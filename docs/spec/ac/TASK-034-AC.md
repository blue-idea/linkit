# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-034-AC.md`  
> 任务编号：TASK-034  
> 执行日期：2026-07-18  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-034 | REQ-018-AC-001 | API + Unit | RerankSemanticSearch 仅返回候选内 ID；score∈[0,1]；本地候选最小字段 | PASS | `TestRerankSemanticSearch*`、Vitest semantic 5 | — |
| TASK-034 | REQ-018-AC-002 | E2E | AI 失败英文降级 + 关键词回退；不显示伪造语义分（无 %） | PASS | `关键词降级` E2E、`TASK-034-keyword-fallback.png` | — |
| TASK-034 | REQ-018-AC-003 | E2E | 空结果文案可见；Spotlight 内无 option、无外部链接推荐 | PASS | `语义搜索` E2E、`TASK-034-semantic-empty.png` | — |

---

## 命令与结果

```text
go test ./internal/ai/ -count=1
ok

pnpm --dir ui exec vitest run src/features/search/semantic
✓ 5 tests

pnpm --dir ui exec playwright test -g "语义搜索|关键词降级"
2 passed
```
