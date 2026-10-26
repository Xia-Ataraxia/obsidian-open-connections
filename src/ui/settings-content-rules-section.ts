import { debounce, type SettingGroupItem } from 'obsidian';

import { CONTENT_RULE_PRESETS, normalizeContentRules, parseContentRules } from '../utils';
import { applyContentRulesChange } from './content-rules-actions';
import type { SettingsConfigAccessor, SmartConnectionsPlugin } from './settings-types';

const SETTLE_MS = 1500;
const BASE_DESC = 'Regular expressions, one per line. Matching text is removed from notes before embedding.';

function statusText(raw: string): string {
  const { regexes, invalid } = parseContentRules(raw);
  const parts = [`${regexes.length} active`];
  if (invalid.length > 0) parts.push(`${invalid.length} invalid, ignored`);
  return `${BASE_DESC} ${parts.join(' · ')}.`;
}

export function contentRulesDefinition(
  plugin: SmartConnectionsPlugin,
  config: SettingsConfigAccessor,
  update: () => void,
): SettingGroupItem {
  return {
    name: 'Content rules',
    desc: statusText(config.getConfig('smart_sources.content_rules', '')),
    searchable: true,
    render: (setting) => {
      let draft = config.getConfig('smart_sources.content_rules', '');
      let inputEl: HTMLTextAreaElement | null = null;
      let areaSetValue: ((value: string) => void) | null = null;

      const refresh = (): void => {
        setting.setDesc(statusText(draft));
        inputEl?.toggleClass('osc-rules-invalid', parseContentRules(draft).invalid.length > 0);
      };
      const commit = debounce(
        () => void applyContentRulesChange(plugin, draft).then((changed) => changed && update()),
        SETTLE_MS,
        true,
      );

      setting.settingEl.addClass('osc-rules-setting');
      setting.addTextArea((area) => {
        inputEl = area.inputEl;
        areaSetValue = (value) => void area.setValue(value);
        inputEl.addClass('osc-rules-input');
        inputEl.rows = 4;
        inputEl.spellcheck = false;
        area
          .setPlaceholder(String.raw`https?://\S+`)
          .setValue(draft)
          .onChange((value) => {
            draft = value;
            refresh();
          });
        plugin.registerDomEvent(inputEl, 'blur', () => commit());
        refresh();
      });

      setting.addDropdown((dropdown) => {
        dropdown.addOption('', 'Add preset…');
        for (const preset of CONTENT_RULE_PRESETS) dropdown.addOption(preset.pattern, preset.label);
        dropdown.setValue('').onChange((pattern) => {
          dropdown.setValue('');
          const lines = normalizeContentRules(draft).split('\n').filter(Boolean);
          if (!pattern || lines.includes(pattern)) return;
          draft = [...lines, pattern].join('\n');
          areaSetValue?.(draft);
          refresh();
          commit();
        });
      });
    },
  };
}
