import type { SettingGroupItem } from 'obsidian';

import type { ModelPickerDeps } from './settings-model-picker-shared';
import { OLLAMA_QUICK_PICKS } from './settings-model-picker-shared';

export function ollamaModelDefinitions(
  deps: ModelPickerDeps,
  currentModelKey: string,
): SettingGroupItem[] {
  const { adapterName, config, confirmReembed, triggerReEmbed } = deps;
  const isQuickPick = OLLAMA_QUICK_PICKS.some((model) => model.value === currentModelKey);
  let pendingModelKey = currentModelKey;

  return [
    {
      name: 'Quick picks',
      desc: 'Recommended ollama embedding models',
      render: (setting) => {
        setting.addDropdown((dropdown) => {
          for (const model of OLLAMA_QUICK_PICKS) {
            dropdown.addOption(model.value, model.name);
          }
          dropdown.addOption('__manual__', 'Manual entry...');
          dropdown.setValue(isQuickPick ? currentModelKey : '__manual__');
          dropdown.onChange((value) => handleOllamaQuickPickChange(
            value,
            currentModelKey,
            isQuickPick,
            adapterName,
            config,
            confirmReembed,
            triggerReEmbed,
            dropdown,
            (nextValue) => {
              pendingModelKey = nextValue;
            },
          ));
        });
      },
    },
    {
      name: 'Model key',
      desc: 'Use quick picks or enter any local ollama embedding model key',
      render: (setting) => {
        setting
          .addText((text) => {
            text.setPlaceholder('Enter model name');
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
    },
  ];
}

async function handleOllamaQuickPickChange(
  value: string,
  currentModelKey: string,
  isQuickPick: boolean,
  adapterName: string,
  config: ModelPickerDeps['config'],
  confirmReembed: ModelPickerDeps['confirmReembed'],
  triggerReEmbed: ModelPickerDeps['triggerReEmbed'],
  dropdown: { setValue(value: string): unknown },
  setPendingModelKey: (value: string) => void,
): Promise<void> {
  if (value === '__manual__') return;
  if (value === currentModelKey) {
    setPendingModelKey(value);
    return;
  }
  const confirmed = await confirmReembed(
    'Changing the embedding model requires re-embedding all notes. This may take a while. Continue?',
  );
  if (!confirmed) {
    dropdown.setValue(isQuickPick ? currentModelKey : '__manual__');
    return;
  }
  setPendingModelKey(value);
  config.setConfig(`smart_sources.embed_model.${adapterName}.model_key`, value);
  await triggerReEmbed();
}
