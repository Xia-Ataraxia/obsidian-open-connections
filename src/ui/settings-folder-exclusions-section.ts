import type { App, SettingGroupItem } from 'obsidian';

import {
  applyExcludedFolder,
  buildFolderExclusionConfirmMessage,
  removeExcludedFolder,
} from './folder-exclusion-actions';
import { FolderExclusionPickerModal } from './folder-exclusion-modal';
import {
  listVaultFolderPaths,
  parseExcludedFolderPaths,
} from './folder-exclusion-state';
import { confirmWithModal } from './settings-confirm-modal';
import type { SettingsConfigAccessor, SmartConnectionsPlugin } from './settings-types';

async function handleAddExcludedFolder(
  app: App,
  plugin: SmartConnectionsPlugin,
  config: SettingsConfigAccessor,
  update: () => void,
): Promise<void> {
  const existing = config.getConfig('smart_sources.folder_exclusions', '');
  const excluded = parseExcludedFolderPaths(existing);
  const folderPaths = listVaultFolderPaths(app).filter((path) => !excluded.includes(path));
  const selected = await new FolderExclusionPickerModal(app, folderPaths).openModal();
  if (!selected) return;

  const activeRun = plugin.getEmbedRuntimeState?.().backfill.kind === 'running';
  const confirmed = await confirmWithModal(
    app,
    buildFolderExclusionConfirmMessage(selected, activeRun),
  );
  if (!confirmed) return;

  await applyExcludedFolder(plugin, selected);
  update();
}

export function folderExclusionDefinitions(
  app: App,
  plugin: SmartConnectionsPlugin,
  config: SettingsConfigAccessor,
  update: () => void,
): SettingGroupItem[] {
  const excludedFolders = parseExcludedFolderPaths(
    config.getConfig('smart_sources.folder_exclusions', ''),
  );

  const addRow: SettingGroupItem = {
    name: 'Excluded folders',
    desc: excludedFolders.length === 0
      ? 'Choose vault folders to exclude. Confirming will remove existing embeddings for that folder. No excluded folders configured.'
      : 'Choose vault folders to exclude. Confirming will remove existing embeddings for that folder.',
    render: (setting) => {
      setting.addButton((button) => {
        button
          .setButtonText('Add folder')
          .setCta()
          .onClick(() => {
            void handleAddExcludedFolder(app, plugin, config, update);
          });
      });
    },
  };

  const folderRows = excludedFolders.map((folderPath): SettingGroupItem => ({
    name: folderPath,
    desc: 'Excluded',
    searchable: false,
    render: (setting) => {
      setting.addButton((button) => {
        button
          .setButtonText('×')
          .setClass('mod-warning')
          .onClick(() => {
            void removeExcludedFolder(plugin, folderPath).then(update);
          });
      });
    },
  }));

  return [addRow, ...folderRows];
}
