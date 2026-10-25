import type SmartConnectionsPlugin from '../main';
import { TFile } from 'obsidian';
import { splitNoteKey } from './lookup-view-format';

export async function openNote(
  plugin: SmartConnectionsPlugin,
  targetKey: string,
  event: MouseEvent | null = null,
): Promise<void> {
  const { path, heading } = splitNoteKey(targetKey);
  const file = plugin.app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  const mode = event?.ctrlKey || event?.metaKey ? 'tab' : 'source';
  await plugin.app.workspace
    .getLeaf(mode === 'tab')
    .openFile(file, heading ? { eState: { subpath: `#${heading}` } } : undefined);
}
