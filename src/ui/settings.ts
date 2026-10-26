/**
 * @file settings.ts
 * @description Settings tab composition for Open Connections.
 */

import { App, PluginSettingTab } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';

import {
  blockDefinitions,
  excludedHeadingsDefinition,
  sourceDefinitions,
  viewDefinitions,
} from './settings-basic-sections';
import { createSettingsConfigAccessor } from './settings-config-accessor';
import { confirmWithModal } from './settings-confirm-modal';
import { embeddingModelDefinitions } from './settings-embedding-model-section';
import { folderExclusionDefinitions } from './settings-folder-exclusions-section';
import { mcpDefinitions } from './settings-mcp-section';
import type { CustomModelMode } from './settings-model-picker-shared';
import { noticeDefinitions } from './settings-notice-section';
import {
  createStatusElements,
  statusDefinitions,
  updateEmbeddingStatusOnly,
} from './settings-status-section';
import type { SmartConnectionsPlugin } from './settings-types';

export class SmartConnectionsSettingsTab extends PluginSettingTab {
  plugin: SmartConnectionsPlugin;
  private statusElements = createStatusElements();
  private customModelMode: CustomModelMode = { adapter: null };

  constructor(app: App, plugin: SmartConnectionsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    // Obsidian caches definitions and never calls getSettingDefinitions or display()
    // when the tab is reopened, so listeners live for the plugin and data changes call update().
    plugin.registerEvent(app.workspace.on('open-connections:embed-progress', () => this.updateEmbeddingStatusOnly()));
    plugin.registerEvent(app.workspace.on('open-connections:embed-state-changed', () => this.updateEmbeddingStatusOnly()));
    plugin.registerEvent(app.workspace.on('open-connections:notices-changed', () => this.update()));
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    if (!this.plugin.settings) return [];
    this.containerEl.addClass('open-connections-settings');

    const config = createSettingsConfigAccessor(this.app, this.plugin);
    const update = (): void => this.update();

    return [
      {
        type: 'group',
        heading: 'Embedding model',
        items: embeddingModelDefinitions(
          this.plugin,
          config,
          (message) => this.confirmReembed(message),
          () => this.triggerReEmbed(),
          update,
          this.customModelMode,
        ),
      },
      {
        type: 'group',
        heading: 'Sources',
        items: [
          ...sourceDefinitions(),
          ...folderExclusionDefinitions(this.app, this.plugin, config, update),
          excludedHeadingsDefinition(),
        ],
      },
      { type: 'group', heading: 'Blocks', items: blockDefinitions() },
      { type: 'group', heading: 'View', items: viewDefinitions() },
      { type: 'group', heading: 'Notices', items: noticeDefinitions(this.plugin) },
      { type: 'group', heading: 'MCP', items: mcpDefinitions(this.plugin, update) },
      {
        type: 'group',
        heading: 'Embedding status',
        items: [
          ...statusDefinitions(this.plugin, this.statusElements),
          {
            name: 'Actions',
            desc: 'Control the embedding pipeline.',
            render: (setting) => {
              setting.addButton((button) => {
                button.setButtonText('Re-embed stale').onClick(async () => {
                  const count = await this.plugin.reembedStaleEntities?.('Settings re-embed');
                  if (count === 0) {
                    this.plugin.notices?.show?.('no_stale_entities');
                  }
                  update();
                });
              });
            },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    return createSettingsConfigAccessor(this.app, this.plugin).getConfig(key, undefined);
  }

  setControlValue(key: string, value: unknown): void {
    if (typeof value === 'number' && Number.isNaN(value)) return;
    createSettingsConfigAccessor(this.app, this.plugin).setConfig(key, value);
  }

  updateEmbeddingStatusOnly(): void {
    updateEmbeddingStatusOnly(this.plugin, this.statusElements);
  }

  private async confirmReembed(message: string): Promise<boolean> {
    return confirmWithModal(this.app, message);
  }

  private async triggerReEmbed(): Promise<void> {
    this.plugin.notices?.show?.('reinitializing_embedding_model');
    try {
      await this.plugin.switchEmbeddingModel?.('Settings model switch');
      this.plugin.notices?.show?.('embedding_model_switched');
      this.update();
    } catch {
      this.plugin.notices?.show?.('failed_reinitialize_model');
    }
  }
}
