---
name: hns-sdd
description: Use when the user wants Spec-Driven Development, SDD workflow, docs/spec planning, requirements/design/tasks execution, QA/TDD acceptance, or asks to create or align constitution.md, requirements.md, design.md, tasks.md, test_strategy.md, traceability.md, AC matrices, or test reports.
---

# HNS-SDD

## 核心原则

本技能用于执行 SDD（Spec-Driven Development，规范驱动开发）流程：先建立可追溯的规格文档，再基于规格拆分任务、实现、测试和验收。

使用本技能时，按当前阶段渐进加载文档。先读取入口和当前阶段所需文件，再按需读取模板或 QA/TDD 参考，避免一次性加载全部长文档。

## 何时使用

在以下场景使用本技能：

- 用户要求按 SDD、规范驱动开发、Spec-Driven Development、需求到任务、需求到实现、规格对齐、验收矩阵等流程推进。
- 用户要求创建、补齐、审查或同步 `docs/spec/` 下的规格文档。
- 用户要求生成或维护 `constitution.md`、`requirements.md`、`design.md`、`data.md`、`api.md`、`tasks.md`、`test_strategy.md`、`traceability.md`、AC 验收矩阵或测试报告。
- 用户要求执行已拆分的 TASK，并需要严格绑定 REQ/AC、TDD、QA 验收和证据记录。

不要在普通一次性代码问答、无需规格文档的小修小改、或用户明确要求跳过 SDD 流程时使用。

## 阶段总览

| 步骤 | 阶段 | 目标 | 主输出 |
|:---:|------|------|--------|
| STEP 0 | 初始化通用规范 | 建立沟通、工程化、测试与安全基线 | 无 |
| STEP 1 | 立规矩 | 生成项目宪法 | `docs/spec/constitution.md` |
| STEP 2 | 需求文档 | 用 EARS 和 AC 固化需求 | `docs/spec/requirements.md` |
| STEP 3 | 技术方案 | 设计架构、数据、接口与实现方案 | `docs/spec/design.md`，按需含 `data.md` / `api.md` |
| STEP 4 | 规格审查 | 审查需求、设计、数据、接口一致性 | `docs/spec/analysis-report-{{DATE}}.md` |
| STEP 5 | 拆分任务 | 生成可执行任务、测试策略和追溯关系 | `docs/spec/tasks.md` 等 |
| STEP 6 | 执行验收 | 按 TASK 实现、测试、验收和收尾 | 代码、测试、AC 矩阵、测试报告 |

## 上下文加载矩阵

每个阶段开始前，先读取 `phases/00_agents.md`。随后按表加载当前阶段文件。

| 步骤 | 必读 | 按需读 |
|:---:|------|--------|
| STEP 0 | `phases/00_agents.md` | 无 |
| STEP 1 | `phases/00_agents.md`、`phases/01_constitution.md` | `templates/tpl_constitution.md`、`phases/qa_engine.md` 第 7 阶段 |
| STEP 2 | `phases/00_agents.md`、`phases/02_requirements.md`、`docs/spec/constitution.md` | `templates/tpl_requirements.md`、`phases/qa_engine.md` 第 1 阶段 |
| STEP 3 | `phases/00_agents.md`、`phases/03_design.md`、`docs/spec/constitution.md`、`docs/spec/requirements.md` | 项目已有 `data.md` / `api.md` 约束 |
| STEP 4 | `phases/00_agents.md`、`phases/04_analysis.md`、`docs/spec/requirements.md`、`docs/spec/design.md` | `docs/spec/data.md`、`docs/spec/api.md`、`templates/tpl_analysis_report.md` |
| STEP 5 | `phases/00_agents.md`、`phases/05_tasks.md`、`docs/spec/requirements.md`、`docs/spec/design.md`、`phases/qa_engine.md` 第 1 阶段 | `templates/tpl_tasks.md`、`templates/tpl_test_strategy.md`、`templates/tpl_info.md`、`templates/tpl_traceability.md`、`docs/spec/data.md`、`docs/spec/api.md` |
| STEP 6 | `phases/00_agents.md`、`phases/06_execution.md`、`phases/tdd.md`、`docs/spec/constitution.md`、`docs/spec/requirements.md`、`docs/spec/tasks.md` | `phases/qa_engine.md` 对应阶段、`phases/testing-anti-patterns.md`、`docs/spec/design.md`、`docs/spec/data.md`、`docs/spec/api.md`、`templates/tpl_ac_matrix.md`、`templates/tpl_test_report.md` |

## 执行路由

根据用户请求选择入口：

- 新项目从零开始：按 STEP 0 到 STEP 6 顺序推进。
- 已有项目但缺少规格：定位缺失文件对应的 STEP，先补齐并确认，再继续后续阶段。
- 已有 `docs/spec/tasks.md`，用户要求执行任务：直接进入 STEP 6。
- 用户要求代码和规格对齐：先识别涉及的规格文件，再按影响范围回退到 STEP 2、3、4 或 5。
- 发现实现需要改变已定稿的 `requirements.md`、`design.md`、`data.md` 或 `api.md`：暂停当前 TASK，按“规格回退协议”处理。

## 工作规则

1. 先确认当前 SDD 阶段、目标输出文件和已有 `docs/spec/` 状态。
2. 只加载当前阶段所需文件；长文档按章节查阅。
3. 对需要用户确认的阶段，逐项提问并等待明确确认，不自行定稿关键规格。
4. 所有需求必须可验收、可测试，并与 REQ/AC 编号绑定。
5. STEP 6 中任何实现都必须绑定 TASK、REQ/AC、测试类型和验收证据。
6. STEP 6 按任务开 Git 分支，验收通过后再合并到主分支（细则见 `phases/06_execution.md`）。
7. 测试结果必须来自真实执行；无法执行时标记 `BLOCKED` 并说明阻塞原因。
8. 输出项目文件统一写入 `docs/spec/`，不要写回本技能目录。

## QA 与 TDD 路由

按任务类型读取 `phases/qa_engine.md` 的对应章节：

| 场景 | 读取内容 |
|------|----------|
| 确定 AC 的 `test_type` | `phases/qa_engine.md` 第 1 阶段 |
| 单元测试 | 第 2 阶段 |
| 集成/API 测试 | 第 3 阶段 |
| E2E 测试 | 第 4 阶段 |
| 性能测试 | 第 5 阶段 |
| 安全测试 | 第 6 阶段 |
| CI 流水线或测试框架选型 | 第 7 阶段 |
| 测试报告和质量评分 | 第 8 阶段 |
| Mock 或测试替身设计 | `phases/testing-anti-patterns.md` |
| 任何生产代码实现 | `phases/tdd.md` |

## 可用文档

### 阶段手册

- `phases/00_agents.md`：通用沟通、工程化、安全、测试规范。
- `phases/01_constitution.md`：创建项目宪法。
- `phases/02_requirements.md`：创建需求文档和 AC。
- `phases/03_design.md`：创建技术方案。
- `phases/04_analysis.md`：审查规格一致性。
- `phases/05_tasks.md`：拆分任务、测试策略和追溯矩阵。
- `phases/06_execution.md`：执行 TASK、验收、失败修复和收尾。
- `phases/qa_engine.md`：完整 QA 与测试方法。
- `phases/tdd.md`：TDD 红绿重构协议。
- `phases/testing-anti-patterns.md`：测试反模式与 Mock 门控。

### 模板

- `templates/tpl_constitution.md`：项目宪法模板。
- `templates/tpl_requirements.md`：需求文档模板。
- `templates/tpl_analysis_report.md`：规格审查报告模板。
- `templates/tpl_tasks.md`：任务清单模板。
- `templates/tpl_test_strategy.md`：测试策略简报模板。
- `templates/tpl_info.md`：测试账号与数据模板。
- `templates/tpl_traceability.md`：可追溯性矩阵模板。
- `templates/tpl_ac_matrix.md`：AC 验收矩阵模板。
- `templates/tpl_test_report.md`：测试报告模板。

### 原始入口

- `references/sdd-v4-entry.md`：来自 `sdd_v4/SKILL.md` 的原始入口文档，作为兼容参考保留。

## 规格回退协议

当 STEP 6 中的修复需要改动已定稿规格时，不要直接改代码绕过规格。先输出设计冲突通知，说明当前 TASK、冲突、需变更文件、影响的下游 TASK 和建议回退步骤，等待用户确认后再更新规格与任务。

影响范围：

- `requirements.md` 变更：回退 STEP 2，并重新经过 STEP 3、4、5。
- `design.md` 变更：回退 STEP 3，并重新经过 STEP 4、5。
- `data.md` 或 `api.md` 变更：回退 STEP 4，并更新 STEP 5 中受影响 TASK。

## 输出习惯

阶段产出应明确列出：

- 已读取的上下文文件。
- 新增或修改的 `docs/spec/` 文件。
- 用户需要确认的事项。
- 后续建议进入的 STEP。
- 对 STEP 6，额外列出测试命令、真实结果、验收证据和未解决风险。
