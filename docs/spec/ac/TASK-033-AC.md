# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-033-AC.md`  
> 任务编号：TASK-033  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-033 | REQ-006-AC-002 | API + Unit | AnalyzeBookmark 返回 title/summary/category/tags；DTO 校验与候选集门禁 | PASS | `TestAnalyzeBookmarkReturnsValidatedSuggestions`、Vitest 9 | — |
| TASK-033 | REQ-006-AC-003 | E2E | 无 Key/服务不可用时英文降级；AI summary 为空；无伪结果 | PASS | `AI 降级` E2E、`TASK-033-ai-fallback.png` | — |
| TASK-033 | REQ-020-AC-001 | API + E2E | Reanalyze 仅返回预览；失败不改原摘要 | PASS | `TestReanalyzeBookmarkReturnsPreviewWithoutSideEffects`、重新分析 E2E | — |
| TASK-033 | REQ-020-AC-002 | Unit | `applyReanalyzeConfirmation` 确认后写入摘要与采纳标签，拒绝项不持久化 | PASS | Vitest reanalyze 用例 | — |

---

## 命令与结果

```text
go test ./internal/ai/ -count=1
ok

pnpm --dir ui exec vitest run src/features/ai/bookmark-analysis
✓ 9 tests

pnpm --dir ui exec playwright test -g "AI 入库分析|重新分析|AI 降级"
3 passed
```
