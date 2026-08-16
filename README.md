

# Linkit — Your Smart Knowledge Curation Space

<p align="center">
  <img src="https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/dashboard.png" alt="Linkit Dashboard" width="80%">
</p>

<p align="center">
  <a href="https://github.com/blue-idea/linkit/releases"><img src="https://img.shields.io/github/v/release/blue-idea/linkit?style=flat-square&color=blue" alt="GitHub release"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/storage-local%20%7C%20cloud-green?style=flat-square" alt="Storage">
  <img src="https://img.shields.io/badge/AI-built--in-purple?style=flat-square" alt="AI">
</p>

<p align="center">
  <b>English</b> | <a href="README.zh-CN.md">简体中文</a>
</p>

---

**Linkit** is a desktop bookmark manager built for knowledge workers. AI summaries, semantic search, and a knowledge graph turn saved links into real assets. Collections let you group ideas across categories; link health checks and duplicate detection keep your library clean; one-click import from Chrome, Firefox, Raindrop and more gets you started in seconds. Six beautiful themes, local-first storage, cloud sync when you need it — your data, always yours. Connect any OpenAI-compatible API or a local model (Ollama, etc.) for full AI features. Available on macOS, Windows, and Linux.

---

### 🚀 Installation

#### 🍺 macOS — Homebrew (Recommended)

```bash
brew install blue-idea/tap/linkit
```

```bash
brew update && brew upgrade linkit  # upgrade anytime
```

```bash
brew uninstall --cask linkit  # remove anytime
```

> Linkit is currently distributed without Apple notarization. The Cask automatically clears the Gatekeeper `com.apple.quarantine` attribute on install — no `sudo` required.

#### 📦 Direct Downloads

Windows, macOS (DMG), and Linux (AppImage / DEB) binaries are on the [GitHub Releases](https://github.com/blue-idea/linkit/releases) page.

> **macOS DMG**: If Gatekeeper blocks the app, drag `Linkit.app` to `/Applications`, then run `Fix Gatekeeper.command` inside the DMG to clear the quarantine flag automatically.

---

### 🌟 Why Linkit?

| | Linkit | Raindrop | Browser Bookmarks |
|---|---|---|---|
| Local-first storage | ✅ | ❌ | ✅ |
| AI summaries & tags | ✅ | ❌ | ❌ |
| Semantic search | ✅ | ❌ | ❌ |
| Duplicate detection | ✅ | ✅ | ❌ |
| Knowledge graph | ✅ | ❌ | ❌ |
| Insights report | ✅ | ❌ | ❌ |
| Import from browsers / Raindrop | ✅ | ✅ | — |
| Cross-device sync | ✅ | ✅ | ✅ |
| Offline-first | ✅ | ❌ | ✅ |

---

### ✨ Key Features

#### 🗄️ Local-First, Privacy-Respecting Storage
All your bookmarks are stored in a local SQLite database on your own machine — no account required to get started. Enable optional Supabase cloud sync to access your library across devices. Either way, your data is never sold or shared.

#### 📥 One-Click Import
Migrate your existing bookmarks in seconds:
- **Browser HTML export** — Chrome, Firefox, Safari, Edge
- **Raindrop.io CSV/JSON export**
- **Clipboard URL** — paste any link directly via Spotlight (`Cmd/Ctrl + K`)

#### 💡 Knowledge Assets, Not Just Links
Every bookmark is a rich knowledge card: custom tags, star ratings, pinning, personal notes, and reading status (`unread` → `reading` → `read` → `archived`). Stop losing links you meant to revisit.

#### 📁 Multi-Level Categories + Dynamic Collections
Build a stable category tree with drag-and-drop. Then create **Collections** — cross-category themed spaces with custom emojis and colors — for projects, research, or inspiration boards. Drag bookmarks in manually, or let AI curate a collection from a single prompt.

#### 🤖 Built-in AI Copilot
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

#### 🛡️ Secure Cloud Sync
When you enable sync, all data is protected by Supabase Row-Level Security (RLS) — every row is cryptographically bound to your user ID. No one else can read your bookmarks, not even us.

---

### 📸 Interface Showcase

#### 📊 Main Workspace (Dashboard)
Three-column layout with collapsible sidebars, six view modes (grid, list, waterfall, timeline, tag-cluster, collections), and a rich detail panel.
![Dashboard](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/dashboard.png)

#### 🔍 Spotlight Search (`Cmd/Ctrl + K`)
Instant multi-attribute and semantic search, or paste a URL to capture and analyze it on the spot.
![Spotlight](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/spotlight.png)

#### 🤖 AI Insights & Smart Summaries
One-click page analysis: core takeaways, auto-tags, and a concise summary — all generated locally or via your chosen API.
![AI Insights](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/ai_insights.png)

#### 📥 Adding Bookmarks & Quick Capture
Drag-and-drop or clipboard detection. AI fetches metadata and suggests tags in real time.
![Add Bookmark](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/add_bookmark.png)

#### 💔 Link Health Check
Scan for broken or changed links and filter results by status.
![Health Check](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/health_check.png)

#### ⚙️ Preferences & Themes
Six elegant themes (*Midnight*, *Ocean*, *Graphite*, *Sunset*, *Daylight*, *Paper*) and full English / 简体中文 localization.
![Settings](https://raw.githubusercontent.com/blue-idea/linkit/main/ui/screenshot/settings.png)

---

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
