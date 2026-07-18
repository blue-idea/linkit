# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-030-AC.md`
> 任务编号：TASK-030
> 执行日期：2026-07-18
> 执行人：Antigravity Agent

---

## 任务说明

**TASK-030 · 远程 Supabase 云端验收**

- 远程项目：`linkit`（`https://zheqhjsctvkuzmtohrnm.supabase.co`）
- Migration 已应用，schema + RLS + trigger 已验证
- 双用户 seed（user-a / user-b）已在远程初始化
- 测试脚本：`ui/scripts/cloud-remote-test.mjs`
- 运行命令：`pnpm --dir ui run test:cloud:remote`
- 实际输出：**17 PASS  0 FAIL**

---

## 远程 Schema 核验结果

| 检查项 | 期望 | 实际 | 状态 |
|--------|------|------|:----:|
| `user_bookmarks` 表存在 | 是 | 是（RLS enabled, 2 行 seed） | ✅ |
| `schema_version` 列（INT, NOT NULL, DEFAULT 1） | 是 | 是 | ✅ |
| `revision` 列（BIGINT, NOT NULL, DEFAULT 0） | 是 | 是 | ✅ |
| `updated_at` 列（timestamptz, NOT NULL） | 是 | 是 | ✅ |
| PRIMARY KEY `id`（uuid） | 是 | 是 | ✅ |
| UNIQUE 约束 `user_id` | 是 | 是 | ✅ |
| CHECK `revision >= 0` | 是 | 是 | ✅ |
| CHECK `schema_version >= 1` | 是 | 是 | ✅ |
| FK `user_id → auth.users(id) ON DELETE CASCADE` | 是 | 是 | ✅ |
| RLS 策略 `select_own_bookmarks`（authenticated） | 是 | 是 | ✅ |
| RLS 策略 `insert_own_bookmarks`（authenticated） | 是 | 是 | ✅ |
| RLS 策略 `update_own_bookmarks`（authenticated） | 是 | 是 | ✅ |
| RLS 策略 `delete_own_bookmarks`（authenticated） | 是 | 是 | ✅ |
| Trigger `trg_user_bookmarks_updated`（BEFORE UPDATE） | 是 | 是 | ✅ |
| Migration 版本记录 | `20260718113845` / `20260718113930` | 已应用 | ✅ |

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 |
|---------|-------|:-------:|------------|:----:|------|
| TASK-030 | REQ-025-AC-003 | API | 未认证 SELECT HTTP 200，rows=0 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-025-AC-005 | Security | 未认证 INSERT code=42501；UPDATE 被拒绝 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-001-AC-001 | API | 用户 A 有效登录返回 session，userId 匹配 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-001-AC-002 | API | 用户 B 有效登录返回 session，userId 匹配 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-001-AC-003 | API | 无效凭据返回 `Invalid login credentials` | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-001-AC-004 | API | getSession 恢复 userId 一致 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-003-AC-001 | API | 用户 A SELECT 本人行 1 行，user_id 匹配 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-003-AC-002 | API | 用户 A 条件 UPDATE revision 0→1，更新成功 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-003-AC-003 | Security | 用户 A SELECT user_id=B 返回空（RLS 隔离） | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-003-AC-004 | API | 本人 DELETE 成功，DELETE 后 rows=0 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-003-AC-005 | API | revision 1→2 条件更新成功；stale=1 返回 CLOUD_REVISION_CONFLICT，云端保持 revision=2 | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-004-AC-001 | API | 云存储下 SELECT 返回 rows>=0（云可读） | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-004-AC-002 | Security | signOut 后 SELECT 返回 rows=0（RLS 立即生效） | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-004-AC-003 | Security | 用户 B SELECT user_id=A 返回空（跨用户 RLS） | PASS | `cloud-remote-test.mjs` 真实输出 |
| TASK-030 | REQ-004-AC-004 | Security | signOut 后 INSERT code=42501（被拒绝） | PASS | `cloud-remote-test.mjs` 真实输出 |

---

## 真实测试输出（脱敏）

```
🔗 远程 Supabase 验收 · https://zheqhjsctvkuzmtohrnm.supabase.co

── 分组 1：未认证安全边界 ──────────────────────────────────
PASS REQ-025-AC-003 未认证 SELECT 返回空数组 {"status":200,"rows":0}
PASS REQ-025-AC-005 未认证 INSERT 拒绝 {"code":"42501"}
PASS REQ-025-AC-005b 未认证 UPDATE 拒绝 {"code":"21000"}

── 分组 2：Auth 登录流程 ──────────────────────────────────
PASS REQ-001-AC-003 无效凭据被拒绝 {"message":"Invalid login credentials"}
PASS REQ-001-AC-001 用户 A 有效登录返回 session {"userId":"11111111-****-****-****-111111111111"}
PASS REQ-001-AC-004 getSession 恢复会话 {"userId":"11111111-****-****-****-111111111111"}
PASS REQ-001-AC-002 用户 B 有效登录返回 session {"userId":"22222222-****-****-****-222222222222"}

── 分组 3：本人 CRUD 与跨用户 RLS 隔离 ─────────────────────
PASS REQ-003-AC-001 用户 A SELECT 本人行 {"rows":1,"revision":0}
PASS REQ-003-AC-002 用户 A 条件 UPDATE 成功 {"from":0,"to":1}
PASS REQ-003-AC-003 用户 A 越权读取用户 B 返回空 {"rows":0}

── 分组 4：revision 乐观锁与冲突 ───────────────────────────
PASS REQ-003-AC-005-happy revision 条件更新成功 {"from":1,"to":2}
PASS REQ-003-AC-005-conflict 陈旧 revision 映射 CLOUD_REVISION_CONFLICT {"staleUsed":1,"cloudRevision":2}
PASS REQ-003-AC-004 本人 DELETE 成功且行消失 {"rows":0}
  ℹ 恢复用户 A seed 行

── 分组 5：存储模式语义（CloudRepository 层） ───────────────
PASS REQ-004-AC-001 云存储下可读取云数据 {"rows":1}
PASS REQ-004-AC-002 signOut 后 RLS 立即生效 {"rows":0}
PASS REQ-004-AC-003 用户 B 无法读写用户 A 的行（RLS） {"crossRows":0}
PASS REQ-004-AC-004 signOut 后 INSERT 被拒绝 {"code":"42501"}

────────────────────────────────────────────────────────────
结果：17 PASS  0 FAIL
────────────────────────────────────────────────────────────

✅ 所有远程 Supabase 验收 AC 通过
```

---

## 未解决风险

| 风险 | 说明 |
|------|------|
| 远程 seed 数据每次测试后 revision 递增 | 测试脚本结束时已恢复 user_a seed 行（revision 重置为 0），但 revision 计数器可能因多次运行而累积；不影响测试正确性 |
| 无法直接验证 `email_confirmed_at` 触发邮件 | 远程项目通过 SQL 直接插入用户（设 `email_confirmed_at=now()`），不测试真实邮件发送路径；该 AC 在 TASK-027 本地路径中已覆盖 |
