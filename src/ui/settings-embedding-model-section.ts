import type { SettingGroupItem } from 'obsidian';

import {
  getDefaultEmbedModelKey,
  getManagedSearchModel,
  shouldClearManagedSearchModel,
} from '../domain/embed-provider-policy';
import {
  apiKeyDefinition,
  hostDefinition,
  modelDefinitions,
  searchModelDefinitions,
} from './settings-model-picker';
import type { CustomModelMode } from './settings-model-picker-shared';
import type { SettingsConfigAccessor, SmartConnectionsPlugin } from './settings-types';

function ensureModelKeyForAdapter(config: SettingsConfigAccessor, adapterName: string): void {
  const existing = config.getConfig(`smart_sources.embed_model.${adapterName}.model_key`, '');
  if (typeof existing === 'string' && existing.trim().length > 0) {
    applyManagedSearchModel(config, adapterName);
    return;
  }

  const fallback = getDefaultEmbedModelKey(adapterName);
  if (!fallback) return;
  config.setConfig(`smart_sources.embed_model.${adapterName}.model_key`, fallback);
  applyManagedSearchModel(config, adapterName);
}

function applyManagedSearchModel(config: SettingsConfigAccessor, adapterName: string): void {
  const searchModel = getManagedSearchModel(adapterName);
  if (searchModel) {
    config.setConfig('smart_sources.search_model', searchModel);
  }
}

function clearManagedSearchModelIfStale(config: SettingsConfigAccessor, newAdapter: string): void {
  if (newAdapter === 'upstage') return;
  const searchModel = config.getConfig<{ adapter?: string; model_key?: string } | null>('smart_sources.search_model', null);
  if (shouldClearManagedSearchModel(searchModel, newAdapter)) {
    config.setConfig('smart_sources.search_model', undefined);
  }
}

function triggerSearchModelReInit(plugin: SmartConnectionsPlugin): void {
  plugin.switchEmbeddingModel?.('Search model changed').catch(() => {
    // Search model re-init failure is non-critical.
  });
}

const PROVIDERS: Record<string, string> = {
  transformers: 'Transformers (Local)',
  openai: 'OpenAI',
  ollama: 'Ollama (Local)',
  gemini: 'Google Gemini',
  lm_studio: 'LM Studio (Local)',
  upstage: 'Upstage',
  open_router: 'Open Router',
};

export function embeddingModelDefinitions(
  plugin: SmartConnectionsPlugin,
  config: SettingsConfigAccessor,
  confirmReembed: (message: string) => Promise<boolean>,
  triggerReEmbed: () => Promise<void>,
  update: () => void,
  customModelMode: CustomModelMode,
): SettingGroupItem[] {
  const currentAdapter = config.getConfig<string>('smart_sources.embed_model.adapter', 'transformers');

  const provider: SettingGroupItem = {
    name: 'Provider',
    desc: 'Embedding model provider',
    render: (setting) => {
      setting.addDropdown((dropdown) => {
        dropdown.addOptions(PROVIDERS);
        dropdown.setValue(currentAdapter);
        dropdown.onChange((value) => {
          void (async () => {
            if (value !== currentAdapter) {
              const confirmed = await confirmReembed(
                'Changing the embedding provider requires re-embedding all notes. This may take a while. Continue?',
              );
              if (!confirmed) {
                dropdown.setValue(currentAdapter);
                return;
              }
            }

            config.setConfig('smart_sources.embed_model.adapter', value);
            ensureModelKeyForAdapter(config, value);
            clearManagedSearchModelIfStale(config, value);
            update();
            await triggerReEmbed();
          })();
        });
      });
    },
  };

  const rows: SettingGroupItem[] = [
    provider,
    ...modelDefinitions({
      adapterName: currentAdapter,
      config,
      confirmReembed,
      triggerReEmbed,
      update,
      customModelMode,
    }),
  ];

  if (['openai', 'gemini', 'upstage', 'open_router'].includes(currentAdapter)) {
    rows.push(apiKeyDefinition(currentAdapter, config));
  }
  if (['ollama', 'lm_studio'].includes(currentAdapter)) {
    const defaultHost = currentAdapter === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234';
    rows.push(hostDefinition(currentAdapter, defaultHost, config));
  }

  rows.push(
    ...searchModelDefinitions({
      config,
      onChanged: () => triggerSearchModelReInit(plugin),
      update,
    }),
  );
  return rows;
}
