/**
 * @file setup.ts
 * @description Test setup file for Vitest
 */

import { beforeAll, afterEach, vi } from 'vitest';
import { App } from 'obsidian';

// Note: obsidian module is aliased in vitest.config.ts to ./test/mocks/obsidian.ts

// Setup global test environment
beforeAll(() => {
  // Create a mock app instance
  const mockApp = new App();
  (global as any).app = mockApp;

  // Mock crypto.subtle for hashing tests (if not available in jsdom)
  if (!globalThis.crypto?.subtle) {
    const crypto = require('crypto');
    (globalThis as any).crypto = {
      subtle: {
        digest: async (algorithm: string, data: Uint8Array) => {
          const hash = crypto.createHash('sha256');
          hash.update(Buffer.from(data));
          return hash.digest().buffer;
        },
      },
    };
  }
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Obsidian global DOM helpers (not provided by jsdom).
const g = globalThis as any;
if (typeof document !== 'undefined' && !g.createEl) {
  g.createEl = (tag: string, o: { cls?: string; text?: string; type?: string } = {}) => {
    const el = document.createElement(tag) as HTMLElement & { type?: string };
    if (o.cls) el.className = o.cls;
    if (o.text !== undefined) el.textContent = o.text;
    if (o.type) el.type = o.type;
    return el;
  };
  g.createDiv = (o: { cls?: string; text?: string } = {}) => g.createEl('div', o);
  g.createFragment = () => document.createDocumentFragment();
}
