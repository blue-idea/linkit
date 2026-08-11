# TASK-084 测试报告

> 任务：REQ-035 / TASK-084：浏览器书签导入移除 AI 后处理，仅保留 metadata 补全
> 报告日期：2026-08-11
> 执行人：Codex

## 结论

TASK-084 已完成并通过当前要求的验证。浏览器书签导入后不再触发 AI 后处理，只保留 metadata 补全、失败隔离、用户编辑基线保护与 metadata 进度上报。Unit、Component、E2E、Visual、TypeScript、ESLint 与 Vite build 均已真实通过。

## 测试结果

| 层级 | 命令 | 实际结果 |
|---|---|---|
| React Unit / Component | `pnpm --dir ui exec vitest run src/features/import-export/browser-import-ai.test.ts src/components/SettingsDialog.browser-bookmarks.test.tsx` | 2 个测试文件，14 个测试全部通过 |
| TypeScript | `pnpm --dir ui exec tsc --noEmit` | 通过 |
| ESLint | `pnpm --dir ui exec eslint src` | 通过 |
| Build | `pnpm --dir ui build` | 通过；仅有既有 chunk size warning |
| E2E | `pnpm --dir ui exec playwright test tests/e2e/browser-bookmarks.spec.ts --workers=1` | 4/4 通过 |
| Visual | `pnpm --dir ui exec playwright test tests/visual/settings-browser-bookmarks.spec.ts --workers=1` | 4/4 通过 |
| 工作区检查 | `git diff --check` | 通过；无空白错误 |

## 风险与说明

- 本次未修改浏览器 HTML 解析、分类路径合并和重复 URL 跳过逻辑，这些能力沿用 TASK-079 / TASK-081 的既有实现。
- Playwright 失败的根因已定位并修复在测试辅助层，而不是产品代码层。
- 当前未执行真实 AI 外部调用；这正是 TASK-084 的目标结果，而不是测试缺口。

## 发布建议

可以继续合并 TASK-084 的逻辑与测试变更。下一步建议把同类 `exact Linkit` 断言替换同步扩展到其余 E2E 套件的回归执行计划中，避免后续出现同类脆弱失败。