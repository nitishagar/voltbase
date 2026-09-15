import { defineConfig } from 'vitest/config';

/**
 * Site gate suite — tests over the built artifact (`site/dist`).
 * `npm test` requires a prior build BY DESIGN (no silent rebuilds, lumen
 * parity): the globalSetup fails fast with guidance when site/dist is
 * missing. `npm run check -w @voltbase/site` chains build -> test, and the
 * root `verify` chain always builds before testing.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
  },
});
