import { ModelDownloadTracker, type ModelDownloadSnapshot } from '../../domain/model-download-progress';

const tracker = new ModelDownloadTracker();
const listeners = new Set<(snapshot: ModelDownloadSnapshot) => void>();

function emit(): void {
  const snapshot = tracker.snapshot();
  listeners.forEach((listener) => listener(snapshot));
}

export function reportModelDownload(file: string, loaded: number, total: number): void {
  tracker.update(file, loaded, total);
  emit();
}

export function resetModelDownload(): void {
  tracker.reset();
  emit();
}

export function getModelDownload(): ModelDownloadSnapshot {
  return tracker.snapshot();
}

export function onModelDownload(listener: (snapshot: ModelDownloadSnapshot) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
