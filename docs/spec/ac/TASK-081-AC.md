# TASK-081 验收矩阵

> 任务：REQ-010 / REQ-035 浏览器书签导入修正、metadata/AI 加速与递归删除
> 日期：2026-08-09
> 状态：完成；真实第三方 AI 与 Playwright MCP 依赖按门禁标记 BLOCKED

| TASK | REQ / AC | 测试类型 | 实际结果 | 状态 | 证据 |
|---|---|---|---|:---:|---|
| TASK-081 | REQ-010-AC-005 | Unit + E2E | 递归删除会永久移除分类子树及其书签，并清理 Collection.bookmarkIds；删除后 canonical/legacy 本地快照均不再包含目标 URL，重新导入摘要为 `1 new · 0 skipped duplicates`。 | PASS | `ui/src/domain/categories/categories.test.ts`、`ui/src/features/categories/apply-category-command.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-003 | Unit + E2E | Chrome/Edge/Firefox 虚拟根不会创建 Linkit Category、不计入 folders；虚拟根直属书签落在根层，普通子文件夹从根层参与融合。 | PASS | `ui/src/features/import-export/browser-html.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-007 | Unit + Component + E2E | 每条新增书签尝试 metadata；成功时补全非空 title/description 和 HTTP(S) favicon，失败只隔离该条并保留导入结果；用户编辑基线优先。 | PASS | `ui/src/features/bookmarks/metadata-client.test.ts`、`ui/src/features/import-export/browser-import-ai.test.ts`、`ui/src/components/SettingsDialog.browser-bookmarks.test.tsx`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-008 | Unit + E2E | metadata 正文进入 AI 上下文；AI 未配置、未授权或单条失败不阻塞导入；现有 Tag 优先复用，每条最终最多 3 个唯一标签。 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-009 | Unit + E2E | Category 完整路径按 NFKC、trim、大小写不敏感生成 key；已有路径复用 ID，缺失路径才创建，现有书签关系保持不变。 | PASS | `ui/src/features/import-export/browser-html.test.ts`、`ui/src/features/import-export/browser-import-ai.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-010 | Component + E2E + Visual | Settings 导入对话框保持可见，暴露 `role="progressbar"`、阶段文本和 `completed / total`；metadata/AI 完成后才结束。 | PASS | `ui/src/components/SettingsDialog.browser-bookmarks.test.tsx`、`ui/tests/e2e/browser-bookmarks.spec.ts`、`ui/tests/visual/settings-browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-011 | Unit + Performance | metadata 与 AI 使用集中配置的受控 worker pool（上限 4）；并发请求不超过上限，结果按原始输入顺序串行合并，单条失败不阻塞其余条目。 | PASS | `ui/src/config/browser-bookmarks.ts`、`ui/src/features/import-export/browser-import-ai.test.ts` |
| TASK-081 | REQ-035-AC-012 | Unit + Component + E2E | 新 Category 的 icon/color 从受控候选集随机选择；有效 HTTP(S) favicon 优先覆盖 fallback，data URL 不作为正式 favicon 持久化。 | PASS | `ui/src/features/import-export/browser-html.test.ts`、`ui/src/features/import-export/browser-import-ai.test.ts`、`ui/tests/e2e/browser-bookmarks.spec.ts` |
| TASK-081 | REQ-035-AC-001~006 | E2E + Manual smoke | 浏览器 Netscape HTML 导出/导入、摘要确认、重复跳过和专有字段排除通过；Chrome 151.0.7922.76、Edge 145.0.3800.70、Firefox 151.0 smoke 证据沿用 TASK-079。 | PASS | `ui/tests/e2e/browser-bookmarks.spec.ts`、`docs/spec/evidence/TASK-079-evidence.md` |
| TASK-081 | 全部关联 AC | Static + Go | 108 个 Vitest 文件、465 个测试通过；TypeScript、ESLint、Vite build、Go metadata/AI 测试和 security scan（844 个 tracked files）通过。 | PASS | `docs/spec/evidence/TASK-081-evidence.md` |
| TASK-081 | REQ-035-AC-008 | Real third-party AI | `docs/spec/info.md` 未提供可用 API Base/Model/Key，未伪造真实成功态。 | BLOCKED | `docs/spec/evidence/TASK-081-evidence.md` |
| TASK-081 | REQ-035-AC-010 | Playwright MCP | MCP 截图调用固定查找未展开 `%USERNAME%` 的 Chromium 路径（`chromium-1200`），浏览器无法启动；CLI Playwright 视觉回归独立通过。 | BLOCKED | `docs/spec/evidence/TASK-081-evidence.md` |

## TDD 记录

1. Red：先观察并记录虚拟根误建 Category、递归删除残留书签、metadata/AI 并发为 1、固定 Category 外观及 canonical 快照滞后等失败。
2. Green：以最小改动加入虚拟根剥离、递归删除引用清理、worker pool、随机外观/favicon 优先和 canonical/legacy 同步保存。
3. Refactor：复用路径归一化、受控并发和外观配置辅助函数，保留现有失败隔离、基线保护、进度回调及标签上限。
