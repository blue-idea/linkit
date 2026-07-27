# TASK-077 AC 验收矩阵

> 任务：Settings → AI 接口连通性测试
> 日期：2026-07-27
> 状态：done（真实第三方成功态 BLOCKED）

| TASK | REQ / AC | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|------|----------|:-------:|------------|:----:|------|---------|
| TASK-077 | REQ-033-AC-001 | Unit + API | Go `Client.TestConnection` 使用 Keychain Key、最小固定提示和当前 Base/Model；不读取收藏、不调用 consent；返回 `status=ok`、非负耗时与 UTC 时间。前端对 DTO 执行严格 Zod 校验，并在配置变化时拒绝旧请求结果回写 | PASS | `internal/ai/client_test.go`、`internal/ai/service_test.go`、`ui/src/features/settings/ai-connection.test.ts`、`ui/src/components/SettingsDialog.ai-connection.test.tsx` | — |
| TASK-077 | REQ-033-AC-001 | API（真实第三方） | 使用 `docs/spec/info.md` 配置调用生产 `Client.TestConnection` 路径，第三方服务返回 `AI_UNAUTHORIZED` | BLOCKED | `docs/spec/evidence/TASK-077-evidence.md` | 测试凭据被第三方拒绝；依赖有效测试 Key 后补充真实成功态，不得用 Mock 替代 |
| TASK-077 | REQ-033-AC-002 | Component + E2E | API Base、Model 或 Key 缺失时按钮禁用并显示英文提示；组件与 E2E 均确认外部调用次数为 0 | PASS | `ui/src/components/SettingsDialog.ai-connection.test.tsx`、`ui/tests/e2e/settings-ai-connection.spec.ts` | — |
| TASK-077 | REQ-033-AC-003 | Unit + E2E | 未授权、超时、限流、网络失败映射为稳定状态；Wails 字符串错误可归一化；失败前后设置与资料库保持原值 | PASS | `internal/ai/client_test.go`、`ui/src/features/settings/ai-connection.test.ts`、`ui/tests/e2e/settings-ai-connection.spec.ts` | — |
| TASK-077 | REQ-033-AC-001~003 | Visual + Security | Settings 成功态 Baseline/Actual 通过，Diff 507 像素（0.12113%）；截图不含真实 Key 或用户收藏内容；安全扫描与 97 条相关回归通过 | PASS | `TASK-077-ai-connection-success-actual.png`、`TASK-077-ai-connection-success-diff.png`、`TASK-077-ai-connection-success-mcp-2026-07-27T00-21-37-376Z.png` | — |

## TDD 记录

- Red：先执行 Go、适配器、组件和 E2E 失败测试；代码审查发现异步竞态后，再新增两条延迟 Promise 测试，真实复现旧结果回写和新 Key 草稿丢失。
- Green：实现最小连接测试路径、严格 DTO、Settings 状态；增加请求版本门禁和 Key 草稿条件清理后，目标 Vitest 10/10 通过。
- Refactor：复用既有 URL、Keychain、超时、重试和错误映射；共享 HTTP 门禁；固定探针文案集中到 `config/ai.go`。

## 结论

REQ-033 三条 AC 的产品行为与错误路径均通过自动化验收。真实第三方成功态因测试凭据被拒绝保持 `BLOCKED`，已保留实际返回结果与解除条件。
