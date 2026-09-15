import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedTestConfig } from '../../vitest.shared.ts';

/** Node-pool suite: the S1 scaffold gates (worker/*.test.ts). */
export default mergeConfig(
  sharedTestConfig,
  defineConfig({ test: { name: 'mcp-node', include: ['worker/**/*.test.ts'] } }),
);
