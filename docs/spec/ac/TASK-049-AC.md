# AC 验收矩阵 — TASK-049

> 文件路径：`docs/spec/ac/TASK-049-AC.md`  
> 任务编号：TASK-049  
> 日期：2026-07-19  
> 状态：PASS

---

| TASK | AC ID | 测试类型 | 验收点 | 状态 | 证据 | 错误详情 |
|------|-------|----------|--------|:----:|------|----------|
| TASK-049 | REQ-017-AC-005 | Unit | Spotlight 搜索结果按 Enter 确认时调用 `onOpenDirectly`，不调用详情定位 `onSelect`，并关闭 Spotlight | PASS | `ui/src/components/Spotlight.test.tsx` | — |
| TASK-049 | REQ-017-AC-003 | Unit | 鼠标点击搜索结果仍调用 `onSelect` 并关闭 Spotlight，保持详情定位行为 | PASS | `ui/src/components/Spotlight.test.tsx` | — |
| TASK-049 | REQ-008-AC-002 | Unit | `visitBookmark` 保证外部打开成功后才记录 visitCount / lastVisitedAt | PASS | `ui/src/features/bookmarks/visit.test.ts` | — |
| TASK-049 | REQ-017-AC-005 | E2E | 在真实页面中搜索 React 并按 Enter 后，`https://react.dev` 被直接打开，Spotlight 关闭，详情面板仍停留在原书签 | PASS | `ui/tests/e2e/spotlight.spec.ts` | — |
| TASK-049 | REQ-017-AC-005 | Visual | Spotlight 搜索结果高亮态截图证据已生成 | PASS | `docs/spec/evidence/TASK-049-spotlight-direct-open.png` | — |
| TASK-049 | REQ-017-AC-005 | Visual | Playwright MCP 截图无法执行 | BLOCKED | — | MCP 浏览器启动时查找 `C:\Users\%USERNAME%\AppData\Local\ms-playwright\chromium-1200\chrome-win64\chrome.exe`，可执行文件不存在；已用 Playwright CLI E2E 与截图替代 |

---

## 结论

TASK-049 通过 Unit + E2E + CLI Visual 验收。Playwright MCP 截图为环境阻塞，不影响 CLI Playwright 已真实执行的行为与截图证据。
