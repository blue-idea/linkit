# AC 验收矩阵 — TASK-008

> 任务编号：TASK-008
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-008 | REQ-005-AC-001 | Unit + E2E | `ExportLibrary` 写入含 `format/data/exportedAt/appVersion` 的 JSON；取消返回 `cancelled` | BLOCKED | `docs/spec/evidence/TASK-008-evidence.md`、`internal/platform/native_file_test.go` | 桌面保存对话框与导出 UX 依赖 TASK-024 |
| TASK-008 | REQ-005-AC-002 | Unit + E2E | `SelectImportFile` 对有效 JSON 返回 `selected` 与 `documentJson`；取消无文档副作用 | BLOCKED | `internal/platform/native_file_test.go` | 覆盖确认、Zod 摘要与资料库替换 UI 依赖 TASK-024 / `ReplaceLibrary` 接入 |
| TASK-008 | REQ-005-AC-003 | Unit + E2E | 损坏 JSON、非法 UTF-8、超大文件均返回 `IMPORT_INVALID`，不产生导入结果 | BLOCKED | `internal/platform/native_file_test.go` | 英文错误 UI 呈现依赖 TASK-024 |
| TASK-008 | REQ-025-AC-002 | Unit | 导出/导入载荷含 `apiKey` 时被拒绝；合法导出不含 settings/密钥字段 | PASS | `internal/platform/native_file_test.go`、`internal/platform/service_extra_test.go` | — |

---

## 结论

TASK-008 的 NativeFileService（对话框可注入、大小/UTF-8/JSON 门禁、导出信封、密钥拒绝）已通过任务级 Unit 验收。跨层 E2E AC 保持 `BLOCKED`，待导入导出 UX 接入。
