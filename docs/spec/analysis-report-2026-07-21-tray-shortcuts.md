# 规格审查报告（Analysis Report）

> 文件路径：`docs/spec/analysis-report-2026-07-21-tray-shortcuts.md`  
> 创建步骤：STEP 4（规格审查）  
> 审查日期：2026-07-21  
> 审查人：Auto（SDD）  
> 范围主题：`fix_task` 1.8 / REQ-030 关闭隐藏、托盘与可配置快捷键

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | 2.5.0 / 2026-07-21 |
| `docs/spec/design.md` | 1.9.0 / 2026-07-21 |
| `docs/spec/data.md` | 1.4.0 / 2026-07-21 |
| `docs/spec/api.md` | 1.3.0 / 2026-07-21 |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 0 条 · P2 2 条
- **已更新文件**：`docs/spec/design.md`（补充桌面态 `toggleWindow` 不双绑定）
- **需用户决策**：0 条
- **结论**：可进入 STEP 5

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P2 | REQ-030-AC-005 | 跨文档冲突 | 若前端 `useGlobalShortcuts` 与 Go 全局热键同时绑定 `toggleWindow`，窗口可见时可能双触发 | 在 `design.md` §6.7 明确桌面运行时仅 Go 处理 `toggleWindow` | 已解决 |
| 2 | P2 | REQ-030-AC-007 | 系统响应可验证性 | AC 标注 Unit，但含全局热键注册与重启恢复副作用 | STEP 5 拆为 Unit（Schema/冲突/持久化）+ Manual（托盘/OS 关闭/全局热键）任务 | 已纳入任务拆分 |

> 审查维度：术语一致性 / 用户角色清晰度 / 触发条件完整性 / 系统响应可验证性 / 前置条件与约束 / 跨文档冲突 / 非功能性需求缺失

---

## 澄清问题记录

无 P0/P1 澄清项。产品决策已在需求访谈中确认（决策 16）。

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| `docs/spec/design.md` | §6.7 补充桌面态 `toggleWindow` 仅 Go 全局热键处理，避免双绑定 | 修改 |
| `docs/spec/analysis-report-2026-07-21-tray-shortcuts.md` | 本审查报告 | 新增 |

---

## 一致性核对摘要

| 核对项 | 结果 |
|--------|------|
| REQ-030 AC ↔ design §6.7 | 一致：HideWindowOnClose、托盘 Show/Quit、全局热键、Shortcuts |
| REQ-030 ↔ data `shortcuts` | 一致：9 个 action id 与默认 accelerator |
| REQ-030 ↔ api SystemService | 一致：Show/Hide/Quit、SetToggleWindowHotkey、GetDesktopCapability |
| REQ-023-AC-001 Shortcuts 入口 | 已修订，与设计 Settings 分区一致 |
| REQ-024 默认快捷键可被覆盖 | 已加 notes，与 REQ-030 一致 |
| Linux best-effort | requirements / design / api 能力探测一致，禁止伪造 PASS |

---

## 结论

REQ-030 及相关 design/data/api 增量一致，无阻塞性问题。可进入 STEP 5：更新测试策略并拆分 TASK-059~061。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
