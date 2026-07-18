# 测试报告（Test Report）

> 文件路径：`docs/spec/reports/TASK-026-report.md`  
> 参考方法论：`phases/qa_engine.md` §第8阶段  
> 版本 / Sprint / 发布：TASK-026  
> 报告日期：2026-07-18  
> 执行人：Auto

---

## 摘要

- **状态：** ⚠️ 风险通过（核心 RLS AC 全过；REQ-025-AC-004 限流 BLOCKED）
- **测试运行：** 17 | **通过：** 17 | **失败：** 0 | **跳过/阻塞 AC：** 1（限流）
- **覆盖率：** 本 TASK 为 API/Security 集成，不以行覆盖率为门禁
- **持续时间：** 本地 reset ≈34s；`test:supabase` ≈3–6s

---

## 质量评分（本 TASK 切片）

| 维度 | 权重 | 得分 | 备注 |
|------|:---:|:---:|------|
| 关键路径覆盖率 | 20% | 18 | 本人 CRUD / 跨用户 / 未认证读写均真实执行 |
| 安全测试覆盖率 | 10% | 9 | RLS + 权限基线；顾问 WARN 已修 search_path |
| 文档 | 5% | 5 | AC / evidence / report 齐全 |
| 自动化比例 | 10% | 10 | pgTAP + Node PostgREST 脚本 |
| **本切片加权观感** | — | **高** | 可进入 TASK-027 |

---

## 关键发现

### 致命（阻塞发布）

无。

### 高（需跟踪）

| ID | 说明 | 处置 |
|----|------|------|
| REQ-025-AC-004 | 无自建 API/Edge Function 限流实现 | 保持 BLOCKED，待后续 API 任务 |
| Auth leaked password protection | 远程 Auth 未开启 HaveIBeenPwned 检查 | 记录顾问建议，非本 TASK 门禁 |

### 已修复

- `set_user_bookmarks_updated_at` 的 mutable `search_path`（本地 migration + 远程 follow-up migration）

---

## 测试分层结果

| 层级 | 结果 | 命令 |
|------|:----:|------|
| pgTAP DB | PASS 13/13 | `supabase test db` |
| PostgREST API | PASS 4/4 | `pnpm --dir ui test:supabase` |
| 远程 schema/seed | PASS | Supabase MCP `list_tables` + `execute_sql` |

---

## 结论

TASK-026 本地 Supabase 环境、migration、seed、类型生成与 RLS 真实验证完成；远程 `linkit` 项目已创建并初始化。建议下一步执行 **TASK-027 · Supabase Auth 与注册分支**。
