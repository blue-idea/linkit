# TASK-064 AC 矩阵

> 任务：修复 Windows 托盘 Quit 无法退出
> 日期：2026-07-22
> 状态：done

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-064 | REQ-030-AC-002 | Unit | 托盘 Show/Quit 回调不阻塞原生消息回调 | PASS | `internal/tray/menu_test.go` | 回调改为异步派发 |
| TASK-064 | REQ-030-AC-003 | Manual | Windows 托盘 Show 可恢复并聚焦主窗口 | PASS | `docs/spec/evidence/TASK-064-evidence.md` | Windows 原生 `WM_COMMAND` 验证通过 |
| TASK-064 | REQ-030-AC-004 | Unit | 停止托盘发生在 Wails Quit 之前 | PASS | `internal/platform/desktop_test.go` | 覆盖退出调用顺序与空钩子兼容性 |
| TASK-064 | REQ-030-AC-004 | Manual | Windows 托盘 Quit 完全退出应用 | PASS | 用户 2026-07-22 确认 | 托盘图标与应用进程正常退出 |
| TASK-064 | REQ-030-AC-010 | Static/Build | Windows 使用同一 OS 线程管理 HWND；macOS/Linux 保留外部循环 | PASS | `systray_runner_windows.go`、`systray_runner_other.go`、`wails build` | Windows 构建通过；跨平台实现按 build tag 隔离 |
| TASK-064 | REQ-030-AC-010 | Manual | macOS/Linux 原生托盘退出回归 | BLOCKED | — | 当前仅有 Windows 桌面环境；未伪造跨平台运行结果 |

## 结论

Windows 缺陷已修复并通过自动化与人工验收。macOS/Linux 不走 Windows HWND 路径，因此不存在相同根因；共享的异步回调和退出前清理也降低了消息循环重入风险，但仍需对应平台环境完成原生回归。
