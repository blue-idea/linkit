# AC 验收矩阵 — TASK-020

> 任务编号：TASK-020
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-020 | REQ-016-AC-001 | E2E | Timeline 按 createdAt 分组，提供时间源切换控件 | PASS | `aggregate-views.spec.ts`、`TASK-020-timeline-*.png` | — |
| TASK-020 | REQ-016-AC-002 | Unit | lastVisitedAt 为空归入 Never Visited 并沉底 | PASS | `views.test.ts` | — |
| TASK-020 | REQ-016-AC-003 | Unit + E2E | 标签聚合成员与计数一致，UI 展示计数 | PASS | `views.test.ts`、`TASK-020-tag-aggregation-*.png` | — |
| TASK-020 | REQ-016-AC-004 | E2E | Theme Space 以主题容器嵌套展示元数据与成员 | PASS | `TASK-020-theme-space-*.png` | — |
| TASK-020 | REQ-028-AC-004 | E2E | 三视图 Baseline / Actual 比对通过 | PASS | `TASK-020-*-baseline.png`、`TASK-020-*-actual.png` | — |

---

## 结论

TASK-020 Timeline / Tag Aggregation / Theme Space 已通过 Unit + E2E 验收，可合并。
