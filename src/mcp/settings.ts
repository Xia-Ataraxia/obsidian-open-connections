import { DEFAULT_SETTINGS } from '../domain/config';
import type { McpSettings } from '../types/settings';

const MIN_PORT = 1024;
const MAX_PORT = 65535;
const TOKEN_BYTES = 24;

export function createMcpAuthToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  if (bytes.some((byte) => byte !== 0)) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function clampPort(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.mcp.port;
  return Math.max(MIN_PORT, Math.min(MAX_PORT, Math.trunc(parsed)));
}

export function parseMcpSettings(value: unknown): McpSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS.mcp, authToken: createMcpAuthToken() };
  }

  const record = value as Record<string, unknown>;
  const authToken = typeof record.authToken === 'string' && record.authToken.trim().length >= 16
    ? record.authToken.trim()
    : createMcpAuthToken();
  return {
    enabled: typeof record.enabled === 'boolean'
      ? record.enabled
      : DEFAULT_SETTINGS.mcp.enabled,
    port: clampPort(record.port),
    authToken,
  };
}

/** Plain-language reason for a failed server start; the raw error stays in the console. */
export function describeMcpStartError(error: unknown, port: number): string {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (code === 'EADDRINUSE' || message.includes('EADDRINUSE')) return `Port ${port} is already in use.`;
  if (code === 'EACCES' || message.includes('EACCES')) return `Port ${port} isn't allowed.`;
  return message;
}
