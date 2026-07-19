# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-038-AC.md`  
> 任务编号：TASK-038  
> 执行日期：2026-07-19  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-038 | REQ-022-AC-001 | Unit + E2E + Visual | Insights 显示健康、主题、标签、未读或空库规则卡片；每张卡片包含指标、计算证据和明确行动，并可跳转到对应视图或筛选 | PASS | `insights.test.ts`、`insights.spec.ts`、`TASK-038-insights-report.png` | — |

---

## 边界与性能数据

| 场景 | 实际结果 | 状态 |
|------|----------|:----:|
| 空资料库 | 返回 Bookmarks=0、`bookmarkCount=0` 和 New Bookmark 行动 | PASS |
| 少量数据 | 生成健康、主题与标签等可追溯洞察 | PASS |
| 10,000 条书签 | 单次计算低于 500ms，结果确定且不超过 6 张卡片 | PASS |

---

## 视觉回归

| 场景 | Baseline | 实际截图 | 比较结果 |
|------|----------|----------|----------|
| 收藏洞察报告 | `ui/tests/e2e/insights.spec.ts-snapshots/TASK-038-insights-report.png` | `docs/spec/evidence/TASK-038-insights-report.png` | PASS，像素差异在 5% 门限内 |

---

## 命令与真实结果

```text
pnpm --dir ui exec vitest run src/features/insights
3 passed

pnpm --dir ui exec playwright test tests/e2e/insights.spec.ts --workers=1
1 passed

pnpm --dir ui typecheck
PASS

pnpm --dir ui lint
PASS

pnpm --dir ui build
PASS
```

核心规则模块覆盖率：100% lines / 92% branches / 100% functions / 100% statements。
