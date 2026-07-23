# AC 验收矩阵（TASK-074）

> 任务编号：TASK-074  
> 执行日期：2026-07-23  
> 范围：fix_task 1.16-1.18：一级分类入口、左右侧栏快捷键拆分、托盘双击显示窗口

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-074 | REQ-010-AC-002 | E2E | 当前选中分类后点击“收藏分类”标题 `+`，新分类仍以一级分类创建，根节点 `padding-left=12px` | PASS | `ui/tests/e2e/category-crud.spec.ts`、`docs/spec/evidence/TASK-074-root-category-create.png` | — |
| TASK-074 | REQ-024-AC-003 | E2E | `CmdOrCtrl+/` 切换左侧 Sidebar；`CmdOrCtrl+\` 切换右侧 Detail Panel；视图快捷键保持可用 | PASS | `ui/tests/e2e/app-shell.spec.ts`、`docs/spec/evidence/TASK-022-shortcut-matrix.json` | — |
| TASK-074 | REQ-030-AC-006 | Unit + E2E | Shortcuts 分区列出 `Toggle left sidebar`、`Toggle right sidebar` 与 `Show / hide window` | PASS | `ui/src/features/shell/shortcuts.test.ts`、`ui/src/features/settings/ShortcutsPanel.test.tsx`、`ui/tests/e2e/settings-shortcuts.spec.ts`、`docs/spec/evidence/TASK-074-shortcuts-panel.png` | — |
| TASK-074 | REQ-030-AC-007 | Unit | 新快捷键映射可合并、持久化并在重启恢复；旧 `toggleSidebar` 配置自动迁移到右侧栏动作 | PASS | `ui/src/domain/library.test.ts`、`ui/src/features/auth/persist-ui-settings.test.ts` | — |
| TASK-074 | REQ-030-AC-011 | Unit | 托盘宿主暴露双击回调分发，Windows/macOS 构建路径可编译并通过 Go 测试 | PASS | `internal/tray/menu_test.go`、`go test ./internal/tray ./internal/platform ./internal/settingsstore -count=1` | — |
| TASK-074 | REQ-030-AC-011 | Manual | 真实 Windows/macOS 托盘图标双击显示窗口 | BLOCKED | — | 当前回合未在真实原生桌面进程执行；未伪造 PASS |

---

## 测试命令与真实结果

```text
pnpm --dir ui exec vitest run src/components/Sidebar.category-label.test.tsx src/features/shell/shortcuts.test.ts src/features/settings/ShortcutsPanel.test.tsx src/features/auth/persist-ui-settings.test.ts src/domain/library.test.ts
# Test Files  5 passed (5)
# Tests  32 passed (32)

go test ./internal/tray ./internal/platform ./internal/settingsstore -count=1
# ok internal/tray
# ok internal/platform
# ok internal/settingsstore

pnpm --dir ui typecheck
# exit 0

pnpm --dir ui lint
# exit 0

pnpm --dir ui exec playwright test ui/tests/e2e/category-crud.spec.ts -g "当前选中分类时，收藏分类标题加号" --workers=1
# 1 passed

pnpm --dir ui exec playwright test ui/tests/e2e/app-shell.spec.ts -g "快捷键 shall 打开 New Bookmark、Insights、Settings 并切换视图与左右侧栏" --workers=1
# 1 passed

pnpm --dir ui exec playwright test ui/tests/e2e/settings-shortcuts.spec.ts -g "设置中列出 Shortcuts 分区与全部快捷键" --workers=1
# 1 passed
```
