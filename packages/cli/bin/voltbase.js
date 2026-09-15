#!/usr/bin/env node
/**
 * `voltbase` bin (S4). Thin ESM entry over `../src/index.ts` (no build step):
 * delegates arg parsing + exit codes to `run()` so `--help`, `mcp` (stdio),
 * `search`, `detail`, and `status` share one implementation. Sets
 * `process.exitCode` (never `process.exit()` on success) so stdout flushes.
 */
const args = process.argv.slice(2);
const { run } = await import('../src/index.ts');
process.exitCode = await run(args);
