import type SmartConnectionsPlugin from '../main';
import { BlockCollection, NodeSqliteDataAdapter, SourceCollection, VaultFileDataAdapter } from '../domain/entities';
import type { VaultShim } from '../types/obsidian-shims';
import { getEmbedAdapterSettings, resolveStorageNamespace } from './collection-embed-context';

export async function initCollections(plugin: SmartConnectionsPlugin): Promise<void> {
  try {
    const dataDir = `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}/.smart-env`;
    const storageNamespace = resolveStorageNamespace(plugin, dataDir);
    const adapterSettings = getEmbedAdapterSettings(
      plugin.settings.smart_sources.embed_model,
    );
    const modelKey =
      plugin.embed_adapter?.model_key || (adapterSettings.model_key as string | undefined) || 'None';

    plugin.logger.debug(`[SC][Init]   [collections] Initializing with model_key=${modelKey}, data_dir=${dataDir}`);

    const sources = new SourceCollection(
      `${dataDir}/sources`,
      plugin.settings.smart_sources,
      modelKey,
      plugin.app.vault as unknown as VaultShim,
      plugin.app.metadataCache,
      storageNamespace,
    );
    const blocks = new BlockCollection(
      `${dataDir}/blocks`,
      plugin.settings.smart_blocks,
      modelKey,
      sources,
      storageNamespace,
    );
    sources.block_collection = blocks;
    plugin.source_collection = sources;
    plugin.block_collection = blocks;

    const vaultAdapter = plugin.app.vault.adapter;
    const configDir = plugin.app.vault.configDir;
    const pluginId = plugin.manifest.id;
    const useFileStore = (): void => {
      const onStoreRecovered = (file: string): void => {
        plugin.notices?.show('index_store_recovered', { file: file.split('/').pop() });
      };
      const sourceStore = new VaultFileDataAdapter(sources, 'smart_sources');
      const blockStore = new VaultFileDataAdapter(blocks, 'smart_blocks');
      sourceStore.onStoreRecovered = onStoreRecovered;
      blockStore.onStoreRecovered = onStoreRecovered;
      sources.data_adapter = sourceStore;
      blocks.data_adapter = blockStore;
    };
    const initAdapters = async (): Promise<void> => {
      await sources.data_adapter.initVaultContext(vaultAdapter, configDir, pluginId);
      await blocks.data_adapter.initVaultContext(vaultAdapter, configDir, pluginId);
    };
    if (hasDesktopBasePath(vaultAdapter)) {
      sources.data_adapter = new NodeSqliteDataAdapter(
        sources,
        'smart_sources',
        storageNamespace,
      );
      blocks.data_adapter = new NodeSqliteDataAdapter(
        blocks,
        'smart_blocks',
        storageNamespace,
      );
      try {
        await initAdapters();
      } catch (error) {
        // node:sqlite missing (older Electron) or unopenable: keep working on the file store.
        plugin.logger.warn(`node:sqlite unavailable, using the file store: ${String(error)}`);
        useFileStore();
        await initAdapters();
      }
    } else {
      useFileStore();
      await initAdapters();
    }

    await plugin.source_collection.init();
    await plugin.block_collection.init();
    plugin.logger.debug('Collections initialized successfully');
  } catch (error) {
    plugin.logger.error('Failed to initialize collections:', error);
    throw error;
  }
}

function hasDesktopBasePath(vaultAdapter: unknown): boolean {
  return typeof (vaultAdapter as { getBasePath?: unknown }).getBasePath === 'function';
}
