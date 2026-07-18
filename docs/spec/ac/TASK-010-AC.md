# AC 验收矩阵 — TASK-010

> 任务编号：TASK-010
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-010 | REQ-001-AC-005 | Unit + E2E | 引导未完成仅 Loading；完成后登录门或本地主界面，无闪烁 | PASS | `startup-gate.test.ts`、`local-startup.spec.ts`、`TASK-010-login-gate.png` | — |
| TASK-010 | REQ-002-AC-001 | E2E | 本地模式入口可用，进入后显示主窗口 | PASS | `local-startup.spec.ts`、smoke | — |
| TASK-010 | REQ-002-AC-002 | Unit + E2E | 刷新后恢复 `storageMode=local` 与本机书签；不完整数据可安全渲染 | PASS | `bootstrap.test.ts`、`storage.test.ts`、`TASK-010-local-restore.png` | — |
| TASK-010 | REQ-002-AC-003 | E2E | Back to login 不清库；再进本地模式仍见原书签 | PASS | `local-startup.spec.ts` | — |
| TASK-010 | REQ-002-AC-004 | Unit + E2E | 恢复种子前显示英文确认对话框，Cancel 可关闭 | PASS | `startup-gate.test.ts`、`TASK-010-seed-confirm.png` | — |

---

## 结论

TASK-010 本地模式启动 / 恢复 / 退出已通过 Unit + E2E 验收，可合并。
