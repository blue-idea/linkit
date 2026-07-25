# hns-sdd-v4 使用说明

`hns-sdd-v4` 是由 `sdd_v4` 目录下文档整理生成的 SDD（规范驱动开发）技能包。它用于把项目从需求、设计、任务拆分推进到实现、测试、验收和文档收尾。

## 目录结构

```text
hns-sdd-v4/
|-- SKILL.md
|-- readme.md
|-- phases/
|   |-- 00_agents.md
|   |-- 01_constitution.md
|   |-- 02_requirements.md
|   |-- 03_design.md
|   |-- 04_analysis.md
|   |-- 05_tasks.md
|   |-- 06_execution.md
|   |-- qa_engine.md
|   |-- tdd.md
|   `-- testing-anti-patterns.md
|-- templates/
|   |-- tpl_ac_matrix.md
|   |-- tpl_analysis_report.md
|   |-- tpl_constitution.md
|   |-- tpl_info.md
|   |-- tpl_requirements.md
|   |-- tpl_tasks.md
|   |-- tpl_test_report.md
|   |-- tpl_test_strategy.md
|   `-- tpl_traceability.md
`-- references/
    `-- sdd-v4-entry.md
```

## 安装方式

把整个 `hns-sdd-v4/` 目录放入 Codex/Agent 的 skills 目录即可使用。

当前生成位置：

```text
E:\NextCloud\coding\harness\skill-factory\hns-sdd-v4
```

如需安装到本机 Codex skills 目录，可复制到：

```text
C:\Users\blue\.codex\skills\hns-sdd-v4
```

## 触发方式

可在对话中直接提到技能名：

```text
$hns-sdd-v4 按 SDD 流程为这个项目建立 docs/spec 文档
```

也可以用自然语言触发：

```text
请按规范驱动开发流程，先生成 constitution.md 和 requirements.md
```

```text
根据 docs/spec/tasks.md 执行 TASK-003，并输出 AC 验收矩阵
```

```text
检查 requirements.md、design.md、api.md 是否一致，并生成分析报告
```

## 推荐工作流

### 新项目从零开始

按顺序执行：

```text
STEP 0 -> STEP 1 -> STEP 2 -> STEP 3 -> STEP 4 -> STEP 5 -> STEP 6
```

常见提示：

```text
$hns-sdd-v4 从零开始为当前项目建立 SDD 规格文档
```

产出位置统一为：

```text
docs/spec/
```

### 补齐缺失规格

如果项目已经有部分文档，先说明已有文件：

```text
$hns-sdd-v4 当前已有 docs/spec/requirements.md，请补齐 design.md、tasks.md，并检查一致性
```

技能会根据缺失文件定位到对应 STEP。

### 执行任务

已有 `docs/spec/tasks.md` 时，可直接进入 STEP 6：

```text
$hns-sdd-v4 执行 TASK-005，严格绑定对应 REQ/AC，使用 TDD，并在完成后生成验收矩阵
```

STEP 6 会读取：

- `phases/06_execution.md`
- `phases/tdd.md`
- `phases/qa_engine.md` 的对应测试章节
- `docs/spec/constitution.md`
- `docs/spec/requirements.md`
- `docs/spec/tasks.md`

### 规格回退

如果实现时发现代码修复需要修改已定稿的 `requirements.md`、`design.md`、`data.md` 或 `api.md`，不要直接绕过规格。应触发规格回退：

```text
$hns-sdd-v4 当前 TASK 的实现需要修改 api.md，请按规格回退协议处理
```

## 阶段和文档对应关系

| 阶段 | 读取手册 | 主要输出 |
|------|----------|----------|
| STEP 0 | `phases/00_agents.md` | 无 |
| STEP 1 | `phases/01_constitution.md` | `docs/spec/constitution.md` |
| STEP 2 | `phases/02_requirements.md` | `docs/spec/requirements.md` |
| STEP 3 | `phases/03_design.md` | `docs/spec/design.md` |
| STEP 4 | `phases/04_analysis.md` | `docs/spec/analysis-report-{{DATE}}.md` |
| STEP 5 | `phases/05_tasks.md` | `docs/spec/tasks.md`、`test_strategy.md`、`traceability.md` |
| STEP 6 | `phases/06_execution.md` | 实现代码、测试、AC 矩阵、测试报告 |

## 使用注意

- 每次只读取当前阶段需要的文档，长文档按章节查阅。
- 所有项目产出写入 `docs/spec/`，不要写回技能目录。
- 用户未确认的规格不视为定稿。
- 测试结果必须来自真实执行，不能伪造 PASS。
- 无法执行的验收项标记为 `BLOCKED`，并写明原因。
