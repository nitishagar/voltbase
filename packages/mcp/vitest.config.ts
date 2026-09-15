import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedTestConfig } from '../../vitest.shared.ts';

/** Node-pool suite: S1 scaffold + S3 API/guards + S4 MCP server gates. */
export default mergeConfig(
  sharedTestConfig,
  defineConfig({ test: { name: 'mcp-node', include: ['src/**/*.test.ts', 'worker/**/*.test.ts'] } }),
);
