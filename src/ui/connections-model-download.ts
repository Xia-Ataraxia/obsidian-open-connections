import { ProgressBarComponent } from 'obsidian';
import { formatMegabytes, type ModelDownloadSnapshot } from '../domain/model-download-progress';
import type { ConnectionsView } from './ConnectionsView';
import { getModelDownload } from './embed-adapters/transformers-progress';

const INDETERMINATE_VALUE = 30;

export interface ModelDownloadEl {
  root: HTMLElement;
  file: HTMLElement;
  size: HTMLElement;
  bar: ProgressBarComponent;
}

function createModelDownloadEl(container: HTMLElement): ModelDownloadEl {
  const root = container.createDiv({ cls: 'osc-model-download' });
  const header = root.createDiv({ cls: 'osc-model-download-header' });
  header.createSpan({ cls: 'osc-model-download-title', text: 'Downloading local model' });
  const size = header.createSpan({ cls: 'osc-model-download-size' });
  const bar = new ProgressBarComponent(root.createDiv({ cls: 'osc-model-download-bar' }));
  const file = root.createDiv({ cls: 'osc-model-download-file' });
  return { root, file, size, bar };
}

export function syncModelDownload(view: ConnectionsView, snapshot: ModelDownloadSnapshot = getModelDownload()): void {
  if (!view.container) return;
  if (!snapshot.active) {
    view.modelDownloadEl?.root.remove();
    view.modelDownloadEl = null;
    return;
  }
  if (!view.modelDownloadEl?.root.isConnected) {
    view.modelDownloadEl?.root.remove();
    view.modelDownloadEl = createModelDownloadEl(view.container);
  }
  const el = view.modelDownloadEl;
  el.root.toggleClass('osc-model-download--indeterminate', !snapshot.determinate);
  el.file.setText(snapshot.file?.split('/').pop() ?? '');
  if (snapshot.determinate) {
    el.size.setText(`${formatMegabytes(snapshot.loaded)} / ${formatMegabytes(snapshot.total)}`);
    el.bar.setValue(Math.round((snapshot.loaded / snapshot.total) * 100));
  } else {
    el.size.setText('');
    el.bar.setValue(INDETERMINATE_VALUE);
  }
}
