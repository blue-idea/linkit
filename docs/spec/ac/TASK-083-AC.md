# TASK-083 验收矩阵

> 文件路径：`docs/spec/ac/TASK-083-AC.md`
> 任务编号：TASK-083
> 执行日期：2026-08-09
> 状态：完成

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-083 | REQ-020-AC-008 | Unit | `resolveDuplicateKeep` / `findDuplicatePairs` 将更短 URL pathname 定向为 Keep | PASS | `duplicates.test.ts` | — |
| TASK-083 | REQ-020-AC-007 | Unit | `applyDuplicateBatch` 批量 merge 并跳过缺失书签对 | PASS | `duplicates.test.ts` | — |
| TASK-083 | REQ-020-AC-007 | Component | 列表支持勾选、Merge selected 与 Delete all | PASS | `OrganizerDialogs.test.tsx` | — |
| TASK-083 | REQ-020-AC-007 | E2E | 勾选 Merge selected 后剩 1 对；Merge all 后关闭列表 | PASS | `ai-organizer.spec.ts`、`TASK-083-duplicate-batch.png` | — |
| TASK-083 | REQ-020-AC-005 | E2E + Visual | 候选列表展示批量按钮与对数 | PASS | `TASK-083-duplicate-pairs.png` | — |

## TDD 记录

1. Red：短路径定向、批量应用与列表批量控件测试失败。
2. Green：实现 `resolveDuplicateKeep`、`applyDuplicateBatch` 与列表勾选/全部操作。
3. Refactor：候选对在扫描阶段即按 Keep 定向，批量复用既有决策命令。
