type TimerHost = Pick<typeof window, 'setTimeout'>;

let injected: TimerHost | undefined;

/** Node entry points (standalone MCP, tests) have no `window`; they inject a host. */
export function setTimerHost(host: TimerHost): void {
  injected = host;
}

export function sleep(ms: number): Promise<void> {
  const host = typeof window !== 'undefined' ? window : injected;
  if (!host) throw new Error('No timer host: call setTimerHost() outside Obsidian');
  return new Promise((resolve) => host.setTimeout(resolve, ms));
}
