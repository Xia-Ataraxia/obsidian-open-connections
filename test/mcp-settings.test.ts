import { describe, expect, it } from 'vitest';

import { describeMcpStartError, parseMcpSettings } from '../src/mcp/settings';

describe('parseMcpSettings', () => {
  it('returns defaults when the value is missing', () => {
    const settings = parseMcpSettings(undefined);
    expect(settings.enabled).toBe(false);
    expect(settings.port).toBe(27124);
    expect(settings.authToken.length).toBeGreaterThanOrEqual(16);
  });

  it('parses a valid object and clamps the port range', () => {
    expect(parseMcpSettings({ enabled: true, port: '999999', authToken: 'x'.repeat(16) })).toEqual({
      enabled: true,
      port: 65535,
      authToken: 'x'.repeat(16),
    });
  });

  it('falls back when values are invalid', () => {
    const settings = parseMcpSettings({ enabled: 'yes', port: 'oops', authToken: 'short' });
    expect(settings.enabled).toBe(false);
    expect(settings.port).toBe(27124);
    expect(settings.authToken.length).toBeGreaterThanOrEqual(16);
  });
});

describe('describeMcpStartError', () => {
  it('turns a busy port into plain copy', () => {
    const err = Object.assign(new Error('listen EADDRINUSE: address already in use 127.0.0.1:27124'), { code: 'EADDRINUSE' });
    expect(describeMcpStartError(err, 27124)).toBe('Port 27124 is already in use.');
  });

  it('keeps other messages', () => {
    expect(describeMcpStartError(new Error('boom'), 27124)).toBe('boom');
  });
});
