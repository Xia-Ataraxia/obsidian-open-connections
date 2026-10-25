import type { SettingGroupItem } from 'obsidian';

import type { ModelPickerDeps } from './settings-model-picker-shared';

export function freeformModelDefinitions(
  deps: ModelPickerDeps,
  currentModelKey: string,
): SettingGroupItem[] {
  const { adapterName, config, confirmReembed, triggerReEmbed } = deps;
  let pendingModelKey = currentModelKey;

  return [{
    name: 'Model',
    desc: 'Embedding model key',
    render: (setting) => {
      setting
        .addText((text) => {
          text.setPlaceholder(adapterName === 'ollama' ? 'nomic-embed-text' : 'Model key');
          text.setValue(currentModelKey);
          text.onChange((value) => {
            pendingModelKey = value.trim();
          });
        })
        .addButton((button) => {
          button.setButtonText('Apply').setCta();
          button.onClick(async () => {
            if (!pendingModelKey || pendingModelKey === currentModelKey) return;
            const confirmed = await confirmReembed(
              'Changing the embedding model requires re-embedding all notes. Continue?',
            );
            if (!confirmed) return;
            config.setConfig(`smart_sources.embed_model.${adapterName}.model_key`, pendingModelKey);
            await triggerReEmbed();
          });
        });
    },
  }];
}
