# TASK-076 测试报告

> 任务：macOS Homebrew Tap 分发与 Release 自动更新
> 版本 / Sprint / 发布：TASK-076 / Linkit v0.2.2
> 报告日期：2026-07-25
> 执行人：Codex

---

## 摘要

- **状态：** ⚠️ 风险通过
- **验收检查：** 19 | **通过：** 18 | **失败：** 0 | **BLOCKED：** 1
- **覆盖率：** 更新器行 98.21% | 分支 80.00% | 函数 100.00% | 完整 AC 关键路径 83.33%（5/6）
- **持续时间：** macOS Tap CI 64s；本地核心 Node 与质量契约小于 10 分钟

公开 Tap、真实 macOS 安装、`/Applications/Linkit.app`、quarantine 清理与卸载均已通过。风险通过的唯一原因是主仓库尚未配置最小权限 `TAP_GITHUB_TOKEN`，因此真实 Release→Tap 自动提交没有执行，不得标记为 PASS。

---

## 质量评分

| 维度 | 权重 | 得分 | 备注 |
|------|:---:|:---:|------|
| 测试覆盖率 | 20% | 20 | 更新器行覆盖率 98.21% |
| 关键路径覆盖率 | 20% | 0 | 按严格规则，AC-004 的真实跨仓库写入未闭环，完整关键路径未达到 100% |
| 缺陷逃逸率 | 15% | 15 | 本任务验收未发现已知逃逸缺陷 |
| 测试套件速度 | 10% | 10 | 本地核心门禁和远程 Tap CI 均小于 10 分钟 |
| 不稳定率 | 10% | 10 | 本次执行无不稳定测试 |
| 安全测试覆盖率 | 10% | 3 | 完成凭据扫描、最小权限审查和无 `sudo` / 最小 xattr 作用域检查 |
| 文档 | 5% | 5 | 需求、设计、任务、策略、追踪、AC、报告和 README 已同步 |
| 自动化比例 | 10% | 10 | 18/19 验收检查自动化执行，唯一未执行项为真实 Release 写入 |
| **总分** | **100%** | **73** | 🟢 良好（风险通过） |

---

## 关键发现

### 🔴 致命（阻塞当前 Tap 使用）

无。`v0.2.2` 已可从公开 Tap 安装。

### 🟡 高（在下次 Release 前修复）

1. 主仓库未配置 `TAP_GITHUB_TOKEN` — 后续 Release 会在 `Update Homebrew Tap` Job 明确失败，Tap 不会自动更新。必须创建仅授权 `blue-idea/homebrew-tap` 且仅含 Contents Write 的 fine-grained PAT；不得复用当前广权限 `gho_...` OAuth Token。

### 🟢 中 / 低（待办事项）

1. 当前只有 `v0.2.2`，未执行一次真实跨版本 `brew upgrade`；Homebrew 管理路径、升级命令和 Cask `livecheck` 已就绪，可在下一版本发布时闭环。
2. Vite 构建保留既有 500KB chunk-size warning，与本任务无关且不影响构建成功。

---

## 风险评估

- **未测试区域：** 真实 `release.yml` 使用 fine-grained PAT 向 Tap 创建提交；从 `v0.2.2` 升级到后续真实版本。
- **已知不稳定测试：** 无。
- **性能关注：** 无；Cask 更新仅处理一个小型 Ruby 文件，macOS Tap CI 总耗时约 64 秒。
- **安全关注：** 禁止将当前广权限 OAuth Token 写入 Actions Secret；Cask 会主动移除 Gatekeeper quarantine，README 已向用户披露，且作用域仅限已安装的 `Linkit.app`。

---

## 各层测试结果汇总

| 测试类型 | 用例总数 | 通过 | 失败 | BLOCKED | 结果 |
|---------|:-------:|:---:|:---:|:-------:|------|
| Node 单元测试 | 8 | 8 | 0 | 0 | 行 98.21%、分支 80.00%、函数 100.00% |
| 质量配置契约 | 1 | 1 | 0 | 0 | Workflow/Cask/Tap CI/README 契约通过 |
| Workflow lint | 2 | 2 | 0 | 0 | `actionlint v1.7.12` 通过 |
| 前端静态检查与构建 | 3 | 3 | 0 | 0 | Typecheck、Lint、Build 通过 |
| Go 回归与静态检查 | 2 | 2 | 0 | 0 | `go test ./...`、`go vet ./...` 通过 |
| macOS Tap CI | 1 | 1 | 0 | 0 | Ruby/style/install/xattr/uninstall 全部通过 |
| 凭据扫描 | 1 | 1 | 0 | 0 | 无 Token/Secret 命中 |
| 真实 Release→Tap 写入 | 1 | 0 | 0 | 1 | 缺少最小权限 `TAP_GITHUB_TOKEN` |

---

## 可复核证据

- [Linkit v0.2.2 Release](https://github.com/blue-idea/collection/releases/tag/v0.2.2)：包含 `Linkit.dmg`（9,816,977 bytes）。
- [Homebrew Tap macOS CI 30141644793](https://github.com/blue-idea/homebrew-tap/actions/runs/30141644793)：`verify-cask` 结论为 `success`。
- CI 日志：`Moving App 'Linkit.app' to '/Applications/Linkit.app'`、`linkit was successfully installed!`，quarantine 检查退出 0，随后卸载并删除应用。
- 远程 Tap 与本地种子 blob SHA 一致：Cask `64b41a0e...ad920`、README `0ddc123a...c320`、Workflow `3b61ea54...ca49`。
- AC 矩阵：`docs/spec/ac/TASK-076-AC.md`。

---

## 发布建议

- [ ] ✅ 可以宣称 Release 自动更新已完全启用
- [x] ⚠️ 当前 Tap 可用；在下次 Release 前配置最小权限 Token，并以真实发布闭环自动提交
- [ ] ❌ 暂缓当前 `v0.2.2` Tap 分发
