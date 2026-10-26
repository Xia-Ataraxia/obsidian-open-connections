import { describe, expect, it } from 'vitest';

import { getRunStateTone } from '../src/ui/settings-status-runtime-state';

describe('getRunStateTone', () => {
  it('keeps idle neutral and running active', () => {
    expect(getRunStateTone('idle', null)).toBe('idle');
    expect(getRunStateTone('embedding', null)).toBe('active');
    expect(getRunStateTone('error', null)).toBe('error');
  });
});
