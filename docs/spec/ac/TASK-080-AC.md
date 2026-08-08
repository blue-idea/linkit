# TASK-080 AC 验收矩阵

> 任务：fix_task 1.22：浏览器书签导入后 AI 分类与标签整理
> 日期：2026-08-09
> 状态：done（真实第三方 AI BLOCKED）

| TASK | REQ / AC | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|------|----------|:-------:|------------|:----:|------|---------|
| TASK-080 | REQ-035-AC-004 | Unit | 仅对本次浏览器导入新增书签执行 AI 整理；优先复用现有标签；每条书签最多 3 个唯一标签；AI 单条失败不抛错、不回滚已导入资料库 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts` | — |
| TASK-080 | REQ-006-AC-002 | Unit | 复用既有 `buildInboundMetadataPreview` / `enhanceInboundAnalysis` 两阶段链路，不引入第二套 AI DTO | PASS | `ui/src/features/import-export/browser-import-ai.ts`、`ui/src/features/ai/bookmark-analysis/inbound.ts` | — |
| TASK-080 | REQ-014-AC-003 | Unit | AI 建议标签优先匹配已有 `Tag`，仅在缺失时创建新标签，最终写入保持唯一且上限为 3；歧义候选不会误复用 | PASS | `ui/src/features/import-export/browser-import-ai.test.ts`、`ui/src/features/tags/suggested-tag-matching.ts` | — |
| TASK-080 | REQ-035-AC-002 / AC-003 | Component | 浏览器导入确认后，`SettingsDialog` 将“本次新增书签 ID”一并传给 `onImport`，为导入后 AI 整理提供精确范围 | PASS | `ui/src/components/SettingsDialog.browser-bookmarks.test.tsx` | — |
| TASK-080 | REQ-035-AC-004 | E2E | 导入成功先落库，再异步执行 AI 整理；AI 未配置时导入仍完成且不阻塞 | PASS | `ui/tests/e2e/browser-bookmarks.spec.ts`、`ui/src/features/import-export/browser-import-ai.test.ts` | — |
| TASK-080 | REQ-035-AC-004 | Static Gate | 全量 Vitest、`tsc --noEmit`、ESLint、Vite build 与 `go test ./internal/ai/...` 通过 | PASS | `docs/spec/evidence/TASK-080-evidence.md` | — |
| TASK-080 | REQ-035-AC-004 | Manual / Real AI | 真实第三方 AI 调用未执行；`docs/spec/info.md` 不提供可用测试凭据，按门禁保持 BLOCKED | BLOCKED | `docs/spec/evidence/TASK-080-evidence.md` | 缺少授权 API Base、Model 和 Key；不得以 Mock 或本地替身冒充真实成功态 |
| TASK-080 | REQ-035-AC-004 | Visual / Playwright CLI | Settings 浏览器导入入口与摘要的 English/中文/General Baseline、Actual、Diff 通过；AI 整理结果 toast 的 MCP 截图无法执行 | PASS | `ui/tests/visual/settings-browser-bookmarks.spec.ts`、`docs/spec/evidence/TASK-079-settings-browser-bookmarks-*.png` | AI toast 视觉路径由 MCP 阻塞，但浏览器导入视觉回归通过 |
| TASK-080 | REQ-035-AC-004 | Visual / Playwright MCP | MCP 固定访问 `C:\Users\%USERNAME%\...`，无法启动 Chromium | BLOCKED | `docs/spec/evidence/TASK-080-evidence.md` | 工具环境路径解析缺陷，不是应用运行时失败 |

## TDD 记录

- Red：新增 `browser-import-ai.test.ts`，先复现“未限定新增书签范围、未优先复用已有标签、标签数量失控、AI 失败可能影响导入”的缺口；追加用户编辑保护和标签歧义测试。
- Green：实现浏览器导入后 AI 整理协调器，仅对新增书签执行分类/标签写入；AI 错误不回滚已成功的导入落库。
- Refactor：提炼 `mergeBrowserImportAIResult`，仅合并 AI 分类与增量标签，避免异步结果整库覆盖用户在导入成功后的其他编辑。

## 结论

TASK-080 的导入后 AI 分类与标签整理已通过自动化验收，AI 不可用时的降级路径已验证。真实第三方 AI 与 Playwright MCP 视觉路径受环境门禁阻塞，均按规范保持 BLOCKED。
