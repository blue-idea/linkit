# TASK-082 验收矩阵

> 文件路径：`docs/spec/ac/TASK-082-AC.md`
> 任务编号：TASK-082
> 执行日期：2026-08-09
> 状态：完成；Playwright MCP 不可用，视觉证据以 CLI Playwright 截图为准

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-082 | REQ-020-AC-005 | Unit + Component | `findDuplicatePairs` 返回全部 URL/同域名候选对；`DuplicatePairsDialog` 展示重复对数并可选择某一对 | PASS | `duplicates.test.ts`、`OrganizerDialogs.test.tsx` | — |
| TASK-082 | REQ-020-AC-005 | E2E + Visual | Find duplicates 先打开候选列表并显示 `1 duplicate pair found`；确认前无资料库修改 | PASS | `ai-organizer.spec.ts`、`TASK-082-duplicate-pairs.png` | — |
| TASK-082 | REQ-020-AC-003 | E2E + Visual | 从列表进入差异预览后展示 Exact URL match 与 Merge/Delete/Cancel | PASS | `TASK-035-duplicate-diff.png`、`ai-organizer.spec.ts` | — |
| TASK-082 | REQ-020-AC-004 | Unit | Merge/Delete 保持标签与主题关系一致且无悬空引用 | PASS | `duplicates.test.ts` | — |
| TASK-082 | REQ-020-AC-006 | E2E | 两对候选时显示 `2 duplicate pairs found`；Delete 一对后列表刷新为 `1 duplicate pair found`；最后一对 Merge 后关闭列表 | PASS | `ai-organizer.spec.ts`、`TASK-082-duplicate-pairs-multi.png` | — |
| TASK-082 | Visual | Playwright MCP | 当前会话无 Playwright MCP server，无法执行 MCP 截图 | BLOCKED | CLI 截图已留存 | MCP server `user-Playwright` 不可用 |

## TDD 记录

1. Red：`findDuplicatePairs` / `DuplicatePairsDialog` 缺失导致 Vitest 失败。
2. Green：实现候选对扫描、列表对话框与 App 两阶段编排。
3. Refactor：统一 URL 规范化匹配函数，复用既有差异预览与决策命令。
