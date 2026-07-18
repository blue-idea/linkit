# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-032-AC.md`  
> 任务编号：TASK-032  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-032 | REQ-019-AC-002 | API | Chat Completions 使用配置的 Base/Model/Key；凭据仅发往配置 Base | PASS | `TestChatCompletionsHappyPathUsesConfiguredBaseModelAndKey` | — |
| TASK-032 | REQ-019-AC-003 | API | 401/403→`AI_UNAUTHORIZED` 不重试；429/5xx 有限重试；超时→`AI_TIMEOUT`；无效 JSON→`AI_RESPONSE_INVALID` | PASS | Unauthorized/Forbidden/RateLimit/5xx/Timeout/InvalidJSON 测试 | — |
| TASK-032 | REQ-019-AC-004 | Security | 错误消息不含 API Key；传输错误经 `RedactSecrets` | PASS | Unauthorized 泄漏断言 + `mapTransportError` | — |
| TASK-032 | REQ-019-AC-005 | API + Security | 未授权时 `AI_CONSENT_REQUIRED` 且 HTTP hits=0 | PASS | `TestChatCompletionsRequiresConsentBeforeNetwork` | — |
| TASK-032 | REQ-027-AC-002 | API | 外部 AI 失败返回可识别错误码，不静默成功；客户端与本地能力解耦 | PASS | 失败路径全映射为 AppError；`go test ./...` 回归绿 | — |

---

## 命令与覆盖率

```text
go test ./internal/ai/... -count=1 -cover
ok  github.com/blue-idea/collection/internal/ai  coverage: 80.0% of statements

go test ./... -count=1
ok  (all packages)
```
