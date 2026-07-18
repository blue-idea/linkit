# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-028-AC.md`  
> 任务编号：TASK-028  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-028 | REQ-003-AC-001 | Unit | dirty draft 写入与成功清理已具备；UI Cloud badge / 防抖保存接线属后续前端任务 | BLOCKED | `cloud-draft-sync.test.ts` | UI 防抖与 Cloud 状态徽章未在本 TASK 接线；依赖 TASK-029 / 存储协调 |
| TASK-028 | REQ-003-AC-002 | Unit + API | 本人 load/create/save；session user_id 二次检查；revision API 回归可读 | PASS | `cloud.test.ts`、`TASK-028-revision-api-output.txt` | — |
| TASK-028 | REQ-003-AC-003 | API | 跨用户空结果由既有 RLS 套件覆盖，本任务未改 RLS | PASS | `supabase-rls-api-test.mjs`（TASK-026） | — |
| TASK-028 | REQ-003-AC-004 | Unit | 云失败抛错、保留 dirty cloud draft；不返回伪成功 | PASS | `cloud-draft-sync.test.ts` | UI 英文错误条展示属后续接线；Repository 层契约已满足 |
| TASK-028 | REQ-003-AC-005 | Unit + API | 零行更新映射 `CLOUD_REVISION_CONFLICT`；真实 PostgREST 验证 | PASS | `cloud.test.ts`、`TASK-028-revision-api-output.txt` | 冲突对话框 UI 属 TASK-029 |
| TASK-028 | REQ-027-AC-002 | Unit | 云失败不丢弃草稿数据，本地可重试 | PASS | `cloud-draft-sync.test.ts` | — |
| TASK-028 | REQ-027-AC-003 | Unit | 失败路径抛出 `RepositoryError`，无成功返回 | PASS | `cloud.test.ts`、`cloud-draft-sync.test.ts` | — |
