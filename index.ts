/**
 * pi-prompt-logger - Pi Extension
 * 
 * Auto-record user prompts to JSONL, export to JSONL for review.
 * 
 * Install: git clone to ~/.pi/agent/extensions/prompt-logger
 */

import minimist from 'minimist';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { appendFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';

// Types
interface PromptRecord {
  id: string;
  timestamp: string;
  text: string;
  cwd: string;
  sessionFile: string | null;
  model: string | null;
  tags?: string[];
  summary?: string;
}

interface Settings {
  enabled: boolean;
  logDir: string;
  ignoredProjects: string[];
  ignoredKeywords: string[];
  exportDir: string;
  concatenate: boolean;
  maxFileAge: number;
}

// Defaults
const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  logDir: '~/.pi/agent/prompt-logger',
  ignoredProjects: [],
  ignoredKeywords: ['password', 'secret', 'api_key', 'token', 'key'],
  exportDir: '~/Documents',
  concatenate: true,
  maxFileAge: 365,
};

const TAG_POOL = [
  'feature', 'bugfix', 'refactor',
  'docs', 'test', 'config',
  'debug', 'design', 'research',
  'question', 'performance', 'security'
];

// Utilities
function resolveHome(path: string): string {
  if (path.startsWith('~/')) {
    return join(process.env.HOME ?? '', path.slice(2));
  }
  return path;
}

function getDateStr(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function generateId(): string {
  return randomUUID();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDate(dateStr: string): Date | null {
  const relativeMatch = dateStr.match(/^(\d+)\s*(days?|d)$/i);
  if (relativeMatch) {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(relativeMatch[1], 10));
    return date;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function tokenizeArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaped) current += '\\';
  if (current) tokens.push(current);

  return tokens;
}

// Config
async function loadSettings(logDir?: string): Promise<Settings> {
  const dir = resolveHome(logDir ?? DEFAULT_SETTINGS.logDir);
  const settingsPath = join(dir, 'settings.json');

  if (!existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = await readFile(settingsPath, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function ensureLogDir(logDir: string): Promise<void> {
  const dir = resolveHome(logDir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// Log files
function getLogPath(logDir: string, date?: Date): string {
  return join(resolveHome(logDir), `prompts-${getDateStr(date)}.jsonl`);
}

function getLogFiles(logDir: string): string[] {
  const dir = resolveHome(logDir);
  
  try {
    return readdirSync(dir)
      .filter(f => f.startsWith('prompts-') && f.endsWith('.jsonl'))
      .map(f => join(dir, f))
      .sort();
  } catch {
    return [];
  }
}

function getLogFilesInRange(logDir: string, startDate: Date, endDate: Date): string[] {
  const files = getLogFiles(logDir);
  const startStr = getDateStr(startDate);
  const endStr = getDateStr(endDate);

  return files.filter(f => {
    const match = f.match(/prompts-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (!match) return false;
    return match[1] >= startStr && match[1] <= endStr;
  });
}

function shouldIgnore(
  text: string,
  cwd: string,
  ignoredProjects: string[],
  ignoredKeywords: string[]
): boolean {
  const normalizedCwd = cwd.toLowerCase();
  if (ignoredProjects.some(p => normalizedCwd.includes(p))) {
    return true;
  }

  const patterns = ignoredKeywords.map(k => new RegExp(escapeRegex(k), 'i'));
  return patterns.some(p => p.test(text));
}

// Record operations
async function appendRecord(record: PromptRecord, logDir: string): Promise<void> {
  const logPath = getLogPath(logDir);
  await ensureLogDir(logDir);
  const line = JSON.stringify(record) + '\n';
  await appendFile(logPath, line, 'utf-8');
}

async function appendRecordWithRetry(
  record: PromptRecord,
  logDir: string,
  maxRetries: number = 3
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await appendRecord(record, logDir);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
  return false;
}

// Read operations
async function readRecordsFromFile(filePath: string): Promise<PromptRecord[]> {
  if (!existsSync(filePath)) return [];
  const content = await readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .filter(l => l.trim())
    .map(l => {
      try { return JSON.parse(l); }
      catch { return null; }
    })
    .filter(r => r !== null);
}

async function readRecords(
  logDir: string,
  since?: string,
  until?: string,
  project?: string
): Promise<PromptRecord[]> {
  const normalizedLogDir = resolveHome(logDir);
  
  let startDate = since ? parseDate(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let endDate = until ? (parseDate(until) ?? new Date()) : new Date();

  if (!startDate) startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const files = getLogFilesInRange(normalizedLogDir, startDate, endDate);
  let records: PromptRecord[] = [];

  for (const file of files) {
    records = records.concat(await readRecordsFromFile(file));
  }

  if (project) {
    const np = resolveHome(project).toLowerCase();
    records = records.filter(r => r.cwd.toLowerCase().includes(np));
  }

  return records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

async function getTodayCount(logDir: string): Promise<number> {
  const records = await readRecordsFromFile(getLogPath(resolveHome(logDir)));
  return records.length;
}

// LLM
async function getLlmConfig(ctx: ExtensionContext) {
  const model = ctx.model;
  if (!model) return null;
  const provider = ctx.modelRegistry.getProvider(model.provider);
  if (!provider) return null;
  return {
    baseUrl: provider.config.baseUrl,
    apiKey: provider.config.apiKey,
    model: model.id,
  };
}

async function callLlm(config: NonNullable<ReturnType<typeof getLlmConfig>>, prompt: string): Promise<string> {
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content?.[0]?.text ?? '';
}

// Export
function parseArgs(args: string): {
  since?: string;
  until?: string;
  project?: string;
  output?: string;
  withTags?: boolean;
  withSummary?: boolean;
} {
  if (!args.trim()) return {};
  try {
    const parsed = minimist(tokenizeArgs(args.trim()));
    return {
      since: parsed.since ? String(parsed.since) : undefined,
      until: parsed.until ? String(parsed.until) : undefined,
      project: parsed.project ? String(parsed.project) : undefined,
      output: parsed.output ? String(parsed.output) : undefined,
      withTags: parsed['with-tags'] ? true : undefined,
      withSummary: parsed['with-summary'] ? true : undefined,
    };
  } catch {
    return {};
  }
}

async function doExport(
  logDir: string,
  exportDir: string,
  options: ReturnType<typeof parseArgs>,
  ctx: ExtensionContext
): Promise<{ path: string; count: number }> {
  const records = await readRecords(logDir, options.since, options.until, options.project);

  // LLM enhancement
  if ((options.withTags || options.withSummary) && ctx.model) {
    const config = await getLlmConfig(ctx);
    if (config) {
      try {
        const prompt = `Generate 1-3 tags from this list: ${TAG_POOL.join(', ')}

For each record, output: {"id": "...", "tags": ["tag1"]}

Records:
${records.map(r => JSON.stringify({ id: r.id, text: r.text.slice(0, 200) })).join('\n')}`;

        const response = await callLlm(config, prompt);
        const tagMap = new Map<string, string[]>();
        
        response.split('\n').forEach(line => {
          try {
            const parsed = JSON.parse(line.trim());
            if (parsed.id && parsed.tags) {
              tagMap.set(parsed.id, parsed.tags.filter((t: string) => TAG_POOL.includes(t)));
            }
          } catch {}
        });

        if (options.withTags) {
          records.forEach(r => {
            r.tags = tagMap.get(r.id) ?? [];
          });
        }
      } catch (error) {
        console.error('LLM tagging failed:', error);
      }
    }
  }

  const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';

  const date = getDateStr();
  let outputPath = options.output
    ? resolveHome(options.output)
    : join(resolveHome(exportDir), `prompt-log-${date}.jsonl`);

  const dir = dirname(outputPath);
  await mkdir(dir, { recursive: true });

  await appendFile(outputPath, content, 'utf-8');

  return { path: outputPath, count: records.length };
}

// Cleanup
async function cleanupOldFiles(logDir: string, maxFileAge: number, ctx: ExtensionContext): Promise<void> {
  if (maxFileAge <= 0) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxFileAge);
  const cutoffStr = getDateStr(cutoffDate);

  const files = getLogFiles(logDir);
  let deletedCount = 0;

  for (const file of files) {
    const match = file.match(/prompts-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match && match[1] < cutoffStr) {
      try {
        await unlink(file);
        deletedCount++;
      } catch {}
    }
  }

  if (deletedCount > 0) {
    ctx.ui.notify(`Cleaned up ${deletedCount} old log files`, 'info');
  }
}

// Failure tracking
let failureCount = 0;
const FAILURE_THRESHOLD = 3;

// Main entry
export default async function (pi: ExtensionAPI) {
  const settings = await loadSettings();
  await ensureLogDir(settings.logDir);

  // Register command
  pi.registerCommand('export-prompts', {
    description: 'Export prompts to JSONL',
    handler: async (args, ctx) => {
      const options = parseArgs(args);
      const startTime = Date.now();

      try {
        ctx.ui.setStatus('prompt-logger', 'Exporting...');
        const result = await doExport(settings.logDir, settings.exportDir, options, ctx);
        const duration = Date.now() - startTime;
        ctx.ui.notify(
          `Exported ${result.count} records to ${result.path} (${duration}ms)`,
          'info'
        );
      } catch (error) {
        ctx.ui.notify(`Export failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
      } finally {
        ctx.ui.setStatus('prompt-logger', '');
      }
    },
  });

  // Listen to input
  pi.on('input', async (event, ctx) => {
    if (!settings.enabled) return;
    if (!event.text?.trim()) return;
    if (event.source === 'extension') return;

    if (shouldIgnore(event.text, ctx.cwd, settings.ignoredProjects, settings.ignoredKeywords)) {
      return;
    }

    const record: PromptRecord = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      text: event.text,
      cwd: ctx.cwd,
      sessionFile: ctx.sessionManager.getSessionFile(),
      model: ctx.model?.id ?? null,
    };

    appendRecordWithRetry(record, settings.logDir).catch(err => {
      console.error('Failed to log prompt:', err);
      failureCount++;
      if (failureCount >= FAILURE_THRESHOLD) {
        ctx.ui.notify('Prompt Logger recording failed. Check disk space and file permissions.', 'warn');
        failureCount = 0;
      }
    });
  });

  // Session start
  pi.on('session_start', async (_event, ctx) => {
    await cleanupOldFiles(settings.logDir, settings.maxFileAge, ctx);

    const todayCount = await getTodayCount(settings.logDir);
    if (todayCount > 0) {
      ctx.ui.notify(`Today: ${todayCount} prompts recorded`, 'info');
    } else {
      // First use hint
      ctx.ui.notify('Prompt Logger activated. Logs saved to ~/.pi/agent/prompt-logger/', 'info');
    }
  });
}
