# TASK-053 AC 验收矩阵

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-053 | REQ-012-AC-006 | E2E | 主题视图工具栏显示 `Add bookmarks` | PASS | `collection-membership.spec.ts` | — |
| TASK-053 | REQ-012-AC-007 | Unit + E2E | 挑选器排除已成员，支持搜索与多选 | PASS | `AddBookmarksToCollectionDialog.test.tsx`、E2E | — |
| TASK-053 | REQ-012-AC-008 | Unit + E2E | 确认后成员与计数更新（3→4） | PASS | E2E 确认 Coolors 加入「周末长读」 | — |
| TASK-053 | REQ-012-AC-009 | Unit + E2E | Cancel 后计数不变；组件 Cancel 不调用 onConfirm | PASS | Unit + E2E | — |
| TASK-053 | REQ-012-AC-010 | E2E | 空主题空态 CTA 打开同一挑选器 | PASS | `TASK-053-empty-add-cta.png` | — |
| TASK-053 | REQ-012-AC-006~010 | Visual | 挑选器与空态截图 | PASS | `TASK-053-add-bookmarks-picker.png`、`TASK-053-empty-add-cta.png` | — |
| TASK-053 | Visual MCP | Visual | Playwright MCP 截图 | BLOCKED | MCP Chromium 可执行文件缺失时沿用 CLI 截图 | MCP Chromium 路径不可用 |
