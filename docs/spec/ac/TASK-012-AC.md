# AC 验收矩阵 — TASK-012

> 任务编号：TASK-012
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-012 | REQ-008-AC-001 | E2E | Toggle star / pin 后 `aria-pressed` 立即翻转；界面状态同步 | PASS | `bookmark-state.spec.ts`、`TASK-012-star-read-status.png` | — |
| TASK-012 | REQ-008-AC-002 | Unit + E2E | 外部打开成功后 visitCount+1；失败路径不改计数 | PASS | `visit.test.ts`、`bookmark-state.test.ts`、`TASK-012-visit-count.png` | — |
| TASK-012 | REQ-008-AC-003 | Unit + E2E | readStatus 仅接受 unread/reading/read/archived；非法值拒绝 | PASS | `bookmark-state.test.ts`、E2E Read status | — |
| TASK-012 | REQ-008-AC-004 | Unit + E2E | 按阅读状态筛选仅返回匹配项 | PASS | `filterBookmarksByReadStatus`、E2E Filter by read status | — |

---

## 结论

TASK-012 书签标记、访问与阅读状态已通过 Unit + E2E 验收，可合并。
