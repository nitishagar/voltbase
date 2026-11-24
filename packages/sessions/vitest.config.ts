import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedTestConfig } from '../../vitest.shared.ts';

/** Node-pool suite: ChargeLens session normalisers + corpus + depot-index gates. */
export default mergeConfig(
  sharedTestConfig,
  defineConfig({ test: { name: 'sessions', include: ['src/**/*.test.ts'] } }),
);
