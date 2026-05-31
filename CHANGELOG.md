# Changelog

## v1.0.0 (2026-05-31)

### Features

- Auto-record prompts to JSONL
- Daily file rotation (`prompts-YYYY-MM-DD.jsonl`)
- JSONL export with date range & project filter
- LLM batch tag generation
- Sensitive info filtering (project paths, keywords)
- Auto-cleanup old logs
- Zero-latency recording (async append)

### Commands

- `/export-prompts` - Export prompt records

### Options

- `--since` - Start date
- `--until` - End date
- `--project` - Filter by project
- `--output` - Output path
- `--with-tags` - Generate LLM tags
