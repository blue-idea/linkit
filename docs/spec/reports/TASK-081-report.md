# TASK-081 测试报告

> 任务：REQ-010 / REQ-035 浏览器书签导入修正、metadata/AI 加速与递归删除
> 报告日期：2026-08-09
> 执行人：Codex

## 结论

TASK-081 的产品范围已完成。虚拟浏览器根扁平化、分类融合、metadata 补全、受控并发 AI、随机 Category 外观、favicon 优先、递归删除和本地 canonical 快照同步均通过自动化验收。真实第三方 AI 成功态和 Playwright MCP 截图分别因外部配置与工具运行环境缺失保持 BLOCKED，不以 mock 结果替代。

## 测试结果

| 层级 | 命令 | 实际结果 |
|---|---|---|
| React Unit/Component | `pnpm exec vitest run` | 108 个测试文件、465 个测试通过，Vitest 报告耗时 21.00s |
| Go 相关包 | `go test ./internal/metadata/... ./internal/ai/... -count=1` | `internal/metadata`、`internal/ai` 均通过 |
| TypeScript | `pnpm exec tsc --noEmit -p tsconfig.app.json` | 通过 |
| ESLint | `pnpm exec eslint src` | 通过 |
| Build | `pnpm build` | 通过（Vite 报告构建耗时 11.46s）；仅有既有 chunk size warning |
| Security | `pnpm exec node scripts/security-scan.mjs`（`core.quotePath=false` 临时环境） | 844 个 tracked files 检查通过，无 credential-like values |
| E2E | `pnpm exec playwright test tests/e2e/browser-bookmarks.spec.ts tests/e2e/category-crud.spec.ts --workers=1` | 9/9 通过，耗时约 33.2s |
| Visual | `pnpm exec playwright test tests/visual/settings-browser-bookmarks.spec.ts --workers=1` | 4/4 通过，耗时约 15.1s，Baseline/Actual/Diff 已保存 |
| 工作区门禁 | `git diff --check` | 通过 |

## 关键验收观察

- 虚拟根（Bookmarks Bar/Toolbar/Menu、Favorites Bar、Other/Mobile Bookmarks 及中文别名）不落为 Category；直属书签 `categoryId` 为根引用。
- 递归删除会删除子树书签并清理 Collection 引用。回归用例同时检查 `linkit.library.v1` 与 `lattice.library`，确认删除后不会由旧 canonical 快照恢复，重新导入同一 URL 显示 `1 new`。
- metadata 与 AI 各自最多 4 路并发，收集阶段不修改共享分类/标签状态，随后按导入顺序串行应用，避免重复 Tag/Category。
- 新 Category 的 icon/color 使用受控候选集随机选择；metadata 返回有效 HTTP(S) favicon 时优先保存，data URL 仅作临时输入。
- 导入进度对话框在 `saving`、`metadata`、`ai`、`complete` 阶段显示可访问进度条和 `completed / total`。

## 视觉与外部依赖

CLI Playwright 视觉回归已通过，证据包括：

- `docs/spec/evidence/TASK-079-settings-browser-bookmarks-general-en-{baseline,actual,diff}.png`
- `docs/spec/evidence/TASK-079-settings-browser-bookmarks-en-{baseline,actual,diff}.png`
- `docs/spec/evidence/TASK-079-settings-browser-bookmarks-zh-{baseline,actual,diff}.png`
- `docs/spec/evidence/TASK-081-settings-browser-bookmarks-progress-en-{baseline,actual,diff}.png`

Playwright MCP 实际截图调用 BLOCKED：启动器查找字面路径 `C:\Users\%USERNAME%\AppData\Local\ms-playwright\chromium-1200\...`，未展开当前用户路径，无法启动 Chromium。真实第三方 AI 同样 BLOCKED，因为 `docs/spec/info.md` 没有可用测试凭据。

## 发布建议

可以合并 TASK-081 分支并发布本地/浏览器兼容功能；后续若提供真实 AI 凭据或修复 MCP 浏览器路径，再补跑对应外部门禁即可。
