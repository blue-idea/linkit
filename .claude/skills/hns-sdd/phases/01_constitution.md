# STEP 1 · 立规矩（Constitution）

> **前置**：已完成 STEP 0（通用规范已加载）
> **输出文件**：`docs/spec/constitution.md`
> **模板参考**：`templates/tpl_constitution.md`

---

## 目标

为项目建立**技术宪法**——一份覆盖技术栈约束、工程化要求、沟通规范、安全与隐私、一致性要求的基础文件。

> constitution **不涉及具体功能逻辑**，只约束"如何做事"。

---

## 执行步骤

1. 加载 `templates/tpl_constitution.md`，以其为骨架开始填写。
2. 与用户确认以下核心维度（逐条确认，不得跳过）：

| 维度 | 需确认的内容 |
|------|------------|
| 技术栈 | 主语言、框架、运行时版本 |
| 包管理 | 使用 npm / pnpm / yarn，版本锁定策略 |
| TypeScript | 严格模式开关，`any` / `as` 使用约束 |
| 编码安全 | RLS、Rate Limiting、API 密钥管理方式 |
| 质量基线 | Lint 规则、Git Hooks、CI/CD 配置 |
| 测试策略 | 单元测试框架、E2E 框架 |
| 文档结构 | `docs/spec/` 目录下各文件职责 |

3. 所有维度确认后，生成 `docs/spec/constitution.md`。
4. 与用户二次确认文件内容，定稿后**禁止再修改**（如需变更须显式通知并记录原因）。

---

## 完成判定

- [ ] `docs/spec/constitution.md` 文件已创建
- [ ] 用户已明确确认内容定稿
- [ ] 文件中无占位符（`[TODO]` / `...` 等）残留
