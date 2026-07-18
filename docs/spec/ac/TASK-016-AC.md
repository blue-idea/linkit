# AC 验收矩阵 — TASK-016

> 任务编号：TASK-016
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-016 | REQ-012-AC-001 | Unit + E2E | 创建/编辑主题持久化 name/emoji/color/description；侧栏显示新主题 | PASS | `collections.test.ts`、`TASK-016-collection-create.png` | — |
| TASK-016 | REQ-012-AC-002 | Unit + E2E | 删除主题后书签保留，并从 `collectionIds` 清理引用 | PASS | `collections.test.ts`、`TASK-016-collection-delete.png` | — |
| TASK-016 | REQ-012-AC-003 | Unit | 拖拽/详情成员切换经 `setBookmarkCollectionMembership` 双向同步 | PASS | `membership.test.ts`、`apply-collection-command.test.ts` | — |
| TASK-016 | REQ-012-AC-004 | Unit + E2E | 打开主题仅显示成员，内容区显示准确计数（如 5 个收藏） | PASS | `listCollectionMembers`、`TASK-016-collection-members.png` | — |
| TASK-016 | REQ-026-AC-003 | Unit | 成员加入无重复 ID，且 `bookmarkIds`/`collectionIds` 对称 | PASS | `collections.test.ts`、`membership.test.ts` | — |

---

## 结论

TASK-016 主题 CRUD 与双向成员关系已通过 Unit + E2E 验收，可合并。
