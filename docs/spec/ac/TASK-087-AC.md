# TASK-087 验收矩阵

> 任务：REQ-011 / TASK-087：批量操作栏增加全选（Select all）与取消全选（Deselect all）选项
> 日期：2026-09-21
> 状态：done

| TASK | REQ / AC | 测试类型 | 实际结果 | 状态 | 证据 |
|---|---|---|---|:---:|---|
| TASK-087 | REQ-011-AC-006 | Unit | `computeSelectAllIds`、`computeDeselectAllIds`、`isAllVisibleSelected` 纯函数精确计算可视书签与集合差集并去重，5 个测试全部通过。 | PASS | `ui/src/features/collections/compose/selection.test.ts` |
| TASK-087 | REQ-011-AC-006 | Component | ContentArea 批量工具栏中展示全选/取消全选按钮，点击全选选中全部可视书签，点击取消全选取消全部，计数精确更新，2 个组件测试全部通过。 | PASS | `ui/src/components/ContentArea.select-all.test.tsx` |
| TASK-087 | REQ-011-AC-006 | Static / Audit | 文案集中注册到 `i18n/catalogs.ts`（`content.selectAll` / `content.deselectAll`），通过硬编码门禁与 TypeScript 严格类型检查。 | PASS | `ui/src/i18n/ui-language-audit.test.ts`、`pnpm typecheck` |
| TASK-087 | REQ-011-AC-006 | Visual / Playwright | 实际界面渲染验证：在已选择书签时展示全选按钮并截图，一键全选全部 9 个卡片后按钮平滑切换为取消全选且计数联动，截图保存留证。 | PASS | `docs/spec/evidence/TASK-087-select-all-partial.png`、`docs/spec/evidence/TASK-087-select-all-full.png` |

## TDD 记录

1. Red：在 `ui/src/features/collections/compose/selection.test.ts` 中编写测试，断言 `isAllVisibleSelected`、`computeSelectAllIds`、`computeDeselectAllIds`，亲眼见证 3 项失败。
2. Green：在 `ui/src/features/collections/compose/selection.ts` 中实现纯函数，测试全部变绿（5 passed）。
3. Red：在 `ui/src/components/ContentArea.select-all.test.tsx` 中编写组件测试，验证全选按钮渲染与点击交互，亲眼见证 2 项失败。
4. Green：在 `ui/src/components/ContentArea.tsx` 中增加全选/取消全选按钮并在 `ui/src/App.tsx` 中绑定状态更新，在 `i18n/catalogs.ts` 中增加国际化词条，组件测试全部变绿（2 passed）。
5. Static：运行 `pnpm typecheck` 与全量 505 个 Vitest 测试全部通过。
6. Visual：通过 Playwright MCP 访问开发服务器，捕获部分选择与全选状态高保真截图并留存证据。
