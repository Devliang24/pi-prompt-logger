# Changelog

## v1.0.0 (2026-05-31)

### Features

- 自动记录用户提问为 JSONL
- 按日期分割文件 (`prompts-YYYY-MM-DD.jsonl`)
- Markdown 导出，支持日期范围、项目过滤
- JSONL 导出，保留原始数据
- LLM 批量生成标签/摘要
- 敏感信息过滤（项目路径、关键词）
- 自动清理过期日志
- 零延迟记录（异步追加）

### Commands

- `/export-prompts` - 导出提问记录

### Options

- `--since` - 起始日期
- `--until` - 结束日期
- `--project` - 项目过滤
- `--format` - 导出格式 (markdown/jsonl)
- `--output` - 输出路径
- `--with-tags` - 生成 LLM 标签
- `--with-summary` - 生成 LLM 摘要
