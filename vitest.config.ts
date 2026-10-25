import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const PROJECTS = [
  {
    // SQLite integration tests — real node:sqlite, node environment
    test: {
      name: 'sqlite-integration',
      include: [
        'test/node-sqlite-data-adapter.test.ts',
        'test/model-key-remap.test.ts',
      ],
      environment: 'node',
      globals: true,
      setupFiles: ['./test/setup.ts'],
    },
    resolve: {
      alias: {
        'obsidian': path.resolve(__dirname, './test/mocks/obsidian.ts'),
        'node:sqlite': path.resolve(__dirname, './test/mocks/real-node-sqlite.cjs'),
      },
    },
  },
  {
    // All other tests — jsdom + node:sqlite mock
    test: {
      name: 'unit',
      include: ['test/**/*.test.ts'],
      exclude: [
        'test/node-sqlite-data-adapter.test.ts',
        'test/model-key-remap.test.ts',
      ],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
    },
    resolve: {
      alias: {
        'obsidian': path.resolve(__dirname, './test/mocks/obsidian.ts'),
        'node:sqlite': path.resolve(__dirname, './test/mocks/node-sqlite.ts'),
      },
    },
  },
];

export default defineConfig({
  test: {
    projects: PROJECTS,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/shared/**', 'src/main.ts'],
      thresholds: {
        statements: 60,
        branches: 68,
        functions: 50,
      },
    },
  },
});

