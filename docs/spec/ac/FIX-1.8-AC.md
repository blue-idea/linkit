# AC 验收矩阵（fix_task 1.8）

> 任务编号：FIX-1.8  
> 执行日期：2026-07-21  
> 范围：关闭隐藏到托盘、Ctrl/Cmd+L 全局显隐、Settings→Shortcuts 可配置（Win/mac）

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| fix-1.8 | REQ-030-AC-001 | Unit | `ShouldPreventClose` 默认阻止退出；Quit 后放行 | PASS | `desktop_test.go`、`FIX-1.8-go-test.txt` | Manual OS 关闭见 J-17 |
| fix-1.8 | REQ-030-AC-002 | Unit | 托盘菜单含 Show/Quit | PASS | `menu_test.go` | Manual 托盘图标见 J-17 |
| fix-1.8 | REQ-030-AC-003 | Unit | Show/Hide/Toggle 调用窗口运行时 | PASS | `desktop_test.go` | Manual 唤回见 J-17 |
| fix-1.8 | REQ-030-AC-004 | Unit | QuitApplication 设置 allowQuit 并退出 | PASS | `desktop_test.go` | Manual Quit 见 J-17 |
| fix-1.8 | REQ-030-AC-005 | Unit | 默认 CmdOrCtrl+L；热键触发 Toggle | PASS | `hotkey/*_test.go`、`desktop_test.go` | Manual 全局热键见 J-17 |
| fix-1.8 | REQ-030-AC-006 | E2E | Settings→Shortcuts 列出九项含 Show/hide window | PASS | `settings-shortcuts.spec.ts`、`FIX-1.8-shortcuts-panel.png` | — |
| fix-1.8 | REQ-030-AC-007 | Unit | 改绑合并与持久化字段；保存同步桌面热键 | PASS | `shortcuts.test.ts`、`App.tsx` handleSaveSettings | — |
| fix-1.8 | REQ-030-AC-008 | Unit | 冲突拒绝并保持原绑定 | PASS | `shortcuts.test.ts` | — |
| fix-1.8 | REQ-030-AC-009 | Unit | 恢复默认回调默认映射 | PASS | `shortcuts.test.ts`、`ShortcutsPanel.test.tsx` | — |
| fix-1.8 | REQ-030-AC-010 | Unit | `GetDesktopCapability` 含 platform；Win/mac Mod 为 CmdOrCtrl | PASS | `desktop_test.go`、`accelerator_test.go` | Linux best-effort |
| fix-1.8 | REQ-030-AC-001~005 | Manual | J-17：OS 关闭隐藏、托盘 Show/Quit、Ctrl+L | PENDING | 桌面冒烟：`linkit.exe` 可启动并保持运行 | 等待用户确认交互项 |
| fix-1.8 | REQ-027-AC-001 | Manual | `wails build -platform windows/amd64` 产物可启动 | PASS | `build/bin/linkit.exe` 冒烟 pid 存活 | — |

---

## 测试命令与真实结果

```text
go test ./internal/hotkey ./internal/tray ./internal/platform -count=1
# ok hotkey / tray / platform

pnpm --dir ui exec vitest run src/features/shell/shortcuts.test.ts src/features/settings/ShortcutsPanel.test.tsx src/features/settings/settings-ui.test.ts src/domain/library.test.ts src/i18n/i18n.test.ts
# Test Files  5 passed / Tests  34 passed

pnpm --dir ui exec playwright test tests/e2e/settings-shortcuts.spec.ts --workers=1
# 1 passed

pnpm --dir ui lint
# 通过

pnpm --dir ui typecheck
# 通过

wails build -platform windows/amd64
# Built build/bin/linkit.exe；进程启动后保持运行（冒烟）
```

---

## 说明

本任务将曾误从 `main` reset 掉的 REQ-030 实现（原 `f302122`）恢复到 `feat/FIX-1.8-tray-shortcuts`。  
单元与 E2E、Windows 构建冒烟已通过；J-17 交互项（关闭隐藏 / 托盘 Show·Quit / Ctrl+L）待用户确认后勾选 `fix_task` 1.8 并合并 `main`。
