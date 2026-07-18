# AC 验收矩阵（Acceptance Criteria Matrix）

> 文件路径：`docs/spec/ac/TASK-035-AC.md`  
> 任务编号：TASK-035  
> 执行日期：2026-07-19  
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-035 | REQ-013-AC-003 | API + Unit | `GenerateCollection` 返回可编辑名称、描述、标签和库内成员；未知候选 ID 被拒绝 | PASS | `TestGenerateCollection*`、`collections.test.ts` | — |
| TASK-035 | REQ-013-AC-004 | Unit + E2E | 取消保持原资料库；确认后仅创建勾选成员并建立双向关系 | PASS | Vitest 3、Playwright `AI 创建主题`、`TASK-035-ai-collection-preview.png` | — |
| TASK-035 | REQ-020-AC-003 | Unit + E2E | 重复预览展示 URL/域名匹配依据及字段差异，确认前无资料库修改 | PASS | Vitest 3、组件测试 2、`TASK-035-duplicate-diff.png` | — |
| TASK-035 | REQ-020-AC-004 | Unit + E2E | Merge 合并标签与主题关系并清理重复引用；Delete 仅删除指定项 | PASS | `duplicates.test.ts`、Playwright `去重整理` | — |

---

## 视觉回归

| 场景 | Baseline | 实际截图 | 比较结果 |
|------|----------|----------|----------|
| AI 主题预览 | `ui/tests/e2e/ai-organizer.spec.ts-snapshots/TASK-035-ai-collection-preview.png` | `docs/spec/evidence/TASK-035-ai-collection-preview.png` | PASS，像素差异在 2% 门限内 |
| 重复字段差异 | `ui/tests/e2e/ai-organizer.spec.ts-snapshots/TASK-035-duplicate-diff.png` | `docs/spec/evidence/TASK-035-duplicate-diff.png` | PASS，像素差异在 2% 门限内 |

---

## 命令与真实结果

```text
go test ./internal/ai/... -cover
ok — coverage: 79.9%

pnpm --dir ui exec vitest run src/features/ai/collections src/features/ai/duplicates src/features/ai/OrganizerDialogs.test.tsx --coverage
8 passed — TASK-035 feature files: 92.45% statements / 80% branches

pnpm --dir ui exec playwright test tests/e2e/ai-organizer.spec.ts --workers=1
2 passed

pnpm --dir ui lint
PASS

pnpm --dir ui build
PASS
```
