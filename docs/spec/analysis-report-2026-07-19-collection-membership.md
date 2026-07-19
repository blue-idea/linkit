# 规格审查报告（Analysis Report）

> 文件路径：`docs/spec/analysis-report-2026-07-19-collection-membership.md`
> 创建步骤：STEP 4（规格审查）
> 审查日期：2026-07-19
> 审查人：Auto（SDD）
> 主题：收藏主题视图手动添加 / 移出书签（REQ-012-AC-006~011）

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | 2.2.0 / 2026-07-19 |
| `docs/spec/design.md` | 1.6.0 / 2026-07-19 |
| `docs/spec/data.md` | 现有 Collection / Bookmark 成员双向模型（无本次变更） |
| `docs/spec/api.md` | 无本次变更（不新增 Go / Supabase 接口） |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 0 条 · P2 2 条
- **已更新文件**：`requirements.md`、`design.md`
- **需用户决策**：0 条
- **结论**：✅ 可进入 STEP 5

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P2 | REQ-012-AC-008 | 触发条件完整性 | Confirm 在零选中时的交互未在需求中显式写出 | 设计 6.5 约定 Confirm 禁用；实现按设计执行 | closed |
| 2 | P2 | REQ-012-AC-007 | 术语一致性 | 搜索大小写敏感度未在 AC 中声明 | 设计 6.5 约定 title/URL 不区分大小写搜索 | closed |

---

## 七维审查结果

| 维度 | 结果 |
|------|------|
| 术语一致性 | 通过；Collection / 主题 / 成员关系与既有术语一致；UI 文案统一英文 |
| 用户角色清晰度 | 通过；本地用户与登录用户均可在当前资料库操作，无新增权限边界 |
| 触发条件完整性 | 通过；覆盖工具栏入口、挑选器、确认、取消、空态 CTA、单条/多选移出 |
| 系统响应可验证性 | 通过；AC 均含可观察 ui_state 或双向成员副作用，无主观表述 |
| 前置条件与约束 | 通过；均绑定「正在查看某一收藏主题」或对话框可见前提 |
| 跨文档冲突 | 通过；复用 DATA-INV-005 双向一致；设计引入 `batchSetBookmarkCollectionMembership` 与批量 Move/Delete 原子语义一致；无 API/数据模型冲突 |
| 非功能性需求缺失 | 通过；沿用既有防抖保存与领域命令边界；不新增网络或密钥路径 |

---

## 澄清问题记录

本次审查无 P0 / P1 澄清项。用户已在 STEP 2 / STEP 3 确认：

- 入口形态 A（工具栏 Add bookmarks）
- 排除已成员 + 搜索多选 + 确认前零副作用
- 空态 CTA
- 单条即时移出、多选确认后移出
- 批量成员变更采用单一领域命令返回新 LibraryData

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| `docs/spec/requirements.md` | 版本 2.2.0；REQ-012 用户故事微调；新增 AC-006~011 | 修改 |
| `docs/spec/design.md` | 版本 1.6.0；6.3 补充主题视图移出；新增 6.5；领域命令列表增加 batchSetBookmarkCollectionMembership | 修改 |
| `docs/spec/data.md` | 无变更 | — |
| `docs/spec/api.md` | 无变更 | — |

---

## 结论

REQ-012-AC-006~011 与 design 1.6.0 一致，数据与接口无需扩展，无遗留 P0 / P1。可进入 **STEP 5** 拆分任务、更新 `tasks.md` / `test_strategy.md` / `traceability.md`。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
