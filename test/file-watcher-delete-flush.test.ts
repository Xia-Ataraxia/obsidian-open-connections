import { describe, expect, it, vi } from 'vitest';
vi.mock('obsidian', () => ({ TFile: class {}, TFolder: class {}, Notice: class {} }));
vi.mock('../src/ui/embed-orchestrator', () => ({ logEmbed: vi.fn(), runEmbeddingJobNow: vi.fn() }));
vi.mock('../src/ui/block-connections', () => ({ invalidateConnectionsCache: vi.fn() }));
vi.mock('../src/ui/collection-processing', () => ({ collectFolderSources: vi.fn(), processNewSourcesChunked: vi.fn() }));

import { removeSource, runReImport } from '../src/ui/file-watcher';

vi.stubGlobal('window', { setTimeout, clearTimeout });

describe('deleting a note', () => {
  it('flushes the delete to the adapter even with no other pending save', async () => {
    const deleted = new Set<string>();
    const makeCollection = () => ({
      data_adapter: { save: vi.fn().mockImplementation(() => { deleted.clear(); return Promise.resolve(); }) },
      get has_pending_deletes() { return deleted.size > 0; },
      delete: (key: string) => deleted.add(key),
      delete_source_blocks: (key: string) => deleted.add(`${key}#b`),
    });
    const source_collection = makeCollection();
    const block_collection = makeCollection();
    const plugin = {
      source_collection,
      block_collection,
      embedding_pipeline: {},
      pendingReImportPaths: new Set<string>(),
      settings: { re_import_wait_time: 1 },
      re_import_timeout: undefined,
    } as never;

    removeSource(plugin, 'gone.md');
    window.clearTimeout((plugin as { re_import_timeout?: number }).re_import_timeout);
    await runReImport(plugin);

    expect(source_collection.data_adapter.save).toHaveBeenCalledTimes(1);
  });
});
