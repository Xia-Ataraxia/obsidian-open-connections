import { describe, expect, it } from 'vitest';
import { WorkerCrashGate, createSerialQueue, createSingleFlight } from '../src/domain/embed-worker-guard';

describe('createSerialQueue', () => {
  it('never overlaps tasks and survives failures', async () => {
    const run = createSerialQueue();
    let active = 0;
    let peak = 0;
    const task = (fail: boolean) => async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      if (fail) throw new Error('x');
      return 1;
    };
    const results = await Promise.allSettled([run(task(false)), run(task(true)), run(task(false))]);
    expect(peak).toBe(1);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  });
});

describe('createSingleFlight', () => {
  it('shares one load between concurrent callers and allows a retry after failure', async () => {
    const once = createSingleFlight();
    let calls = 0;
    const load = async () => { calls += 1; await new Promise((r) => setTimeout(r, 5)); return calls; };
    await Promise.all([once(load), once(load), once(load), once(load), once(load)]);
    expect(calls).toBe(1);
    await expect(once(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await once(load);
    expect(calls).toBe(2);
  });
});

describe('WorkerCrashGate', () => {
  it('backs off exponentially, then stops until reset', () => {
    const gate = new WorkerCrashGate();
    expect(gate.blockedReason(0)).toBeNull();
    gate.recordCrash(0);
    expect(gate.blockedReason(1000)).toContain('retrying');
    expect(gate.blockedReason(5000)).toBeNull();
    gate.recordCrash(5000);
    expect(gate.blockedReason(14000)).toContain('retrying');
    expect(gate.blockedReason(15000)).toBeNull();
    gate.recordCrash(15000);
    expect(gate.blockedReason(10 ** 9)).toContain('crashed repeatedly');
    gate.reset();
    expect(gate.blockedReason(0)).toBeNull();
  });
});
