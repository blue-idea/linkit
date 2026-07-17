# AC 验收矩阵 — TASK-003

> 任务编号：TASK-003  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-003 | REQ-026-AC-001 | Unit | Zod Schema 校验有效信封、无效 JSON、当前 V1、旧原型迁移和不支持版本；15 个领域测试通过 | PASS | `docs/spec/evidence/TASK-003-evidence.md` | — |
| TASK-003 | REQ-026-AC-002 | Unit | 一次返回全部悬空 category/tag/collection/bookmark 引用，并拒绝分类环与重复关系 | PASS | `ui/src/domain/library.test.ts` | — |
| TASK-003 | REQ-026-AC-003 | Unit | 校验主题双向成员关系；旧原型迁移显式补齐 Bookmark.collectionIds 且去重 | PASS | `ui/src/domain/library.test.ts` | — |
| TASK-003 | REQ-026-AC-004 | Unit | Bookmark 正式字段 JSON 往返等价，迁移保留既有字段并补齐缺省字段 | PASS | `ui/coverage/index.html` | — |

---

## 结论

REQ-026-AC-001~004 全部通过，无 FAIL、BLOCKED 或 WONTFIX。
