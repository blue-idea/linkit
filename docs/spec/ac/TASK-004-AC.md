# AC 验收矩阵 — TASK-004

> 任务编号：TASK-004
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-004 | REQ-026-AC-001 | Unit | 实体 Factory、核心旅程 seed 与 10,000 条性能资料库均通过正式 Schema 校验 | PASS | `docs/spec/evidence/TASK-004-evidence.md` | — |
| TASK-004 | REQ-026-AC-002 | Unit | 10,000 个书签 ID 全部唯一；人工制造重复 ID 后返回 `DUPLICATE_ENTITY_ID` | PASS | `ui/src/tests/performance-data/performance-data.test.ts` | — |
| TASK-004 | REQ-026-AC-003 | Unit | 核心 seed 与性能数据的 Collection/Bookmark 成员关系通过双向一致性校验 | PASS | `ui/src/tests/factories/factories.test.ts`、`ui/src/tests/performance-data/performance-data.test.ts` | — |
| TASK-004 | REQ-026-AC-004 | Unit | Bookmark Factory 生成全部正式字段，覆盖值被保留且数组不在测试间共享 | PASS | `ui/src/tests/factories/factories.test.ts` | — |
| TASK-004 | REQ-028-AC-005 | Performance | 已生成并验证 10,000 条确定性热启动基线数据 | BLOCKED | `ui/src/testing/performance-data/index.ts` | 热启动 ≤2s 需等待 TASK-041 在正式构建与参考设备执行；本任务不得用生成器耗时代替应用热启动结果 |
| TASK-004 | REQ-028-AC-006 | Performance | 已生成关键词、分类、标签、主题和状态分布所需的 10,000 条基线数据 | BLOCKED | `ui/src/testing/performance-data/index.ts` | 搜索、筛选与视图切换 P95 ≤100ms 需等待相关功能和 TASK-041 性能采样 |
| TASK-004 | REQ-028-AC-007 | Performance | 已生成可序列化且引用有效的 10,000 条本地保存基线数据 | BLOCKED | `ui/src/testing/performance-data/index.ts` | 本地保存 P95 ≤500ms 需等待本地 Repository 实现与 TASK-041 正式测量 |

---

## 结论

TASK-004 的 Factory、seed 与性能数据生成器交付项全部通过。REQ-028-AC-005~007 的数据前置条件已满足，但应用级性能阈值保持 `BLOCKED`，由 TASK-041 解除并给出正式测量证据。
