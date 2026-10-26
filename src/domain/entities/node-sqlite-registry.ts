import { join } from 'path';
import type { DatabaseSync } from 'node:sqlite';

import { ensureSchema } from './node-sqlite-helpers';

const openDatabases = new Map<string, { db: DatabaseSync; closed: boolean }>();

export function closeNodeSqliteDatabases(): void {
  for (const entry of openDatabases.values()) {
    try {
      if (!entry.closed) {
        entry.db.close();
        entry.closed = true;
      }
    } catch (error) {
      console.warn('[NodeSQLite] Failed to close database:', error);
    }
  }
  openDatabases.clear();
}

export function initNodeSqliteDatabase(
  vaultAdapter: unknown,
  configDir: string,
  pluginId: string,
): Promise<DatabaseSync> {
  const adapter = vaultAdapter as { getBasePath?: () => string };
  const basePath = typeof adapter.getBasePath === 'function'
    ? adapter.getBasePath()
    : (() => {
        throw new Error('[NodeSQLite] vaultAdapter.getBasePath() not available');
      })();
  const absoluteDbPath = join(basePath, configDir, 'plugins', pluginId, `${pluginId}.db`);
  return initNodeSqliteDatabaseAtPath(absoluteDbPath);
}

export function initNodeSqliteDatabaseAtPath(absoluteDbPath: string): Promise<DatabaseSync> {
  const existing = openDatabases.get(absoluteDbPath);
  if (existing && !existing.closed) {
    return Promise.resolve(existing.db);
  }

  // Lazy require: Chromium cannot dynamic-import() node: builtins, and a top-level import would break mobile load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, see above
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
  const db = new DatabaseSync(absoluteDbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('PRAGMA wal_autocheckpoint = 10000');
  db.exec('PRAGMA mmap_size = 67108864');
  ensureSchema(db);
  openDatabases.set(absoluteDbPath, { db, closed: false });
  return Promise.resolve(db);
}
