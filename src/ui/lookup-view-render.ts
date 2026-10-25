import { ButtonComponent, Platform, setIcon } from 'obsidian';

import type SmartConnectionsPlugin from '../main';
import type { ConnectionResult } from '../types/entities';
import { showResultContextMenu } from './result-context-menu';
import {
  formatLookupBlockIndicator,
  formatLookupPath,
  formatLookupTitle,
  scoreTierFor,
  splitNoteKey,
} from './lookup-view-format';
import type { LookupFilter } from './lookup-view-format';

interface LookupViewRenderContext {
  app: SmartConnectionsPlugin['app'];
  plugin: SmartConnectionsPlugin;
  resultsContainer: HTMLElement;
  searchMetaEl: HTMLElement;
  lastQuery: string;
  activeFilter: LookupFilter;
  registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => void) => void;
  retrySearch: () => void;
}

function clearElement(element: HTMLElement): void {
  if (typeof (element as HTMLElement & { empty?: () => void }).empty === 'function') {
    (element as HTMLElement & { empty: () => void }).empty();
  } else {
    element.replaceChildren();
  }
}

export function handleLookupModelSwitched(view: LookupViewRenderContext): void {
  showLookupEmpty(
    view,
    'Embedding model changed. Results will refresh after active-model embeddings are ready.',
    true,
  );
}

export function renderLookupResults(
  view: LookupViewRenderContext,
  query: string,
  results: ConnectionResult[],
  elapsedMs?: number,
): void {
  clearElement(view.resultsContainer);
  if (!results.length) {
    clearElement(view.searchMetaEl);
    const message = (view.plugin.block_collection?.embeddedCount ?? 0) === 0
      ? 'No notes are embedded yet. Results appear once embedding finishes.'
      : `No results found for "${query}"`;
    showLookupEmpty(view, message, false);
    return;
  }

  const parts = [`${results.length} result${results.length === 1 ? '' : 's'}`];
  if (elapsedMs !== undefined) parts.push(`${elapsedMs}ms`);
  view.searchMetaEl.textContent = parts.join(' · ');

  const list = view.resultsContainer.createDiv({ cls: 'osc-results', attr: { role: 'list' } });
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (!result) continue;

    const score = result.score ?? result.sim ?? 0;
    const blockKey = result.item?.key ?? '';
    // Notes are ranked by their best block, but each row stands for the whole note.
    const key = view.activeFilter === 'notes' ? splitNoteKey(blockKey).path : blockKey;
    const fullPath = key.split('#')[0] ?? '';
    const threshold = view.plugin.settings?.smart_view_filter?.highlight_threshold ?? 0.8;
    const tier = scoreTierFor(score, threshold);
    const item = list.createDiv({
      cls: 'osc-lookup-result',
      attr: {
        role: 'listitem',
        tabindex: '0',
        'aria-label': `${formatLookupTitle(key)} — similarity ${Math.round(score * 100)}%`,
        style: `--osc-lookup-delay: ${index * 30}ms`,
      },
    });

    item.createDiv({ cls: `osc-lookup-result-bar osc-lookup-result-bar--${tier}` });
    const body = item.createDiv({ cls: 'osc-lookup-result-body' });
    const header = body.createDiv({ cls: 'osc-lookup-result-header' });
    header.createSpan({
      text: formatLookupTitle(key),
      cls: `osc-lookup-result-title${tier === 'high' ? ' osc-lookup-result-title--strong' : ''}`,
    });
    header.createSpan({
      text: `${Math.round(score * 100)}%`,
      cls: `osc-lookup-result-score osc-lookup-result-score--${tier}`,
    });

    const path = formatLookupPath(key);
    if (path) body.createDiv({ text: path, cls: 'osc-lookup-result-path' });
    const blockIndicator = formatLookupBlockIndicator(key);
    if (blockIndicator) body.createDiv({ text: blockIndicator, cls: 'osc-lookup-result-block-indicator' });

    view.registerDomEvent(item, 'click', (event) => {
      void view.plugin.open_note(key, event as MouseEvent);
    });
    view.registerDomEvent(item, 'keydown', (event) => {
      const keyEvent = event as KeyboardEvent;
      if (keyEvent.key === 'Enter') {
        void view.plugin.open_note(key);
      } else if (keyEvent.key === 'ArrowDown') {
        keyEvent.preventDefault();
        (item.nextElementSibling as HTMLElement | null)?.focus();
      } else if (keyEvent.key === 'ArrowUp') {
        keyEvent.preventDefault();
        (item.previousElementSibling as HTMLElement | null)?.focus();
      }
    });
    view.registerDomEvent(item, 'contextmenu', (event) => {
      showResultContextMenu(view.app, fullPath, event as MouseEvent);
    });
    view.registerDomEvent(item, 'mouseover', (event) => {
      view.app.workspace.trigger('hover-link', {
        event: event as MouseEvent,
        source: 'open-connections-lookup',
        hoverParent: view,
        targetEl: item,
        linktext: fullPath,
      });
    });
    item.setAttribute('draggable', 'true');
    view.registerDomEvent(item, 'dragstart', (event) => {
      const linkText = key.replace(/\.md$/, '').replace(/\.md#/, '#');
      (event as DragEvent).dataTransfer?.setData('text/plain', `[[${linkText}]]`);
    });
  }
}

export function showLookupLoading(view: LookupViewRenderContext, message = 'Loading…'): void {
  clearElement(view.resultsContainer);
  const wrapper = view.resultsContainer.createDiv({ cls: 'osc-state' });
  wrapper.createEl('p', { text: message, cls: 'osc-state-text osc-lookup-loading-text' });
}

export function showLookupEmpty(
  view: LookupViewRenderContext,
  message = 'No results',
  clear = true,
): void {
  if (clear) clearElement(view.resultsContainer);
  const wrapper = view.resultsContainer.createDiv({ cls: 'osc-state' });
  const iconEl = wrapper.createDiv({ cls: 'osc-lookup-empty-icon' });
  setIcon(iconEl, 'search');
  wrapper.createEl('p', { text: message, cls: 'osc-state-text' });
  const modKey = Platform?.isMacOS || Platform?.isIosApp ? 'Cmd' : 'Ctrl';
  wrapper.createEl('p', {
    text: `${modKey}+Shift+L to focus search`,
    cls: 'osc-state-hint',
  });
}

export function showLookupError(view: LookupViewRenderContext, message = 'An error occurred'): void {
  clearElement(view.resultsContainer);
  const wrapper = view.resultsContainer.createDiv({ cls: 'osc-state osc-state--error' });
  const iconEl = wrapper.createDiv({ cls: 'osc-state-icon' });
  setIcon(iconEl, 'alert-circle');
  wrapper.createEl('p', { text: message, cls: 'osc-state-text' });
  new ButtonComponent(wrapper).setButtonText('Try again').onClick(() => {
    if (view.lastQuery) {
      view.retrySearch();
    }
  });
}
