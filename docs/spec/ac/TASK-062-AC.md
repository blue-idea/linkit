# AC 验收矩阵（TASK-062）

> 任务编号：TASK-062  
> 需求：REQ-031-AC-002~005  
> 日期：2026-07-21

| TASK | AC | 测试类型 | 结论 | 证据 | 备注 |
|------|-----|----------|------|------|------|
| TASK-062 | REQ-031-AC-002 | Unit | PASS | `config/window_size_test.go`、`window_size_test.go`（settingsstore）、`library.test.ts`、`TASK-062-go-test.txt`、`TASK-062-vitest.txt` | 默认 medium=1280×800 |
| TASK-062 | REQ-031-AC-003 | Unit + Manual | PASS | `internal/platform/window_size_test.go`、J-18 用户 2026-07-21 | 真实 `WindowSetSize` |
| TASK-062 | REQ-031-AC-004 | Unit | PASS | `settingsstore/window_size_test.go` LaunchWindowSize、缺省合并 | — |
| TASK-062 | REQ-031-AC-005 | Unit + Manual | PASS | LaunchWindowSize 按档位；J-18 拖拽后重启仍按档位 | 用户 2026-07-21 |

## 命令与结果

```text
go test ./config ./internal/platform ./internal/settingsstore -count=1
→ ok（见 TASK-062-go-test.txt）

pnpm --dir ui exec vitest run src/config/window-size.test.ts src/domain/library.test.ts src/services/settings/settings.test.ts
→ 24 tests PASS（见 TASK-062-vitest.txt）
```
