import { Menu, setIcon } from 'obsidian';

import type { ConnectionResult } from '../types/entities';
import type { ConnectionsView } from './ConnectionsView';
import { enqueueBlocksForEmbedding } from './connections-view-auto-embed';
import { listenOnRendered } from './connections-view-dom';
import { saveConnectionsSession } from './connections-view-session';
import { getConnectionsResultSourcePath } from './connections-view-result-list';

export function renderPauseButton(view: ConnectionsView, actions: HTMLElement, targetPath: string): void {
  const pauseBtn = actions.createEl('button', {
    cls: 'clickable-icon',
    attr: { 'aria-label': view.session.paused ? 'Resume' : 'Pause', 'aria-pressed': String(view.session.paused) },
  });
  setIcon(pauseBtn, view.session.paused ? 'play' : 'pause');
  pauseBtn.toggleClass('is-active', view.session.paused);

  listenOnRendered(pauseBtn, 'click', () => {
    view.session.paused = !view.session.paused;
    if (view.session.paused) {
      view.session.pausedPath = targetPath;
    } else {
      delete view.session.pausedPath;
      const active = view.app.workspace.getActiveFile();
      if (active) void view.renderView(active.path);
    }
    void saveConnectionsSession(view);
    setIcon(pauseBtn, view.session.paused ? 'play' : 'pause');
    pauseBtn.toggleClass('is-active', view.session.paused);
    pauseBtn.setAttribute('aria-label', view.session.paused ? 'Resume' : 'Pause');
    pauseBtn.setAttribute('aria-pressed', String(view.session.paused));
  });
}

export function renderFilterButton(
  view: ConnectionsView,
  actions: HTMLElement,
  targetPath: string,
  results: ConnectionResult[],
): void {
  const filterBtn = actions.createEl('button', {
    cls: `clickable-icon${view.folderFilter ? ' is-active' : ''}`,
    attr: { 'aria-label': view.folderFilter ? `Filter: ${view.folderFilter}` : 'Filter by folder' },
  });
  setIcon(filterBtn, 'filter');

  listenOnRendered(filterBtn, 'click', () => {
    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle('All folders').setIcon('folder').onClick(() => {
        view.folderFilter = '';
        void view.renderView(targetPath);
      }),
    );

    const folders = new Set<string>();
    for (const result of results) {
      const sourcePath = getConnectionsResultSourcePath(result);
      const firstFolder = sourcePath.split('/')[0];
      if (sourcePath.includes('/') && firstFolder) folders.add(firstFolder);
    }
    for (const folder of Array.from(folders).sort()) {
      menu.addItem((item) =>
        item
          .setTitle(folder)
          .setIcon(view.folderFilter === folder ? 'check' : 'folder')
          .onClick(() => {
            view.folderFilter = view.folderFilter === folder ? '' : folder;
            void view.renderView(targetPath);
          }),
      );
    }

    const hiddenCount = view.session.hiddenKeys.length;
    if (hiddenCount > 0) {
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle(`Show ${hiddenCount} hidden connection${hiddenCount === 1 ? '' : 's'}`)
          .setIcon('eye')
          .onClick(() => {
            view.session.hiddenKeys = [];
            void saveConnectionsSession(view);
            void view.renderView(targetPath);
            view.plugin.notices?.show?.('hidden_connections_restored', {
              count: hiddenCount,
              noun: hiddenCount === 1 ? 'connection' : 'connections',
            });
          }),
      );
    }

    menu.showAtMouseEvent(new MouseEvent('click', {
      clientX: filterBtn.getBoundingClientRect().left,
      clientY: filterBtn.getBoundingClientRect().bottom,
    }));
  });
}

export function renderRefreshButton(view: ConnectionsView, actions: HTMLElement, targetPath: string): void {
  const refreshBtn = actions.createEl('button', {
    cls: 'clickable-icon',
    attr: { 'aria-label': 'Refresh' },
  });
  setIcon(refreshBtn, 'refresh-cw');

  listenOnRendered(refreshBtn, 'click', () => {
    // Not core's is-loading: that adds a sweeping accent bar on top of the spin.
    if (refreshBtn.hasClass('osc-is-refreshing')) return;
    refreshBtn.addClass('osc-is-refreshing');
    refreshBtn.setAttribute('aria-busy', 'true');
    void (async () => {
      try {
        const fileBlocks = view.plugin.block_collection?.for_source(targetPath) ?? [];
        if (fileBlocks.length > 0) {
          enqueueBlocksForEmbedding(fileBlocks);
          await view.plugin.runEmbeddingJob('Connections view refresh');
        }
      } catch {
        refreshBtn.removeClass('osc-is-refreshing');
        refreshBtn.removeAttribute('aria-busy');
        return;
      }
      // renderView rebuilds the header, which replaces this button and its pending state.
      void view.renderView(targetPath);
    })();
  });
}
