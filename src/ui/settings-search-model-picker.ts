import { setTooltip, type SettingGroupItem } from 'obsidian';

import type { SearchModelPickerDeps } from './settings-model-picker-shared';
import { getKnownModels, resolveModelDims } from './settings-model-picker-shared';
import { embedAdapterRegistry } from '../domain/embed-model';

type DimsSignal = 'ok' | 'warn' | 'error';

const DIMS_SIGNAL_TOOLTIPS: Record<DimsSignal, string> = {
  ok: 'Same provider and dimensions — fully compatible',
  warn: 'Different provider but same dimensions — should work, verify quality',
  error: 'Dimension mismatch — search results will be incompatible',
};

function computeDimsSignal(
  indexingAdapter: string,
  indexingDims: number | null,
  searchAdapter: string,
  searchDims: number | null,
): DimsSignal {
  if (indexingDims == null || searchDims == null) return 'ok';
  if (indexingDims !== searchDims) return 'error';
  if (indexingAdapter !== searchAdapter) return 'warn';
  return 'ok';
}

export function searchModelDefinitions(deps: SearchModelPickerDeps): SettingGroupItem[] {
  const { config, onChanged, update } = deps;
  const indexingAdapter = config.getConfig('smart_sources.embed_model.adapter', 'transformers');
  const indexingModelKey = config.getConfig(`smart_sources.embed_model.${indexingAdapter}.model_key`, '');
  const indexingDims = resolveModelDims(indexingAdapter, indexingModelKey);
  const searchAdapter = config.getConfig('smart_sources.search_model.adapter', '');
  const searchModelKey = config.getConfig('smart_sources.search_model.model_key', '');
  const isSearchModelSet = searchAdapter !== '' && searchModelKey !== '';

  const rows: SettingGroupItem[] = [{
    name: 'Search provider',
    desc: 'Provider used for search queries. "same as indexing" uses the indexing model.',
    render: (setting) => {
      setting.addDropdown((dropdown) => {
        dropdown.addOption('', 'Same as indexing');
        for (const registration of embedAdapterRegistry.getAll()) {
          dropdown.addOption(registration.name, registration.displayName);
        }
        dropdown.setValue(searchAdapter);
        dropdown.onChange((value) => {
          if (value === '') {
            config.setConfig('smart_sources.search_model', undefined);
          } else {
            const registration = embedAdapterRegistry.get(value);
            const firstModelKey = registration ? Object.keys(registration.models)[0] ?? '' : '';
            config.setConfig('smart_sources.search_model', {
              adapter: value,
              model_key: firstModelKey,
            });
          }
          onChanged();
          update();
        });
      });
    },
  }];

  if (!isSearchModelSet) return rows;

  const searchModels = getKnownModels()[searchAdapter] ?? [];
  if (searchModels.length > 0) {
    rows.push({
      name: 'Search model',
      desc: 'Model used for embedding search queries',
      render: (setting) => {
        setting.addDropdown((dropdown) => {
          for (const model of searchModels) {
            dropdown.addOption(model.value, model.name);
          }
          dropdown.setValue(searchModelKey);
          dropdown.onChange((value) => {
            config.setConfig('smart_sources.search_model', {
              adapter: searchAdapter,
              model_key: value,
            });
            onChanged();
            update();
          });
        });
      },
    });
  }

  const searchDims = resolveModelDims(searchAdapter, searchModelKey);
  const signal = computeDimsSignal(indexingAdapter, indexingDims, searchAdapter, searchDims);
  rows.push({
    name: 'Dimensions',
    desc: 'Indexing and search model vector sizes',
    searchable: false,
    render: (setting) => {
      const dimsRow = setting.controlEl.createDiv({ cls: 'osc-dims-row' });
      const indexLabel = dimsRow.createSpan({
        text: `Indexing: ${indexingDims != null ? `${indexingDims}d` : '?'}`,
        cls: 'osc-dims-ok',
      });
      indexLabel.setAttribute('aria-label', 'Indexing model dimensions');

      const searchLabel = dimsRow.createSpan({
        text: `Search: ${searchDims != null ? `${searchDims}d` : '?'}`,
        cls: `osc-dims-${signal}`,
      });
      searchLabel.setAttribute('aria-label', DIMS_SIGNAL_TOOLTIPS[signal]);
      setTooltip(searchLabel, DIMS_SIGNAL_TOOLTIPS[signal]);
    },
  });
  return rows;
}
