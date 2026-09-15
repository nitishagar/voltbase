import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

/**
 * Workers-pool suite: the same Hono app exercised INSIDE workerd via
 * Miniflare (fully local, zero live network). S1 keeps one smoke test here
 * so both pools in the root config stay green by construction.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './worker/wrangler.jsonc' },
    }),
  ],
  test: {
    name: 'mcp-workers',
    include: ['worker/**/*.workers.test.ts'],
  },
});
