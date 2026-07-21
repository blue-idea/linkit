# AC 验收矩阵（fix_task 1.7）

> 任务编号：fix-1.7  
> 执行日期：2026-07-21  
> 范围：左侧栏分类与主题改名

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| fix-1.7 | REQ-010-AC-002 | Unit | 侧栏分类行暴露 `Rename category` 并回调 `onRenameCategory` | PASS | `Sidebar.rename.test.tsx` | — |
| fix-1.7 | REQ-010-AC-002 | Unit | `renameCategory` 更新名称且拒绝空名称 | PASS | `categories.test.ts` | — |
| fix-1.7 | REQ-010-AC-002 | E2E | 悬停改名 → 对话框保存后侧栏显示新名称 | PASS | `FIX-1.7-category-rename.png` | — |
| fix-1.7 | REQ-012-AC-001 | Unit | 主题行暴露 `Edit collection` 改名入口 | PASS | `Sidebar.rename.test.tsx` | — |
| fix-1.7 | REQ-012-AC-001 | E2E | 编辑主题名称后侧栏显示更新后的名称 | PASS | `FIX-1.7-collection-rename.png` | — |

---

## 测试命令与真实结果

```text
pnpm --dir ui test --run src/components/Sidebar.rename.test.tsx src/domain/categories/categories.test.ts
# Test Files  2 passed (2) / Tests  14 passed (14)

pnpm --dir ui exec playwright test tests/e2e/category-crud.spec.ts tests/e2e/collection-crud.spec.ts --grep "改名"
# 2 passed

pnpm --dir ui lint
# 通过

pnpm --dir ui typecheck
# 通过
```
