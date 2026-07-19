# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-040-AC.md`  
> 任务编号：TASK-040  
> 执行日期：2026-07-19  
> 执行人：Auto

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-040 | REQ-025-AC-001 | Security + Manual | 626 个版本控制及新增文件无 OpenAI Key、JWT 或私钥形态值；真实环境文件处于 Git ignored；Supabase 测试 key 改由环境变量读取 | PASS | `security-scan.mjs`、`test-env.test.mjs` | — |
| TASK-040 | REQ-025-AC-002 | Unit + Security | Settings、LibraryData、云 Repository 与导出测试均拒绝或排除 API Key；截图二进制模式扫描 0 命中；日志脱敏测试通过 | PASS | `test:security`、`internal/secretstore/service_test.go`、`internal/platform/native_file_test.go` | — |
| TASK-040 | REQ-025-AC-003 | API + Security | 远程未认证 SELECT 返回 HTTP 200 与空数组，无用户记录 | PASS | `test:cloud:remote`：17 PASS / 0 FAIL | — |
| TASK-040 | REQ-025-AC-004 | Architecture + Security | 当前无自建入站 HTTP API 或 Edge Function，仅有桌面出站客户端；条件攻击面不存在，未伪造 429 响应 | PASS | `main.go` 绑定清单、`docs/spec/api.md` 接口清单 | — |
| TASK-040 | REQ-025-AC-005 | API + Security | 远程未认证 INSERT/UPDATE 被 RLS 拒绝；复查后数据未变化 | PASS | `test:cloud:remote`：错误码 42501/21000 | — |
| TASK-040 | 依赖漏洞门禁 | Security | Go toolchain 1.26.5、x/net v0.55.0 下 govulncheck 0 漏洞；pnpm audit 0 已知漏洞 | PASS | `govulncheck`、`pnpm audit` 实际输出 | — |
| TASK-040 | 破坏性操作门禁 | Unit + API | 删除、导入覆盖、存储切换与云冲突在未确认/失败时保持原数据 | PASS | Vitest 57 PASS、Go 相关套件 PASS | — |

## 命令与真实结果

```text
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
No vulnerabilities found.

pnpm --dir ui audit --audit-level high（registry.npmjs.org）
No known vulnerabilities found

pnpm --dir ui test:security
Node 2 passed；Secret Scan 626 files / 0 findings；Vitest 57 passed

pnpm --dir ui run test:cloud:remote
17 PASS；0 FAIL

go test ./...
PASS
```
