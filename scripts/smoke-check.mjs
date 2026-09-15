#!/usr/bin/env node
/**
 * scripts/smoke-check.mjs — zero-dependency route smoke for `scripts/smoke.sh`.
 * Imports the Worker Hono app directly (no `wrangler dev` needed) and asserts
 * GET / (contains "voltbase") + GET /healthz ({"ok":true,"stage":1}).
 */
import { app } from '../packages/mcp/worker/index.ts';
import { STAGE } from '../src/lib/stage.ts';

let failed = false;
const check = (cond, msg) => {
  if (!cond) {
    process.stderr.write(`smoke FAIL: ${msg}\n`);
    failed = true;
  }
};

const root = await app.request('/');
const rootText = await root.text();
check(root.status === 200, `GET / status ${root.status}, expected 200`);
check(rootText.toLowerCase().includes('voltbase'), 'GET / body does not contain "voltbase"');

const hz = await app.request('/healthz');
let body = null;
try {
  body = await hz.json();
} catch {
  body = null;
}
check(hz.status === 200, `GET /healthz status ${hz.status}, expected 200`);
check(body !== null && body.ok === true && body.stage === STAGE, `GET /healthz body ${JSON.stringify(body)}, expected {"ok":true,"stage":${String(STAGE)}}`);
check(STAGE === 1, `STAGE ${String(STAGE)}, expected 1`);

if (failed) process.exit(1);
process.stdout.write('smoke-check: / + /healthz green\n');
