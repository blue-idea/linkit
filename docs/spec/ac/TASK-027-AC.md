# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-027-AC.md`  
> 任务编号：TASK-027  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-027 | REQ-001-AC-001 | API + E2E | seed 用户登录返回 session；E2E 进入主界面并显示邮箱 | PASS | `TASK-027-auth-api-output.txt`、`auth.spec.ts` | — |
| TASK-027 | REQ-001-AC-002 | E2E | 新邮箱注册后直接进入主界面（本地 confirmations=false） | PASS | `auth.spec.ts` | — |
| TASK-027 | REQ-001-AC-003 | API + E2E + Unit | 无效凭据映射 `Invalid login credentials`，停留认证页 | PASS | API/E2E/login-screen 测试 | — |
| TASK-027 | REQ-001-AC-004 | API + E2E | getSession 恢复；刷新后仍在主界面 | PASS | API + `会话恢复` E2E | — |
| TASK-027 | REQ-001-AC-005 | E2E | 既有 startup-gate / local-startup loading 门仍通过 | PASS | `startup-gate.test.ts`、`local-startup.spec.ts` | — |
| TASK-027 | REQ-001-AC-006 | Unit | `email_confirmation_required` → Check your email UI | PASS | `auth-flow.test.ts`、`login-screen.test.tsx` | 本地 CLI 默认直接发 session，E2E 无独立无 session 环境 |
| TASK-027 | REQ-002-AC-003 | API + E2E | signOut 清会话；本机书签仍可在本地模式恢复 | PASS | API + `退出登录` E2E | — |
