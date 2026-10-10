# Linkit — Your Smart Knowledge Curation Space

<p align="center">
  <img src="ui/screenshot/dashboard.png" alt="Linkit Dashboard" width="80%">
</p>

<p align="center">
  <a href="https://github.com/blue-idea/linkit/releases"><img src="https://img.shields.io/github/v/release/blue-idea/linkit?style=flat-square&color=blue" alt="GitHub release"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/storage-local%20%7C%20cloud-green?style=flat-square" alt="Storage">
  <img src="https://img.shields.io/badge/pricing-100%25%20free-brightgreen?style=flat-square" alt="Pricing">
  <img src="https://img.shields.io/badge/AI-built--in-purple?style=flat-square" alt="AI">
</p>

<p align="center">
  <b>English</b> | <a href="README.zh-CN.md">简体中文</a>
</p>

---

**Linkit** is a desktop bookmark manager built for knowledge workers. AI summaries, semantic search, and a knowledge graph turn saved links into real assets. Collections let you group ideas across categories; link health checks and duplicate detection keep your library clean; one-click import from Chrome, Firefox, Raindrop and more gets you started in seconds. Twelve beautiful themes, **dual-track local-first storage and cloud sync — completely free with no paywalls**, your data is always yours. Connect any OpenAI-compatible API or a local model (Ollama, etc.) for full AI features. Available on macOS, Windows, and Linux.

---

### 🚀 Installation

#### 🍺 macOS — Homebrew (Recommended)

```bash
brew install blue-idea/tap/linkit
```

```bash
brew upgrade linkit   # upgrade anytime
```

> Linkit is currently distributed without Apple notarization. The Cask automatically clears the Gatekeeper `com.apple.quarantine` attribute on install — no `sudo` required.

#### 📦 Direct Downloads

Windows, macOS (DMG), and Linux (AppImage / DEB) binaries are on the [GitHub Releases](https://github.com/blue-idea/linkit/releases) page.

> **macOS DMG**: If Gatekeeper blocks the app, drag `Linkit.app` to `/Applications`, then run `Fix Gatekeeper.command` inside the DMG to clear the quarantine flag automatically.

---

### 🌟 Why Linkit?

|                                 | Linkit       | R*                   | Browser Bookmarks |
| ------------------------------- | ------------ | ----------------------------- | ----------------- |
| Local-first storage             | ✅           | ❌                            | ✅                |
| AI summaries & tags             | ✅           | ❌                            | ❌                |
| Semantic search                 | ✅           | ❌                            | ❌                |
| Duplicate detection             | ✅           | ✅                            | ❌                |
| Knowledge graph                 | ✅           | ❌                            | ❌                |
| Insights report                 | ✅           | ❌                            | ❌                |
| Import from browsers / Raindrop | ✅           | ✅                            | —                |
| Cross-device sync               | ✅           | ✅                            | ✅                |
| Offline-first                   | ✅           | ❌                            | ✅                |
| Pricing (No Paywall)            | ✅ 100% Free | ❌ Paid Subscription ($3+/mo) | ✅ Free           |

---

### ✨ Key Features

#### 🗄️ Local-First Storage, Absolute Privacy (100% Free)

- **Zero setup, no account required**: All bookmarks are stored in a local SQLite database on your machine by default. Works seamlessly offline with lightning-fast sub-millisecond lookups.
- **Uncapped library size**: No limits on how many bookmarks, tags, or collections you can store. No hidden caps, trial periods, or functional paywalls.
- **100% data sovereignty**: Your data stays on your machine. No telemetry, no ads, and zero third-party data sharing.

#### ☁️ Free & Secure Cloud Sync (Supabase RLS)

- **Real-time multi-device sync**: Sign in anytime to keep bookmarks, collections, categories, and tags synchronized across all your devices.
- **Enterprise-grade Row-Level Security (RLS)**: Powered by Supabase (PostgreSQL), each record is cryptographically bound to your `auth.uid()`. Nobody else (not even the developers) can access your bookmarks.
- **Conflict resolution & draft protection**: Built-in revision tracking and automatic merging prevent multi-device race conditions; dirty draft caching ensures zero data loss during network disruptions.
- **Completely free, forever**: Unlike competing tools that gate cross-device sync, full-text search, or backups behind monthly subscriptions, Linkit's cloud sync is **100% free with zero paywalls**.

#### 📥 One-Click Import

Migrate your existing bookmarks in seconds:

- **Browser HTML export** — Chrome, Firefox, Safari, Edge
- **Raindrop.io CSV/JSON export**
- **Clipboard URL** — paste any link directly via Spotlight (`Cmd/Ctrl + K`)

#### 💡 Knowledge Assets, Not Just Links

Every bookmark is a rich knowledge card: custom tags, star ratings, pinning, personal notes, and reading status (`unread` → `reading` → `read` → `archived`). Stop losing links you meant to revisit.

#### 📁 Multi-Level Categories + Dynamic Collections

Build a stable category tree with drag-and-drop. Then create **Collections** — cross-category themed spaces with custom emojis and colors — for projects, research, or inspiration boards. Organize items manually or let AI structure them around your curation goals.

#### 🎨 AI-Curated Collections

Break free from rigid hierarchies. Provide a natural language prompt (e.g., "Collect modern frontend tooling and design resources"), and the built-in AI will match relevant bookmarks across your library, generate a collection title and description, and recommend contextual tags. Inside any collection, a dynamic recommendation banner continuously surfaces relevant bookmarks based on content and tag similarity for one-click addition. All suggestions remain editable previews until you explicitly confirm.

#### 🤖 Built-in AI Copilot

> **Note**: Linkit does not provide built-in LLM services or API keys by default; users need to configure their own model.

Connect any OpenAI / DeepSeek-compatible API or a local LLM (Ollama, etc.) and unlock:

- Auto page fetch, summarization, and key takeaways
- Smart tag and category recommendations
- AI-curated collections from natural language prompts
- Semantic search across your entire library
- Duplicate detection and merge suggestions

#### 🔍 Spotlight Search (`Cmd/Ctrl + K`)

Instant full-text and semantic vector search across titles, notes, tags, and AI-generated content. Also doubles as a quick-capture bar — paste a URL and save it without leaving your current tab.

#### 📊 Curation Insights Report

Linkit periodically generates an **Insights Report** summarizing your curation habits: most-used tags, reading progress, content patterns, and AI-surfaced highlights from your unread pile. Turn your bookmark graveyard into an active knowledge base.

#### 🔁 Duplicate Bookmark Detection

Automatically surface exact-URL duplicates and AI-detected near-duplicates (same content, different URLs). Review and merge with one click to keep your library clean.

#### ❤️ Link Health Check

Background scans detect broken links (`404`) and silently changed pages. Filter, review, and clean up stale bookmarks before they pile up.

#### 🌐 Knowledge Graph

Visualize your entire library as an interactive network. Nodes connect via shared tags, collections, and AI semantic similarity. Click any node to jump directly to that bookmark.

---

### 📸 Interface Showcase

#### 📊 Main Workspace (Dashboard)

Three-column layout with collapsible sidebars, six view modes (grid, list, waterfall, timeline, tag-cluster, collections), and a rich detail panel.
![Dashboard](ui/screenshot/dashboard.png)
![list1](ui/screenshot/list1.png)
![list2](ui/screenshot/list2.png)
![list3](ui/screenshot/list3.png)

#### 🔍 Spotlight Search (`Cmd/Ctrl + K`)

Instant multi-attribute and semantic search, or paste a URL to capture and analyze it on the spot.
![Spotlight](ui/screenshot/spotlight.png)

#### 🤖 AI Insights & Smart Summaries

One-click page analysis: core takeaways, auto-tags, and a concise summary — all generated locally or via your chosen API.
![AI Insights](ui/screenshot/ai_insights.png)

#### 🎨 AI-Curated Collections & Smart Aggregation

Generate curated collections from natural language goals, with real-time similarity-based bookmark suggestions inside each collection view.
![AI Collections](ui/screenshot/zhuti.png)

#### 📥 Adding Bookmarks & Quick Capture

Drag-and-drop or clipboard detection. AI fetches metadata and suggests tags in real time.
![Add Bookmark](ui/screenshot/add_bookmark.png)
![入库分析](ui/screenshot/new.png)

#### ☁️ Local vs Cloud Storage Modes

Seamlessly choose between an account-free, offline local-first mode or a free cloud account with multi-device synchronization.
![Storage Modes](ui/screenshot/login.png)
![Storage Settings](ui/screenshot/store.png)

#### 🤖 LLM Configuration 

> **Note**: Linkit does not provide built-in LLM services or API keys by default; users need to configure their own model.

Connect any OpenAI / DeepSeek-compatible cloud API or local LLM (such as Ollama, LocalAI, vLLM). API keys are encrypted in your local OS keychain (macOS Keychain / Windows Credential Manager) and never uploaded.
![LLM Configuration](ui/screenshot/llm.png)

#### 💔 Link Health Check

Scan for broken or changed links and filter results by status.
![Health Check](ui/screenshot/health_check.png)

#### ⚙️ Preferences & Themes

Twelve elegant themes (*Midnight*, *Ocean*, *Graphite*, *Sunset*, *Obsidian*, *Aurora*, *Daylight*, *Paper*, *Cupertino*, *Cappuccino*, *Provence*, *Monet*) and full English / 简体中文 localization.
![Settings](ui/screenshot/settings.png)
![theme1](ui/screenshot/theme1.png)
![theme2](ui/screenshot/theme2.png)
![theme3](ui/screenshot/theme3.png)
![theme4](ui/screenshot/theme4.png)
![theme5](ui/screenshot/theme5.png)
![theme6](ui/screenshot/theme6.png)

### 🛠️ Technology Stack

- **Desktop Framework**: [Wails](https://wails.io/) (Go)
- **Frontend**: [React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + Glassmorphism design system
- **Local DB**: SQLite (via GORM)
- **Cloud Sync**: [Supabase](https://supabase.com/) (PostgreSQL + RLS)
- **AI**: OpenAI / DeepSeek-compatible APIs or local LLMs (Ollama)

---

### 🔑 Security & Privacy

- **Local by default**: No account, no telemetry, no cloud dependency to get started.
- **RLS-enforced sync**: Cloud data is row-level secured — only you can access your records.
- **Keychain-stored credentials**: AI API keys are stored in your OS keystore (`go-keyring` → macOS Keychain / Windows Credential Manager). Never hardcoded, never uploaded.
