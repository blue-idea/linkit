# 规格审查报告（Analysis Report）

> 文件路径：`docs/spec/analysis-report-2026-07-21-ui-size.md`  
> 创建步骤：STEP 4（规格审查）  
> 审查日期：2026-07-21  
> 审查人：Auto（SDD）  
> 范围主题：`fix_task` 1.9 / REQ-031 Appearance 界面窗口大小

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | 2.6.0 / 2026-07-21 |
| `docs/spec/design.md` | 1.10.0 / 2026-07-21 |
| `docs/spec/data.md` | 1.5.0 / 2026-07-21 |
| `docs/spec/api.md` | 1.4.0 / 2026-07-21 |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 0 条 · P2 2 条
- **已更新文件**：无（P2 纳入 STEP 5 任务约束，不改规格）
- **需用户决策**：0 条
- **结论**：可进入 STEP 5

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P2 | REQ-031-AC-003 | 系统响应可验证性 | AC 标注 Unit，但「立即调整主窗口」依赖真实 Wails 窗口；纯前端无法证明原生尺寸 | STEP 5：Go Unit 用 `WindowRuntime` mock 断言 `SetSize` 调用参数；选定平台 Manual/冒烟验证真实窗口 | 已纳入任务拆分 |
| 2 | P2 | REQ-031-AC-005 | 前置条件与约束 | 若未来增加「记住上次窗口几何」会与「仅按 uiSize 启动」冲突 | design §6.8 已禁止持久化手动拖拽；STEP 5 验收明确不得新增独立 width/height 持久化字段 | 已解决（规格约束） |

> 审查维度：术语一致性 / 用户角色清晰度 / 触发条件完整性 / 系统响应可验证性 / 前置条件与约束 / 跨文档冲突 / 非功能性需求缺失

---

## 澄清问题记录

无 P0/P1 澄清项。产品决策已在需求访谈中确认（决策 17）。

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| `docs/spec/analysis-report-2026-07-21-ui-size.md` | 本审查报告 | 新增 |

> 注：本轮审查前曾因同步还原丢失 STEP 2/3 增量，已按用户已确认内容完整恢复 `requirements` 2.6.0、`design` 1.10.0、`data` 1.5.0、`api` 1.4.0。

---

## 一致性核对摘要

| 核对项 | 结果 |
|--------|------|
| REQ-031 四档尺寸 ↔ design §6.8 ↔ data 预设表 | 一致：1024×640 / 1280×800 / 1536×960 / 1792×1120 |
| 默认 Medium ↔ config.AppWidth/Height | 一致：1280×800 |
| 仅改宽高、不改字号密度 | requirements 决策 17 与 design §6.8 一致 |
| 持久化 `uiSize`、不云同步、缺省合并 | data / design 一致 |
| 保存立即生效 ↔ `SetMainWindowSize` | api / design 一致 |
| 冷启动读 settings 设 Width/Height | design 明确；实现落在 STEP 5 |
| 手动拖拽不单独记忆 | REQ-031-AC-005 / design / data 一致 |
| i18n 文案 en/zh | REQ-031-AC-001、AC-006 与 design Settings UI 一致 |
| 错误码 `WINDOW_SIZE_INVALID` | api 已定义；STEP 5 在 `config` 落地 |

---

## 结论

REQ-031 及相关 design/data/api 增量一致，无阻塞性问题。可进入 STEP 5：更新测试策略并拆分 TASK-062~063。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
