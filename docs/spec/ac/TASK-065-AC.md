# TASK-065 AC 矩阵

> 任务：托盘 Show 替换为 Settings
> 日期：2026-07-22
> 状态：done

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-065 | REQ-030-AC-002 | Unit | 托盘菜单第一项为 `Settings`，第二项仍为 `Quit` | PASS | `internal/tray/menu_test.go` | 两项菜单数量与顺序保持不变 |
| TASK-065 | REQ-030-AC-003 | Unit | Settings 事件订阅使用固定事件名并可取消 | PASS | `ui/src/features/shell/tray-settings.test.ts` | 复用共享 Wails 事件适配器 |
| TASK-065 | REQ-030-AC-003 | Manual | 隐藏窗口后点击 Settings，窗口恢复且设置弹窗打开 | PASS | `TASK-065-tray-settings.png` | Windows 正式构建原生 `WM_COMMAND` 路径 |
| TASK-065 | REQ-030-AC-004 | Static | Quit 业务代码与退出清理代码无修改 | PASS | Git diff 审查 | `QuitApplication`、`systray_runner_windows.go` 无差异 |
| TASK-065 | REQ-030-AC-004 | Manual | 托盘第二项 Quit 仍完全退出进程 | PASS | `docs/spec/evidence/TASK-065-evidence.md` | 原生命令 ID 2，进程在 10 秒内退出 |

## 结论

托盘 Show 已替换为 Settings，且 Settings 会显示窗口并打开设置弹窗。Quit 的业务实现保持不变，自动化原生回归正常退出。
