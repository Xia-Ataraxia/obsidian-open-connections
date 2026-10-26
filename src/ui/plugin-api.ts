import type SmartConnectionsPlugin from '../main';
import { PluginMcpContext } from '../mcp/plugin-context';
import type { McpSearchResult } from '../types/mcp-context';

export interface OpenConnectionsApiResult {
  ok: boolean;
  results: Array<{ path: string; score: number; block_key: string }>;
  meta: { query_type: 'file' | 'text'; elapsed_ms: number };
  error?: string;
}

const DEFAULT_LIMIT = 20;
const POLL_MS = 250;

/** Stable surface for `obsidian eval` and other plugins: `app.plugins.plugins['open-connections'].api`. */
export function createPluginApi(plugin: SmartConnectionsPlugin) {
  const ctx = new PluginMcpContext(plugin);

  async function run(
    type: 'file' | 'text',
    search: () => Promise<McpSearchResult[]>,
    minScore = 0,
  ): Promise<OpenConnectionsApiResult> {
    const started = Date.now();
    const meta = () => ({ query_type: type, elapsed_ms: Date.now() - started });
    try {
      if (!ctx.ready || !ctx.embedReady) return { ok: false, results: [], meta: meta(), error: 'not_ready' };
      const found = await search();
      const results = found
        .filter((r) => r.score >= minScore)
        .map((r) => ({ path: r.path, score: r.score, block_key: r.blockKey }));
      return { ok: true, results, meta: meta() };
    } catch (error) {
      return { ok: false, results: [], meta: meta(), error: error instanceof Error ? error.message : String(error) };
    }
  }

  return {
    get ready() { return ctx.ready; },
    get embedReady() { return ctx.embedReady; },
    get status() { return ctx.statusState; },
    searchByFile: ({ file, limit = DEFAULT_LIMIT, minScore }: { file: string; limit?: number; minScore?: number }) =>
      run('file', async () => (await ctx.getConnections(file, limit + 1)).filter((r) => r.path !== file).slice(0, limit), minScore),
    searchByText: ({ query, limit = DEFAULT_LIMIT, minScore }: { query: string; limit?: number; minScore?: number }) =>
      run('text', async () => ctx.searchNearest(await ctx.embedQuery(query), { limit }), minScore),
    getStats: () => ctx.getStats(),
    async waitForReady(timeoutMs = 30000): Promise<boolean> {
      const deadline = Date.now() + timeoutMs;
      while (!(ctx.ready && ctx.embedReady)) {
        if (Date.now() >= deadline) return false;
        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
      }
      return true;
    },
  };
}

export type OpenConnectionsApi = ReturnType<typeof createPluginApi>;
