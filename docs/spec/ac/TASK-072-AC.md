# AC 验收矩阵（TASK-072）

> 任务编号：TASK-072
> 执行日期：2026-07-22
> 执行人：Codex

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-072 | REQ-010-AC-001 | Component + E2E | 根分类按既有规则默认展开；第一次双击名称即可折叠，第二次双击恢复子分类 | PASS | `Sidebar.category-double-click.test.tsx`、`category-name-double-click.spec.ts` | — |
| TASK-072 | REQ-010-AC-006 | Component | 单击父分类名称只选择；双击有子分类的名称只触发一次切换并携带当前实际展开值；叶子名称双击不产生展开状态 | PASS | `Sidebar.category-double-click.test.tsx`；3/3 PASS | — |
| TASK-072 | REQ-010-AC-006 | E2E | 真实侧栏验证名称单击、连续双击折叠/展开及 Chevron 折叠/展开全部符合规格 | PASS | `category-name-double-click.spec.ts`；1/1 PASS | — |
| TASK-072 | REQ-010-AC-006 | UI | Baseline/Actual/Diff 为 45 像素差异，比例 0.0049%，低于 8% 门限；MCP 截图显示“技术”已折叠 | PASS | `TASK-072-category-name-double-click-{baseline,actual,diff,mcp}.png`、diff metric | — |
| TASK-072 | REQ-011-AC-001 | Unit Regression | 合法分类移动仍更新 `parentId`，非法自循环/后代移动仍被拒绝；4/4 用例通过 | PASS | `src/features/categories/drag/drag.test.ts` | — |
| TASK-072 | REQ-011-AC-003 | E2E Regression | 书签拖放到分类仍更新归属并显示英文成功提示；分类操作控件仍可访问 | PASS | `category-drag.spec.ts`；2/2 PASS | — |
