export interface ModelDownloadSnapshot {
  active: boolean;
  determinate: boolean;
  file: string | null;
  loaded: number;
  total: number;
}

const MB = 1024 * 1024;

export function formatMegabytes(bytes: number): string {
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Aggregates per-file download progress; total is unknown until a file reports one. */
export class ModelDownloadTracker {
  private files = new Map<string, { loaded: number; total: number }>();
  private current: string | null = null;

  update(file: string, loaded: number, total: number): void {
    const known = Number.isFinite(total) && total > 0;
    this.files.set(file, { loaded: known ? Math.min(loaded, total) : loaded, total: known ? total : 0 });
    this.current = file;
  }

  reset(): void {
    this.files.clear();
    this.current = null;
  }

  snapshot(): ModelDownloadSnapshot {
    let loaded = 0;
    let total = 0;
    for (const entry of this.files.values()) {
      loaded += entry.loaded;
      total += entry.total;
    }
    return { active: this.files.size > 0, determinate: total > 0, file: this.current, loaded, total };
  }
}
