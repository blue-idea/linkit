# SDD — 规范驱动开发 技能入口
> 版本 v3 · 更新时间：2026-05-26

## 什么是 SDD

规范驱动开发（Spec-Driven Development）是一套 **先立规范、后写代码** 的工程流程。
每个阶段都有独立的规格文档，AI 在执行前必须加载对应上下文，确保所有实现严格可溯源。

---

## 执行流程总览

```
STEP 0  初始化通用规范        →  phases/00_agents.md
STEP 1  立规矩（宪法）        →  phases/01_constitution.md
STEP 2  编写需求文档          →  phases/02_requirements.md
STEP 3  技术方案设计          →  phases/03_design.md
STEP 4  规格审查与分析        →  phases/04_analysis.md
STEP 5  拆分任务清单          →  phases/05_tasks.md
STEP 6  执行 · 验收 · 收尾   →  phases/06_execution.md
```

> **原则**：每次只读当前步骤所需的文件层级，不预加载后续步骤内容。

---

## 上下文加载矩阵

> AI 在每个步骤**开始前**，按下表加载文件。`●` = 必读，`○` = 按需读（仅当任务涉及时）。

| 步骤 | 阶段描述 | 必读（●） | 按需读（○） |
|:----:|---------|-----------|------------|
| **0** | 初始化通用规范 | `phases/00_agents.md` | — |
| **1** | 立规矩 / 宪法 | `SKILL.md`<br>`phases/01_constitution.md` | `templates/tpl_constitution.md`<br>`phases/qa_engine.md` §第7阶段（CI/CD 流水线配置） |
| **2** | 需求文档 | `SKILL.md`<br>`phases/02_requirements.md`<br>`docs/spec/constitution.md` | `templates/tpl_requirements.md`<br>`phases/qa_engine.md` §第1阶段（确定 test_type）|
| **3** | 技术方案 | `phases/03_design.md`<br>`docs/spec/constitution.md`<br>`docs/spec/requirements.md` | — |
| **4** | 规格审查 | `phases/04_analysis.md`<br>`docs/spec/requirements.md`<br>`docs/spec/design.md` | `docs/spec/data.md`<br>`docs/spec/api.md`<br>`templates/tpl_analysis_report.md` |
| **5** | 拆分任务 | `phases/05_tasks.md`<br>`phases/qa_engine.md` §第1阶段<br>`docs/spec/requirements.md`<br>`docs/spec/design.md` | `templates/tpl_tasks.md`<br>`templates/tpl_test_strategy.md`<br>`templates/tpl_info.md`（首次）<br>`templates/tpl_traceability.md`（首次）<br>`docs/spec/data.md`<br>`docs/spec/api.md` |
| **6** | 执行·验收 | `phases/06_execution.md`<br>`phases/tdd.md`<br>`phases/qa_engine.md`（按需查阅对应阶段）<br>`docs/spec/constitution.md`<br>`docs/spec/requirements.md`<br>`docs/spec/tasks.md` | `phases/testing-anti-patterns.md`（添加 Mock 时）<br>`docs/spec/design.md`<br>`docs/spec/data.md`<br>`docs/spec/api.md`<br>`templates/tpl_ac_matrix.md`<br>`templates/tpl_test_report.md` |

### qa_engine.md 阶段与 SDD 步骤的映射

> 执行时按此表定位 `phases/qa_engine.md` 中的对应章节，不需要每次全文读取。

| 当前 SDD 步骤 | 需要查阅的文件和章节 |
|-------------|------------------------------|
| STEP 2 需求文档 | §第1阶段 — 测试类型决策矩阵（确定每条 AC 的 test_type） |
| STEP 5 拆分任务 | §第1阶段 — 策略简报模板（产出 `docs/spec/test_strategy.md`） |
| STEP 1 立规矩 | `phases/qa_engine.md` §第7阶段 — CI 流水线阶段定义（录入 constitution.md §CI/CD 配置） |
| STEP 6 编写任何代码 | `phases/tdd.md` — 铁律、红绿重构循环、核查清单 |
| STEP 6 添加 Mock / 测试工具 | `phases/testing-anti-patterns.md` — 反模式识别与修复 |
| STEP 6 执行单元测试 | `phases/qa_engine.md` §第2阶段 — AAA 模式、Mock 规则、覆盖率目标 |
| STEP 6 执行集成/API 测试 | §第3阶段 — API 测试清单、数据库测试规则 |
| STEP 6 执行 E2E 测试 | §第4阶段 — 关键用户旅程、选择器优先级 |
| STEP 6 执行性能测试 | §第5阶段 — 负载测试设计、性能预算 |
| STEP 6 执行安全测试 | `phases/qa_engine.md` §第6阶段 — OWASP Top 10 清单、注入 Payload |
| STEP 6 配置 CI 流水线 / 选型测试框架 | §第7阶段 — CI 流水线各阶段配置、框架选型指南 |
| STEP 6 输出测试报告 | §第8阶段 — 测试报告模板、质量评分 |

---

## 文件目录速查

```
SKILL.md                      ← 你在这里（入口）
│
├── phases/                   ← 各阶段执行指令（AI 流程手册）
│   ├── 00_agents.md          ← 通用沟通 & 工程规范
│   ├── 01_constitution.md    ← 如何建立项目宪法
│   ├── 02_requirements.md    ← 如何编写需求文档
│   ├── 03_design.md          ← 如何完成技术方案
│   ├── 04_analysis.md        ← 如何审查规格文档
│   ├── 05_tasks.md           ← 如何拆分任务清单
│   ├── 06_execution.md       ← 如何执行、验收、收尾
│   ├── qa_engine.md          ← QA 方法论全集（按需查阅对应阶段）
│   ├── tdd.md                ← TDD 铁律与红绿重构完整协议
│   └── testing-anti-patterns.md ← 测试反模式识别与防护
│
└── templates/                ← 可复用的输出模板
    ├── tpl_constitution.md   ← 宪法文档模板
    ├── tpl_requirements.md   ← 需求文档模板
    ├── tpl_tasks.md          ← 任务清单模板
    ├── tpl_ac_matrix.md      ← AC 验收矩阵模板
    ├── tpl_test_strategy.md  ← 测试策略简报模板（STEP 5 产出）
    ├── tpl_test_report.md    ← 测试报告模板（STEP 6 产出）
    ├── tpl_info.md           ← 测试账号与数据模板（STEP 5 产出，加入 .gitignore）
    ├── tpl_traceability.md   ← 可追溯性矩阵模板（STEP 5 产出）
    └── tpl_analysis_report.md ← 规格审查报告模板（STEP 4 产出）
```

> 项目实际产出文件统一写入 `docs/spec/` 目录（不在本 skill 包内）。

---

## 规格回退协议（Spec Rollback）

> **触发条件**：在 STEP 6 执行过程中，修复方案需要改动已定稿的 `api.md` / `data.md` / `design.md`，判定为"设计冲突"。
> 发现时立即暂停当前 TASK，进入本协议。

### 影响范围判定

| 变更涉及的文件 | 需要重新执行的步骤 | 下游文件失效范围 |
|-------------|----------------|--------------|
| `api.md` 接口签名变更 | STEP 4（重审接口契约一致性）→ STEP 5（更新关联 TASK）| 所有依赖该接口的 TASK |
| `data.md` 数据模型变更 | STEP 4（重审数据与需求映射）→ STEP 5（更新关联 TASK）| 所有涉及该数据模型的 TASK |
| `design.md` 架构变更 | STEP 3（重新确认技术方案）→ STEP 4 → STEP 5（重评估全部 TASK）| 可能影响所有 TASK |
| `requirements.md` 需求变更 | STEP 2（重新定稿）→ STEP 3 → STEP 4 → STEP 5（全量重评估）| 全部下游 |

### 执行流程

```
1. AI 输出"设计冲突通知"（格式见下方）
2. 等待用户确认变更方向
3. 按影响范围表回退到对应步骤
4. 重新执行受影响步骤，更新相关规格文件
5. 在 traceability.md 中将受影响的 TASK 状态重置为 todo
6. 重新进入 STEP 6 执行回退点之后的任务
```

### 设计冲突通知格式

```
## ⚠️ 设计冲突 — 需要规格变更

**当前任务**：TASK-XXX
**冲突描述**：[一句话说明什么 AC 的修复需要改动已定稿的规格]
**需变更文件**：`docs/spec/api.md` / `docs/spec/data.md` / `docs/spec/design.md`
**变更内容**：[具体说明需要改什么]
**影响的下游 TASK**：TASK-XXX, TASK-YYY（将重置为 todo）
**建议回退到**：STEP N

请确认：
  A. 同意变更，按建议回退
  B. 调整变更范围（请说明）
  C. 放弃本次修复，保持现有设计（该 AC 标记 WONTFIX）
```

---

## 快速跳转

- 从头开始新项目 → 按 STEP 0 → 1 → 2 → 3 → 4 → 5 → 6 顺序执行
- 接手已有项目执行任务 → 直接进入 **STEP 6**，加载矩阵第 6 行所列文件
- 补写缺失规格 → 定位对应步骤，加载该行必读文件后执行

---
