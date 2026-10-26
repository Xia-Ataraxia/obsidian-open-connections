import { renderStatCard } from './settings-status-pill-render';
import type { SmartConnectionsPlugin } from './settings-types';

function getStats(plugin: SmartConnectionsPlugin): {
  total: number;
  embedded: number;
  pending: number;
  pct: number;
} {
  const total = plugin.source_collection?.size ?? 0;
  const embedded = plugin.block_collection?.embeddedSourceCount ?? 0;
  const pending = Math.max(0, total - embedded);
  const pct = total > 0 ? Math.round((embedded / total) * 100) : 0;
  return { total, embedded, pending, pct };
}

export function renderStatsGrid(
  containerEl: HTMLElement,
  plugin: SmartConnectionsPlugin,
): HTMLElement {
  const statsGridEl = containerEl.createDiv({ cls: 'osc-stats-grid' });
  updateStatsGrid(statsGridEl, plugin);
  return statsGridEl;
}

export function updateStatsGrid(
  statsGridEl: HTMLElement,
  plugin: SmartConnectionsPlugin,
): void {
  const { total, embedded, pending, pct } = getStats(plugin);
  statsGridEl.empty();
  renderStatCard(statsGridEl, 'Notes', total.toLocaleString());
  renderStatCard(statsGridEl, 'Embedded notes', embedded.toLocaleString(), 'green');
  renderStatCard(statsGridEl, 'Pending notes', pending.toLocaleString(), pending > 0 ? 'amber' : undefined);
  renderStatCard(statsGridEl, 'Indexed', `${pct}%`, pct >= 100 ? 'green' : undefined);
}
