# TASK-061 AC 矩阵

> 任务：托盘与快捷键跨平台验收（Win/mac + Linux best-effort）  
> 日期：2026-07-21  
> 状态：done

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-061 | REQ-030-AC-001 | Manual | OS 关闭隐藏、进程不退出 | PASS | 用户确认 J-17 | 选定平台：Windows（本机 `./scripts/dev.ps1`） |
| TASK-061 | REQ-030-AC-002 | Manual | 托盘图标与 Show/Quit | PASS | 用户确认 J-17 | — |
| TASK-061 | REQ-030-AC-003 | Manual | Show / 热键唤回并聚焦 | PASS | 用户确认 J-17 | — |
| TASK-061 | REQ-030-AC-004 | Manual | Quit 完全退出 | PASS | 用户确认 J-17 | — |
| TASK-061 | REQ-030-AC-005 | Manual | Ctrl+L 全局显隐 | PASS | 用户确认 J-17 | — |
| TASK-061 | REQ-030-AC-006~009 | Manual/E2E | Shortcuts 列表/改绑/冲突/恢复 | PASS | TASK-060 + 用户确认 | — |
| TASK-061 | REQ-030-AC-010 | Manual | Win/mac 惯例；Linux best-effort | PASS | 用户确认 J-17 | macOS 构建门禁由既有 CI 覆盖；Linux 不伪造 PASS |
| TASK-061 | REQ-027-AC-001 | Manual | 选定平台旅程 + 另一平台构建门禁 | PASS | 用户确认 + 既有 Wails CI | — |

`fix_task.md` 1.8 已勾选完成。
