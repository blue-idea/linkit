---
name: hns-gh-ac
description: "使用 GitHub CLI (gh) 修复 GitHub Actions CI 失败：检查运行/日志、识别根本原因、修复工作流/代码、重新运行作业并总结验证。在 GitHub Actions CI 失败或需要诊断时使用。"
trigger: /hnx-gh-ac
---

# CI 修复 (GitHub Actions)

## 目标

- 通过最小化、可审查的差异快速使 CI 恢复绿色（通过）。
- 使用 `gh` 定位失败的运行、检查日志/产物、重新运行作业并确认修复。

## 需要询问的输入（如果缺失）

- 仓库 (`OWNER/REPO`) 以及这是 PR 还是分支构建。
- 失败的运行 URL/ID（或 PR 编号 / 分支名称）。
- “绿色”意味着什么（必填的工作流？允许的不稳定重新运行？）。
- 任何限制（禁止修改工作流、禁止更改权限、禁止强制推送等）。

## 工作流程（清单）

1. 确认 `gh` 环境
   - 身份验证：`gh auth status`
   - 仓库：`gh repo view --json nameWithOwner -q .nameWithOwner`
   - 如果需要，在所有命令中添加 `-R OWNER/REPO`。
   - 如果未安装 `gh` 或未通过身份验证，告知用户并询问是安装/身份验证还是手动粘贴日志/运行 URL。
2. 找到失败的运行
   - 如果有运行 URL，提取运行 ID：`.../actions/runs/<id>`。
   - 否则：
     - 最近的失败：`gh run list --limit 20 --status failure`
     - 分支失败：`gh run list --branch <branch> --limit 20 --status failure`
     - 工作流失败：`gh run list -w <workflow> --limit 20 --status failure`
   - 在浏览器中打开：`gh run view <id> --web`
3. 从日志中提取信号
   - 作业/步骤概览：`gh run view <id> --verbose`
   - 仅失败的步骤：`gh run view <id> --log-failed`
   - 作业的完整日志：`gh run view <id> --log --job <job-id>`
   - 下载产物：`gh run download <id> -D .artifacts/<id>`
4. 识别根本原因（优先选择最小化修复）
   - 使用 `references/ci-failure-playbook.md` 查找常见模式和安全修复方案。
   - 偏好顺序：确定性的代码/配置修复 > 工作流管道修复 > 针对不稳定错误的重新运行。
5. 实施修复（最小化差异）
   - 更新代码/测试/配置和/或 `.github/workflows/*.yml`。
   - 将更改范围限制在失败的作业/步骤中。
   - 如果更改触发器/权限/机密，请说明风险并获得明确确认。
6. 在 GitHub Actions 中验证
   - 仅重新运行失败的部分：`gh run rerun <id> --failed`
   - 重新运行特定作业（注意：作业的 **databaseId**）：`gh run view <id> --json jobs --jq '.jobs[] | {name,databaseId,conclusion}'`
   - 观察直至完成：`gh run watch <id> --compact --exit-status`
   - 手动触发：`gh workflow run <workflow> --ref <branch>`

## 安全说明

- 除非用户明确要求并理解安全权衡，否则避免使用 `pull_request_target`（以及任何使用机密运行不受信任的分支代码的更改）。
- 保持工作流 `permissions:` 为最小权限；不要为了“让它通过”而扩大令牌访问权限。

## 交付成果（粘贴在聊天 / PR 中）

- **总结：** ...
- **失败的运行：** <链接/ID> (作业/步骤)
- **根本原因：** ...
- **修复方案：** ...
- **验证：** 命令 + 新的运行链接/ID
- **备注/风险：** ...
