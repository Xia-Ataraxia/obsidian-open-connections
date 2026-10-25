/**
 * @file status-bar.ts
 * @description Status bar setup, rendering, and click handling for Open Connections
 */

import { setIcon } from 'obsidian';
import type SmartConnectionsPlugin from '../main';
import { getCurrentModelInfo } from './embed-orchestrator';
import { ConnectionsView } from './ConnectionsView';
import { runEmbeddingJob } from './run-embedding-job';

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

function setStatusLabel(plugin: SmartConnectionsPlugin, label: string): void {
  plugin.status_container?.setAttribute('aria-label', label);
}

type StatusTone = 'idle' | 'embedding' | 'paused' | 'error';

function setStatusTone(plugin: SmartConnectionsPlugin, tone: StatusTone, percent = 0): void {
  const container = plugin.status_container;
  if (!container) return;
  const changed = !container.hasClass(`is-${tone}`);
  for (const name of ['idle', 'embedding', 'paused', 'error']) container.toggleClass(`is-${name}`, name === tone);
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
  plugin.status_container.removeAttribute('aria-label');

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
    setStatusIcon(plugin, 'rotate-cw');
    setStatusTone(plugin, 'error');
    plugin.status_msg.setText(`OC: ${vaultTag} · Retry`);
    plugin.status_container.setAttribute(
      'title',
      `Indexing stopped after a crash. Click to retry.
Progress: ${vaultTag}
Model: ${modelTag}${model.dims ? ` (${model.dims}d)` : ''}
Indexed notes remain queryable`,
    );
    setStatusLabel(plugin, `Open Connections embedding stopped. ${vaultTag} embedded. Activate to retry.`);
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
      if (ctx?.phase === 'halted') {
        setStatusIcon(plugin, 'pause');
        setStatusTone(plugin, 'paused');
        plugin.status_msg.setText(`OC: paused ${vaultTag}`);
        plugin.status_container.setAttribute('title', `Embedding paused\nProgress: ${vaultTag}\nClick to resume`);
        break;
      }
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
      const retryable = typeof plugin.embed_adapter?.reset_failure === 'function';
      setStatusIcon(plugin, retryable ? 'rotate-cw' : 'alert-triangle');
      setStatusTone(plugin, 'error');
      plugin.status_msg.setText(retryable ? `OC: ${vaultTag} · Retry` : `OC: ${vaultTag}`);
      plugin.status_container.setAttribute(
        'title',
        `Indexing stopped: the embedding model is unavailable.
Progress: ${vaultTag}
${retryable ? 'Click to retry.' : 'Click to open settings.'}`,
      );
      setStatusLabel(plugin, `Open Connections embedding model unavailable. ${retryable ? 'Activate to retry.' : 'Activate to open settings.'}`);
      break;
    }
  }
}

/**
 * Handle clicks on the status bar item.
 */
export function handleStatusBarClick(plugin: SmartConnectionsPlugin): void {
  const runtime = plugin.getEmbedRuntimeState();
  const adapter = plugin.embed_adapter;
  const stopped = runtime.serving.kind === 'degraded' || runtime.serving.kind === 'unavailable';
  if (stopped && typeof adapter?.reset_failure === 'function') {
    adapter.reset_failure();
    plugin.queueUnembeddedEntities();
    void runEmbeddingJob(plugin, 'Manual retry');
    return;
  }
  if (runtime.serving.kind === 'unavailable') {
    (plugin.app as unknown as { setting?: { open?(): void } }).setting?.open?.();
    return;
  }
  ConnectionsView.open(plugin.app.workspace);
}
