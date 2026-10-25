import { describe, expect, it, vi } from 'vitest';
import { importBlocksChunked } from '../src/ui/collection-block-import';

function fakePlugin(keys: string[]) {
  const withBlocks = new Set<string>();
  return {
    _unloading: false,
    logger: { debug: vi.fn(), warn: vi.fn() },
    source_collection: { all: keys.map((key) => ({ key })) },
    block_collection: {
      for_source: (key: string) => (withBlocks.has(key) ? [1] : []),
      import_source_blocks: vi.fn(({ key }: { key: string }) => {
        if (!key.startsWith('empty')) withBlocks.add(key);
        return Promise.resolve();
      }),
      data_adapter: { save: vi.fn(() => Promise.resolve()) },
    },
  };
}

vi.stubGlobal('window', { setTimeout });

describe('importBlocksChunked', () => {
  it('walks the whole vault in batches without retrying sources that parse to nothing', async () => {
    const plugin = fakePlugin(['empty.md', 'a.md', 'b.md', 'c.md']);
    const attempted = new Set<string>();
    const run = () => importBlocksChunked(plugin as never, { limit: 2, attempted });

    const first = await run();
    const second = await run();
    const third = await run();

    expect([first.importedCount, second.importedCount, third.importedCount]).toEqual([2, 2, 0]);
    expect(plugin.block_collection.import_source_blocks).toHaveBeenCalledTimes(4);
  });
});
