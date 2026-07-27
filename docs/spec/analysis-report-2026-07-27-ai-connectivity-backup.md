# 规格审查报告（AI 连通性与完整备份）

> 文件路径：`docs/spec/analysis-report-2026-07-27-ai-connectivity-backup.md`
> 创建步骤：STEP 4（规格审查）
> 审查日期：2026-07-27
> 审查人：Codex

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | 2.18.0 / 2026-07-27 |
| `docs/spec/design.md` | 1.18.0 / 2026-07-27 |
| `docs/spec/data.md` | 1.7.0 / 2026-07-27 |
| `docs/spec/api.md` | 1.7.0 / 2026-07-27 |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 2 条 · P2 3 条
- **已更新文件**：`requirements.md`、`design.md`、`data.md`、`api.md`、`tasks.md`、`test_strategy.md`、`traceability.md`
- **需用户决策**：2 条，均已确认
- **结论**：✅ 可进入 STEP 5

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P1 | REQ-034 | 术语一致性 / 跨文档冲突 | `data.md` 仍表述本地、云端和导入导出共用 `LibraryDocument`，与新 `linkit-backup` 信封冲突 | 明确本地/云端使用 `LibraryDocument`，完整备份使用独立 `BackupEnvelope` 并复用 `LibraryData` | 已解决 |
| 2 | P1 | REQ-031、REQ-034 | 跨文档冲突 | `design.md` 的完整备份小节被插入 Appearance 持久化步骤中间，导致后续窗口大小条目归属错误 | 恢复 REQ-031 小节完整结构，将 REQ-034 移至其后并补齐测试工具边界 | 已解决 |
| 3 | P2 | REQ-033、REQ-034 | 系统响应可验证性 | TASK-077/078 的测试类型标记存在多余 Markdown 下划线和尾随空白 | 统一为明确的测试类型字段并移除尾随空白 | 已解决 |
| 4 | P2 | REQ-033 | 文档结构 | REQ-033 前存在重复章节分隔符 | 删除重复分隔符 | 已解决 |
| 5 | P2 | REQ-033、REQ-034 | 前置条件与约束 | 本轮修改产生混合 CRLF/LF，与根目录 `.gitattributes` 的 LF 约束不一致 | 将本轮涉及的规格文件统一规范化为 LF | 已解决 |

> 已逐项审查：术语一致性、用户角色清晰度、触发条件完整性、系统响应可验证性、前置条件与约束、跨文档冲突、非功能性需求缺失。

---

## 澄清问题记录

### 澄清 1 · 备份数据范围【REQ-034】

**问题**：1.21 是否仅导出设置，还是同时导出全部资料库实体？

**选项**：
- A. 完整资料库与可移植设置
- B. 仅设置
- C. 仅资料库
- D. 其他（请说明）

**用户回复**：选择 A；需要同时导出所有数据，包括书签、分类、标签等。

**处理动作**：将导出范围明确为全部 Bookmark、Category、Collection、Tag 与可移植设置。 · **更新文件**：`requirements.md`、`design.md`、`data.md`、`api.md`、`tasks.md`、`test_strategy.md`、`traceability.md`

### 澄清 2 · 安全与兼容边界【REQ-033、REQ-034】

**问题**：是否采用独立 `linkit-backup` 格式，排除凭据与设备运行态字段，并继续兼容旧 `linkit-library` 导入？

**选项**：
- A. 采用推荐设计：新备份格式、敏感字段排除、旧格式兼容
- B. 覆盖旧格式且不保留兼容
- C. 继续使用旧格式并把设置塞入旧信封
- D. 其他（请说明）

**用户回复**：确认采用 A。

**处理动作**：固化 `linkit-backup` v1、PortableAppSettings 投影、敏感字段排除及旧格式兼容约束。 · **更新文件**：`design-fix-1.20-1.21.md`、`requirements.md`、`design.md`、`data.md`、`api.md`

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| `docs/spec/design-fix-1.20-1.21.md` | 记录两项修复的已确认方案、数据流、安全边界与测试范围 | 新增 |
| `docs/spec/requirements.md` | 新增 REQ-033、REQ-034 及 8 条可测试 AC | 修改 |
| `docs/spec/design.md` | 新增 AI 连通性和完整备份架构设计，并修正章节归属 | 修改 |
| `docs/spec/data.md` | 新增 PortableAppSettings 与 BackupEnvelope，明确实体与敏感字段边界 | 修改 |
| `docs/spec/api.md` | 新增 `AIService.TestConnection`，扩展原生导入导出契约 | 修改 |
| `docs/spec/tasks.md` | 新增 TASK-077、TASK-078 的 TDD、QA 与证据要求 | 修改 |
| `docs/spec/test_strategy.md` | 增加 AI 连接和完整备份的测试旅程与风险覆盖 | 修改 |
| `docs/spec/traceability.md` | 建立 REQ-033/034 到 TASK-077/078 的追溯 | 修改 |

---

## 结论

REQ-033 与 REQ-034 的业务范围、接口、数据模型、安全边界、兼容策略、测试类型和任务追溯已一致。审查未发现遗留 P0/P1 问题，可进入 STEP 5，并按 TASK-077、TASK-078 顺序进入 STEP 6。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
