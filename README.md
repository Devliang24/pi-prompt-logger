# pi-prompt-logger

Pi Extension: Auto-record user prompts to JSONL, export to Markdown for review.

## Features

- ✅ Auto-record prompts to JSONL
- ✅ Export to Markdown/JSONL
- ✅ Date range & project filtering
- ✅ LLM batch tag/summary generation
- ✅ Sensitive info filtering
- ✅ Auto-cleanup old logs
- ✅ Zero-latency recording

## Installation

```bash
git clone https://github.com/Devliang24/pi-prompt-logger-.git ~/.pi/agent/extensions/prompt-logger
```

Restart pi or run `/reload` to load the extension.

## Usage

### Auto Recording

Once installed, prompts are recorded automatically. Each Enter saves to:

```
~/.pi/agent/prompt-logger/prompts-YYYY-MM-DD.jsonl
```

### Export

```
/export-prompts
```

#### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--since` | 7 days | Start date |
| `--until` | today | End date |
| `--project` | all | Filter by project |
| `--format` | markdown | Format: markdown / jsonl |
| `--output` | auto | Output path |
| `--with-tags` | - | Generate LLM tags |
| `--with-summary` | - | Generate LLM summary |

#### Examples

```bash
/export-prompts                                    # Last 7 days
/export-prompts --since "30 days"                 # Last 30 days
/export-prompts --since "2026-05-01" --until "2026-05-31"
/export-prompts --project ~/project-a             # Filter by project
/export-prompts --format jsonl                    # JSONL format
/export-prompts --with-tags --with-summary        # LLM enhanced
```

## Data Format

```json
{
  "id": "uuid-v4",
  "timestamp": "2026-05-31T10:30:00.000Z",
  "text": "How to implement feature X?",
  "cwd": "/Users/liang/project",
  "sessionFile": "session-xxx",
  "model": "claude-sonnet-4"
}
```

## Configuration

Edit `~/.pi/agent/prompt-logger/settings.json`:

```json
{
  "enabled": true,
  "logDir": "~/.pi/agent/prompt-logger",
  "ignoredProjects": [],
  "ignoredKeywords": ["password", "secret", "api_key"],
  "exportDir": "~/Documents",
  "concatenate": true,
  "maxFileAge": 365
}
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| enabled | Enable recording | true |
| logDir | Log storage directory | ~/.pi/agent/prompt-logger |
| ignoredProjects | Projects to ignore | [] |
| ignoredKeywords | Keywords to ignore | ["password", "secret", "api_key", "token", "key"] |
| exportDir | Default export directory | ~/Documents |
| concatenate | Append to existing export | true |
| maxFileAge | Days to keep logs | 365 |

## Tag Pool

LLM tags are generated from this pool:

```
feature, bugfix, refactor, docs, test, config,
debug, design, research, question, performance, security
```

## Privacy

- Only user prompt text is recorded
- Assistant replies are NOT recorded
- Tool calls and results are NOT recorded
- Data is stored locally in `~/.pi/agent/prompt-logger/`
- Delete the directory to remove all records
- No data is uploaded anywhere

## License

MIT
