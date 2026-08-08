# TASK-079 AC 验收矩阵

> 任务：REQ-035 / TASK-079：浏览器书签 HTML 导入导出契约与 Settings 集成
> 日期：2026-08-09
> 状态：done（Playwright MCP 视觉门禁 BLOCKED）

| TASK | REQ / AC | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|------|----------|:-------:|------------|:----:|------|---------|
| TASK-079 | REQ-035-AC-001 | Unit | 导出为 Netscape Bookmark HTML；仅包含文件夹与书签必需字段，不包含 `notes`、`tags`、`aiSuggestedTags` 等 Linkit 私有字段 | PASS | `ui/src/features/import-export/browser-html.test.ts` | — |
| TASK-079 | REQ-035-AC-002 | Component | Settings → General 中可触发浏览器书签导入；导入后先显示摘要，确认前不调用 `onImport` | PASS | `ui/src/components/SettingsDialog.browser-bookmarks.test.tsx` | — |
| TASK-079 | REQ-035-AC-003 | Unit + Component | 浏览器文件夹映射为 `Category` 层级；重复 URL 按规范化 URL 跳过并统计 `skipped duplicates`；确认后仅追加非重复书签 | PASS | `ui/src/features/import-export/browser-html.test.ts`、`ui/src/components/SettingsDialog.browser-bookmarks.test.tsx` | — |
| TASK-079 | REQ-035-AC-003 | E2E | 取消导入保持零副作用；确认后新增书签落库并绑定导入文件夹 Category；全重复批次不触发持久化 | PASS | `ui/tests/e2e/browser-bookmarks.spec.ts`、`docs/spec/evidence/TASK-079-browser-import-summary-actual.png` | — |
| TASK-079 | REQ-035-AC-005 | Component | 非法 HTML 导入显示稳定错误 `Import file is invalid`，不修改当前资料库或设置 | PASS | `ui/src/components/SettingsDialog.browser-bookmarks.test.tsx` | — |
| TASK-079 | REQ-035-AC-006 | Unit + Security | 导出的 HTML 兼容主流浏览器导入约定，且不泄露无关字段 | PASS | `ui/src/features/import-export/browser-html.test.ts` | — |
| TASK-079 | REQ-035-AC-001~006 | Manual / Browser smoke | 同一 Netscape HTML 在 Chrome `151.0.7922.76`、Edge `145.0.3800.70`、Firefox `151.0` 中由浏览器实际解析；三者均完成导出、导入摘要、确认和 Category 落库 | PASS | `docs/spec/evidence/TASK-079-chrome-export.html`、`TASK-079-edge-export.html`、`TASK-079-firefox-export.html` 及对应 `*-import-summary.png` | — |
| TASK-079 | REQ-035-AC-001~006 | Static Gate | `tsc --noEmit`、定向 `eslint` 与 `pnpm --dir ui build` 全部通过 | PASS | `docs/spec/evidence/TASK-079-evidence.md` | — |
| TASK-079 | REQ-035-AC-001~006 | Visual / Playwright CLI | English、中文和 General Settings Baseline/Actual/Diff 像素比较通过（`bbox=None`） | PASS | `ui/tests/visual/settings-browser-bookmarks.spec.ts`、`docs/spec/evidence/TASK-079-settings-browser-bookmarks-*.png` | — |
| TASK-079 | REQ-035-AC-001~006 | Visual / Playwright MCP | MCP 固定查找字面路径 `C:\Users\%USERNAME%\AppData\Local\ms-playwright\...`，无法启动浏览器 | BLOCKED | `docs/spec/evidence/TASK-079-evidence.md` | 工具环境路径解析缺陷，不是应用运行时失败 |

## TDD 记录

- Red：先补 `browser-html.test.ts` 与 `SettingsDialog.browser-bookmarks.test.tsx`，复现 HTML 互通、摘要确认、重复跳过、全重复零副作用和非法文件反馈缺口。
- Green：新增浏览器书签 HTML 构建/解析模块、Settings 按钮与隐藏文件输入、导入摘要对话框分支和下载工具复用；全重复批次直接结束确认流程，不触发持久化。
- Refactor：将浏览器书签常量集中到 `ui/src/config/browser-bookmarks.ts`，将下载逻辑抽到 `downloadTextFile`，并复用统一导入确认对话框，避免重复实现。

## 结论

TASK-079 的导入导出契约、Settings 集成、重复 URL 跳过、全重复零副作用和错误降级已通过自动化验收。CLI 视觉回归与 Chrome/Edge/Firefox 真实 smoke 通过；Playwright MCP 环境缺陷仍如实记录为 BLOCKED。
