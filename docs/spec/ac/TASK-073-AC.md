# AC 验收矩阵（TASK-073）

> 任务编号：TASK-073
> 执行日期：2026-07-22
> 执行人：Codex

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-073 | REQ-006-AC-001 | Component + E2E Regression | Manual/Smart 仍先进入可编辑预览，显式 Save 前 `onCreate` 与资料库写入均为零 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`、`bookmark-crud.spec.ts` | — |
| TASK-073 | REQ-006-AC-004 | Component + E2E | 点击 Save 只创建一次书签，随机 thumbnail 随同既有 payload 写入并由本地资料库持久化 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`、`new-bookmark-random-thumbnail.spec.ts` | — |
| TASK-073 | REQ-006-AC-010 | Unit | 六个随机区间依次得到 blue/green/amber/coral/violet/gray；越界随机值限制到首尾键；未知键及 `__proto__`、`constructor`、`toString` 均回退 gray | PASS | `src/features/bookmarks/thumbnail.test.ts`；4/4 PASS | — |
| TASK-073 | REQ-006-AC-010 | Component | 固定 `Math.random=0.75` 且使用有效 favicon 隔离无关随机源；Save 前随机调用与 `onCreate` 均为 0，Save 后均恰好 1 次，payload thumbnail 为 `violet` | PASS | `NewBookmarkDialog.entry-modes.test.tsx` | — |
| TASK-073 | REQ-006-AC-010 | E2E | 固定浏览器随机源后创建书签，本地资料库实际持久化 `thumbnail="violet"`，详情显示对应渐变 | PASS | `new-bookmark-random-thumbnail.spec.ts`；1/1 PASS | — |
| TASK-073 | REQ-006-AC-010 | UI + Playwright MCP | Baseline/Actual/Diff 差异 5,365 像素，比例 0.5821%，低于 8%；MCP DOM 为 violet 渐变且 console error 为 0 | PASS | `TASK-073-random-thumbnail-{baseline,actual,diff,mcp}.png`、diff metric | — |
