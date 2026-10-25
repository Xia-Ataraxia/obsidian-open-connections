/** Runs tasks one at a time in submission order; a failed task never blocks the next. */
export function createSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return (task) => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}

/** Shares one in-flight promise between concurrent callers. */
export function createSingleFlight(): <T>(task: () => Promise<T>) => Promise<T> {
  let inflight: Promise<unknown> | null = null;
  return (task) => {
    if (!inflight) {
      const started = task().finally(() => { inflight = null; });
      inflight = started;
    }
    return inflight as ReturnType<typeof task>;
  };
}

const MAX_CRASHES = 3;
const BASE_COOLDOWN_MS = 5000;

/** Blocks respawning a crashed worker: exponential cooldown, then a hard stop until reset. */
export class WorkerCrashGate {
  private crashes = 0;
  private retryAt = 0;

  recordCrash(now: number): void {
    this.crashes += 1;
    this.retryAt = now + BASE_COOLDOWN_MS * 2 ** (this.crashes - 1);
  }

  reset(): void {
    this.crashes = 0;
    this.retryAt = 0;
  }

  /** Returns an error message while spawning is not allowed, otherwise null. */
  blockedReason(now: number): string | null {
    if (this.crashes === 0) return null;
    if (this.crashes >= MAX_CRASHES) {
      return 'The local embedding worker crashed repeatedly and was stopped. Reload the plugin to retry.';
    }
    if (now < this.retryAt) {
      return `The local embedding worker crashed; retrying in ${Math.ceil((this.retryAt - now) / 1000)}s.`;
    }
    return null;
  }
}
