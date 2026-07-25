# 规格审查报告（Analysis Report）

> 文件路径：`docs/spec/analysis-report-2026-07-25-homebrew-tap.md`
> 创建步骤：STEP 4（规格审查）
> 审查日期：2026-07-25
> 审查人：Codex

---

## 审查范围

| 文件 | 版本 / 最后修改日期 |
|------|------------------|
| `docs/spec/requirements.md` | 2.17.0 / 2026-07-25 |
| `docs/spec/design.md` | 1.16.0 / 2026-07-25 |
| `docs/spec/data.md` | 无数据模型变更 |
| `docs/spec/api.md` | 无应用接口变更 |

---

## 审查结论摘要

- **发现问题数**：P0 0 条 · P1 2 条 · P2 1 条
- **已更新文件**：`requirements.md`、`design.md`
- **需用户决策**：0 条；用户已指定参考指南与完成目标，仓库远程和 Release 资产提供了可验证的项目参数
- **结论**：✅ 可进入 STEP 5

---

## 问题列表

| # | 优先级 | 关联需求 | 维度 | 问题描述 | 处理方式 | 状态 |
|---|:------:|---------|------|---------|---------|:----:|
| 1 | P1 | REQ-032 | 跨文档冲突 | 参考模板使用 arm64/intel 双 DMG，但现有 Release 只发布 universal `Linkit.dmg` | 需求与设计明确使用单一 SHA256，禁止制造不存在的双架构 URL | 已解决 |
| 2 | P1 | REQ-032-AC-004~005 | 前置条件与约束 | `blue-idea/homebrew-tap` 尚不存在，主仓库也未配置跨仓库写 Secret | 将远程仓库、细粒度 Token 与真实 Release 运行列为部署门禁；本地实现不得伪报远程 PASS | 已记录 |
| 3 | P2 | REQ-032-AC-003 | 安全性 | `xattr -dr` 若作用域过大会修改无关应用 | Cask 将目标限制为 `#{appdir}/Linkit.app` 且禁用 sudo，契约测试检查路径 | 已解决 |

---

## 澄清问题记录

无。项目参数可由 `origin=https://github.com/blue-idea/collection.git`、最新 Release `v0.2.2` 及资产 `Linkit.dmg` 直接确认；参考文档已明确 Tap 命名、安装命令与 quarantine 处理目标。

---

## 文档变更清单

| 文件 | 变更内容摘要 | 变更类型 |
|------|------------|---------|
| `docs/spec/requirements.md` | 新增 REQ-032 与 6 条 AC，明确 universal DMG、自动更新、失败路径、README 与 Manual 验收 | 修改 |
| `docs/spec/design.md` | 新增 Tap 数据流、集中配置、更新器边界、安全约束与风险缓解 | 修改 |
| `docs/spec/data.md` | 无持久化数据或数据库变化 | 无 |
| `docs/spec/api.md` | 无 Wails、Supabase 或 HTTP API 契约变化 | 无 |

---

## 结论

需求、设计、现有 Release 资产与参考指南已对齐，无遗留 P0/P1 规格歧义。STEP 5 应拆分一个 `TASK-076`，以 Node 单元测试和配置契约测试覆盖自动更新逻辑，并将真实 macOS `brew install`、远程 Tap 仓库与 Secret 配置保留为可审计的 Manual/BLOCKED 门禁。

> 本报告归档后不再修改。如 STEP 5 / 6 期间发现新问题，须新建审查报告记录。
