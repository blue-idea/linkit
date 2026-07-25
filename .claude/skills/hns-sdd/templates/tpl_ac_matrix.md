# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-XXX-AC.md`
> 任务编号：{{TASK_ID}}
> 执行日期：{{DATE}}
> 执行人：{{EXECUTOR}}

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| {{TASK_ID}} | {{AC_ID}} | {{QA_TYPE}} | {{ACTUAL_RESULT}} | {{STATUS}} | {{EVIDENCE}} | {{ERROR_DETAIL}} |

---

## 填写说明

### QA 类型

| 值 | 含义 |
|----|------|
| `UI` | 界面视觉验收（需 Playwright 截图） |
| `API` | 接口验收（需 curl 输出） |
| `E2E` | 端到端流程验收（需截图） |
| `Unit` | 单元测试验收 |
| `Manual` | 人工验收 |

### 状态

| 值 | 含义 | 错误详情要求 |
|----|------|------------|
| `PASS` | 验收通过 | 填 `—` |
| `FAIL` | 验收失败 | **必须**填写实际值 vs 期望值差异及可能根因 |
| `BLOCKED` | 无法执行 | **必须**填写阻塞原因及依赖项 |

### 证据

- UI / E2E：截图文件名（如 `screenshot-001.png`）
- API：输出文件名（如 `curl-output.txt`）
- Unit：测试报告路径或覆盖率报告

---

## 示例行

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-001 | REQ-001-AC-001 | UI | 页面跳转耗时 1340ms，标题正确 | PASS | screenshot-001.png | — |
| TASK-001 | REQ-001-AC-004 | API | HTTP 200，JWT exp=+3600s | PASS | curl-output.txt | — |
| TASK-001 | REQ-001-AC-007 | E2E | 邮件未在 60s 内送达 | FAIL | — | 实际送达耗时 92s，超出 60s 阈值；怀疑 SMTP 队列延迟 |
| TASK-001 | REQ-001-AC-009 | Unit | 测试环境无法访问第三方 OAuth | BLOCKED | — | 依赖 TASK-003 完成 OAuth 配置后方可执行 |
