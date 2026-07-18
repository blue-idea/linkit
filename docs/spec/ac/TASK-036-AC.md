# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-036-AC.md`  
> 任务编号：TASK-036  
> 执行日期：2026-07-19  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-036 | REQ-021-AC-001 | Unit + E2E | 推荐仅使用活动资料库 ID，按共同标签、主题和分类分数确定性排序 | PASS | `explore.test.ts`、`TASK-036-library-recommendations.png` | — |
| TASK-036 | REQ-021-AC-002 | Unit + E2E | 主题缺口只生成建议；点击显式 Add 后才调用成员命令 | PASS | `ExploreDialog.test.tsx`、Playwright `库内推荐` | — |
| TASK-036 | REQ-021-AC-003 | Unit + E2E + Visual | 中心节点固定，外围节点按 ID 径向排列，边显示 Shared tag/collection/AI related | PASS | `knowledge-graph.test.ts`、`TASK-036-knowledge-graph.png` | — |
| TASK-036 | REQ-021-AC-004 | Component + E2E | 点击 SVG 中现有书签节点后关闭图并切换详情标题 | PASS | `KnowledgeGraphDialog.test.tsx`、Playwright `知识网络` | — |

---

## 视觉回归

| 场景 | Baseline | 实际截图 | 比较结果 |
|------|----------|----------|----------|
| 静态知识网络 | `ui/tests/e2e/explore-knowledge-graph.spec.ts-snapshots/TASK-036-knowledge-graph.png` | `docs/spec/evidence/TASK-036-knowledge-graph.png` | PASS，像素差异在 2% 门限内 |

---

## 命令与真实结果

```text
pnpm --dir ui exec vitest run src/features/explore src/features/knowledge-graph --coverage
7 passed；探索核心逻辑 100%，知识图模型 97.72% lines / 84.61% branches

pnpm --dir ui exec playwright test tests/e2e/explore-knowledge-graph.spec.ts --workers=1
2 passed

pnpm --dir ui typecheck
PASS

pnpm --dir ui lint
PASS

pnpm --dir ui build
PASS
```
