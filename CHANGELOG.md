# Changelog

## v1.0.0 (2026-05-31)

### Features

- Auto-record prompts to JSONL
- Daily file rotation (`prompts-YYYY-MM-DD.jsonl`)
- Markdown export with date range & project filter
- JSONL export for raw data
- LLM batch tag/summary generation
- Sensitive info filtering (project paths, keywords)
- Auto-cleanup old logs
- Zero-latency recording (async append)

### Commands

- `/export-prompts` - Export prompt records

### Options

- `--since` - Start date
- `--until` - End date
- `--project` - Filter by project
- `--format` - Export format (markdown/jsonl)
- `--output` - Output path
- `--with-tags` - Generate LLM tags
- `--with-summary` - Generate LLM summary
