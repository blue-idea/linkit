# AC 验收矩阵（fix_task 1.2）

> 任务编号：fix-1.2  
> 执行日期：2026-07-19  
> 范围：分类图标设置与候选图标选择（侧栏 Move 入口替换为图标设置）

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| fix-1.2 | fix-1.2-AC-001 | Unit | 候选图标 >40 且含 `Rocket`；非法图标拒绝 | PASS | `categories.test.ts` | — |
| fix-1.2 | fix-1.2-AC-002 | Unit | 颜色候选为 6 个受控 token；非法颜色拒绝 | PASS | `categories.test.ts` | — |
| fix-1.2 | fix-1.2-AC-003 | Unit | `setCategoryIcon` 同时更新 icon+color 且入参不可变 | PASS | `categories.test.ts` | — |
| fix-1.2 | fix-1.2-AC-004 | Unit | 对话框可选图标/颜色，Save 后回调 `{icon,color}` | PASS | `SetCategoryIconDialog.test.tsx` | — |
| fix-1.2 | fix-1.2-AC-005 | E2E | 候选>40，可选颜色，Save 后 toast `Category icon updated` | PASS | `fix-1.2-category-icon.png` | — |
| fix-1.2 | fix-1.2-AC-006 | E2E | `Set category icon` 控件可识别且可聚焦（替代原 Move 入口） | PASS | `TASK-015-category-move.png` | — |

---

## 测试命令与真实结果

```text
pnpm --dir ui exec vitest run src/domain/categories/categories.test.ts src/features/categories/SetCategoryIconDialog.test.tsx src/features/categories/drag/drag.test.ts
# Test Files  3 passed (3) / Tests  16 passed (16)

pnpm --dir ui exec playwright test tests/e2e/category-icon.spec.ts tests/e2e/category-drag.spec.ts
# 3 passed
```
