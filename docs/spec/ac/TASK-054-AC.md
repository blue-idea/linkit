# TASK-054 AC 验收矩阵

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-054 | REQ-012-AC-011 | Unit | 书签项提供 `Remove from collection`；未提供回调时不渲染 | PASS | `BookmarkItemActions.test.tsx` | — |
| TASK-054 | REQ-012-AC-011 | Unit | 多选移出对话框 Cancel 零副作用、Confirm 触发回调 | PASS | `RemoveFromCollectionDialog.test.tsx` | — |
| TASK-054 | REQ-012-AC-011 | E2E | 单条即时移出 3→2；多选 Cancel 保持 2；Confirm 后 0；书签仍在资料库 | PASS | `collection-membership.spec.ts` | — |
| TASK-054 | REQ-026-AC-003 | Unit | 移出经 `runSetMembership` / `runBatchSetMembership` 双向一致（复用 TASK-052） | PASS | membership 命令测试 | — |
| TASK-054 | Visual | Visual | 多选移出确认对话框截图 | PASS | `TASK-054-remove-from-collection.png` | — |
| TASK-054 | Visual MCP | Visual | Playwright MCP | BLOCKED | 沿用 CLI 截图 | MCP Chromium 不可用 |
