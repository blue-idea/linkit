# STEP 5 · 拆分任务（Tasks）

> **前置**：STEP 4 审查已完成，所有规格文档已定稿
> **输出文件**：`docs/spec/info.md`（如尚未创建）
>             `docs/spec/traceability.md`（初始骨架）
>             `docs/spec/test_strategy.md`
>             `docs/spec/tasks.md`
> **模板参考**：`templates/tpl_info.md`、`templates/tpl_traceability.md`、
>             `templates/tpl_test_strategy.md`、`templates/tpl_tasks.md`

---

## 目标

依次完成：①补齐基础文件 → ②测试策略 → ③任务清单。

---

## 第一步：补齐基础文件（每个项目只做一次）

### 1.1 创建 `docs/spec/info.md`

如果 `docs/spec/info.md` 尚不存在：

1. 加载 `templates/tpl_info.md`。
2. 与用户确认：测试账号、环境 URL、第三方服务凭据、数据重置方式。
3. 生成 `docs/spec/info.md`，**并将其加入 `.gitignore`**。

> 若文件已存在，验证账号可用性后跳过此步骤。

### 1.2 初始化 `docs/spec/traceability.md`

如果 `docs/spec/traceability.md` 尚不存在：

1. 加载 `templates/tpl_traceability.md`。
2. 生成初始骨架（此时任务列表尚空，完成第三步后补充行）。

---

## 第二步：设计测试策略

1. 加载 `phases/qa_engine.md` **§第1阶段**，填写测试策略简报。
2. 使用 `templates/tpl_test_strategy.md` 输出 `docs/spec/test_strategy.md`，内容包括：

| 项目 | 说明 | 边界 |
|------|------|------|
| 风险概况 | `data_sensitivity` / `user_impact` / `regulatory` | — |
| 测试范围 | `in_scope` / `out_of_scope` 明确边界 | — |
| 测试类型决策 | 参照 qa_engine.md §第1阶段「测试类型决策矩阵」 | — |
| 测试金字塔比例 | 单元 / 集成 / E2E 的目标比例 | — |
| 覆盖率目标 | 各风险等级对应的行/分支覆盖率数值 | ⚠️ 此处定义，design.md 不重复 |
| 环境配置 | dev / staging / prod URL 和数据库策略 | — |

3. 与用户确认策略后定稿。

---

## 第三步：拆分任务清单

1. 通读 `docs/spec/requirements.md` 和 `docs/spec/design.md`。
2. 按**功能模块**分组拆分任务，分配 `TASK-XXX` 编号。
3. 每项任务必须包含：
   - 具体子步骤（可执行的操作）
   - 验证命令（`pnpm test` / `grep` / `rg` / `find` / `tree` / `curl` 等）
   - 验收证据描述
   - `_需求:` 引用对应 REQ 编号和 AC 编号
   - `_测试类型:` 标注本任务对应 qa_engine.md 的哪一阶段（见下表）

4. 任务粒度：每项任务应能在 **1–4 小时**内完成。
5. 加载 `templates/tpl_tasks.md` 作为格式参考。
6. 与用户确认任务优先级和顺序后，生成 `docs/spec/tasks.md`。
7. 生成后，将所有 TASK 行填入 `docs/spec/traceability.md` 的矩阵中（状态列填"待开始"）。

---

## 任务测试类型标注

> 每个 TASK 根据其 AC 的 `test_type` 字段，在任务中标注 `_测试类型:`，
> AI 在 STEP 6 执行时依此定位 `qa_engine.md` 的对应章节。

| test_type | 查阅 qa_engine.md | 关键产出 |
|-----------|-----------------|---------|
| `Unit` | §第2阶段 | AAA 格式测试、Mock 规则、覆盖率达标 |
| `API` | §第3阶段 | API 测试清单、契约测试（如需）|
| `E2E` | §第4阶段 | 用户旅程脚本、Playwright/Maestro 截图 |
| `Performance` | §第5阶段 | k6 测试计划、性能预算验证 |
| `Security` | §第6阶段 | OWASP 清单、注入 Payload 结果 |
| `Manual` | §第10阶段 | 人工检查记录 |

---

## 任务拆分原则

| 原则 | 说明 |
|------|------|
| 可验证 | 每项任务必须有 CLI 可执行的验证步骤 |
| 可追溯 | 通过 `_需求:` 字段关联 REQ 和 AC 编号 |
| 测试明确 | 通过 `_测试类型:` 字段关联 qa_engine.md 章节 |
| 最小粒度 | 避免"大而全"的任务，应可独立交付 |
| 顺序依赖 | 明确标注前置依赖任务（如 `依赖: TASK-001`） |
| 无冗余背景 | `_需求:` 引用编号即可，不在任务中重复需求细节 |

---

## 完成判定

- [ ] `docs/spec/info.md` 已创建并加入 `.gitignore`（或已确认存在）
- [ ] `docs/spec/traceability.md` 已创建，TASK 行已填入
- [ ] `docs/spec/test_strategy.md` 已创建并与用户确认
- [ ] `docs/spec/tasks.md` 已创建
- [ ] 每项 TASK 均关联至少一条 REQ 和 AC 编号
- [ ] 每项 TASK 均有 `_测试类型:` 标注
- [ ] 每项 TASK 均有可执行的验证命令
- [ ] 用户已确认任务拆分合理
