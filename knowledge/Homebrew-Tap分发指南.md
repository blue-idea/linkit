# macOS Homebrew Tap 自建分发指南（无证书/免隔离属性方案）

## 1. 背景与核心原理

### 1.1 为什么无法继续使用 Homebrew 官方 Cask
* **Gatekeeper 隔离限制**：macOS 默认给从网络下载的未签名/未公证应用赋予 `com.apple.quarantine` 属性。在没有 $99/年 Apple 开发者证书进行 `codesign` 和 `notarytool` 公证的情况下，用户打开应用时会触发 *“已损坏，无法打开。你应该将它移到废纸篓”* 的警告。
* **官方规则封禁**：过去开发者可以在 Cask 的 `postflight` 钩子中执行 `xattr -d com.apple.quarantine` 帮用户解封。但 Homebrew 官方目前合入了严格审查规范（参见 [Homebrew/brew#20755](https://github.com/Homebrew/brew/issues/20755)），**禁止在官方 `homebrew/cask` 仓库中包含修改系统隔离属性的指令**。

### 1.2 私人 Tap 的解法优势
自建私人 Homebrew Tap（第三方源）不受官方 Cask 严格审计约束。在私人 Cask 的 `postflight` 中配置自动清除隔离标记，用户只需执行一行 `brew install` 命令即可无感知安装并直接运行应用。

---

## 2. 架构与 Tap 仓库创建

Homebrew 遵循约定优于配置（Convention over Configuration）的命名规则：

1. 在 GitHub 上新建公开仓库，命名必须为：`homebrew-tap`（或 `homebrew-<custom-name>`）。
   > 例如 GitHub 组织/用户名为 `myorg`，仓库名设为 `homebrew-tap`，用户安装时即可使用简写 `myorg/tap`。
2. 建立标准的 Cask 目录结构：

```text
homebrew-tap/
└── Casks/
    └── linkit.rb
```

---

## 3. Cask 配置文件模版 (`Casks/linkit.rb`)

在 `homebrew-tap/Casks/linkit.rb` 中填入以下模板。重点在于 `postflight` 块中的 `system_command "xattr"`：

```ruby
cask "linkit" do
  arch arm: "aarch64", intel: "x86_64"

  version "1.0.0"
  sha256 arm:   "ARM64_RELEASE_DMG_SHA256_HASH",
         intel: "INTEL_RELEASE_DMG_SHA256_HASH"

  url "https://github.com/your-username/your-repo/releases/download/v#{version}/LinkIt_#{version}_#{arch}.dmg"
  name "LinkIt"
  desc "AI Copilot + Supabase Sync Desktop Client"
  homepage "https://github.com/your-username/your-repo"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "LinkIt.app"

  # 关键点：在安装后自动清理 macOS com.apple.quarantine 隔离标记
  # 免去用户手动在终端跑 xattr -d /Applications/LinkIt.app 的步骤
  postflight do
    system_command "xattr",
                   args: ["-dr", "com.apple.quarantine", "#{appdir}/LinkIt.app"],
                   sudo: false
  end

  zap trash: [
    "~/Library/Application Support/LinkIt",
    "~/Library/Preferences/com.linkit.app.plist",
    "~/Library/Saved Application State/com.linkit.app.savedState",
  ]
end
```

---

## 4. GitHub Actions 自动化部署流水线

为了在主应用仓库发布 Release 时自动计算 DMG 哈希并更新 Tap 仓库中的 `.rb` 配置文件，请在主工程的 GitHub Actions（如 `.github/workflows/release.yml`）中添加以下 Job：

```yaml
jobs:
  # ...前面的打包与 GitHub Release 流程 ...

  update-brew-tap:
    needs: publish-github-release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Homebrew Tap
        uses: actions/checkout@v4
        with:
          repository: 'your-username/homebrew-tap'
          token: ${{ secrets.TAP_GITHUB_TOKEN }} # 需要具有写 repo 权限的 PAT Token
          path: homebrew-tap

      - name: Calculate SHA256 and Update Cask
        run: |
          VERSION="${{ github.ref_name }}"
          VERSION_NUMBER="${VERSION#v}" # 去掉 tag 的 v 前缀
          
          # 从 GitHub Release 产物计算 sha256
          SHA256_ARM=$(curl -sL "https://github.com/your-username/your-repo/releases/download/${VERSION}/LinkIt_${VERSION_NUMBER}_aarch64.dmg" | sha256sum | awk '{print $1}')
          SHA256_INTEL=$(curl -sL "https://github.com/your-username/your-repo/releases/download/${VERSION}/LinkIt_${VERSION_NUMBER}_x86_64.dmg" | sha256sum | awk '{print $1}')
          
          CASK_FILE="homebrew-tap/Casks/linkit.rb"
          
          # 更新版本号与 SHA256 字段
          sed -i "s/version \".*\"/version \"${VERSION_NUMBER}\"/" $CASK_FILE
          sed -i "s/sha256 arm:   \".*\"/sha256 arm:   \"${SHA256_ARM}\"/" $CASK_FILE
          sed -i "s/sha256 intel: \".*\"/sha256 intel: \"${SHA256_INTEL}\"/" $CASK_FILE

      - name: Commit and Push to Tap
        run: |
          cd homebrew-tap
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add Casks/linkit.rb
          git commit -m "bump: update LinkIt to ${{ github.ref_name }}" || exit 0
          git push
```

---

## 5. 用户引导文案（README / 官网）

在 README 或落地页中引导 macOS 用户安装：

```markdown
### 🍺 安装方式 (macOS)

推荐使用 Homebrew 快速安装：

```bash
# 自动 tap 并安装
brew install your-username/tap/linkit
```

升级到最新版本：
```bash
brew upgrade linkit
```
```

---

## 6. 方案对比总结

| 维度 | Apple 官方公证 + 官方 Cask | 裸 DMG 分发 | 私人 Homebrew Tap + postflight (本方案) |
| :--- | :--- | :--- | :--- |
| **费用** | $99 / 年 | $0 | **$0** |
| **用户体验** | 一键打开 | 拦截报错“已损坏”，需终端手动 `xattr -d` | **一键安装并自动解除拦截，可无感直接打开** |
| **维护成本** | 复杂证书续费与签名流水线 | 无 | **一次性配置 Tap 仓库与 CI 自动化** |
