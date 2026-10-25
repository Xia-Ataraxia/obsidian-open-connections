import type { SettingGroupItem } from 'obsidian';

import type { ModelPickerDeps } from './settings-model-picker-shared';
import { getKnownModels } from './settings-model-picker-shared';
import { freeformModelDefinitions } from './settings-model-dropdown-freeform';
import { knownModelDefinitions } from './settings-model-dropdown-known';
import { ollamaModelDefinitions } from './settings-model-dropdown-ollama';

export function modelDefinitions(deps: ModelPickerDeps): SettingGroupItem[] {
  const currentModelKey = deps.config.getConfig(
    `smart_sources.embed_model.${deps.adapterName}.model_key`,
    '',
  );
  if (deps.adapterName === 'ollama') return ollamaModelDefinitions(deps, currentModelKey);

  const knownModels = getKnownModels()[deps.adapterName];
  if (knownModels) return knownModelDefinitions(deps, currentModelKey, knownModels);

  return freeformModelDefinitions(deps, currentModelKey);
}
