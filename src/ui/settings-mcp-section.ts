import type { SettingGroupItem } from 'obsidian';

import { createMcpAuthToken, parseMcpSettings } from '../mcp/settings';
import { renderStatusPill } from './settings-status-pill-render';
import type { SmartConnectionsPlugin } from './settings-types';

export function mcpDefinitions(
  plugin: SmartConnectionsPlugin,
  update: () => void,
): SettingGroupItem[] {
  const mcpSettings = parseMcpSettings(plugin.settings?.mcp);
  if (plugin.settings) {
    plugin.settings.mcp = mcpSettings;
  }

  const sync = async (): Promise<void> => {
    await plugin.saveSettings?.();
    try {
      await plugin.syncMcpServer?.();
    } catch (error) {
      plugin.notices?.show?.('mcp_server_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    update();
  };
  const mcpServer = plugin.getMcpServer?.();

  return [
    {
      name: 'Enable local server',
      desc: 'Expose the current vault through a local endpoint at http://127.0.0.1:<port>/mcp',
      render: (setting) => {
        setting.addToggle((toggle) => {
          toggle.setValue(Boolean(mcpSettings.enabled));
          toggle.onChange(async (value) => {
            mcpSettings.enabled = value;
            await sync();
          });
        });
      },
    },
    {
      name: 'Local server port',
      desc: 'Localhost port for the local endpoint.',
      render: (setting) => {
        setting.addText((text) => {
          text.inputEl.type = 'number';
          text.setValue(String(mcpSettings.port));
          text.onChange(async (value) => {
            mcpSettings.port = parseMcpSettings({ ...mcpSettings, port: value }).port;
            await plugin.saveSettings?.();
            if (mcpSettings.enabled) await sync();
          });
        });
      },
    },
    {
      name: 'Authentication token',
      desc: 'Required as an authorization token for vault-data tools.',
      searchable: false,
      render: (setting) => {
        setting
          .addText((text) => {
            text.setValue(mcpSettings.authToken);
            text.inputEl.readOnly = true;
            text.inputEl.addEventListener('focus', () => text.inputEl.select());
          })
          .addButton((button) => {
            button.setButtonText('Regenerate').onClick(async () => {
              mcpSettings.authToken = createMcpAuthToken();
              await plugin.saveSettings?.();
              update();
            });
          });
      },
    },
    {
      name: 'Local server status',
      searchable: false,
      render: (setting) => {
        const running = Boolean(mcpServer?.isRunning);
        const statusEl = setting.descEl.createDiv({ cls: 'osc-model-status' });
        renderStatusPill(statusEl, 'Server', running ? 'Running' : 'Stopped', running, running ? 'ready' : 'idle');
        if (running && mcpServer) statusEl.createEl('code', { cls: 'osc-mcp-endpoint', text: mcpServer.endpointUrl });
        setting
          .addButton((button) => {
            button.setButtonText(mcpServer?.isRunning ? 'Restart' : 'Start').onClick(async () => {
              mcpSettings.enabled = true;
              await sync();
            });
          })
          .addButton((button) => {
            button
              .setButtonText('Stop')
              .setDisabled(!mcpServer?.isRunning)
              .onClick(async () => {
                mcpSettings.enabled = false;
                await sync();
              });
          });
      },
    },
  ];
}
