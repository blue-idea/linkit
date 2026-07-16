# 规格审查报告（Analysis Report）

> 文件路径：`docs/spec/analysis-report-{{DATE}}.md`
> 创建步骤：STEP 4（规格审查）
> 审查日期：{{DATE}}
> 审查人：{{REVIEWER}}

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | {{VERSION_OR_DATE}} |
| `docs/spec/design.md` | {{VERSION_OR_DATE}} |
| `docs/spec/data.md` | {{VERSION_OR_DATE}} |
| `docs/spec/api.md` | {{VERSION_OR_DATE}} |

---

## 审查结论摘要

- **发现问题数**：P0 {{N}} 条 · P1 {{N}} 条 · P2 {{N}} 条
- **已更新文件**：{{LIST_OR_无}}
- **需用户决策**：{{N}} 条（见下方澄清记录）
- **结论**：✅ 可进入 STEP 5 / ⚠️ 待澄清后进入 / ❌ 需重大修订

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P0 | {{REQ_ID}} | {{DIMENSION}} | {{ISSUE_DESC}} | {{ACTION}} | {{STATUS}} |
| 2 | P1 | {{REQ_ID}} | {{DIMENSION}} | {{ISSUE_DESC}} | {{ACTION}} | {{STATUS}} |

> 审查维度：术语一致性 / 用户角色清晰度 / 触发条件完整性 / 系统响应可验证性 / 前置条件与约束 / 跨文档冲突 / 非功能性需求缺失

---

## 澄清问题记录

### 澄清 1 · {{TITLE}}【{{REQ_ID}}】

**问题**：{{QUESTION}}

**选项**：
- A. {{OPTION_A}}
- B. {{OPTION_B}}
- C. {{OPTION_C}}
- D. 其他（请说明）

**用户回复**：{{ANSWER}}

**处理动作**：{{ACTION_TAKEN}} · **更新文件**：{{UPDATED_FILE}}

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| {{FILE}} | {{CHANGE_SUMMARY}} | 新增 / 修改 / 删除 |

---

## 结论

{{CONCLUSION_TEXT}}

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
