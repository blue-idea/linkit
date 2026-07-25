# AC 验收矩阵（TASK-076）

> 任务编号：TASK-076
> 执行日期：2026-07-25
> 范围：macOS Homebrew Tap 分发、Cask 更新器、Release 自动更新与安装链路

---

## 验收结果

| TASK ID | AC ID | QA 类型 | 实际结果摘要 | 状态 | 证据 | 错误详情 |
|---------|-------|:-------:|------------|:----:|------|---------|
| TASK-076 | REQ-032-AC-001 | Unit + Integration | `v0.2.2` 的 `Linkit.dmg` 存在；公开 Cask 使用版本 `0.2.2`、真实 SHA256 `41ed2e...741d`、版本化 Release URL 与 `Linkit.app`，Homebrew 安装时完成哈希校验 | PASS | `config/homebrew-tap.json`、`homebrew-tap/Casks/linkit.rb`、[Release v0.2.2](https://github.com/blue-idea/collection/releases/tag/v0.2.2)、[Tap CI 30141644793](https://github.com/blue-idea/homebrew-tap/actions/runs/30141644793) | — |
| TASK-076 | REQ-032-AC-002 | Manual | macOS runner 从公开 `blue-idea/tap` 安装 Cask，日志显示 `Linkit.app` 移动到 `/Applications/Linkit.app` 且安装成功；Cask 由 Homebrew 管理并提供 `brew upgrade linkit` 路径 | PASS | `homebrew-tap/.github/workflows/ci.yml`、[Tap CI 30141644793](https://github.com/blue-idea/homebrew-tap/actions/runs/30141644793) | — |
| TASK-076 | REQ-032-AC-003 | Manual | macOS runner 确认 `/Applications/Linkit.app` 存在且 `xattr -p com.apple.quarantine` 不返回属性；随后成功卸载；Cask 明确 `sudo: false` 且目标仅为 `#{appdir}/Linkit.app` | PASS | `homebrew-tap/Casks/linkit.rb`、[Tap CI 30141644793](https://github.com/blue-idea/homebrew-tap/actions/runs/30141644793) | — |
| TASK-076 | REQ-032-AC-004 | Unit + Integration | 更新器的版本/SHA256 替换与幂等逻辑通过；Release Job 已实现下载资产、计算哈希、仅变化时提交，但尚未执行一次真实 Release→Tap 写入 | BLOCKED | `scripts/update-homebrew-cask.test.mjs`、`.github/workflows/release.yml`、`docs/spec/reports/TASK-076-report.md` | 主仓库未配置 `TAP_GITHUB_TOKEN`，且当前可用 GitHub OAuth Token 权限过宽，不得写入 Secret；需创建仅授权 `blue-idea/homebrew-tap` Contents Write 的 fine-grained PAT，并在后续真实 Release 验证提交 |
| TASK-076 | REQ-032-AC-005 | Unit | 非法 tag、占位/大写/错误长度 SHA256 与缺失 CLI 参数均真实返回英文错误和非零状态；Workflow 对缺失 `TAP_GITHUB_TOKEN` 显式失败，凭据扫描无命中 | PASS | `scripts/update-homebrew-cask.test.mjs`、`ui/verify-quality-config.mjs`、`.github/workflows/release.yml` | — |
| TASK-076 | REQ-032-AC-006 | Unit | English/中文 README 与 Tap README 均包含安装、升级命令和 quarantine 清理披露 | PASS | `README.md`、`README.zh-CN.md`、`homebrew-tap/README.md`、`ui/verify-quality-config.mjs` | — |

---

## 测试命令与真实结果

```text
node --experimental-test-coverage --test scripts/update-homebrew-cask.test.mjs
# tests 8; pass 8; fail 0
# lines 98.21%; branches 80.00%; functions 100.00%

pnpm --dir ui verify:quality-config
# Quality configuration is valid

actionlint .github/workflows/release.yml homebrew-tap/.github/workflows/ci.yml
# exit 0; actionlint v1.7.12

pnpm --dir ui typecheck
pnpm --dir ui lint
pnpm --dir ui build
# all exit 0; build retains the existing chunk-size warning

go test ./...
go vet ./...
# all exit 0

gh run view 30141644793 --repo blue-idea/homebrew-tap
# conclusion: success; verify-cask: success

gh secret list --repo blue-idea/collection
# TAP_GITHUB_TOKEN is not configured
```

## TDD 记录

- Red：先运行更新器与质量配置契约，确认缺少更新器、Cask、Workflow Job 与 README 安装说明时失败。
- Green：新增集中配置、Cask、更新器、Release Job、Tap CI 与中英文安装文档，8 个 Node 测试和质量契约转为通过。
- Refactor：Workflow 与更新器复用 `config/homebrew-tap.json`；更新器只允许唯一 `version` / `sha256` stanza；quarantine 清理限制在 `Linkit.app` 且不使用 `sudo`。
