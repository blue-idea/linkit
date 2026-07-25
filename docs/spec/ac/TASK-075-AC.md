# AC 验收矩阵（TASK-075）

> 任务编号：TASK-075
> 执行日期：2026-07-25
> 范围：新建书签元数据优先、AI 后台增强、快速 favicon 路径与过期请求保护

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-075 | REQ-006-AC-001 | Component + E2E | Smart/Enter 在元数据返回后立即进入可编辑 review，Save 可用且确认前 `onCreate` 为 0 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`、`new-bookmark-entry-modes.spec.ts` | — |
| TASK-075 | REQ-006-AC-003 | Unit + Component | AI 超时、无绑定或元数据失败时保留可用的元数据/手动预览，并显示稳定英文降级文案 | PASS | `bookmark-analysis.test.ts`、`metadata-client.test.ts`、`NewBookmarkDialog.entry-modes.test.tsx` | — |
| TASK-075 | REQ-006-AC-006 | Unit + Component | `FetchMetadataFast` 返回 favicon URL 而不抓取二进制；旧 `FetchMetadata` 仍返回 data URL；OpenGraph 标题/描述优先 | PASS | `internal/metadata/service_test.go`、`metadata-client.test.ts`、`bookmark-analysis.test.ts` | — |
| TASK-075 | REQ-006-AC-009 | Component + E2E | Manual 只调用元数据且 AI 次数为 0；Smart 与 Enter 各调用一次 AI；关闭/重开后旧结果失效 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`、`new-bookmark-entry-modes.spec.ts` | — |
| TASK-075 | REQ-006-AC-011 | Component | AI 延迟时先显示元数据标题/描述和可访问的 `AI enhancement in progress` 状态；用户编辑标题、原值标题和标签后均不被覆盖 | PASS | `NewBookmarkDialog.entry-modes.test.tsx`（13/13） | — |
| TASK-075 | REQ-006-AC-011 | E2E | 真实浏览器旅程验证 Manual → Smart → Enter；元数据计数 `{1,2,3}`、AI 计数 `{0,1,2}`，AI 解析后才更新标题 | PASS | `ui/tests/e2e/new-bookmark-entry-modes.spec.ts`（1 passed） | — |
| TASK-075 | REQ-028-AC-004 | Visual（CLI） | Baseline/Actual/Diff 已生成；最新差异 1,027 像素，`pixelDiffRatio=0.0037124060`，低于 0.08 阈值 | PASS | `TASK-075-metadata-first-baseline.png`、`TASK-075-metadata-first-actual.png`、`TASK-075-metadata-first-diff.png`、`TASK-075-metadata-first-diff-metric.txt` | — |
| TASK-075 | REQ-028-AC-004 | Visual（Playwright MCP） | MCP 无法启动浏览器，未执行 MCP 页面截图验收 | BLOCKED | — | MCP 配置指向不存在的 `C:\Users\%USERNAME%\AppData\Local\ms-playwright\chromium_headless_shell-1200`；需修正浏览器缓存路径或安装对应 Chromium |

---

## 测试命令与真实结果

```text
pnpm --dir ui exec vitest run src/components/NewBookmarkDialog.entry-modes.test.tsx src/features/ai/bookmark-analysis/bookmark-analysis.test.ts src/features/bookmarks/metadata-client.test.ts --reporter=dot
# Test Files 3 passed (3); Tests 30 passed (30)

pnpm --dir ui exec vitest run --reporter=dot
# Test Files 98 passed (98); Tests 386 passed (386)

pnpm --dir ui test:coverage --reporter=dot
# Test Files 98 passed (98); Tests 386 passed (386)
# V8 total: lines 78.98%, branches 78.46%, functions 76.65%

go test ./internal/metadata -count=1
# ok github.com/blue-idea/collection/internal/metadata

go test ./... -count=1
# all Go packages passed; scripts/check-identity has no test files

go vet ./...
# exit 0

pnpm --dir ui typecheck
# exit 0

pnpm --dir ui lint
# exit 0

pnpm --dir ui build
# built successfully; existing chunk-size warning remains

pnpm --dir ui exec playwright test tests/e2e/new-bookmark-entry-modes.spec.ts --workers=1
# 1 passed (5.4s)
```

## TDD 记录

- Red（本轮竞态保护补强）：组件套件 13 个用例中 2 个失败，分别暴露“改回元数据原值的标题被覆盖”和“已编辑标签仍被追加”的真实缺陷。
- Green：加入显式 dirty 字段跟踪、标签 `aria-pressed` 和仅对未编辑字段的 AI 合并后，13/13 通过。
- Refactor：保留两阶段元数据/AI 编排，统一请求 ID 失效规则，并移除 E2E 对 TASK-071 旧 Actual 截图的写入副作用。
