# AC 验收矩阵 — TASK-009

> 任务编号：TASK-009
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-009 | REQ-006-AC-001 | API + E2E | `FetchMetadata` 对有效 HTTP(S) 返回标题/描述/纯文本预览字段，不落库 | BLOCKED | `docs/spec/evidence/TASK-009-evidence.md`、`internal/metadata/service_test.go` | New Bookmark 分析确认 UI 依赖 TASK-011 |
| TASK-009 | REQ-006-AC-002 | API | 页面可获取时返回非空 title/description/contentText；AI 建议字段不在本服务范围 | BLOCKED | `internal/metadata/service_test.go` | 标题/摘要/分类/标签 AI 建议依赖 TASK-032/033 |
| TASK-009 | REQ-006-AC-003 | API + E2E | 抓取失败返回 `METADATA_FETCH_FAILED`；危险 URL 返回 `URL_INVALID`，不产生伪造成功结果 | BLOCKED | `internal/metadata/service_test.go` | 英文降级提示与手动表单 UI 依赖 TASK-011 |
| TASK-009 | REQ-008-AC-002 | Unit + E2E | `OpenExternalURL` 成功返回 nil；失败返回 `EXTERNAL_OPEN_FAILED`；不安全协议不调用浏览器 | BLOCKED | `internal/platform/external_url_test.go` | visitCount/lastVisitedAt 更新依赖 TASK-012 前端命令 |
| TASK-009 | REQ-025-AC-001 | Manual/Unit | 新增代码无硬编码密钥；网络配置集中在 `config/network.go`；请求不附带 Cookie/AI Key | PASS | `config/network.go`、`internal/metadata/httpclient.go`、`internal/metadata/service.go` | — |

---

## 结论

TASK-009 的 MetadataService 与 OpenExternalURL 安全门禁已通过任务级 API/Unit 验收。跨层书签/访问计数 E2E AC 保持 `BLOCKED`。
