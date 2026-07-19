# AC 验收矩阵 — TASK-048

> 文件路径：`docs/spec/ac/TASK-048-AC.md`  
> 任务编号：TASK-048  
> 日期：2026-07-19  
> 状态：PASS

---

| TASK | AC ID | 测试类型 | 验收点 | 状态 | 证据 | 错误详情 |
|------|-------|----------|--------|:----:|------|----------|
| TASK-048 | REQ-008-AC-005 | Unit | `BookmarkItemActions` 普通模式提供 `Open bookmark directly`，点击只触发访问回调，不触发 Edit/Move/Delete | PASS | `ui/src/features/views/BookmarkItemActions.test.tsx` | — |
| TASK-048 | REQ-008-AC-005 | Unit | 选择模式同时保留复选框与直接访问按钮，选择与访问互不冲突 | PASS | `ui/src/features/views/BookmarkItemActions.test.tsx` | — |
| TASK-048 | REQ-008-AC-005 | Unit | 直接访问复用 `visitBookmark`，外部打开成功后才更新 visitCount / lastVisitedAt | PASS | `ui/src/features/bookmarks/visit.test.ts` | — |
| TASK-048 | REQ-008-AC-005 | E2E | Card、List、Masonry、Timeline、Tag Aggregation、Theme Space 均显示书签项直达入口，并与右侧 `Open bookmark URL` / `Visit` 区分 | PASS | `ui/tests/e2e/bookmark-actions.spec.ts` | — |
| TASK-048 | REQ-008-AC-005 | Visual | 直达入口截图 Baseline / Actual / Diff 证据已生成 | PASS | `docs/spec/evidence/TASK-048-direct-access-baseline.png`、`TASK-048-direct-access.png`、`TASK-048-direct-access-diff.png` | — |

---

## 结论

TASK-048 通过 Unit + E2E + Visual 验收。Playwright MCP 截图因 MCP 浏览器可执行文件缺失标记为 BLOCKED；项目 Playwright CLI 验收已真实执行并通过。
