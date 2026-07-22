# AC 验收矩阵（TASK-069）

> 任务编号：TASK-069
> 执行日期：2026-07-22
> 执行人：Codex

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-069 | REQ-006-AC-002 | API | AI 提示词将 `tagCandidates` 作为受控词表，要求原样复用候选 label、禁止翻译并限制最多 3 个建议 | PASS | `internal/ai/prompt_test.go`、`go test ./internal/ai -count=1 -cover` | — |
| TASK-069 | REQ-014-AC-003 | Unit | NFKC、大小写、前导 `#` 与常见分隔符差异可映射到唯一现有 Tag ID | PASS | `suggested-tag-matching.test.ts`；行 100%、分支 94.73% | — |
| TASK-069 | REQ-014-AC-003 | Unit | 子串与歧义规范化键保持未匹配，重复建议只写入一次 | PASS | `suggested-tag-matching.test.ts` | — |
| TASK-069 | REQ-006-AC-004、REQ-014-AC-003 | Unit | New Bookmark 真实组件流程将 `# React` 保存为现有 `tag-react` | PASS | `NewBookmarkDialog.ai-tags.test.tsx` | — |
| TASK-069 | REQ-006-AC-002、004；REQ-014-AC-003 | E2E | 分析、确认、保存后详情显示现有 React 标签，未创建 `# React` 标签 | PASS | `ai-bookmark-analysis.spec.ts`、`TASK-069-ai-tag-match.png` | — |
| TASK-069 | 性能约束 | Unit | 未增加网络/AI/数据库调用；匹配由逐建议扫描候选改为一次索引 O(C+S) | PASS | `suggested-tag-matching.ts`、单元套件 4ms | — |
| TASK-069 | 补充视觉核验 | UI | Playwright MCP 未能启动其配置的 Chromium revision；Playwright CLI 同旅程已通过并截图 | BLOCKED | `TASK-069-ai-tag-match.png` | MCP 指向不存在的 `chromium_headless_shell-1200`，不改动用户目录绕过 |
