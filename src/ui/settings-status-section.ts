import type { SettingGroupItem } from 'obsidian';

import { renderEmbedProgress } from './embed-progress';
import { getRuntimeState } from './settings-status-runtime-state';
import { setElementText } from './settings-status-pill-render';
import { updateStatusPills } from './settings-status-pills';
import { renderStatsGrid, updateStatsGrid } from './settings-status-stats-grid';
import type { EmbeddingStatusElements, SmartConnectionsPlugin } from './settings-types';

export function createStatusElements(): EmbeddingStatusElements {
  return {
    eventRefs: [],
    statusRowEl: null,
    statsGridEl: null,
    currentRunEl: null,
    currentRunSettingEl: null,
    embedProgress: null,
  };
}

export function statusDefinitions(
  plugin: SmartConnectionsPlugin,
  elements: EmbeddingStatusElements,
): SettingGroupItem[] {
  return [
    {
      name: 'Status',
      searchable: false,
      render: (setting) => {
        elements.statusRowEl = setting.descEl.createDiv({ cls: 'osc-model-status' });
        elements.statsGridEl = renderStatsGrid(setting.descEl, plugin);
        elements.embedProgress = renderEmbedProgress(setting.descEl, plugin);
        updateEmbeddingStatusOnly(plugin, elements);
        return () => {
          elements.embedProgress?.destroy();
          elements.embedProgress = null;
          elements.statusRowEl = null;
          elements.statsGridEl = null;
        };
      },
    },
    {
      name: 'Current run',
      searchable: false,
      render: (setting) => {
        elements.currentRunEl = setting.descEl;
        elements.currentRunSettingEl = setting.settingEl;
        setting.setDesc('-');
        updateEmbeddingStatusOnly(plugin, elements);
        return () => {
          elements.currentRunEl = null;
          elements.currentRunSettingEl = null;
        };
      },
    },
  ];
}

export function updateEmbeddingStatusOnly(
  plugin: SmartConnectionsPlugin,
  elements: EmbeddingStatusElements,
  activeCtx = plugin.getActiveEmbeddingContext?.() ?? null,
  status = plugin.status_state ?? 'idle',
): void {
  const runtime = getRuntimeState(plugin);

  if (elements.statusRowEl) updateStatusPills(plugin, elements.statusRowEl);

  if (elements.statsGridEl) {
    updateStatsGrid(elements.statsGridEl, plugin);
  }

  elements.embedProgress?.update();
  if (!elements.currentRunEl) return;

  if (status === 'embedding' && activeCtx) {
    elements.currentRunSettingEl?.removeClass('osc-hidden');
    const runCurrent = activeCtx.current ?? 0;
    const runTotal = activeCtx.total ?? 0;
    const runPercent = runTotal > 0 ? Math.round((runCurrent / runTotal) * 100) : 0;
    const currentItem = activeCtx.currentSourcePath ?? activeCtx.currentEntityKey ?? '-';
    setElementText(
      elements.currentRunEl,
      `Run #${activeCtx.runId ?? '-'} • ${runCurrent.toLocaleString()}/${runTotal.toLocaleString()} (${runPercent}%) • ${currentItem}`,
    );
    return;
  }

  if (runtime?.serving.kind === 'degraded') {
    elements.currentRunSettingEl?.removeClass('osc-hidden');
    setElementText(
      elements.currentRunEl,
      runtime.serving.error
        ? `Background embedding degraded. Indexed notes remain queryable. Last error: ${runtime.serving.error}`
        : 'Background embedding degraded. Indexed notes remain queryable.',
    );
    return;
  }

  if (status === 'error') {
    elements.currentRunSettingEl?.removeClass('osc-hidden');
    setElementText(elements.currentRunEl, 'Embedding model is unavailable. Check settings and notices for details.');
    return;
  }

  elements.currentRunSettingEl?.addClass('osc-hidden');
}
