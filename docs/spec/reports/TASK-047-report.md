# 测试报告 — TASK-047 本地存储目录与数据迁移

> 日期：2026-07-19  
> 分支：`feat/TASK-047-data-root`  
> 需求：REQ-023-AC-002；REQ-029-AC-001~005

---

## 摘要

| 层级 | 结果 |
|------|------|
| Go Unit | PASS（localstore 79.1%，settingsstore 85.6%） |
| Vitest | PASS（3/3） |
| Playwright E2E | PASS（2/2，含截图） |
| Typecheck | PASS |

结论：TASK-047 验收通过，可合并任务分支。

---

## 覆盖 AC

见 `docs/spec/ac/TASK-047-AC.md`。

---

## 质量评分（简评）

| 维度 | 分 | 说明 |
|------|:--:|------|
| 需求覆盖 | 10 | 五条 REQ-029 AC + Storage 路径展示均有证据 |
| 测试真实性 | 9 | Go/Vitest/Playwright 真实执行；原生对话框桌面补验留 TASK-042 |
| 失败安全 | 10 | 占用阻止、失败回滚、子路径拒绝均有单测 |
| 可维护性 | 9 | 引导根/有效根分离清晰，settings 通过回调同步 |

---

## 下一步

1. 合并 `feat/TASK-047-data-root` 到主分支（按用户确认）。  
2. Windows 桌面旅程 TASK-042 补一轮真实文件夹选择与重启恢复。  
3. 勾选 float_task 1.3（若仍存在）。
