# TASK-050 测试报告

> 日期：2026-07-19  
> 任务：Collection Emoji 候选图标菜单  
> 状态：PASS

---

## 范围

- 左侧栏新建 Collection 时可通过候选 Emoji 菜单选择主题图标。
- 左侧栏编辑 Collection 时可通过同一菜单更换主题图标。
- 保留 name、color、description 保存语义，编辑时保存前不提交变更。

## 结果

| 层级 | 命令 | 结果 |
|------|------|:----:|
| RED | `pnpm --dir ui exec vitest run src/features/collections/CollectionFormDialog.test.tsx` | FAIL，缺少 `Choose collection icon` 按钮 |
| Unit | `pnpm --dir ui exec vitest run src/features/collections/CollectionFormDialog.test.tsx` | PASS，2 tests |
| E2E / Visual | `pnpm --dir ui exec playwright test tests/e2e/collection-crud.spec.ts --workers=1` | PASS，4 tests |
| Regression | `pnpm --dir ui exec vitest run src/features/collections/CollectionFormDialog.test.tsx src/features/collections/apply-collection-command.test.ts src/domain/collections/collections.test.ts` | PASS，3 files / 12 tests |
| Typecheck | `pnpm --dir ui typecheck` | PASS |
| Lint | `pnpm --dir ui lint` | PASS |
| Build | `pnpm --dir ui build` | PASS，存在既有 Vite chunk warning |
| Full Unit | `pnpm --dir ui exec vitest run` | PASS，67 files / 268 tests |

## 风险

- Playwright MCP 截图因 MCP 浏览器可执行文件路径异常为 `BLOCKED`；CLI Playwright 已完成页面截图与 E2E 验证。
- Vite build 的 2 条 chunk warning 与本次变更无关，后续可单独整理动态/静态导入边界。

## 质量评分

| 维度 | 分数 | 说明 |
|------|:---:|------|
| 需求覆盖 | 25/25 | REQ-012-AC-005 与 REQ-012-AC-001 覆盖 |
| 测试覆盖 | 25/25 | RED、Unit、相关回归、全量 Vitest、E2E、CLI Visual 均已执行 |
| 工程质量 | 23/25 | 候选 Emoji 集中在 `config/collection-icons.ts`，表单菜单封装复用创建/编辑路径；仍存在既有 build warning |
| 验收证据 | 20/25 | CLI 证据完整；MCP screenshot BLOCKED |
| **总分** | **93/100** | PASS |
