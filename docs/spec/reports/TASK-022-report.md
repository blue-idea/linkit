# TASK-022 测试报告

> 日期：2026-07-18  
> 任务：重构主窗口、快捷键、拖入 URL 与可访问性

## 范围

- REQ-024-AC-001~006、REQ-028-AC-004
- 测试类型：Unit + E2E（含 axe Security/a11y）

## 结果摘要

| 层级 | 命令 | 结果 |
|------|------|------|
| Unit | `vitest run src/features/shell` | 3 passed |
| E2E | `playwright test tests/e2e/app-shell.spec.ts` | 5 passed |
| 静态 | tsc / eslint / build | 零 error |
| axe | 主窗口壳扫描 | violations = [] |

## 质量结论

三栏布局壳、全局快捷键、Esc 层级、拖入 URL 与键盘可达性全部通过，TASK-022 可关闭。
