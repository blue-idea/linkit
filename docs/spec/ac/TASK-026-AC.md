# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-026-AC.md`  
> 任务编号：TASK-026  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-026 | REQ-003-AC-002 | API | 用户 A 登录后可读本人行并完成 revision 条件更新；HTTP 200 | PASS | `docs/spec/evidence/TASK-026-supabase-rls-output.txt`、`ui/scripts/supabase-rls-api-test.mjs` | — |
| TASK-026 | REQ-003-AC-003 | API | 用户 A 按用户 B 的 user_id 查询返回空数组；HTTP 200 | PASS | 同上 | — |
| TASK-026 | REQ-025-AC-003 | API/Security | 未认证 SELECT 返回空数组；HTTP 200，无数据泄露 | PASS | 同上；pgTAP `user_bookmarks_rls_test.sql` | — |
| TASK-026 | REQ-025-AC-004 | API | 当前仓库尚无自建 HTTP API / Edge Function 限流入口 | BLOCKED | — | 依赖后续自建 API 或 Edge Function；本 TASK 仅覆盖 RLS 与权限基线 |
| TASK-026 | REQ-025-AC-005 | API/Security | 未认证 INSERT 返回 `permission denied for table user_bookmarks`；数据未写入 | PASS | `docs/spec/evidence/TASK-026-supabase-rls-output.txt` | — |

---

## 环境与产物

| 项 | 值 |
|----|----|
| 本地 API | `http://127.0.0.1:54321` |
| 远程项目 | `linkit` / `zheqhjsctvkuzmtohrnm`（ap-southeast-1） |
| Migration | `supabase/migrations/20260715112414_create_user_bookmarks.sql` |
| Seed | `supabase/seed.sql`（本地）；远程已执行等价双用户初始化 |
| 生成类型 | `ui/src/database.types.ts` |
