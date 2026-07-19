# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-045-AC.md`
> 任务编号：TASK-045
> 执行日期：2026-07-19
> 执行人：Auto

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-045 | REQ-007-AC-005~007 | Unit + E2E | 卡片和详情面板提供 Edit、Move、Delete；统一编辑包含 URL、Title、Description、Notes、Category、Tags、Collections、Read status 并成功保存 | PASS | `batch-actions.test.ts`；`bookmark-actions.spec.ts` | — |
| TASK-045 | REQ-007-AC-008 | Unit + E2E | checkbox、Ctrl/Cmd、Shift 范围选择与 Clear selection 均通过 | PASS | 4 条 Vitest；Playwright 批量旅程 | — |
| TASK-045 | REQ-007-AC-009 | Unit + E2E | 批量删除显示选中数量、二次确认并清理主题引用 | PASS | `TASK-045-bookmark-actions.png`；视觉 Baseline | — |
| TASK-045 | REQ-011-AC-004~005 | Unit + E2E | 单项与批量移动支持目标分类及 Uncategorized；无效目标整批零修改 | PASS | `batch-actions.test.ts`；Playwright 批量旅程 | — |
| TASK-045 | REQ-026-AC-002~003 | Unit | 编辑与删除保持书签、标签、分类和主题引用一致 | PASS | `batch-actions.test.ts` | — |
| TASK-045 | REQ-027-AC-002~003 | Unit + E2E | 命令错误返回英文消息，UI 仅在命令成功后投影完整结果 | PASS | TypeScript typecheck；Vitest；Playwright | — |

## 视觉证据

- Baseline：`ui/tests/e2e/bookmark-actions.spec.ts-snapshots/TASK-045-bulk-delete.png`
- 实际截图：`docs/spec/evidence/TASK-045-bookmark-actions.png`
- 无更新参数复跑通过，实际图与 Baseline 未产生超阈值 Diff。
