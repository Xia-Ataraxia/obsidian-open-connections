import type { SettingGroupItem } from 'obsidian';

import type { SmartConnectionsPlugin } from './settings-types';

export function noticeDefinitions(plugin: SmartConnectionsPlugin): SettingGroupItem[] {
  const mutedNotices = plugin.notices?.listMuted?.() ?? [];

  const summary: SettingGroupItem = {
    name: 'Muted notices',
    desc: mutedNotices.length === 0
      ? 'Muted notices remain hidden until manually unmuted. No muted notices.'
      : 'Muted notices remain hidden until manually unmuted.',
    render: (setting) => {
      setting.addButton((button) => {
        button
          .setButtonText('Unmute all')
          .setDisabled(mutedNotices.length === 0)
          .onClick(async () => {
            await plugin.notices?.unmuteAll?.();
          });
      });
    },
  };

  const rows = mutedNotices.map((noticeId): SettingGroupItem => ({
    name: noticeId,
    desc: 'Muted',
    searchable: false,
    render: (setting) => {
      setting.addButton((button) => {
        button.setButtonText('Unmute').onClick(async () => {
          await plugin.notices?.unmute?.(noticeId);
        });
      });
    },
  }));

  return [summary, ...rows];
}
