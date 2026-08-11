# TASK-084 验收矩阵

> 任务：REQ-035 / TASK-084：浏览器书签导入移除 AI 后处理，仅保留 metadata 补全
> 日期：2026-08-11
> 状态：done

| TASK | REQ / AC | 测试类型 | 实际结果 | 状态 | 证据 |
|---|---|---|---|:---:|---|
| TASK-084 | REQ-035-AC-003 | Unit + Component + E2E | 浏览器书签导入仍保持“仅追加新书签、重复 URL 跳过”的导入契约；确认摘要、取消零副作用和确认后追加行为均通过自动化验证。 | PASS | `ui/src/components/SettingsDialog.browser-bookmarks.test.tsx`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-084 | REQ-035-AC-007 | Unit + E2E | 每条新导入书签仍会尝试 metadata 补全；metadata 失败仅隔离当前书签，不影响其他导入项。 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-084 | REQ-035-AC-008 | Unit | 即使提供 AI client 也不会发起 `analyzeBookmark`；metadata 结果不会修改分类或标签，也不会新增标签。 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts` |
| TASK-084 | REQ-035-AC-009 | N/A | 本次实现未改变浏览器 HTML 解析与分类路径合并逻辑，沿用 TASK-079 / TASK-081 的既有实现。 | PASS | `ui/src/features/import-export/browser-html.ts`、`docs/spec/ac/TASK-081-AC.md` |
| TASK-084 | REQ-035-AC-010 | Unit + Component + E2E + Visual | 导入进度仅暴露 `saving`、`metadata`、`complete` 三个阶段；不再出现 `ai` 阶段文案，Settings 导入摘要与进度视觉回归通过。 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts`、`ui/src/components/SettingsDialog.browser-bookmarks.test.tsx`、`ui/tests/e2e/browser-bookmarks.spec.ts`、`ui/tests/visual/settings-browser-bookmarks.spec.ts` |
| TASK-084 | REQ-035-AC-011 | Unit | metadata 补全继续使用受控并发 worker pool，测试确认并发度大于 1 且不超过配置上限。 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts` |
| TASK-084 | REQ-035-AC-012 | Unit + E2E | metadata 仍只持久化有效 HTTP(S) favicon，且用户在导入后即时编辑的标题、描述、favicon 不会被异步结果覆盖。 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-084 | REQ-035 关联静态门禁 | Static | TypeScript、ESLint、Vite build 均通过；`git diff --check` 无空白错误。 | PASS | `docs/spec/evidence/TASK-084-evidence.md` |

## TDD 记录

1. Red：先修改 `ui/src/features/import-export/browser-import-ai.test.ts`，让“即使提供 AI client 也不发起 AI 请求”“进度阶段不再出现 ai”“metadata 不得覆盖分类/标签”的断言真实失败。
2. Green：重写 `ui/src/features/import-export/browser-import-ai.ts` 的导入后处理流程，只保留 metadata 获取、合并、失败隔离与进度上报。
3. Refactor：同步收口 `ui/src/features/import-export/index.ts`、`ui/src/features/import-export/restore.ts`、`ui/src/App.tsx`、`ui/src/i18n/catalogs.ts`，并把 Playwright 本地模式入口断言改成 `banner[name="Top bar"]`，移除对精确文本 `Linkit` 的脆弱依赖。