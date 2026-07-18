# AC 验收矩阵 — TASK-024

> 任务编号：TASK-024
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-024 | REQ-005-AC-001 | E2E | 导出 JSON 含 format/schemaVersion 与四类实体，无 apiKey | PASS | `TASK-024-export-en.png` | — |
| TASK-024 | REQ-005-AC-002 | E2E + Unit | 导入摘要可见；取消无副作用；确认后资料库被替换 | PASS | `TASK-024-import-confirm-en.png` | — |
| TASK-024 | REQ-005-AC-003 | E2E + Unit | 无效 JSON 显示英文错误且 localStorage 库不变 | PASS | `TASK-024-import-invalid-en.png` | — |
| TASK-024 | REQ-023-AC-005 | E2E | 中文下覆盖确认与导入入口文案本地化 | PASS | `TASK-024-import-confirm-zh.png` | — |
| TASK-024 | REQ-023-AC-006 | E2E + Unit | zh 下导入错误为中文并保留 IMPORT_INVALID 键 | PASS | `import-export.test.ts`、zh 截图 | — |

---

## 结论

TASK-024 导入导出 UX、覆盖确认与双语言证据已通过验收，可合并。
