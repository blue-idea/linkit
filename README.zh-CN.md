# Linkit — 智能知识收藏空间

<p align="center">
  <img src="ui/screenshot/dashboard.png" alt="Linkit Dashboard" width="80%">
</p>

<p align="center">
  <a href="https://github.com/blue-idea/linkit/releases"><img src="https://img.shields.io/github/v/release/blue-idea/linkit?style=flat-square&color=blue" alt="GitHub release"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/存储-本地%20%7C%20云端-green?style=flat-square" alt="Storage">
  <img src="https://img.shields.io/badge/费用-完全免费-brightgreen?style=flat-square" alt="Cost">
  <img src="https://img.shields.io/badge/AI-内置-purple?style=flat-square" alt="AI">
</p>

<p align="center">
  <a href="README.md">English</a> | <b>简体中文</b>
</p>

---

**Linkit** 是为知识工作者设计的桌面书签管理器。AI 自动摘要、语义搜索与知识图谱，让收藏真正变成资产；主题空间帮你跨分类聚合灵感；链接健康扫描与重复项检测让书签库始终整洁；一键导入 Chrome、Firefox、Raindrop 等数据，十二款精美主题开箱即用。**本地存储 + 云端同步双轨架构，且完全免费无任何付费墙**，数据始终属于你。支持接入任意 OpenAI 兼容 API 或本地模型（Ollama 等）解锁全部 AI 功能。支持 macOS、Windows 与 Linux。

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

|                        | Linkit      | Raindrop                | 浏览器书签  |
| ---------------------- | ----------- | ----------------------- | ----------- |
| 本地优先存储           | ✅          | ❌                      | ✅          |
| AI 摘要与标签          | ✅          | ❌                      | ❌          |
| 语义搜索               | ✅          | ❌                      | ❌          |
| 重复书签检测           | ✅          | ✅                      | ❌          |
| 知识关联网络           | ✅          | ❌                      | ❌          |
| 收藏洞察报告           | ✅          | ❌                      | ❌          |
| 浏览器 / Raindrop 导入 | ✅          | ✅                      | —          |
| 多设备同步             | ✅          | ✅                      | ✅          |
| 离线优先               | ✅          | ❌                      | ✅          |
| 费用政策（无付费墙）   | ✅ 完全免费 | ❌ 需付费订阅（$3+/月） | ✅ 完全免费 |

---

### ✨ 核心功能

#### 🗄️ 本地优先存储，极致隐私（完全免费）

- **零门槛、无账号依赖**：所有书签默认保存在本地 SQLite 数据库中，打开即用，无需注册登录，无网络也能流畅使用所有核心功能。
- **毫秒级性能与无容量限制**：本地读写毫秒响应，书签收藏数量无上限，绝无任何收费门槛或使用时长限制。
- **数据 100% 自主掌控**：你的数据仅存在于你自己的设备中，绝不收集隐私，绝不上传遥测数据。

#### ☁️ 免费安全云端同步（基于 Supabase RLS）

- **多端实时无缝同步**：随时登录开启云端同步，多台设备间书签、分类、主题空间与标签毫秒级保持一致。
- **企业级行级安全（RLS）**：后端由 Supabase（PostgreSQL）强力驱动，每一行数据在数据库底层与你的 `auth.uid()` 绑定，物理隔离。除你之外任何人（包括开发者）都无法查看你的书签。
- **智能冲突解决与草稿防护**：内置版本修订跟踪与冲突合流策略，避免多端同时编辑导致数据覆盖；支持脏草稿恢复，断网也不会丢失任何编辑内容。
- **100% 完全免费，无付费墙**：区别于同类工具将多设备同步、全文检索或备份作为收费订阅项，Linkit 的云同步与全套功能**完全免费开放**，没有 Pro 版、没有隐藏付费。

#### 📥 一键导入，无缝迁移

几秒钟内完成现有书签的迁移：

- **浏览器 HTML 导出** — Chrome、Firefox、Safari、Edge 均支持
- **Raindrop.io CSV / JSON 导出**
- **剪贴板 URL** — 通过 Spotlight（`Cmd/Ctrl + K`）直接粘贴保存

#### 💡 知识资产，而非链接列表

每条书签都是一张富信息知识卡片：自定义标签、星标、置顶、个人备注，以及阅读状态（`未读` → `在读` → `已读` → `已归档`）。不再让「稍后再看」变成永远不看。

#### 📁 多级分类 + 动态主题空间

通过拖拽构建稳定的分类树。再创建**主题空间（Collections）**——跨分类的创意聚合区，支持自定义 Emoji 和配色，适合项目管理、研究课题或灵感收集。支持手动拖拽归类，也能让 AI 依据主题目标自动组织。

#### 🎨 AI 智能收藏主题

打破传统单一树状目录的局限。只需输入一段自然语言目标（如“整理所有关于现代前端构建与设计系统的工具”），AI 即可从你的整个知识库中精准匹配候选书签，自动生成主题名称、背景描述与建议标签。在主题空间内，顶部智能聚合栏还会持续基于主题画像与标签重合度，动态推荐库内潜在关联书签，支持一键吸纳加入。所有推荐在确认前均为只读预览，确保数据安全可控。

#### 🤖 内置 AI 助手

> **说明**：本项目默认不提供大模型，请自行配置。

支持接入任意 OpenAI / DeepSeek 兼容 API 或本地大模型（Ollama 等），即可解锁：

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

---

### 📸 界面展示

#### 📊 桌面工作空间（Dashboard）

三栏式布局，可折叠侧边栏，六种视图模式（卡片、列表、瀑布流、时间流、标签聚合、主题空间），以及详情面板。
![工作空间](ui/screenshot/dashboard.png)
![list1](ui/screenshot/list1.png)
![list2](ui/screenshot/list2.png)
![list3](ui/screenshot/list3.png)

#### 🔍 Spotlight 快速搜索（`Cmd/Ctrl + K`）

多属性全文搜索与语义搜索，或直接粘贴 URL 完成即时入库分析。
![快速搜索](ui/screenshot/spotlight.png)

#### 🤖 AI 智能洞察与摘要

一键提取网页核心要点，自动生成标签，输出简明摘要——本地或云端 API 均可驱动。
![AI 智能](ui/screenshot/ai_insights.png)

#### 🎨 AI 收藏主题与智能聚合

输入策展目标一键生成专属主题空间，并在浏览时实时获得库内相似书签的智能聚合推荐。
![AI 收藏主题](ui/screenshot/zhuti.png)

#### 📥 捕获与入库

拖拽或剪贴板检测，AI 实时抓取元数据并推荐标签。
![入库分析](ui/screenshot/add_bookmark.png)
![入库分析](ui/screenshot/new.png)

#### ☁️ 存储模式自由切换（本地模式 / 云端同步）

零门槛本地模式开箱即用，或登录免费云端账号开启跨设备多向实时同步。
![存储模式切换](ui/screenshot/login.png)
![存储设置](ui/screenshot/store.png)

#### 🤖 大模型服务配置

> **说明**：本项目默认不提供大模型，请自行配置。

支持接入任意兼容 OpenAI / DeepSeek 标准接口的云端服务或本地运行的私有大模型（如 Ollama、LocalAI、vLLM 等）。API Key 通过操作系统原生安全凭据层（Keychain / Windows Credential Manager）本地加密存储，绝不硬编码，绝不上传云端。
![大模型配置](ui/screenshot/llm.png)

#### 💔 链接健康扫描

扫描死链与内容变更页面，按状态筛选，一键清理。
![健康扫描](ui/screenshot/health_check.png)

#### ⚙️ 偏好设置与主题

十二款精美主题（*Midnight*、*Ocean*、*Graphite*、*Sunset*、*Obsidian*、*Aurora*、*Daylight*、*Paper*、*Cupertino*、*Cappuccino*、*Provence*、*Monet*），中英双语界面一键切换。
![系统设置](ui/screenshot/settings.png)
![theme1](ui/screenshot/theme1.png)
![theme2](ui/screenshot/theme2.png)
![theme3](ui/screenshot/theme3.png)
![theme4](ui/screenshot/theme4.png)
![theme5](ui/screenshot/theme5.png)
![theme6](ui/screenshot/theme6.png)

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
