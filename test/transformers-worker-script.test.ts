import { describe, expect, it } from 'vitest';
import { EMBED_WORKER_SCRIPT } from '../src/ui/embed-adapters/transformers-worker-script';

describe('embedding worker script contract', () => {
  it('pins the CDN runtime, validates request schema and avoids window globals', () => {
    expect(EMBED_WORKER_SCRIPT).toContain('@huggingface/transformers@3.8.0');
    expect(EMBED_WORKER_SCRIPT).toContain('assert_request_schema(data)');
    expect(EMBED_WORKER_SCRIPT).toContain('Unknown method');
    expect(EMBED_WORKER_SCRIPT).not.toMatch(/\bwindow\b/);
  });

  it('hides Node globals so the browser ONNX backend is used', () => {
    expect(EMBED_WORKER_SCRIPT).toContain("['process', 'require', 'module', 'Buffer']");
  });

  it('transfers model buffers and caps wasm threads', () => {
    expect(EMBED_WORKER_SCRIPT).toContain('body ? [body] : []');
    expect(EMBED_WORKER_SCRIPT).toContain('Math.min(4,');
    expect(EMBED_WORKER_SCRIPT).not.toContain('numThreads = 8');
  });
});
