import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/mcp/plugin-context', () => ({
  PluginMcpContext: class {
    ready = true;
    embedReady = true;
    statusState = 'idle';
    getConnections = async () => [
      { path: 'a.md', score: 0.9, blockKey: 'a.md#x', headings: [], preview: '' },
      { path: 'b.md', score: 0.2, blockKey: 'b.md#y', headings: [], preview: '' },
    ];
  },
}));

import { createPluginApi } from '../src/ui/plugin-api';

describe('plugin api', () => {
  it('filters by minScore and reports meta', async () => {
    const api = createPluginApi({} as never);
    const res = await api.searchByFile({ file: 'z.md', minScore: 0.5 });
    expect(res.ok).toBe(true);
    expect(res.results).toEqual([{ path: 'a.md', score: 0.9, block_key: 'a.md#x' }]);
    expect(res.meta.query_type).toBe('file');
    expect(await api.waitForReady(10)).toBe(true);
  });
});
