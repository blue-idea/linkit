# STEP 2 · 需求文档（Requirements）

> **前置**：`docs/spec/constitution.md` 已定稿
> **输出文件**：`docs/spec/requirements.md`
> **模板参考**：`templates/tpl_requirements.md`

---

## 目标

使用 **EARS 简易需求语法**将用户需求结构化，形成可验收、可追溯的需求文档。

---

## EARS 语法速查

```
While <可选前置条件>, when <可选触发器>,
the <系统名称> shall <系统响应>
```

---

## 执行步骤

1. 与用户进行需求访谈，梳理核心用户故事。
2. 加载 `templates/tpl_requirements.md`，为每条需求分配唯一 `REQ-XXX` 编号。
3. 每条需求下编写若干**验收标准（AC）**，每条 AC 分配 `REQ-XXX-AC-YYY` 编号。
4. 每条 AC 必须包含：
   - EARS 描述句
   - `expected`：期望的 HTTP 状态、响应体 Schema、副作用
   - `test_type`：`API` | `E2E` | `Unit` | `Manual`
5. 与用户**逐条确认**需求内容，达成共识后定稿。
6. 定稿后生成 `docs/spec/requirements.md`。

---

## 质量检查清单

在提交给用户确认前，逐项自检：

- [ ] 每条 EARS 中 "系统响应" 是否**可被测试**？（无主观表述如"友好""快速"）
- [ ] 所有异常场景（空输入、越权、超时等）是否已覆盖？
- [ ] 每条 AC 是否关联了 `test_type`？
- [ ] 需求编号是否连续、无遗漏？

---

## 完成判定

- [ ] `docs/spec/requirements.md` 文件已创建
- [ ] 所有 REQ 均有至少一条 AC
- [ ] 用户已明确确认内容定稿
