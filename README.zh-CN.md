# Linkit — 智能知识收藏空间

<p align="center">
  <img src="https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/dashboard.png" alt="Linkit Dashboard" width="80%">
</p>

<p align="center">
  <a href="https://github.com/blue-idea/linkit/releases"><img src="https://img.shields.io/github/v/release/blue-idea/linkit?style=flat-square&color=blue" alt="GitHub release"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/存储-本地%20%7C%20云端-green?style=flat-square" alt="Storage">
  <img src="https://img.shields.io/badge/AI-内置-purple?style=flat-square" alt="AI">
</p>

<p align="center">
  <a href="README.md">English</a> | <b>简体中文</b>
</p>

---

**Linkit** 是为知识工作者设计的桌面书签管理器。AI 自动摘要、语义搜索与知识图谱，让收藏真正变成资产；主题空间帮你跨分类聚合灵感；链接健康扫描与重复项检测让书签库始终整洁；一键导入 Chrome、Firefox、Raindrop 等数据，六款精美主题开箱即用。本地存储，云端可选，数据始终属于你。支持接入任意 OpenAI 兼容 API 或本地模型（Ollama 等）解锁全部 AI 功能。支持 macOS、Windows 与 Linux。

---

### 🚀 安装

#### 🍺 macOS — Homebrew（推荐）

```bash
brew install blue-idea/tap/linkit
```

```bash
brew upgrade linkit   # 随时升级
```

> Linkit 当前尚未进行 Apple 官方公证。Cask 会在安装后自动移除 Gatekeeper `com.apple.quarantine` 隔离属性，无需 `sudo` 权限。

#### 📦 直接下载

Windows、macOS (DMG) 和 Linux (AppImage / DEB) 的预编译版本均可在 [GitHub Releases](https://github.com/blue-idea/linkit/releases) 页面下载。

> **macOS DMG 用户**：若 Gatekeeper 阻止打开应用，先将 `Linkit.app` 拖入 `Applications`，再双击 DMG 内的 `Fix Gatekeeper.command` 脚本，即可自动清除隔离属性。

---

### 🌟 为什么选择 Linkit？

|                        | Linkit | Raindrop | 浏览器书签 |
| ---------------------- | ------ | -------- | ---------- |
| 本地优先存储           | ✅     | ❌       | ✅         |
| AI 摘要与标签          | ✅     | ❌       | ❌         |
| 语义搜索               | ✅     | ❌       | ❌         |
| 重复书签检测           | ✅     | ✅       | ❌         |
| 知识关联网络           | ✅     | ❌       | ❌         |
| 收藏洞察报告           | ✅     | ❌       | ❌         |
| 浏览器 / Raindrop 导入 | ✅     | ✅       | —         |
| 多设备同步             | ✅     | ✅       | ✅         |
| 离线优先               | ✅     | ❌       | ✅         |

---

### ✨ 核心功能

#### 🗄️ 本地优先，隐私自主

所有书签默认存储在本机 SQLite 数据库中，无需注册账号即可使用。需要多设备同步时，开启可选的 Supabase 云同步即可。无论哪种模式，你的数据永远不会被出售或共享。

#### 📥 一键导入，无缝迁移

几秒钟内完成现有书签的迁移：

- **浏览器 HTML 导出** — Chrome、Firefox、Safari、Edge 均支持
- **Raindrop.io CSV / JSON 导出**
- **剪贴板 URL** — 通过 Spotlight（`Cmd/Ctrl + K`）直接粘贴保存

#### 💡 知识资产，而非链接列表

每条书签都是一张富信息知识卡片：自定义标签、星标、置顶、个人备注，以及阅读状态（`未读` → `在读` → `已读` → `已归档`）。不再让「稍后再看」变成永远不看。

#### 📁 多级分类 + 动态主题空间

通过拖拽构建稳定的分类树。再创建**主题空间（Collections）**——跨分类的创意聚合区，支持自定义 Emoji 和配色，适合项目管理、研究课题或灵感收集。手动拖入书签，或用一句话让 AI 自动策划整个主题。

#### 🤖 内置 AI 助手

接入任意 OpenAI / DeepSeek 兼容 API 或本地大模型（Ollama 等），即可解锁：

- 自动抓取页面、生成摘要与核心要点
- 智能推荐标签与分类
- 自然语言指令一键生成主题空间
- 全库语义向量搜索
- 重复书签检测与合并建议

#### 🔍 Spotlight 闪念搜索（`Cmd/Ctrl + K`）

随时唤起，对标题、备注、标签和 AI 内容进行全文及语义搜索。同时也是快速入库入口——粘贴 URL 即可完成保存，无需切换窗口。

#### 📊 收藏洞察报告

Linkit 定期生成**洞察报告**，汇总你的收藏习惯：最常用标签、阅读进度、内容分布规律，以及 AI 从未读堆中挖掘出的精华推荐。让书签库从「信息坟场」变成真正的知识资产。

#### 🔁 重复书签检测

自动识别完全相同的 URL 以及 AI 判断的近似重复（内容相同、链接不同）。一键审查并合并，保持书签库整洁有序。

#### ❤️ 链接健康扫描

后台定期扫描，自动标记失效链接（`404`）和内容已变更的页面。按状态筛选，批量清理，防止死链堆积。

#### 🌐 知识关联网络

将整个书签库可视化为交互式网络图谱。节点之间通过共同标签、主题空间和 AI 语义相似度建立连接，点击任意节点即可跳转至对应书签。

#### 🛡️ 安全云同步

开启同步后，所有数据受 Supabase 行级安全策略（RLS）保护——每一行记录在数据库层面与你的用户 ID 绑定，任何人（包括我们）都无法读取你的书签。

---

### 📸 界面展示

#### 📊 桌面工作空间（Dashboard）

三栏式布局，可折叠侧边栏，六种视图模式（卡片、列表、瀑布流、时间流、标签聚合、主题空间），以及详情面板。
![工作空间](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/dashboard.png)

#### 🔍 Spotlight 快速搜索（`Cmd/Ctrl + K`）

多属性全文搜索与语义搜索，或直接粘贴 URL 完成即时入库分析。
![快速搜索](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/spotlight.png)

#### 🤖 AI 智能洞察与摘要

一键提取网页核心要点，自动生成标签，输出简明摘要——本地或云端 API 均可驱动。
![AI 智能](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/ai_insights.png)

#### 📥 捕获与入库

拖拽或剪贴板检测，AI 实时抓取元数据并推荐标签。
![入库分析](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/add_bookmark.png)

#### 💔 链接健康扫描

扫描死链与内容变更页面，按状态筛选，一键清理。
![健康扫描](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/health_check.png)

#### ⚙️ 偏好设置与主题

六款精美主题（*Midnight*、*Ocean*、*Graphite*、*Sunset*、*Daylight*、*Paper*），中英双语界面一键切换。
![系统设置](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/settings.png)

---

### 🛠️ 技术栈

- **桌面框架**：[Wails](https://wails.io/) (Go)
- **前端核心**：[React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **页面样式**：[Tailwind CSS](https://tailwindcss.com/) + 毛玻璃微动效设计系统
- **本地数据库**：SQLite（via GORM）
- **云同步**：[Supabase](https://supabase.com/)（PostgreSQL + 行级安全策略）
- **AI 引擎**：兼容 OpenAI / DeepSeek 标准 API 及本地大模型（Ollama）

---

### 🔑 隐私安全与数据保护

- **本地优先**：无需账号，无遥测，无云端依赖，开箱即用。
- **RLS 强制隔离**：云端同步时，每行数据在数据库层面与 `auth.uid()` 绑定，杜绝越权访问。
- **系统级密钥存储**：AI API 密钥通过宿主系统安全凭据层（`go-keyring` → macOS Keychain / Windows Credential Manager）本地存取，绝不硬编码，绝不上传。
