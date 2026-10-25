/**
 * @file status-bar.ts
 * @description Status bar setup, rendering, and click handling for Open Connections
 */

import { setIcon } from 'obsidian';
import type SmartConnectionsPlugin from '../main';
import { getCurrentModelInfo } from './embed-orchestrator';
import { ConnectionsView } from './ConnectionsView';

let cachedVaultTag = '';
let cachedIcon = '';
let lastComputeMs = 0;
const CACHE_TTL_MS = 2000;

/**
 * Create the status bar item, wire up click handler, and render initial state.
 */
export function setupStatusBar(plugin: SmartConnectionsPlugin): void {
  const app_any = plugin.app as unknown as { statusBar?: { containerEl?: HTMLElement } };
  const status_bar_container: HTMLElement | undefined = app_any?.statusBar?.containerEl;
  if (!status_bar_container) return;

  const existing = status_bar_container.querySelector('.open-connections-status');
  if (existing) {
    existing.closest('.status-bar-item')?.remove();
  }

  plugin.status_elm = plugin.addStatusBarItem();
  plugin.status_elm.addClass('mod-clickable');
  plugin.status_container = plugin.status_elm.createDiv({
    cls: 'open-connections-status',
    attr: { role: 'button', tabindex: '0' },
  });
  cachedIcon = '';
  plugin.status_icon = plugin.status_container.createSpan('open-connections-status-icon');
  setStatusIcon(plugin, 'network');

  plugin.status_msg = plugin.status_container.createSpan('open-connections-status-msg');
  plugin.status_progress = plugin.status_container.createEl('progress', {
    cls: 'open-connections-status-progress',
    attr: { max: '100', value: '0' },
  });

  plugin.registerDomEvent(plugin.status_container, 'click', () => handleStatusBarClick(plugin));
  plugin.registerDomEvent(plugin.status_container, 'keydown', (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') handleStatusBarClick(plugin);
  });

  refreshStatus(plugin);
}

function getVaultTag(plugin: SmartConnectionsPlugin): string {
  const now = Date.now();
  if (now - lastComputeMs < CACHE_TTL_MS && cachedVaultTag) return cachedVaultTag;

  const totalBlocks = plugin.block_collection?.effectiveTotal ?? 0;
  const embeddedBlocks = plugin.block_collection?.embeddedCount ?? 0;
  const vaultPercent = totalBlocks > 0 ? Math.round((embeddedBlocks / totalBlocks) * 100) : 0;

  cachedVaultTag = `${embeddedBlocks}/${totalBlocks} (${vaultPercent}%)`;
  lastComputeMs = now;
  return cachedVaultTag;
}

function setStatusIcon(plugin: SmartConnectionsPlugin, icon: string): void {
  if (!plugin.status_icon || icon === cachedIcon) return;
  setIcon(plugin.status_icon, icon);
  cachedIcon = icon;
}

type StatusTone = 'idle' | 'embedding' | 'error';

function setStatusTone(plugin: SmartConnectionsPlugin, tone: StatusTone, percent = 0): void {
  const container = plugin.status_container;
  if (!container) return;
  const changed = !container.hasClass(`is-${tone}`);
  for (const name of ['idle', 'embedding', 'error']) container.toggleClass(`is-${name}`, name === tone);
  if (changed) {
    container.removeClass('is-changing');
    void container.offsetWidth;
    container.addClass('is-changing');
  }
  plugin.status_progress?.setAttribute('value', String(percent));
}

/**
 * Update the status bar text and tooltip based on current embed state.
 */
export function refreshStatus(plugin: SmartConnectionsPlugin): void {
  if (!plugin.status_msg || !plugin.status_container) return;

  if (!plugin.block_collection) {
    setStatusIcon(plugin, 'network');
    setStatusTone(plugin, 'idle');
    plugin.status_msg.setText('Loading…');
    plugin.status_container.setAttribute('title', 'Open connections is loading…');
    return;
  }

  const model = getCurrentModelInfo(plugin);
  const modelTag = `${model.adapter}/${model.modelKey}`;
  const ctx = plugin.current_embed_context;
  const vaultTag = getVaultTag(plugin);
  const runtime = plugin.getEmbedRuntimeState();

  if (runtime.serving.kind === 'degraded') {
    setStatusIcon(plugin, 'alert-triangle');
    setStatusTone(plugin, 'error');
    plugin.status_msg.setText(`OC: ${vaultTag}`);
    plugin.status_container.setAttribute(
      'title',
      `Embedding backlog degraded
Progress: ${vaultTag}
Model: ${modelTag}${model.dims ? ` (${model.dims}d)` : ''}
Indexed notes remain queryable${runtime.serving.error ? `
Last error: ${runtime.serving.error}` : ''}`,
    );
    return;
  }

  switch (plugin.status_state) {
    case 'idle':
      setStatusIcon(plugin, 'network');
      setStatusTone(plugin, 'idle');
      plugin.status_msg.setText(`OC: ${vaultTag}`);
      plugin.status_container.setAttribute(
        'title',
        `Open Connections is ready
Embedded: ${vaultTag}
Model: ${modelTag}${model.dims ? ` (${model.dims}d)` : ''}`,
      );
      break;
    case 'embedding': {
      setStatusIcon(plugin, 'loader');
      const runCurrent = ctx?.current ?? 0;
      const runTotal = ctx?.total ?? 0;
      const runPercent = runTotal > 0 ? Math.round((runCurrent / runTotal) * 100) : 0;
      setStatusTone(plugin, 'embedding', runPercent);
      plugin.status_msg.setText(`OC: ${runCurrent}/${runTotal} (${runPercent}%)`);
      const currentNote = ctx?.currentSourcePath ?? '-';
      plugin.status_container.setAttribute(
        'title',
        `Embedding in progress
Run: #${ctx?.runId ?? '-'}
Run: ${runCurrent}/${runTotal} (${runPercent}%)
Vault: ${vaultTag}
Model: ${modelTag}${model.dims ? ` (${model.dims}d)` : ''}
Current: ${currentNote}`,
      );
      break;
    }
    case 'error': {
      setStatusIcon(plugin, 'alert-triangle');
      setStatusTone(plugin, 'error');
      plugin.status_msg.setText(`OC: ${vaultTag}`);
      const unavailableError = runtime.serving.kind === 'unavailable' ? runtime.serving.error : null;
      plugin.status_container.setAttribute(
        'title',
        `Embedding model unavailable
Progress: ${vaultTag}
Click to open settings${unavailableError ? `
Last error: ${unavailableError}` : ''}`,
      );
      break;
    }
  }
}

/**
 * Handle clicks on the status bar item.
 */
export function handleStatusBarClick(plugin: SmartConnectionsPlugin): void {
  const runtime = plugin.getEmbedRuntimeState();
  if (runtime.serving.kind === 'unavailable') {
    (plugin.app as unknown as { setting?: { open?(): void } }).setting?.open?.();
    return;
  }
  ConnectionsView.open(plugin.app.workspace);
}
