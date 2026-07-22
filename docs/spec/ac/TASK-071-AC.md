# AC 验收矩阵（TASK-071）

> 任务编号：TASK-071
> 执行日期：2026-07-22
> 执行人：Codex

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-071 | REQ-006-AC-001 | Component + E2E | Manual、Smart 与 Enter 均先进入可编辑预览；组件断言确认保存前 `onCreate` 未调用 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`、`new-bookmark-entry-modes.spec.ts` | — |
| TASK-071 | REQ-006-AC-004 | E2E Regression | 既有 New Bookmark 保存旅程仍只在点击 Save bookmark 后创建一次书签 | PASS | `bookmark-crud.spec.ts`；9 条受影响 E2E 全部通过 | — |
| TASK-071 | REQ-006-AC-009 | Component | Manual 调用元数据一次、AI 零次；Smart 与 URL Enter 各保持一次 AI 调用；关闭重开后旧 Manual/Smart 结果均被忽略 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`；7/7 PASS | — |
| TASK-071 | REQ-006-AC-009 | E2E | 同一真实对话框依次验证 Manual、Smart、Enter，调用计数为 `{1,0}`、`{2,1}`、`{3,2}` | PASS | `new-bookmark-entry-modes.spec.ts` | — |
| TASK-071 | REQ-006-AC-006 | Unit + Component Regression | Manual 元数据预览保留 favicon URL/data URL，确认保存后 favicon 仍为元数据图片；抓取失败时显式回退 null | PASS | `analysis.test.ts`、`NewBookmarkDialog.entry-modes.test.tsx` | — |
| TASK-071 | REQ-023-AC-008 | Unit | Manual/Smart 均提供 English 与中文目录项，语言审计与 i18n 全量测试通过 | PASS | `catalogs.ts`、`ui-language-audit.test.ts`、`i18n.test.ts` | — |
| TASK-071 | REQ-028-AC-004 | Visual + Playwright MCP | Baseline/Actual/Diff 已生成；10 像素差异，比例 0.0062%，低于 8% 门限 | PASS | `TASK-071-entry-modes-baseline.png`、`actual.png`、`diff.png`、`mcp.png`、diff metric | — |
