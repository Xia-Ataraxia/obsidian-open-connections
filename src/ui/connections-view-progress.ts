import { ProgressBarComponent, type App } from 'obsidian';

import { invalidateConnectionsCache } from './block-connections';
import { syncModelDownload } from './connections-model-download';
import type { ConnectionsView } from './ConnectionsView';
import { clearAutoEmbedTimeout } from './connections-view-auto-embed';

export function cancelPendingRetry(view: ConnectionsView): void {
  if (view._pendingRetry === null) return;
  window.clearTimeout(view._pendingRetry);
  view._pendingRetry = null;
}

export function clearEmbedProgress(view: ConnectionsView): void {
  if (!view.embedProgress) return;
  view.embedProgress.destroy();
  view.embedProgress = null;
}

function clearConnectionsBanner(view: ConnectionsView): void {
  if (!view.container) return;
  view.container.querySelectorAll('.osc-banner').forEach((banner) => banner.remove());
}

// app.setting is not in the public typings; guard it like any optional API.
function openPluginSettings(app: App, id: string): void {
  const setting = (app as App & { setting?: { open?: () => void; openTabById?: (tabId: string) => void } }).setting;
  setting?.open?.();
  setting?.openTabById?.(id);
}

// Qualitative by design (b4eae52): Settings owns numeric progress; the view only shows activity.
export function addConnectionsBanner(view: ConnectionsView, message: string, active = false, tone: 'info' | 'error' = 'info'): void {
  let banner = view.container.querySelector<HTMLElement>('.osc-banner');
  if (!banner || banner !== view.container.lastElementChild) {
    clearConnectionsBanner(view);
    banner = view.container.createDiv({ cls: 'osc-banner', attr: { role: 'status' } });
    const row = banner.createDiv({ cls: 'osc-banner-row' });
    row.createSpan({ cls: 'osc-banner-text' });
    const settingsBtn = row.createEl('button', { cls: 'osc-banner-action', text: 'Open settings' });
    settingsBtn.addEventListener('click', () => openPluginSettings(view.app, view.plugin.manifest.id));
    new ProgressBarComponent(banner.createDiv({ cls: 'osc-banner-bar' })).setValue(30);
  }
  banner.toggleClass('osc-banner--error', tone === 'error');
  banner.toggleClass('osc-banner--active', active);
  banner.find('.osc-banner-text').setText(message);
}

export function handleConnectionsModelSwitched(view: ConnectionsView): void {
  clearAutoEmbedTimeout(view);
  clearEmbedProgress(view);
  clearConnectionsBanner(view);
  invalidateConnectionsCache();
  view.resultsCache.invalidateAll();
  view.container.empty();
  addConnectionsBanner(view, 'Embedding model changed. Re-embedding…', true);
  view.lastRenderedPath = null;
  view.lastRenderFingerprint = null;
  view.lastSearchFingerprint = null;
  view._lastResultKeys = [];
  view.autoEmbedRequestedForPath = null;
}

export function updateConnectionsProgressBanner(view: ConnectionsView): void {
  if (!view.container) return;

  const totalBlocks = view.plugin.block_collection?.effectiveTotal ?? 0;
  const embeddedBlocks = view.plugin.block_collection?.embeddedCount ?? 0;
  const isComplete = totalBlocks > 0 && embeddedBlocks >= totalBlocks;
  const runtime = view.plugin.getEmbedRuntimeState?.() ?? null;
  const hasPendingWork = totalBlocks > 0 && !isComplete;
  const modelLoading = runtime
    ? runtime.serving.kind === 'loading'
    : !view.plugin.embed_ready && view.plugin.status_state !== 'error';
  const isRunning = runtime
    ? runtime.backfill.kind === 'running'
    : view.plugin.status_state === 'embedding';

  let message: string | null = null;
  let active = false;
  let tone: 'info' | 'error' = 'info';
  if (view.plugin.status_state === 'error') {
    message = hasPendingWork
      ? 'Embedding hit an error; results may be stale.'
      : 'Embedding hit an error.';
    tone = 'error';
  } else if (modelLoading) {
    message = 'Preparing embedding model…';
    active = true;
  } else if (isRunning) {
    message = 'Updating index. Results may be stale.';
    active = true;
  } else if (hasPendingWork) {
    message = 'Index update pending. Results may be stale.';
  }

  clearEmbedProgress(view);
  if (!message) {
    clearConnectionsBanner(view);
    return;
  }

  addConnectionsBanner(view, message, active, tone);
  syncModelDownload(view);
}
