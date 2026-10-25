import type { SettingGroupItem } from 'obsidian';

import type { ModelPickerDeps } from './settings-model-picker-shared';

export function knownModelDefinitions(
  deps: ModelPickerDeps,
  currentModelKey: string,
  knownModels: Array<{ value: string; name: string }>,
): SettingGroupItem[] {
  const { adapterName, config, confirmReembed, triggerReEmbed, update, customModelMode } = deps;
  const isCustom = !knownModels.some((model) => model.value === currentModelKey) && currentModelKey !== '';
  const showCustomInput = isCustom || customModelMode.adapter === adapterName
    || config.getConfig<string>(`smart_sources.embed_model.${adapterName}.model_key`, '') === '__custom__';

  const rows: SettingGroupItem[] = [{
    name: 'Model',
    desc: 'Embedding model',
    render: (setting) => {
      setting.addDropdown((dropdown) => {
        for (const model of knownModels) {
          dropdown.addOption(model.value, model.name);
        }
        dropdown.addOption('__custom__', 'Custom...');
        dropdown.setValue(showCustomInput ? '__custom__' : currentModelKey);
        dropdown.onChange(async (value) => {
          if (value === '__custom__') {
            customModelMode.adapter = adapterName;
            update();
            return;
          }
          customModelMode.adapter = null;
          if (value !== currentModelKey) {
            const confirmed = await confirmReembed(
              'Changing the embedding model requires re-embedding all notes. This may take a while. Continue?',
            );
            if (!confirmed) {
              if (showCustomInput) customModelMode.adapter = adapterName;
              dropdown.setValue(showCustomInput ? '__custom__' : currentModelKey);
              return;
            }
          }
          config.setConfig(`smart_sources.embed_model.${adapterName}.model_key`, value);
          await triggerReEmbed();
        });
      });
    },
  }];

  if (!showCustomInput) return rows;

  let pendingCustomModel = isCustom ? currentModelKey : '';
  rows.push({
    name: 'Custom model key',
    desc: 'Enter a custom model identifier',
    render: (setting) => {
      setting
        .addText((text) => {
          text.setPlaceholder('Org/model-name');
          text.setValue(pendingCustomModel);
          text.onChange((value) => {
            pendingCustomModel = value.trim();
          });
        })
        .addButton((button) => {
          button.setButtonText('Apply').setCta();
          button.onClick(async () => {
            const nextValue = pendingCustomModel.trim();
            if (!nextValue || nextValue === currentModelKey) return;
            const confirmed = await confirmReembed(
              'Applying a custom embedding model requires re-embedding notes. Continue?',
            );
            if (!confirmed) return;
            customModelMode.adapter = null;
            config.setConfig(`smart_sources.embed_model.${adapterName}.model_key`, nextValue);
            await triggerReEmbed();
          });
        });
    },
  });
  return rows;
}
