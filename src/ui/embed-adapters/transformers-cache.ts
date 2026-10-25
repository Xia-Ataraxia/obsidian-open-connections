import type { App } from 'obsidian';

/** Persists model files for the sandboxed iframe, which has no Cache API or IndexedDB access. */
export interface ModelCacheStore {
  get(key: string): Promise<ArrayBuffer | null>;
  put(key: string, body: ArrayBuffer): Promise<void>;
}

let store: ModelCacheStore | null = null;

export function setModelCacheStore(next: ModelCacheStore | null): void {
  store = next;
}

export function getModelCacheStore(): ModelCacheStore | null {
  return store;
}

export function createVaultModelCache(app: App, pluginId: string): ModelCacheStore {
  const dir = `${app.vault.configDir}/plugins/${pluginId}/models`;
  const pathFor = (key: string): string => `${dir}/${encodeURIComponent(key)}`;
  const adapter = app.vault.adapter;
  return {
    async get(key) {
      const path = pathFor(key);
      return (await adapter.exists(path)) ? adapter.readBinary(path) : null;
    },
    async put(key, body) {
      if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
      await adapter.writeBinary(pathFor(key), body);
    },
  };
}
