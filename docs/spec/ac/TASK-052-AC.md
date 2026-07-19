# TASK-052 AC 验收矩阵

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-052 | REQ-012-AC-008 | Unit | 批量加入一次返回双向一致 LibraryData 与 batch 事件 | PASS | `membership.test.ts`、`apply-collection-command.test.ts` | — |
| TASK-052 | REQ-012-AC-009 | Unit | 空列表 / 取消语义下整批失败且输入资料库不变 | PASS | `membership.test.ts` 空列表与不可变断言 | — |
| TASK-052 | REQ-012-AC-011 | Unit | 批量移出保留书签并清理两侧引用；含无效 ID 时整批失败 | PASS | `membership.test.ts` | — |
| TASK-052 | REQ-026-AC-003 | Unit | `batchSetBookmarkCollectionMembership` / `runBatchSetMembership` 同步 `bookmarkIds` 与 `collectionIds` | PASS | `membership.test.ts`、`apply-collection-command.test.ts` | — |
| TASK-052 | REQ-012-AC-007 | Unit | 候选排除已成员；title/URL 不区分大小写搜索；多选切换去重 | PASS | `membership-candidates.test.ts` | — |
