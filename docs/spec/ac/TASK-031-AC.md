# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-031-AC.md`  
> 任务编号：TASK-031  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-031 | REQ-019-AC-001 | Unit + E2E | API Base/Model 本机保存；Key 走 SecretStore；界面不回显明文 | PASS | E2E AI 设置、settings Zod 拒 apiKey | — |
| TASK-031 | REQ-019-AC-004 | Unit | `RedactSecrets` 去除 Bearer/sk/token 明文 | PASS | `TestRedactSecrets` | Manual 日志抽检以单元替代核心路径 |
| TASK-031 | REQ-019-AC-005 | Unit + E2E | 首次保存弹出授权说明；Cancel 不继续；确认后写入 consent | PASS | `TASK-031-ai-consent.png`、ai-consent 单测 | — |
| TASK-031 | REQ-019-AC-006 | Unit | API Base 变化清除不匹配 consent | PASS | `prepareSettingsForPersist`、`requiresAIConsent` | — |
| TASK-031 | REQ-025-AC-001 | Manual | 无硬编码密钥；`.env` 已忽略；Key 仅经 SecretStore | PASS | 代码审查 + go-keyring 适配 | — |
| TASK-031 | REQ-025-AC-002 | Unit + E2E | Library/设置载荷不含 apiKey；前端仅 configured 状态 | PASS | Zod 拒绝 apiKey、E2E 空输入框 + configured 文案 | — |
