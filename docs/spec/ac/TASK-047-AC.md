# TASK-047 AC 验收矩阵

> 任务编号：TASK-047  
> 执行日期：2026-07-19  
> 执行人：Auto  
> 分支：`feat/TASK-047-data-root`

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-047 | REQ-023-AC-002 | E2E | Settings → Storage 展示数据目录路径与容量信息 | PASS | `ui/tests/e2e/storage-data-root.spec.ts`、`TASK-047-data-root-settings.png` | — |
| TASK-047 | REQ-029-AC-001 | E2E | 更改文件夹后先展示源/目标确认摘要，确认前不写盘 | PASS | `ui/tests/e2e/storage-data-root.spec.ts`、`ui/src/services/storage/data-root.test.ts` | — |
| TASK-047 | REQ-029-AC-002 | Unit + E2E | Go 迁移白名单文件并更新引导指针；浏览器适配器确认后更新路径 | PASS | `internal/localstore/dataroot_test.go`、`storage-data-root.spec.ts` | — |
| TASK-047 | REQ-029-AC-003 | Unit + E2E | 目标已含 Linkit 数据时返回 `DATA_ROOT_TARGET_OCCUPIED` 并保持原根 | PASS | `dataroot_test.go`、`storage-data-root.spec.ts` | — |
| TASK-047 | REQ-029-AC-004 | Unit | 无效目标 / 失败路径保持源数据，不更新指针；允许迁到子/父目录 | PASS | `TestMigrateDataRoot_复制失败时回滚并清理目标`、`允许迁移到源目录子路径`、`允许迁移到源目录的父路径` | — |
| TASK-047 | REQ-029-AC-005 | Unit | `ResolveEffectiveDataRoot` 读取引导指针；迁移后从新根 `ReadLibrary` 成功 | PASS | `dataroot_test.go`（成功迁移 + Resolve） | — |

---

## 结论

TASK-047 绑定的 REQ-023-AC-002 与 REQ-029-AC-001~005 均通过真实测试。桌面原生文件夹对话框在浏览器 E2E 中由 `__linkitSelectDirectory` 替身覆盖；Wails 桌面路径依赖 `OpenDirectoryDialog` + `SetContext`。
