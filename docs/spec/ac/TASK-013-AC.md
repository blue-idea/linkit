# AC 验收矩阵 — TASK-013

> 任务编号：TASK-013
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-013 | REQ-008-AC-004 | Unit | `filterBookmarks` 按 readStatus 仅返回匹配项 | PASS | `query.test.ts` | — |
| TASK-013 | REQ-009-AC-001 | Unit + E2E | recent/created/visits/title 表驱动确定性顺序；UI Sort 可选 | PASS | `query.test.ts`、`bookmark-query.spec.ts` | — |
| TASK-013 | REQ-009-AC-002 | Unit | 任意排序下 pinned 组在前，组内保持所选排序 | PASS | `query.test.ts` | — |
| TASK-013 | REQ-009-AC-003 | Unit | 星标+标签+时间+阅读状态交集仅保留同时满足项 | PASS | `query.test.ts` | — |
| TASK-013 | REQ-009-AC-004 | Unit + E2E | Clear filters 后指示器消失且筛选恢复 all | PASS | `query.test.ts`、`TASK-013-clear-filters.png` | — |

---

## 结论

TASK-013 排序与组合筛选引擎已通过 Unit（及 AC-004 E2E）验收，可合并。
