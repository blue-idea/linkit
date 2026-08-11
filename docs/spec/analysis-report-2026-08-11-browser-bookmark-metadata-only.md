# 规格审查报告：浏览器书签导入回退为 metadata-only
> 文件路径：`docs/spec/analysis-report-2026-08-11-browser-bookmark-metadata-only.md`
> 创建步骤：STEP 4（规格审查）
> 审查日期：2026-08-11
> 审查人：Codex

---

## 审查范围

| 文件 | 版本 / 日期 |
|------|-------------|
| `docs/spec/requirements.md` | 2.23.0 / 2026-08-11 |
| `docs/spec/design.md` | 1.25.0 / 2026-08-11 |
| `docs/spec/data.md` | 1.12.0 / 2026-08-11 |
| `docs/spec/test_strategy.md` | 2.14.0 / 2026-08-11 |
| `docs/spec/tasks.md` | 4.8.0 / 2026-08-11 |
| `docs/spec/traceability.md` | 1.49.0 / 2026-08-11 |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 2 条 · P2 0 条
- **需用户决策**：1 条，已确认
- **结论**：可进入 STEP 5 / STEP 6，按 metadata-only 新规格执行

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P1 | REQ-035 | 需求冲突 | 现行 REQ-035 将浏览器导入后的 AI 分类与标签整理定义为正式能力，与最新用户要求冲突 | 移除 `REQ-035-AC-004`，并将 `REQ-035-AC-008/010/011` 改为 metadata-only 约束 | 已解决 |
| 2 | P1 | REQ-035 | 设计/测试一致性 | `design.md`、`test_strategy.md`、`tasks.md`、`traceability.md` 仍引用导入后 AI 后处理 | 统一回退为 metadata-only，新增 `TASK-084` 追踪实现与验收 | 已解决 |

---

## 澄清记录

### 澄清 1 · 导入后是否保留部分 AI 能力
**问题**：浏览器书签导入后，是“只禁用 AI 标签但保留 AI 分类”，还是“完全不做 AI 后处理，仅保留 metadata 补全”？

**用户确认**：完全不做 AI 后处理，只保留 metadata 补全。

**处理动作**：
- 删除 REQ 中“AI 分类 / 标签整理”能力
- 保留 metadata 补全、Category 路径融合、favicon 优先与进度回调
- 新增回退实现任务 `TASK-084`

---

## 文档变更清单

| 文件 | 变更摘要 |
|------|----------|
| `docs/spec/requirements.md` | REQ-035 改为 metadata-only，移除导入后 AI 后处理 AC |
| `docs/spec/design.md` | 6.10 改为 metadata-only 编排，进度阶段移除 `ai` |
| `docs/spec/data.md` | 导入增强与数据不变量改为仅约束 metadata 结果 |
| `docs/spec/test_strategy.md` | J-21/J-22 与 in-scope 改为 metadata-only |
| `docs/spec/tasks.md` | 新增 `TASK-084`，追踪回退实现 |
| `docs/spec/traceability.md` | 新增 `TASK-084` 追溯行与修订记录 |

---

## 结论

浏览器书签导入的新规格已与用户意图对齐：确认导入后仅执行 metadata 补全，不再触发任何 AI 分类、标签建议或标签写入。现有数据模型、文件格式和 Category 融合规则可继续复用，无需新增 `data.md` 实体或 `api.md` 契约。
