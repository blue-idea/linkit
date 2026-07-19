# TASK-051 测试报告

## 范围

- 需求：REQ-006-AC-005、REQ-006-AC-004
- 任务：创建书签时 URL 规范化后唯一；重复时显示 warning 并阻止进入分析、确认或保存下一步。
- 主要实现：`ui/src/domain/commands/bookmarks.ts`、`ui/src/components/Dialogs.tsx`、`ui/src/App.tsx`

## 实现摘要

- 新增 `BOOKMARK_URL_DUPLICATE` 领域错误。
- 新增 `isBookmarkUrlDuplicate` helper，按规范化 URL key 去重并忽略尾部 `/` 差异。
- `NewBookmarkDialog` 在 Analyze/Enter 前检测重复 URL，显示 `Bookmark URL already exists` 并停留在输入阶段。
- `App.createBookmark` 保存入口保留重复 URL 兜底。

## 真实执行结果

| 命令 | 结果 |
|------|:----:|
| `pnpm --dir ui exec vitest run src/domain/commands/bookmarks.test.ts` | PASS |
| `pnpm --dir ui exec playwright test tests/e2e/bookmark-crud.spec.ts --workers=1` | PASS |
| `pnpm --dir ui exec vitest run src/domain/commands/bookmarks.test.ts src/features/bookmarks/batch-actions.test.ts src/features/bookmarks/analysis.test.ts` | PASS |
| `pnpm --dir ui exec vitest run` | PASS |
| `pnpm --dir ui typecheck` | PASS |
| `pnpm --dir ui lint` | PASS |
| `pnpm --dir ui build` | PASS，含既有 Vite chunk warning |
| Playwright MCP screenshot | BLOCKED |

## 质量评分

评分：94 / 100

扣分项：
- Playwright MCP 截图环境缺少 Chromium，无法执行 MCP 截图；已用 CLI Playwright 截图作为替代证据。
- 构建保留既有 Vite dynamic/static import warning，未在本任务范围内处理。
