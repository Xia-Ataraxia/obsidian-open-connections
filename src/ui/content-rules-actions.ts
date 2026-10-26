import { normalizeContentRules } from '../utils';
import type { SmartConnectionsPlugin } from './settings-types';

interface ReembeddableEntity {
  set_active_embedding_meta?: (meta: { hash: string }) => void;
  queue_embed?: () => void;
}

/** Persists new rules and re-embeds every entity, since embed input (not file content) changed. */
export async function applyContentRulesChange(
  plugin: SmartConnectionsPlugin,
  raw: string,
): Promise<boolean> {
  const settings = plugin.settings?.smart_sources;
  if (!settings) return false;
  const next = normalizeContentRules(raw);
  if (next === normalizeContentRules(settings.content_rules ?? '')) return false;

  settings.content_rules = next;
  await plugin.saveSettings?.();

  const collections = [plugin.source_collection, plugin.block_collection] as Array<
    { all?: unknown[] } | undefined
  >;
  for (const collection of collections) {
    for (const entity of (collection?.all ?? []) as ReembeddableEntity[]) {
      entity.set_active_embedding_meta?.({ hash: '' });
      entity.queue_embed?.();
    }
  }
  void plugin.reembedStaleEntities?.('Content rules changed');
  return true;
}
