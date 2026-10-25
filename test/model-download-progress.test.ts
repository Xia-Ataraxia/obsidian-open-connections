import { describe, expect, it } from 'vitest';
import { ModelDownloadTracker, formatMegabytes } from '../src/domain/model-download-progress';
import { EMBED_CONNECTOR } from '../src/ui/embed-adapters/transformers-connector';

describe('ModelDownloadTracker', () => {
  it('is indeterminate until a file reports a total, then aggregates files', () => {
    const t = new ModelDownloadTracker();
    expect(t.snapshot().active).toBe(false);
    t.update('a.json', 0, 0);
    expect(t.snapshot()).toMatchObject({ active: true, determinate: false });
    t.update('model.onnx', 10, 100);
    t.update('a.json', 5, 5);
    expect(t.snapshot()).toMatchObject({ determinate: true, loaded: 15, total: 105, file: 'a.json' });
    t.reset();
    expect(t.snapshot().active).toBe(false);
  });

  it('formats megabytes', () => {
    expect(formatMegabytes(69 * 1024 * 1024)).toBe('69.0 MB');
  });
});

describe('model cache bridge', () => {
  it('labels quota errors only when the message says quota', () => {
    expect(EMBED_CONNECTOR).toContain("last_message.toLowerCase().includes('quota')");
    expect(EMBED_CONNECTOR).not.toContain("includes('storage')");
  });
});

describe('createVaultModelCache', () => {
  it('maps keys to encoded files under the plugin models dir and round-trips', async () => {
    const files = new Map<string, ArrayBuffer>();
    const dirs = new Set<string>();
    const app = {
      vault: {
        configDir: '.cfg',
        adapter: {
          exists: async (p: string) => files.has(p) || dirs.has(p),
          mkdir: async (p: string) => { dirs.add(p); },
          readBinary: async (p: string) => files.get(p)!,
          writeBinary: async (p: string, b: ArrayBuffer) => { files.set(p, b); },
        },
      },
    };
    const { createVaultModelCache } = await import('../src/ui/embed-adapters/transformers-cache');
    const cache = createVaultModelCache(app as never, 'open-connections');
    expect(await cache.get('https://h/a b.json')).toBeNull();
    await cache.put('https://h/a b.json', new ArrayBuffer(3));
    expect([...files.keys()]).toEqual(['.cfg/plugins/open-connections/models/https%3A%2F%2Fh%2Fa%20b.json']);
    expect((await cache.get('https://h/a b.json'))?.byteLength).toBe(3);
  });
});
