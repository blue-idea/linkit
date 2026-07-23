# TASK-074 测试报告

> 任务：fix_task 1.16-1.18  
> 日期：2026-07-23  
> 结论：代码与自动化验收通过；原生托盘双击 Manual 保持 `BLOCKED`

## 变更范围

- 修正左侧“收藏分类”标题 `+` 的父级回退逻辑，仅影响该入口。
- 将快捷键动作拆分为 `toggleLeftSidebar` / `toggleRightSidebar`，同步更新默认值、Schema、设置面板、持久化与旧配置迁移。
- 新增托盘双击显示窗口回调，接入 Windows/macOS 托盘实现。
- 补上 `main.go` 的托盘双击接线缺口，确保双击与 `Ctrl+L` 复用同一条 `ShowMainWindow` 显示路径。

## 已执行验证

- Vitest：32/32 通过。
- Go：`internal/tray`、`internal/platform`、`internal/settingsstore` 通过。
- Go full suite：`go test ./... -count=1` 通过。
- TypeScript typecheck：通过。
- ESLint：通过。
- Playwright：3 个定向回归通过。

## 未完成项

- `REQ-030-AC-011` 的真实 Windows/macOS 托盘双击 Manual 未在本回合执行，状态 `BLOCKED`。

## 风险说明

- 本次修复解决的是应用层回调未接线问题；真实 Windows 托盘双击仍需在原生桌面环境做一次 Manual 验收，确认不同双击节奏下行为一致。
- macOS 原生托盘实现使用 `popUpStatusItemMenu:` 打开菜单，当前编译仅产生 deprecation warning，不影响测试通过；后续若升级 AppKit 约束，建议改成非弃用菜单弹出方式。
