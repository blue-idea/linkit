# AC 验收矩阵 — TASK-022

> 任务编号：TASK-022
> 执行日期：2026-07-18
> 执行人：Auto

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-022 | REQ-024-AC-001 | E2E | Sidebar / Content / Detail 地标与顶栏操作可见 | PASS | `TASK-022-main-window-*.png` | — |
| TASK-022 | REQ-024-AC-002 | E2E | Ctrl+N / I / , 分别打开 New Bookmark、Insights、Settings | PASS | `TASK-022-shortcut-matrix.json` | — |
| TASK-022 | REQ-024-AC-003 | E2E | Ctrl+1/2/3 切换视图，Ctrl+\ 切换侧栏 | PASS | `TASK-022-shortcut-matrix.json` | — |
| TASK-022 | REQ-024-AC-004 | E2E + Unit | Esc 按优先级关闭最上层浮层 | PASS | `shell.test.ts`、`app-shell.spec.ts` | — |
| TASK-022 | REQ-024-AC-005 | E2E + Unit | 拖入 http(s) 打开 New Bookmark 且确认前不保存 | PASS | `TASK-022-drop-url.png` | — |
| TASK-022 | REQ-024-AC-006 | E2E | 焦点顺序、可见焦点、accessible name；axe 零违规 | PASS | `TASK-022-axe-report.json` | — |
| TASK-022 | REQ-028-AC-004 | E2E | 主窗口 Baseline 比对通过 | PASS | `TASK-022-main-window-baseline.png` | — |

---

## 结论

TASK-022 主窗口壳、快捷键、拖入 URL 与可访问性已通过验收，可合并。
