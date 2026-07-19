# TASK-051 AC 验收矩阵

| AC ID | 场景 | 测试类型 | 状态 | 实际结果 | 证据 |
|------|------|:--------:|:----:|----------|------|
| REQ-006-AC-005 | 创建书签 URL 规范化后已存在时返回重复错误且不修改资料库 | Unit | PASS | `createBookmark` 返回 `BOOKMARK_URL_DUPLICATE`，未新增书签 | `pnpm --dir ui exec vitest run src/domain/commands/bookmarks.test.ts` |
| REQ-006-AC-005 | New Bookmark 输入重复 URL 后显示 warning 并停留在输入阶段 | E2E | PASS | 显示 `Bookmark URL already exists`，未出现 `Save bookmark` | `pnpm --dir ui exec playwright test tests/e2e/bookmark-crud.spec.ts --workers=1` |
| REQ-006-AC-004 | 有效非重复 URL 仍可进入预览并保存 | E2E | PASS | 既有书签新增流程继续通过 | `bookmark-crud.spec.ts` |
| REQ-006-AC-005 | warning UI 截图证据 | Visual | PASS | 截图显示 warning 对话框 | `docs/spec/evidence/TASK-051-duplicate-url-warning.png` |
| REQ-006-AC-005 | Playwright MCP 截图 | Visual | BLOCKED | MCP Chromium 可执行文件缺失，无法初始化浏览器 | `docs/spec/evidence/TASK-051-evidence.md` |
