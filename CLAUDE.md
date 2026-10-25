This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Connections (manifest id `open-connections`) is an Obsidian plugin (TypeScript, esbuild, Bun) that uses embeddings to surface semantically related notes: a **Connections** view for the current file and a **Lookup** view for semantic search. Local embedding runs via Transformers.js; vector search uses an in-memory `FlatVectorIndex`.

## Commands

```bash
bun run dev        # esbuild watch -> dist/
bun run build      # production build -> dist/ (main.js, mcp.js, manifest.json, styles.css)
bun run typecheck  # tsc --noEmit (src only)
bun run lint       # eslint (recommended + layer boundary rule), 0 warnings expected
bun run test       # vitest
bun run ci         # build + typecheck + lint + test (must pass before PR)
```

Develop against `.dev-vault` only; never copy builds into user vaults. Releases are CI-only (`ci.yml` and `release.yml` call the shared `obsidian-boiler-template` workflows).

## Build outputs

- `dist/main.js`, `dist/manifest.json`, `dist/styles.css`: the plugin (the only release assets).
- `dist/mcp.js`: standalone MCP server entry (`src/mcp/entry.ts`, ESM, Node-only). Built but not uploaded by the release workflow.

## Architecture

The codebase follows a strict 4-layer architecture enforced by ESLint `no-restricted-imports`:

| Layer | Path | Rule |
|-------|------|------|
| Composition root | `src/main.ts` | Wires all layers together |
| Domain | `src/domain/` | NO `obsidian` imports — pure business logic |
| UI | `src/ui/` | Obsidian-dependent views, modals, settings |
| Types | `src/types/` | NO `obsidian` imports — pure type definitions |
| Utils | `src/utils/` | NO `obsidian` imports — pure functions, zero state |

```
src/
├── main.ts                   # Composition root — SmartConnectionsPlugin (extends Plugin)
├── domain/                   # Business logic — NO obsidian imports
│   ├── config.ts             # DEFAULT_SETTINGS, NOTICE_CATALOG, error classes
│   ├── embed-model.ts        # EmbedModel + EmbedAdapterRegistry
│   ├── embedding-pipeline.ts # Batch embedding pipeline
│   ├── entities/             # Data model (Source, Block, Collection, SQLite, parser)
│   │   ├── EmbeddingEntity.ts, EmbeddingSource.ts, EmbeddingBlock.ts
│   │   ├── EntityCollection.ts, SourceCollection.ts, BlockCollection.ts
│   │   ├── sqlite-data-adapter.ts, markdown-splitter.ts
│   │   └── index.ts
│   └── embedding/
│       ├── embed-job-queue.ts  # EmbedJobQueue (async job scheduling)
│       └── kernel/             # Redux-style embedding state machine
│           ├── index.ts        # Store, reducer, selectors, effects, queue
│           └── types.ts        # State/Event type definitions
├── ui/                       # Obsidian-dependent code
│   ├── settings*.ts (declarative `getSettingDefinitions()`), commands.ts, status-bar.ts
│   ├── file-watcher.ts, user-state.ts, block-connections.ts
│   ├── ConnectionsView.ts, LookupView.ts, result-context-menu.ts
│   ├── collection-loader.ts   # Source/Block collection init and loading
│   ├── embed-orchestrator.ts   # Model lifecycle, embed jobs, pipeline
│   └── embed-adapters/         # API adapters (use requestUrl — Obsidian-dependent)
│       ├── api-base.ts, transformers.ts
│       ├── openai.ts, gemini.ts, ollama.ts
│       ├── lm-studio.ts, open-router.ts, upstage.ts
├── types/                    # Pure type definitions — NO obsidian imports
│   ├── entities.ts, models.ts, settings.ts, obsidian-shims.ts
├── utils/                    # Pure utility functions (cos_sim, create_hash, timer-host, ...)
├── mcp/                      # Standalone Node MCP server (no obsidian, no window)

test/
└── *.test.ts                 # Vitest unit/integration tests

```

### Layer Boundary Rules

- `domain/`, `types/`, `utils/` must never import from `obsidian` — enforced by ESLint `no-restricted-imports`
- Entity classes in `domain/entities/` use shim interfaces from `types/obsidian-shims.ts` instead of real Obsidian types (structural typing — no runtime difference)
- Adapter self-registration (side effects) is triggered in `ui/embed-orchestrator.ts` via `import './embed-adapters/transformers'` etc.

### Initialization Flow

`SmartConnectionsPlugin.onload()` registers views, commands, settings tab, and ribbon icon, then delegates to `initialize()`:

- **Phase 1 (Core, blocking):** load user state, wait for Obsidian Sync, init collections from SQLite storage, setup status bar, register file watchers.
- **Phase 2 (Embedding, background):** initialize embedding model, download Transformers.js assets if needed, queue unembedded entities. Phase 1 is usable before Phase 2 completes.

### Embedding Kernel

The embedding subsystem uses a Redux-style state machine (`domain/embedding/kernel/`):
- `EmbeddingKernelStore` holds the current state and dispatches typed events.
- `reducer.ts` handles state transitions (INIT_CORE_READY, MODEL_LOADED, EMBED_STARTED, EMBED_PROGRESS, etc.).
- `selectors.ts` exposes derived queries like `isEmbedReady()` and `toLegacyStatusState()`.
- UI components subscribe via `smart-connections:embed-state-changed` workspace event.

## Notices

`plugin.notices` is a `PluginNotices` instance from `src/ui/plugin-notices.ts`. The catalog of all notice types is defined in `src/domain/config.ts` as `NOTICE_CATALOG`. `SmartConnectionsNotices` is just a type alias for `PluginNotices`.

- Muted notice IDs are persisted under `settings.plugin_notices.muted`.
- Existing `smart_notices.muted` entries are migrated on first load.
- CSS uses `plugin-notice*` class names (not `osc-notice*`).
- A `PluginLogger` instance is available as `plugin.logger`.

Usage:
```typescript
// Show a cataloged notice with parameters
plugin.notices.show('embedding_progress', {
  adapter: 'transformers',
  modelKey: 'all-MiniLM-L6-v2',
  current: 42,
  total: 100,
  percent: 42,
});

// Show with action button
plugin.notices.show('update_available', { tag_name: 'v3.2.0' }, {
  button: { text: 'Update', callback: () => { /* ... */ } },
});

// Remove a notice programmatically
plugin.notices.remove('embedding_progress');

// Mute/unmute (persisted in plugin settings)
await plugin.notices.mute('embedding_progress');
await plugin.notices.unmuteAll();
```

## Gotchas

- Timers in `domain/`/`utils/`/`mcp/`: use `sleep()` from `src/utils/timer-host.ts`. Inside Obsidian it uses `window`; Node (MCP, tests) injects a host via `setTimerHost()` (`src/mcp/entry.ts`, `test/setup.ts`). Do not use `globalThis`.
- Do not run `eslint --fix` blindly on `src/mcp/**` or tests: it rewrites `globalThis`/`setTimeout` to `window.*`, which does not exist in Node.
- Settings use the declarative API (`getSettingDefinitions()`, Obsidian 1.13+, hence `minAppVersion` 1.13.0). Dotted `control.key` paths map to `plugin.settings` via `getControlValue`/`setControlValue`; call `this.update()` (not a full redisplay) after structural changes.
- Changing DB file names, storage namespaces or plugin id requires migration code, otherwise all notes are re-embedded.
- Tests are linted via `test/tsconfig.json` but not typechecked.

## Testing

Vitest, `test/*.test.ts`. Single file: `bun run test test/notices.test.ts`.
