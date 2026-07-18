# AC 验收矩阵 — TASK-005

> 任务编号：TASK-005
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-005 | REQ-026-AC-001 | Unit | Store hydrate、命令结果和 MemoryRepository 写入均通过正式 LibraryEnvelope 校验 | PASS | `docs/spec/evidence/TASK-005-evidence.md` | — |
| TASK-005 | REQ-026-AC-002 | Unit | 不存在的书签/主题、悬空引用和伪成功无效命令均返回结构化错误且不覆盖有效状态 | PASS | `ui/src/domain/commands/membership.test.ts`、`ui/src/store/app-store.test.ts`、`ui/src/repositories/memory.test.ts` | — |
| TASK-005 | REQ-026-AC-003 | Unit | 主题成员命令同步 Bookmark.collectionIds 与 Collection.bookmarkIds，并返回可测试领域事件 | PASS | `ui/src/domain/commands/membership.test.ts` | — |
| TASK-005 | REQ-026-AC-004 | Unit | MemoryRepository load/save/replace 使用深拷贝保存完整信封，成功保存递增 revision 并保留书签字段 | PASS | `ui/src/repositories/memory.test.ts` | — |
| TASK-005 | REQ-027-AC-002 | E2E | 单元层已验证云错误存在时本地模式和领域命令继续可用 | BLOCKED | `ui/src/store/app-store.test.ts` | 完整本地浏览、编辑、搜索和组织 E2E 需等待 TASK-010~018 的功能与 UI 接入 |
| TASK-005 | REQ-027-AC-003 | E2E | 单元层已验证保存错误进入 error、保留最后 revision 且不显示 saved 状态 | BLOCKED | `ui/src/store/app-store.test.ts` | 真实持久化失败与英文 UI 错误验收需等待 TASK-006、TASK-010 及对应 E2E |

---

## 结论

TASK-005 的领域命令、Repository、StorageCoordinator、五类 Zustand slice 和 selector 交付项全部通过。REQ-027-AC-002~003 的单元前置条件已完成，端到端验收保持 `BLOCKED` 并由后续功能任务解除。
