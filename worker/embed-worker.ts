import { env, pipeline } from '@huggingface/transformers';

// Configure the Transformers.js runtime environment.
env.allowLocalModels = false;
env.allowRemoteModels = true;
// Cache Storage (`window.caches`) is unavailable in Obsidian's sandboxed
// iframe and the getter throws a SecurityError; probe defensively so the
// bundled transformers.js does not throw on `window.caches` (issue #89).
let canUseBrowserCache = false;
try {
  // Reading the global cache storage throws in the sandboxed context,
  // so the probe itself must be guarded.
  const cachesApi = (globalThis as { caches?: unknown }).caches;
  canUseBrowserCache = typeof cachesApi !== 'undefined' && cachesApi != null;
} catch {
  canUseBrowserCache = false;
}
env.useBrowserCache = canUseBrowserCache;

let embed_pipeline: any = null;
let last_model_key = '';

const post = (payload: Record<string, unknown>) =>
  (self as unknown as Worker).postMessage(payload);

async function loadModel(modelKey: string) {
  if (last_model_key === modelKey && embed_pipeline) return;
  last_model_key = modelKey;
  embed_pipeline = await pipeline('feature-extraction', modelKey);
}

self.onmessage = async (event: MessageEvent) => {
  const { type, model_key, texts } = (event.data ?? {}) as {
    type?: string;
    model_key?: string;
    texts?: string[];
  };
  try {
    if (type === 'load' && typeof model_key === 'string') {
      await loadModel(model_key);
      post({ type: 'loaded', model_key });
      return;
    }
    if (type === 'embed' && Array.isArray(texts)) {
      if (!embed_pipeline) throw new Error('Model not loaded');
      const vectors: number[][] = [];
      for (const text of texts) {
        const output = await embed_pipeline(text, { pooling: 'mean', normalize: true });
        vectors.push(Array.from(output.data as number[]));
      }
      post({ type: 'result', vectors });
      return;
    }
    post({ type: 'error', error: `Unknown message type: ${type}` });
  } catch (error) {
    post({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};
