# pi-prompt-logger

Pi Extension: 自动记录用户提问，支持 Markdown/JSONL 导出复盘。

## 功能

- ✅ 自动记录用户提问为 JSONL
- ✅ 支持 Markdown/JSONL 导出
- ✅ 日期范围、项目过滤
- ✅ LLM 批量生成标签/摘要
- ✅ 敏感信息过滤
- ✅ 自动清理过期日志
- ✅ 零延迟记录

## 安装

```bash
git clone https://github.com/YOUR_USERNAME/pi-prompt-logger.git ~/.pi/agent/extensions/prompt-logger
```

重启 pi 或执行 `/reload` 加载扩展。

## 使用

### 自动记录

安装后自动开始记录，无需任何配置。每次回车后，提问自动保存到：

```
~/.pi/agent/prompt-logger/prompts-YYYY-MM-DD.jsonl
```

### 导出

```
/export-prompts
```

#### 参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `--since` | 7 days | 起始日期 |
| `--until` | today | 结束日期 |
| `--project` | all | 项目过滤 |
| `--format` | markdown | 格式：markdown / jsonl |
| `--output` | 自动 | 输出路径 |
| `--with-tags` | - | 批量生成标签 |
| `--with-summary` | - | 批量生成摘要 |

#### 示例

```bash
/export-prompts                                    # 最近 7 天
/export-prompts --since "30 days"                 # 最近 30 天
/export-prompts --since "2026-05-01" --until "2026-05-31"
/export-prompts --project ~/project-a             # 项目过滤
/export-prompts --format jsonl                    # JSONL 格式
/export-prompts --with-tags --with-summary        # LLM 增强
```

## 数据格式

```json
{
  "id": "uuid-v4",
  "timestamp": "2026-05-31T10:30:00.000Z",
  "text": "如何实现XX功能？",
  "cwd": "/Users/liang/project",
  "sessionFile": "session-xxx",
  "model": "claude-sonnet-4"
}
```

## 配置

编辑 `~/.pi/agent/prompt-logger/settings.json`：

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

### 配置项

| 项 | 说明 | 默认值 |
|----|------|--------|
| enabled | 是否启用记录 | true |
| logDir | 日志存储目录 | ~/.pi/agent/prompt-logger |
| ignoredProjects | 忽略的项目路径 | [] |
| ignoredKeywords | 忽略的关键词 | ["password", "secret", "api_key", "token", "key"] |
| exportDir | 默认导出目录 | ~/Documents |
| concatenate | 导出是否追加 | true |
| maxFileAge | 日志保留天数 | 365 |

## 标签池

LLM 标签生成使用以下标签池：

```
feature, bugfix, refactor, docs, test, config,
debug, design, research, question, performance, security
```

## 隐私声明

- 仅记录用户提问文本
- 不记录助手回复
- 不记录工具调用和结果
- 数据存储在本地 `~/.pi/agent/prompt-logger/`
- 删除该目录可清除所有记录
- 不会上传任何数据

## License

MIT
