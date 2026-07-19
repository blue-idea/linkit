# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-039-AC.md`  
> 任务编号：TASK-039  
> 执行日期：2026-07-19  
> 执行人：Auto

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-039 | REQ-022-AC-002 | API + Unit + E2E | 手动扫描使用受限 HTTP Client，按指纹和响应状态归类 ok/changed/broken；并发上限、取消、逐项进度和最终事件通过测试，结果字段写回资料库 | PASS | `service_test.go`、`health.test.ts`、Playwright `链接健康` | — |
| TASK-039 | REQ-022-AC-003 | E2E | 页面加载和打开对话框后请求计数均为 0；只有点击 Start scan 后才产生请求，UI 明示 Manual scan only | PASS | `health-scan.spec.ts`、`TASK-039-health-scan.png` | — |
| TASK-039 | REQ-022-AC-004 | E2E | Updated 与 Broken 侧栏显示实时计数，选择后只呈现对应 health 书签 | PASS | `health-scan.spec.ts` | — |

## 视觉回归

| 场景 | Baseline | 实际截图 | 比较结果 |
|------|----------|----------|----------|
| 手动健康扫描完成 | `ui/tests/e2e/health-scan.spec.ts-snapshots/TASK-039-health-scan.png` | `docs/spec/evidence/TASK-039-health-scan.png` | PASS，像素差异在 5% 门限内 |

## 命令与真实结果

```text
go test ./internal/health/... -cover
PASS；coverage 86.8%

pnpm --dir ui exec vitest run src/features/health
3 passed

pnpm --dir ui exec playwright test tests/e2e/health-scan.spec.ts --workers=1
1 passed

pnpm --dir ui typecheck
PASS

pnpm --dir ui lint
PASS

pnpm --dir ui build
PASS
```
