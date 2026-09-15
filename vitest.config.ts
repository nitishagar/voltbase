import { defineConfig } from 'vitest/config';

/**
 * Root Vitest entry — `npm test` runs every S1 gate suite in one command.
 * Vitest 4 style: `projects` pointing at per-package config files (no
 * deprecated workspace file). Node pool (unit) + @cloudflare/vitest-plugin
 * workers pool (workerd) both run here; the plain-node project covers the
 * zero-dependency `test/*.test.mjs` gates; the e2e project covers the S7
 * lightweight suite (`tests/**`, node + vitest, no browser).
 */
export default defineConfig({
  test: {
    projects: [
      'packages/core/vitest.config.ts',
      'packages/normalise/vitest.config.ts',
      'packages/providers/vitest.config.ts',
      'packages/mcp/vitest.config.ts',
      'packages/mcp/vitest.worker.config.ts',
      'site/vitest.config.ts',
      {
        test: {
          name: 'plain-node',
          environment: 'node',
          include: ['test/**/*.test.mjs'],
        },
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
    ],
  },
});
