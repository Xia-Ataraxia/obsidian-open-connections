import { ButtonComponent, setIcon } from 'obsidian';
import type { ItemView } from 'obsidian';

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
  retrySearch: () => void;
}

type LookupResultHost = Pick<ItemView, 'app' | 'registerDomEvent'> & {
  plugin: SmartConnectionsPlugin;
  resultsContainer: HTMLElement;
};

function clearElement(element: HTMLElement): void {
  if (typeof (element as HTMLElement & { empty?: () => void }).empty === 'function') {
    (element as HTMLElement & { empty: () => void }).empty();
  } else {
    element.replaceChildren();
  }
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
    const threshold = view.plugin.settings?.smart_view_filter?.highlight_threshold ?? 0.8;
    const tier = scoreTierFor(score, threshold);
    const item = list.createDiv({
      cls: 'osc-lookup-result',
      attr: {
        role: 'listitem',
        tabindex: '0',
        'data-key': key,
        'aria-label': `${formatLookupTitle(key)} — similarity ${Math.round(score * 100)}%`,
      },
    });
    item.setCssProps({ '--osc-lookup-delay': `${index * 30}ms` });

    item.createSpan({ text: `${Math.round(score * 100)}%`, cls: `osc-score osc-score--${tier}` });
    const body = item.createDiv({ cls: 'osc-lookup-result-body' });
    body.createSpan({
      text: formatLookupTitle(key),
      cls: `osc-lookup-result-title${tier === 'high' ? ' osc-lookup-result-title--strong' : ''}`,
    });

    const path = formatLookupPath(key);
    if (path) body.createDiv({ text: path, cls: 'osc-lookup-result-path' });
    const blockIndicator = formatLookupBlockIndicator(key);
    if (blockIndicator) body.createDiv({ text: blockIndicator, cls: 'osc-lookup-result-block-indicator' });

    item.setAttribute('draggable', 'true');
  }
}

/**
 * Wire result interactions once on the results container; rows are rebuilt on every search.
 */
export function registerLookupResultEvents(view: LookupResultHost): void {
  const container = view.resultsContainer;
  const resultFor = (event: Event): HTMLElement | null => {
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('.osc-lookup-result');
    return item && container.contains(item) ? item : null;
  };
  const pathOf = (item: HTMLElement): string => (item.dataset.key ?? '').split('#')[0] ?? '';

  view.registerDomEvent(container, 'click', (event) => {
    const item = resultFor(event);
    if (item) void view.plugin.open_note(item.dataset.key ?? '', event);
  });
  view.registerDomEvent(container, 'keydown', (event) => {
    const item = resultFor(event);
    if (!item) return;
    if (event.key === 'Enter') {
      void view.plugin.open_note(item.dataset.key ?? '');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      (item.nextElementSibling as HTMLElement | null)?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      (item.previousElementSibling as HTMLElement | null)?.focus();
    }
  });
  view.registerDomEvent(container, 'contextmenu', (event) => {
    const item = resultFor(event);
    if (item) showResultContextMenu(view.plugin, pathOf(item), event);
  });
  view.registerDomEvent(container, 'mouseover', (event) => {
    const item = resultFor(event);
    if (!item) return;
    view.app.workspace.trigger('hover-link', {
      event,
      source: 'open-connections-lookup',
      hoverParent: view,
      targetEl: item,
      linktext: pathOf(item),
    });
  });
  view.registerDomEvent(container, 'dragstart', (event) => {
    const item = resultFor(event);
    if (!item) return;
    const linkText = (item.dataset.key ?? '').replace(/\.md$/, '').replace(/\.md#/, '#');
    event.dataTransfer?.setData('text/plain', `[[${linkText}]]`);
  });
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
