# AC 验收矩阵 — TASK-021

> 任务编号：TASK-021
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-021 | REQ-017-AC-001 | E2E | Ctrl/Cmd+K（等价 keydown）打开 Spotlight 且搜索框聚焦 | PASS | `spotlight.spec.ts`、`TASK-021-spotlight-open.png` | — |
| TASK-021 | REQ-017-AC-002 | Unit | 标题/描述/域名/备注大小写不敏感匹配并按权重排序 | PASS | `search.test.ts` | — |
| TASK-021 | REQ-017-AC-003 | E2E | 选择结果后定位书签并关闭 Spotlight | PASS | `TASK-021-spotlight-select.png` | — |
| TASK-021 | REQ-017-AC-004 | E2E + Unit | http(s) URL 打开 New Bookmark 预览，确认前不保存 | PASS | `url.test.ts`、`TASK-021-url-new-bookmark.png` | — |

---

## 结论

TASK-021 Spotlight 关键词与 URL 快捷入库已通过 Unit + E2E 验收，可合并。
