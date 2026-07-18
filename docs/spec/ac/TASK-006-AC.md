# AC 验收矩阵 — TASK-006

> 任务编号：TASK-006
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-006 | REQ-002-AC-002 | Unit/API + E2E | Go 服务已验证 revision 原子保存、`.bak`、损坏正式文件恢复信号及失败回滚 | BLOCKED | `docs/spec/evidence/TASK-006-evidence.md`、`internal/localstore/service_test.go`、`internal/localstore/atomic_test.go` | 完整“修改收藏后重启恢复资料库与设置”E2E 仍依赖 TASK-007、TASK-010 的设置服务、启动装配和桌面旅程 |
| TASK-006 | REQ-003-AC-004 | Unit/API + E2E | dirty 云草稿可原子保存，网络/服务失败所需的本机恢复副本不会被清理，公开错误消息保持稳定英文且不泄露路径 | BLOCKED | `docs/spec/evidence/TASK-006-evidence.md`、`internal/localstore/service_test.go`、`internal/localstore/errors_test.go` | 真实云保存失败、英文同步错误 UI 和重试调度依赖 TASK-028、TASK-029 |
| TASK-006 | REQ-003-AC-005 | Unit/API + E2E | dirty 草稿清理门禁、备份提交失败回滚和 revision 基础契约已通过 | BLOCKED | `internal/localstore/atomic_test.go`、`internal/localstore/service_test.go` | Use Cloud Copy、Overwrite Cloud、Cancel 对话框及自动保存暂停行为依赖 TASK-029 |
| TASK-006 | REQ-027-AC-003 | Unit/API + E2E | 短写、同步、重命名、备份和无效根路径失败均返回稳定英文错误；正式文件和备份保持可恢复且不返回成功结果 | BLOCKED | `docs/spec/evidence/TASK-006-evidence.md`、`internal/localstore/atomic_test.go` | Go 持久化层已通过；UI 不显示成功状态和英文错误呈现仍依赖 TASK-010 及同步 UI 接入 |

---

## 结论

TASK-006 的 Go Service、Wails 绑定、原子资料库、恢复信号和云草稿门禁全部通过任务级 Unit/API 验收。关联需求均为跨层 E2E AC，尚未实现的 UI 与启动/云同步部分保持 `BLOCKED`，不得误报为完整 PASS。
