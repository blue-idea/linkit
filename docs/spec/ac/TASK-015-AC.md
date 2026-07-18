# AC 验收矩阵 — TASK-015

> 任务编号：TASK-015
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-015 | REQ-011-AC-001 | Unit + E2E | `moveCategoryUnder` 更新 parentId；Move category 对话框成功移动 | PASS | `drag.test.ts`、`TASK-015-category-move.png` | — |
| TASK-015 | REQ-011-AC-002 | Unit | 拖入自身/后代抛出 `InvalidCategoryMoveError`，原树不变 | PASS | `drag.test.ts` | — |
| TASK-015 | REQ-011-AC-003 | Unit + E2E | `assignBookmarkToCategory` 更新 categoryId 并显示英文 toast | PASS | `drag.test.ts`、`TASK-015-bookmark-assign.png` | — |
| TASK-015 | REQ-024-AC-006 | Unit + E2E | 键盘可达 Move category 对话框等价拖拽落点 | PASS | `drag.test.ts`、`category-drag.spec.ts` | — |

---

## 结论

TASK-015 分类与书签拖拽已通过 Unit + E2E 验收，可合并。
