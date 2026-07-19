# AC 验收矩阵 — TASK-050

> 文件路径：`docs/spec/ac/TASK-050-AC.md`  
> 任务编号：TASK-050  
> 日期：2026-07-19  
> 状态：PASS

---

| TASK | AC ID | 测试类型 | 验收点 | 状态 | 证据 | 错误详情 |
|------|-------|----------|--------|:----:|------|----------|
| TASK-050 | REQ-012-AC-005 | Unit | 新建 Collection 时可打开 `Collection icon options` 候选菜单，选择 Rocket 后提交 `🚀` | PASS | `ui/src/features/collections/CollectionFormDialog.test.tsx` | — |
| TASK-050 | REQ-012-AC-005 | Unit | 编辑 Collection 时选择 Target 不立即提交，点击 Save 后提交 `🎯` | PASS | `ui/src/features/collections/CollectionFormDialog.test.tsx` | — |
| TASK-050 | REQ-012-AC-001 | E2E | 左侧栏新建主题时通过候选菜单选择 Emoji，保存后侧栏显示所选图标 | PASS | `ui/tests/e2e/collection-crud.spec.ts` | — |
| TASK-050 | REQ-012-AC-005 | E2E | 左侧栏编辑主题时通过候选菜单更换 Emoji，保存前旧图标仍显示，保存后显示新图标 | PASS | `ui/tests/e2e/collection-crud.spec.ts` | — |
| TASK-050 | REQ-012-AC-005 | Visual | Collection Emoji 候选菜单截图证据已生成 | PASS | `docs/spec/evidence/TASK-050-collection-emoji-menu.png` | — |
| TASK-050 | REQ-012-AC-005 | Visual | Playwright MCP 截图无法执行 | BLOCKED | — | MCP 浏览器启动时查找 `C:\Users\%USERNAME%\AppData\Local\ms-playwright\chromium-1200\chrome-win64\chrome.exe`，可执行文件不存在；已用 Playwright CLI E2E 与截图替代 |

---

## 结论

TASK-050 通过 Unit + E2E + CLI Visual 验收。Playwright MCP 截图为环境阻塞，不影响 CLI Playwright 已真实执行的行为与截图证据。
