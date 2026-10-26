/**
 * @file config.ts
 * @description Domain constants for Open Connections plugin:
 *   - TransientError, FatalError: typed error classes for embedding API error classification
 *   - DEFAULT_SETTINGS: hand-written plugin defaults (no auto-scanner)
 *   - NOTICE_CATALOG: all notice definitions + SmartConnectionsNotices alias
 */

import type { PluginSettings, NoticeCatalog } from '../types/settings';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Transient errors are retryable: 429 (rate limit), 503 (service unavailable),
 * network timeouts, connection refused, etc.
 */
export class TransientError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    status: number,
    opts?: { retryAfterMs?: number },
  ) {
    super(message);
    this.name = 'TransientError';
    this.status = status;
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

/**
 * Fatal errors are NOT retryable: 400 (bad request), 401 (unauthorized),
 * 403 (forbidden), malformed response, etc.
 */
export class FatalError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FatalError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  version: '',
  language: 'en',
  new_user: true,
  re_import_wait_time: 13,
  embed_save_interval: 5,
  embed_concurrency: 5,
  discovery_chunk_size: 1000,
  is_obsidian_vault: true,

  smart_sources: {
    min_chars: 200,
    embed_model: {
      adapter: 'transformers',
      transformers: {
        legacy_transformers: false,
        model_key: 'TaylorAI/bge-micro-v2',
      },
    },
    excluded_headings: '',
    file_exclusions: 'Untitled',
    folder_exclusions: '',
    content_rules: '',
  },

  smart_blocks: {
    embed_blocks: true,
    min_chars: 20,
    block_heading_depth: 3,
    re_embed_min_change: 200,
  },

  smart_view_filter: {
    expanded_view: false,
    render_markdown: true,
    show_full_path: false,
    highlight_threshold: 0.8,
  },

  smart_notices: {
    muted: {},
  },

  mcp: {
    enabled: false,
    port: 27124,
    authToken: '',
  },
};

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

export const NOTICE_CATALOG: NoticeCatalog = {
  notice_muted: {
    template: 'Notice muted.',
    timeout: 4000,
    immutable: true,
  },
  embedding_progress: {
    template: 'Embedding {{current}}/{{total}} blocks ({{percent}}%) with {{modelKey}}',
    timeout: 0,
  },
  embedding_complete: {
    template: 'Embedding complete. {{success}} blocks updated.',
  },
  embedding_failed: {
    template: 'Embedding failed. Refresh the connections view to retry.',
  },
  embedding_provider_limited: {
    label: 'Embedding provider limit',
    template: 'Embedding stopped: {{adapter}}/{{modelKey}} hit the provider request limit. Wait and retry later, raise API quota, or switch to a local model.',
    timeout: 10000,
  },
  failed_init_embed_model: {
    label: 'Embedding model failed to initialize',
    template: 'Failed to initialize embedding model',
  },
  failed_download_transformers_model: {
    label: 'Model assets download failed',
    template: 'Failed to download transformers model assets. Check network/CDN access and retry.',
  },
  failed_download_timeout: {
    label: 'Model download timed out',
    template: 'Model download timed out. Try a smaller model or increase timeout in settings.',
  },
  failed_download_quota: {
    label: 'Storage quota exceeded',
    template: 'Not enough storage to cache the model. Free up disk space or pick a smaller model, then retry.',
  },
  failed_download_network: {
    label: 'Model download network error',
    template: 'Failed to download model files. Check your network connection and retry.',
  },
  failed_download_model_not_found: {
    label: 'Model not found',
    template: 'Model "{{modelKey}}" not found. Try switching to BGE-micro-v2 (recommended).',
  },
  failed_init_embed_pipeline: {
    label: 'Embedding pipeline failed to initialize',
    template: 'Failed to initialize embedding pipeline',
  },
  failed_load_collection_data: {
    label: 'Collection data failed to load',
    template: 'Failed to load collection data',
  },
  reimport_failed: {
    template: 'Updating changed notes failed. Refresh the connections view to retry.',
  },
  cache_cleared: {
    label: 'Embedding cache cleared',
    template: 'Embedding cache cleared. Re-embedding all notes…',
  },
  no_stale_entities: {
    label: 'Nothing to re-embed',
    template: 'Everything is already embedded.',
  },
  folder_exclusion_reconcile_deferred: {
    label: 'Folder exclusion pending',
    template: 'Folder exclusion changes will apply after the current embedding run finishes.',
    timeout: 9000,
  },
  folder_exclusion_reconcile_applied: {
    label: 'Folder exclusion applied',
    template: 'Folder exclusion changes applied.',
    timeout: 5000,
  },
  hidden_connections_restored: {
    template: 'Restored {{count}} hidden {{noun}}.',
    timeout: 4000,
  },
  reinitializing_embedding_model: {
    label: 'Re-initializing embedding model',
    template: 'Re-initializing embedding model…',
  },
  embedding_model_switched: {
    template: 'Embedding model switched.',
  },
  failed_reinitialize_model: {
    label: 'Model re-initialization failed',
    template: 'Failed to re-initialize the embedding model. Retry or pick another model.',
  },
  context_copied: {
    label: 'Connections copied',
    template: 'Copied {{count}} connections to the clipboard.',
    timeout: 3000,
  },
  no_embedding_for_context: {
    label: 'Note not embedded yet',
    template: 'This note isn\'t embedded yet. Try again when embedding finishes.',
  },
  no_connections_found: {
    label: 'No connections found',
    template: 'No connections found for this note.',
    timeout: 3000,
  },
  mcp_server_started: {
    label: 'MCP server started',
    template: 'MCP server started at {{url}}',
    timeout: 5000,
  },
  mcp_server_stopped: {
    label: 'MCP server stopped',
    template: 'MCP server stopped.',
    timeout: 3000,
  },
  mcp_server_failed: {
    label: 'MCP server failed',
    template: "Couldn't start the local server. {{error}}",
    timeout: 8000,
  },
};

/** Settings label for a notice id; unknown ids are humanized so a raw id never reaches the UI. */
export function noticeLabel(id: string): string {
  const label = NOTICE_CATALOG[id]?.label;
  if (label) return label;
  const words = id.replace(/_+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type { NoticeCatalog };
