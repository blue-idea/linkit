# AC 验收矩阵 — TASK-018

> 任务编号：TASK-018
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-018 | REQ-014-AC-001 | Unit + E2E | 侧栏标签显示准确计数；点击后仅显示含该标签书签 | PASS | `tags.test.ts`、`TASK-018-tag-filter.png` | — |
| TASK-018 | REQ-014-AC-002 | Unit + E2E | 详情添加/移除标签后书签与侧栏计数立即更新且无重复 | PASS | `apply-tag-command.test.ts`、`TASK-018-tag-edit.png` | — |
| TASK-018 | REQ-014-AC-003 | Unit | 采纳建议标签恰好一次，并从建议列表移除 | PASS | `tags.test.ts`、`apply-tag-command.test.ts` | — |

---

## 结论

TASK-018 标签维护、筛选与建议采纳已通过 Unit + E2E 验收，可合并。
