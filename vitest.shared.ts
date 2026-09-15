import type { ViteUserConfig } from 'vitest/config';

/**
 * Shared Vitest defaults, merged by every package's vitest.config.ts.
 * (Mirrors the lumen exemplar.) Per-package suites stay node-env by default;
 * the Worker suite runs inside workerd via @cloudflare/vitest-plugin.
 */
export const sharedTestConfig: ViteUserConfig = {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
};
