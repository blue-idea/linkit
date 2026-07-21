# AC 验收矩阵（TASK-063）

> 任务编号：TASK-063  
> 需求：REQ-031-AC-001、REQ-031-AC-006、REQ-023-AC-001  
> 日期：2026-07-21

| TASK | AC | 测试类型 | 结论 | 证据 | 备注 |
|------|-----|----------|------|------|------|
| TASK-063 | REQ-031-AC-001 | E2E | PASS | `settings-window-size.spec.ts`、`TASK-063-window-size-en.png` | — |
| TASK-063 | REQ-031-AC-006 | Unit + E2E | PASS | `i18n.test.ts`、中文 E2E、`TASK-063-window-size-zh.png` | — |
| TASK-063 | REQ-023-AC-001 | E2E | PASS | Appearance 分区仍可发现且含窗口大小 | — |
| TASK-063 | REQ-031-AC-003~005 | Manual | PASS | J-18；用户 2026-07-21 确认（`./scripts/dev.ps1`） | 保存立即缩放、重启按档位、拖拽不单独记忆 |

## 命令与结果

```text
pnpm --dir ui exec vitest run src/i18n/i18n.test.ts src/features/shell/desktop-window-size.test.ts
→ 10 tests PASS

pnpm --dir ui exec playwright test tests/e2e/settings-window-size.spec.ts --workers=1
→ 2 passed

pnpm --dir ui typecheck / lint → PASS
```
