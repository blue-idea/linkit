# TASK-059 AC 矩阵

> 任务：关闭隐藏、系统托盘与窗口显隐全局热键  
> 日期：2026-07-21

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-059 | REQ-030-AC-001 | Unit | 默认关闭阻止进程退出 | PASS | `desktop_test.go`、`TASK-059-go-test.txt` | — |
| TASK-059 | REQ-030-AC-002 | Unit | 菜单项 Show/Quit | PASS | `menu_test.go` | 真实托盘由 TASK-061 确认 |
| TASK-059 | REQ-030-AC-003 | Unit | Show 聚焦窗口 | PASS | `desktop_test.go` | — |
| TASK-059 | REQ-030-AC-004 | Unit | Quit 允许退出 | PASS | `desktop_test.go` | — |
| TASK-059 | REQ-030-AC-005 | Unit | 默认 CmdOrCtrl+L 与触发 Toggle | PASS | `hotkey/*_test.go` | 全局热键由 TASK-061 确认 |
| TASK-059 | REQ-030-AC-010 | Unit | 能力探测含 platform | PASS | `desktop_test.go` | — |
| TASK-059 | REQ-030-AC-001~005、010 | Manual | J-17 桌面验证 | PASS | TASK-061 用户确认 | 原 BLOCKED 已关闭 |
