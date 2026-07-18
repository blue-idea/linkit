# AC 验收矩阵 — TASK-007

> 任务编号：TASK-007
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-007 | REQ-019-AC-001 | Unit + E2E | Go/TS 均拒绝 `apiKey` 字段；AI Base/Model 与主题等偏好可原子写入 `settings.json` | BLOCKED | `docs/spec/evidence/TASK-007-evidence.md`、`internal/settingsstore/service_test.go`、`ui/src/services/settings/settings.test.ts` | 设置页 UI 保存与英文校验提示仍依赖 TASK-023；密钥写入 Keychain 依赖 TASK-031 |
| TASK-007 | REQ-019-AC-006 | Unit | API Base 变化时 Go `WriteSettings` 与前端 `prepareSettingsForPersist` 均清除不匹配 consent；`GetAIConsentStatus` 返回未授权 | PASS | `internal/settingsstore/service_test.go`、`ui/src/services/settings/settings.test.ts` | — |
| TASK-007 | REQ-023-AC-003 | Unit + E2E | 四主题枚举可通过 Schema；`ocean`/`sunset` 等偏好可往返持久化 | BLOCKED | `ui/src/services/settings/settings.test.ts`、`internal/settingsstore/service_test.go` | 主题应用到全部主要界面与重启后视觉恢复依赖 TASK-023 |
| TASK-007 | REQ-023-AC-004 | Unit + E2E | 无设置文件时返回正式默认值且 `locale=en` | BLOCKED | `internal/settingsstore/service_test.go`、`ui/src/services/settings/settings.test.ts` | 主界面导航英文呈现依赖 TASK-010/TASK-023 启动装配与 i18n |
| TASK-007 | REQ-023-AC-005 | Unit + E2E | locale `en`/`zh` 可作为可持久化字段通过校验 | BLOCKED | `internal/settingsstore/validation_test.go`、`ui/src/domain/schemas.ts` | English/中文切换与缺译回退 UI 依赖 TASK-023 |
| TASK-007 | REQ-023-AC-006 | Unit | `localizeSettingsError('SETTINGS_INVALID','zh')` 返回中文文案并保留英文 key | PASS | `ui/src/services/settings/settings.test.ts` | — |

---

## 结论

TASK-007 的 Go `settingsstore`、前端 settings 服务、默认值、损坏恢复、consent 失效与错误键本地化均已通过任务级 Unit 验收。跨层 E2E AC 保持 `BLOCKED`，待设置 UI 与启动流程接入后关闭。
