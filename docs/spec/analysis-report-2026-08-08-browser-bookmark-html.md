# 规格审查报告：浏览器书签 HTML 导入导出与 AI 整理
> 文件路径：`docs/spec/analysis-report-2026-08-08-browser-bookmark-html.md`
> 创建步骤：STEP 4（规格审查）
> 审查日期：2026-08-08
> 审查人：Codex

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | 2.19.0 / 2026-08-08 |
| `docs/spec/design.md` | 1.19.0 / 2026-08-08 |
| `docs/spec/data.md` | 1.8.0 / 2026-08-08 |
| `docs/spec/api.md` | 1.7.0 / 2026-07-27 |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 3 条 · P2 0 条
- **已更新文件**：`requirements.md`、`design.md`、`data.md`、`test_strategy.md`、`tasks.md`、`traceability.md`
- **需用户决策**：4 条，均已确认
- **结论**：✅ 可进入 STEP 5

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P1 | REQ-035 | 触发条件完整性 | 浏览器书签 HTML 导入前缺少文件夹映射和重复 URL 处理规则，无法形成稳定 AC | 用户确认“文件夹→Category 树、规范化 URL 跳过重复”，写入 REQ-035 / design / data | 已解决 |
| 2 | P1 | REQ-035 | 系统响应可验证性 | “导入时使用 AI 自动分类和打标签”未定义 AI 失败时是否阻塞导入，也未限制标签数量 | 用户确认“AI 不可用仍完成导入、每条书签最多 3 个标签”，写入 REQ-035-AC-004 与设计 | 已解决 |
| 3 | P1 | REQ-035 | 跨文档冲突 | 现有 `data.md` 导入导出章节只覆盖 `linkit-backup` / `linkit-library` JSON，与新增浏览器 HTML 互通边界不一致 | 在 `data.md` 新增浏览器 HTML 导入导出约束，并补充 DATA-INV-016 | 已解决 |

---

## 澄清问题记录

### 澄清 1 · 文件夹映射规则。REQ-035
**问题**：浏览器书签文件夹是否映射为 `Category` 树，且不创建 `Collection`？

**选项**：
- A. 映射为 `Category` 树，不创建 `Collection`
- B. 映射为 `Collection`
- C. 同时创建 `Category` 和 `Collection`
- D. 其他（请说明）

**用户回复**：A

**处理动作**：将浏览器书签文件夹统一映射为 `Category` 树，并在 requirements / design / data 中明确不创建 `Collection`。 · **更新文件**：`requirements.md`、`design.md`、`data.md`

### 澄清 2 · 重复书签策略。REQ-035
**问题**：导入浏览器书签 HTML 时，若当前资料库已存在同一规范化 URL，系统应如何处理？

**选项**：
- A. 跳过重复并在摘要中统计 `skipped duplicates`
- B. 覆盖现有记录
- C. 强制用户逐条决策
- D. 其他（请说明）

**用户回复**：A

**处理动作**：将重复 URL 规则写入 REQ-035-AC-002/003 和 DATA-INV-016，要求重复项零副作用且进入摘要统计。 · **更新文件**：`requirements.md`、`data.md`

### 澄清 3 · AI 执行策略。REQ-035
**问题**：浏览器书签导入时，AI 分类与标签整理是在确认后执行且允许失败降级，还是必须阻塞导入直至 AI 完成？

**选项**：
- A. 确认后执行 AI 整理；AI 不可用时仍完成导入
- B. 必须等待 AI 成功后才允许导入成功
- C. 完全不执行 AI
- D. 其他（请说明）

**用户回复**：A

**处理动作**：将导入后 AI 整理写为确认后流程，并明确 AI 失败不回滚导入落库。 · **更新文件**：`requirements.md`、`design.md`、`tasks.md`

### 澄清 4 · 标签数量上限。REQ-035
**问题**：导入后每条书签允许写入多少个标签？

**选项**：
- A. 最多 3 个
- B. 最多 2 个
- C. 最多 5 个
- D. 其他（请说明）

**用户回复**：A

**处理动作**：将“每条导入书签最多 3 个唯一标签”写入 REQ-035-AC-004、设计与测试策略。 · **更新文件**：`requirements.md`、`design.md`、`test_strategy.md`

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| `docs/spec/requirements.md` | 新增 REQ-035、6 条 AC、来源映射与修订记录；补充用户确认决策 21 | 修改 |
| `docs/spec/design.md` | 新增 6.10 浏览器书签 HTML 互通与导入后 AI 整理设计；补风险、覆盖概览和修订记录 | 修改 |
| `docs/spec/data.md` | 扩展导入导出格式章节，新增浏览器 HTML 导入导出边界与 DATA-INV-016 | 修改 |
| `docs/spec/test_strategy.md` | 补浏览器 HTML 兼容 smoke、AI 整理范围、关键旅程 J-21 与 BLOCKED 门禁 | 修改 |
| `docs/spec/tasks.md` | 新增 TASK-079 / TASK-080 与修订记录，进入实现准备 | 修改 |
| `docs/spec/traceability.md` | 新增 REQ-035 对应追踪行与变更记录 | 修改 |

---

## 结论

浏览器书签 HTML 导入导出与导入后 AI 整理的关键产品决策已经补齐，现有 `Category` / `Bookmark` / `Tag` 数据模型可复用，无需新增底层实体或修改 `api.md` 契约。规格之间已对齐，可直接进入 STEP 5 任务执行。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
