# 规格与代码分析报告：AI 新建书签标签未自动写入

> 日期：2026-07-22
> 任务：TASK-069 / fix_task 1.11
> 结论：实现回归缺口，可在现有规格与数据模型内修复

## 已审查上下文

- `docs/spec/requirements.md`：REQ-006-AC-002、REQ-006-AC-004、REQ-014-AC-003
- `docs/spec/design.md`：AI 适配器与性能实现策略
- `docs/spec/api.md`：`AnalyzeBookmark` 的 `tagCandidates` / `suggestedTags` 契约
- `docs/spec/data.md`：Bookmark 与 Tag 现有结构
- `docs/spec/tasks.md`、`docs/spec/traceability.md`：TASK-018、TASK-033
- `internal/ai/prompt.go`、`internal/ai/service.go`
- `ui/src/components/Dialogs.tsx`、`ui/src/features/ai/bookmark-analysis/*`

## 根因

1. AI 提示词要求 `suggestedTags` 跟随 UI locale 翻译，但 `tagCandidates` 是用户已有标签，可能为中英混合；候选标签被翻译后无法保持原 label。
2. 新建书签前端仅使用 `trim().toLowerCase()` 精确匹配建议文本与现有标签；空格、连字符、下划线、全角字符或前导 `#` 差异都会失配。
3. 未匹配建议只显示为待定文本；保存时 `tags` 仅写入已匹配 ID，`aiSuggestedTags` 被置空，因此最终书签可能没有任何标签。
4. TASK-033 的测试覆盖了 AI DTO、降级与预览，但没有覆盖“建议文本映射到现有 Tag ID 并随保存入库”的桥接路径。

`git blame` 显示精确匹配与保存桥接均来自 `972ede8`（TASK-033），因此本问题不是近期数据库或书签持久化改动引入，而是原始 AI 入库实现中一直缺少跨语言/格式匹配与对应回归测试。

## 最小修复方案

- 提示词要求优先且精确复用 `tagCandidates.label`，不得翻译已有候选标签；候选存在时不随意发明新标签。
- 抽取纯函数建立一次候选索引，按 Unicode NFKC、大小写与常见分隔符做保守匹配；歧义候选不匹配，避免误标。
- 新建书签仅复用现有标签 ID；未命中建议继续展示但不自动创建标签。
- 不修改数据库结构、不增加网络请求、不增加 AI 调用次数；本地复杂度为 O(候选标签数 + 建议数)。

## 规格一致性结论

- 不改变 `AnalyzeBookmark` 请求/响应 Schema。
- 不改变 Bookmark / Tag 数据结构。
- 行为落在既有“标签建议、用户确认保存、标签唯一写入”验收范围内。
- 无需回退修改 `requirements.md`、`design.md`、`data.md` 或 `api.md`。

## 验证结论

- 新建书签确认保存后，格式等价的 AI 建议会写入已有 Tag ID。
- 子串与歧义规范化键不会自动匹配，避免提高召回率时引入误标。
- 前端匹配函数行覆盖率 100%、分支覆盖率 94.73%；相关与全量回归均通过。
- Playwright CLI 已保存 `TASK-069-ai-tag-match.png`；Playwright MCP 因本机浏览器路径配置指向不存在的 revision 而标记为补充项 `BLOCKED`。
