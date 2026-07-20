# TASK-056 AC 矩阵

> 任务：全界面 UI 语言与设置对齐
> 日期：2026-07-20
> 状态：done

| TASK | REQ / AC | test_type | 期望 | 结果 | 证据 | 备注 |
|------|----------|-----------|------|:----:|------|------|
| TASK-056 | REQ-023-AC-004 | Unit + E2E | 无设置或 English 设置下，默认 UI、`html[lang]`、设置入口和主界面文案保持 English | PASS | `ui/src/i18n/i18n.test.ts`、`ui/src/i18n/use-i18n.test.tsx`、`ui/tests/e2e/settings-i18n.spec.ts`、`ui/tests/e2e/ui-language-alignment.spec.ts`、`TASK-056-en-main-*.png` | — |
| TASK-056 | REQ-023-AC-005 | Unit + E2E | 切换中文后 Chrome、Settings、主界面、代表性对话框和无障碍名称同步显示中文并持久化 | PASS | `ui/src/i18n/i18n.test.ts`、`ui/tests/e2e/settings-i18n.spec.ts`、`ui/tests/e2e/ui-language-alignment.spec.ts`、`TASK-056-zh-new-bookmark-*.png` | — |
| TASK-056 | REQ-023-AC-006 | Unit | 设置和命令错误通过稳定 key 本地化，缺失键安全回退 English | PASS | `ui/src/i18n/i18n.test.ts`、`ui/src/services/settings/settings.test.ts`、`pnpm --dir ui test:coverage` | — |
| TASK-056 | REQ-023-AC-008 | Unit + E2E + Visual | 导航、视图、对话框、表单、空态、状态标签、Toast 与无障碍名称跟随所选语言；用户自定义内容保持原样 | PASS | `ui/src/i18n/ui-language-audit.test.ts`、`ui/tests/e2e/ui-language-alignment.spec.ts`、`ui/tests/visual/ui-language-alignment.spec.ts`、`TASK-056-mcp-login.png` | 全量 E2E 87 passed / 6 skipped / 0 failed |

## 结论

REQ-023-AC-004、REQ-023-AC-005、REQ-023-AC-006、REQ-023-AC-008 全部通过，无 FAIL 或 BLOCKED。
