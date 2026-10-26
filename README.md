# Open Connections

Obsidian plugin that surfaces semantically related notes and semantic search across your vault, powered by local embeddings or an API embedding provider.

[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&query=%24%5B%27open-connections%27%5D.downloads&suffix=%20downloads&logo=obsidian&label=Obsidian&color=483699)](https://obsidian.md/plugins?id=open-connections)
[![Latest Release](https://img.shields.io/github/v/release/Xia-Ataraxia/obsidian-open-connections?logo=github)](https://github.com/Xia-Ataraxia/obsidian-open-connections/releases/latest)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-green)](LICENSE)
![Desktop Only](https://img.shields.io/badge/platform-desktop--only-gray)

Open Connections bridges the gap between simple keyword search and intelligent semantic discovery. As you write in Obsidian, it automatically surfaces notes that are semantically related to your current file—not just keyword matches, but conceptually connected ideas. It works entirely on your machine with local embeddings, or seamlessly integrates with OpenAI, Gemini, Ollama, and other providers.

## Features

- **Local embeddings by default** — Zero API keys, zero setup. Runs Transformers.js in-browser with WebGPU acceleration (WASM fallback)
- **Multi-provider support** — Use Transformers (local), OpenAI, Gemini, Ollama, LM Studio, Upstage, or OpenRouter
- **Connections View** — See related notes as you navigate. Auto-updates when you open a file
- **Semantic Lookup** — Search your vault by meaning, not keywords. Find what you're looking for instantly
- **Multilingual** — Local models include multilingual variants for non-English vaults
- **Privacy-first** — Your notes never leave your device when using local embeddings
- **Fast SQLite cache** — Embeddings are stored locally and reused across sessions
- **Model fingerprinting** — Automatically re-embeds when you change providers or models
- **Status bar progress** — See embedding progress in real-time
- **MCP server** — expose vault connections to MCP clients from inside Obsidian or via the `open-connections-mcp` CLI

### How It Works

**Embeddings** are the core of semantic search. They convert text into mathematical vectors that capture meaning. Open Connections uses these vectors to find notes that are semantically similar.

```
┌─────────────────┐
│  Your Notes     │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Embedding │  (Local Transformers.js or API provider)
    │  Model    │
    └────┬─────┘
         │
    ┌────▼──────────────┐
    │ SQLite Cache      │  (Fast, persistent storage)
    └────┬──────────────┘
         │
    ┌────▼────────────────────┐
    │ Semantic Search Engine  │
    │ • Connections View      │
    │ • Lookup View           │
    └─────────────────────────┘
```

#### Two Main Views

**Connections View** — Shows notes semantically related to the file you're currently viewing. Updates automatically as you navigate.

**Lookup View** — Semantic search across your entire vault. Type a query and find notes by meaning, not just keywords.

### Embedding Providers

Open Connections supports multiple embedding providers. Choose what works best for your workflow:

| Provider | Type | Quality | Speed | Cost | API Key Required | Notes |
|----------|------|---------|-------|------|------------------|-------|
| **Transformers** | Local (in-browser) | High | Fast | Free | No | Default. WebGPU accelerated. No setup. |
| **OpenAI** | API | Very High | Fast | $ | Yes | Most accurate. Supports dimension reduction. |
| **Gemini** | API | High | Fast | Free tier | Yes | Google's embedding model. Generous free tier. |
| **Ollama** | Local (server) | Variable | Variable | Free | No | Run any HuggingFace model locally. Requires Ollama running. |
| **LM Studio** | Local (server) | Variable | Variable | Free | No | Desktop app for local model hosting. |
| **Upstage** | API | High | Fast | $ | Yes | Korean AI startup. Excellent multilingual support. |
| **OpenRouter** | API | High | Fast | $ | Yes | Access multiple models through one API. |

#### Recommended Configurations

**Best for privacy (local, zero setup):**
```
Provider: Transformers
Model: Xenova/bge-micro-v2 (default, fast, good quality)
```

**Best for quality (API):**
```
Provider: OpenAI
Model: text-embedding-3-small or text-embedding-3-large
```

**Best for multilingual vaults (local):**
```
Provider: Transformers
Model: Xenova/bge-m3 (multilingual, high quality)
```

**Best for multilingual vaults (API, free tier):**
```
Provider: Gemini
Model: gemini-embedding-001
```

**Best for self-hosted (local server):**
```
Provider: Ollama
Model: nomic-embed-text or bge-m3 (after pulling)
```

## Installation

### From Community Plugin Browser (Recommended)

1. Open Obsidian and go to **Settings > Community Plugins**
2. Disable Safe Mode if enabled
3. Click **Browse** and search for "Open Connections"
4. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Xia-Ataraxia/obsidian-open-connections/releases/latest)
2. Create `.obsidian/plugins/open-connections/` in your vault
3. Copy the three files into that directory
4. Enable **Open Connections** in Settings > Community Plugins

### Build from Source

```bash
git clone https://github.com/Xia-Ataraxia/obsidian-open-connections.git
cd obsidian-open-connections
bun install
bun run build
```

Copy `dist/` contents to your vault's `.obsidian/plugins/open-connections/` directory.

## Usage

### First Steps

1. Open **Settings > Open Connections**
2. Choose an embedding provider (default: Transformers local)
3. Select a model from the dropdown
4. For API providers, enter your API key
5. Open the **Connections** view from the ribbon icon
6. Start navigating your vault—related notes appear automatically

### Connections View

1. Open any note in your vault
2. The Connections View automatically shows related notes
3. Click any result to jump to that note
4. Results update as you navigate between files

**Tip:** Pin the Connections View in your sidebar for always-on semantic discovery as you work.

### Lookup View

1. Open the **Lookup** view from the ribbon or command palette
2. Type a query in plain language (e.g., "project management tips", "climate change", "meeting notes")
3. See matching notes ranked by relevance
4. Click a result to open it

**Tip:** Lookup finds notes by meaning, not exact keywords. Describe what you're looking for conceptually.

### Commands

Access these from the Command Palette (Cmd/Ctrl + P):

- **Connections view** — Show the Connections panel
- **Find connections to current note**
- **Open smart lookup** — Show the Lookup panel
- **Refresh embeddings** / **Re-embed stale entities**
- **Copy connections as smart context**
- **Open random connection**
- **Clear embedding cache**
- **Start local server** / **Stop local server** — MCP server

### MCP Usage

Open Connections ships MCP support from this same repository/package in two ways:

1. **Inside Obsidian** — enable **Settings → Open Connections → MCP** and start the local server, or run the existing command palette actions:
   - `Open Connections: Start local server`
   - `Open Connections: Stop local server`
2. **Standalone CLI** — build and run the bundled entry:

```bash
bun install && bun run build
node dist/mcp.js /path/to/your/vault
```

HTTP mode is also available:

```bash
node dist/mcp.js /path/to/your/vault --http --port 27124
```

The standalone process reads the vault plugin data from `.obsidian/plugins/open-connections/`, so the plugin must already be installed and run at least once for the target vault.


### Configuration

#### Settings Tab

**Embedding Provider** — Choose where embeddings come from (local or API).

**Model Selection** — The plugin auto-discovers available models from your chosen provider. For API providers, ensure your API key is set first.

**Connection Count** — How many related notes to show in the Connections View.

**API Keys** — Store credentials for OpenAI, Gemini, Upstage, OpenRouter, etc. Keys are stored in the plugin's settings.

**Advanced** — Model fingerprinting, cache management, re-embedding triggers.

### Troubleshooting

#### Plugin won't enable or crashes on startup

1. Check the Obsidian console (Ctrl+Shift+I / Cmd+Shift+I)
2. Verify you're on a supported Obsidian version (1.1.0+)
3. Try disabling other embedding-related plugins
4. Reinstall the plugin by deleting `.obsidian/plugins/open-connections/` and re-enabling from Community Plugins

#### Embeddings slow or CPU-heavy (local Transformers.js)

1. Try a smaller model: `Xenova/bge-micro-v2` instead of `bge-m3`
2. Switch to an API provider if you have quota
3. Check if your browser supports WebGPU (Chrome/Edge on supported devices); otherwise WASM fallback is used

#### API provider returns errors

1. Verify your API key is correct (check provider documentation)
2. Ensure you have API quota remaining
3. Check the Obsidian console for specific error messages
4. Try switching to a different provider temporarily to test

#### Results don't look relevant

1. Embeddings quality depends on the model and your content
2. Try a different model (e.g., switch from `bge-micro-v2` to `bge-m3`)
3. Larger, higher-quality models generally give better results
4. Ensure your notes have sufficient content for the embedding model to work with

## Development

### Prerequisites

- Node.js 18+ (recommend 22+)
- Bun 1.2+
- An Obsidian test vault

### Setup

```bash
git clone https://github.com/Xia-Ataraxia/obsidian-open-connections.git
cd obsidian-open-connections
bun install
```

### Development Commands

```bash
bun run dev           # esbuild watch to dist/
bun run build         # Production build to dist/
bun run test          # Run unit tests (Vitest)
bun run lint          # ESLint check
bun run typecheck     # TypeScript type checking
bun run ci            # Full pipeline (build + typecheck + lint + test)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Platform** | Obsidian Plugin API |
| **Language** | TypeScript 5, JavaScript |
| **Bundler** | esbuild |
| **Embeddings** | Transformers.js (WebGPU + WASM), OpenAI, Gemini, Ollama, LM Studio, Upstage, OpenRouter |
| **Storage** | SQLite (node:sqlite) |
| **Parallelism** | Web Workers (embedding in background) |
| **Testing** | Vitest |

### Project Architecture

```
open-connections/
├── src/
│   ├── main.ts                   # Plugin entry point
│   ├── domain/                   # Business logic (NO obsidian imports)
│   │   ├── config.ts             # Settings, notice catalog
│   │   ├── embed-model.ts        # Embedding adapter registry
│   │   ├── embedding-pipeline.ts # Batch embedding pipeline
│   │   ├── entities/             # Data model (Source, Block, Collection)
│   │   └── embedding/kernel/     # Redux-style state machine
│   ├── ui/                       # Obsidian-dependent UI
│   │   ├── ConnectionsView.ts    # Related notes panel
│   │   ├── LookupView.ts         # Semantic search panel
│   │   ├── embed-adapters/       # 7 provider adapters
│   │   ├── settings.ts           # Settings UI
│   │   ├── status-bar.ts         # Progress bar
│   │   └── commands.ts           # Command palette commands
│   ├── types/                    # Pure type definitions
│   └── utils/                    # Pure utility functions
├── worker/
│   └── embed-worker.ts           # Web Worker for Transformers.js
├── test/                         # Vitest unit tests
├── dist/                         # Build output
└── manifest.json                 # Plugin manifest
```

### Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
4. Run `bun run ci` to verify your changes
5. Submit a pull request with a clear description

**Note:** This plugin maintains a shared architecture with other Obsidian plugins in the ecosystem. Large changes should be discussed in an issue first.

### Community Submission Checklist

Before submitting to [obsidian-releases](https://github.com/obsidianmd/obsidian-releases), run `bun run lint` to catch all [ObsidianReviewBot](https://github.com/obsidianmd/eslint-plugin) violations:

| Rule | What to verify |
|------|---------------|
| Command names | No plugin name prefix — Obsidian adds it automatically |
| Sentence case | All `setName()`, `setDesc()`, placeholders use sentence case |
| Settings headings | `new Setting(el).setName('...').setHeading()` not `createEl('h2', ...)` |
| No inline styles | `addClass()` / `setCssProps()` instead of `el.style.X = value` |
| `vault.configDir` | No hardcoded `.obsidian` strings |
| No async without await | Remove `async` from methods with no `await` inside |

## Disclosures

- **Local database** — embeddings are stored in `<vault>/<config dir>/plugins/open-connections/open-connections.db` via Node's built-in `node:sqlite`, which needs the vault's absolute path (Desktop only). The plugin reads notes through the Vault API only.
- **Network** — API embedding providers you configure (OpenAI-compatible, Ollama, LM Studio, OpenRouter, Upstage, ...) receive note text for embedding; the default local model runs offline after its one-time model download.
- **Local MCP server** — optional, off by default; listens on a local port when you start it.
- **Standalone MCP CLI** (`node dist/mcp.js <vault>`) — a separate process that reads vault files directly from disk, with traversal and symlink-escape checks.
- **Clipboard** — written only when you use a copy action.

## License

**GNU General Public License v3.0** (GPL-3.0)

See [LICENSE](LICENSE) for details.

### Acknowledgments

This project is a fork of [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections) by Brian Petro. It has been rebuilt from the ground up for stability, extensibility, and integration with the broader Obsidian plugin ecosystem.

Per GPL-3.0 Section 5, this modified version is clearly marked as different from the original.

### Links

- **Repository:** https://github.com/Xia-Ataraxia/obsidian-open-connections
- **Releases:** https://github.com/Xia-Ataraxia/obsidian-open-connections/releases
- **Issues:** https://github.com/Xia-Ataraxia/obsidian-open-connections/issues
- **Obsidian:** https://obsidian.md/
- **Smart Connections (Original):** https://smartconnections.app/
