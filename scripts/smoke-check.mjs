#!/usr/bin/env node
/**
 * scripts/smoke-check.mjs — zero-dependency route smoke for `scripts/smoke.sh`.
 * Imports the Worker Hono app directly (no `wrangler dev` needed) and asserts
 * GET / (contains "voltbase") + GET /healthz ({"ok":true,"stage":5}) + the S3
 * API slice: search (/api/v1/sites), site detail, and status (stale-labelled,
 * fixtures predate the 60min SLO) with security + request-id headers present
 * + the S4 MCP slice: POST /mcp tools/list (4 locked tools) and GET /mcp 405.
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
check(STAGE === 5, `STAGE ${String(STAGE)}, expected 5`);

const search = await app.request('/api/v1/sites?limit=5&offset=0');
let searchBody = null;
try {
  searchBody = await search.json();
} catch {
  searchBody = null;
}
check(search.status === 200, `GET /api/v1/sites status ${search.status}, expected 200`);
check(
  searchBody !== null && Array.isArray(searchBody.data) && searchBody.data.length === 5 &&
    typeof searchBody.page?.total === 'number' && searchBody.page.total >= 30,
  `GET /api/v1/sites body ${JSON.stringify(searchBody)?.slice(0, 200)}, expected 5 rows + page.total`,
);
check(
  search.headers.get('content-security-policy')?.includes("frame-ancestors 'none'") === true,
  'GET /api/v1/sites missing content-security-policy',
);
check(
  typeof search.headers.get('x-request-id') === 'string' && search.headers.get('x-request-id') !== '',
  'GET /api/v1/sites missing x-request-id',
);

const site = await app.request('/api/v1/sites/OCM%3A900000');
let siteBody = null;
try {
  siteBody = await site.json();
} catch {
  siteBody = null;
}
check(site.status === 200, `GET /api/v1/sites/:id status ${site.status}, expected 200`);
check(siteBody?.data?.id === 'OCM:900000', `GET /api/v1/sites/:id body ${JSON.stringify(siteBody)?.slice(0, 200)}, expected OCM:900000`);

const status = await app.request('/api/v1/status/OCM%3A900000');
let statusBody = null;
try {
  statusBody = await status.json();
} catch {
  statusBody = null;
}
check(status.status === 200, `GET /api/v1/status/:id status ${status.status}, expected 200`);
check(
  statusBody?.data?.stale === true && typeof statusBody?.data?.staleReason === 'string',
  `GET /api/v1/status/:id body ${JSON.stringify(statusBody)?.slice(0, 200)}, expected stale:true + reason`,
);

const mcpList = await app.request('/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Host: 'localhost',
  },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
});
const mcpText = await mcpList.text();
check(mcpList.status === 200, `POST /mcp status ${mcpList.status}, expected 200`);
for (const name of ['voltbase_search_sites', 'voltbase_site_detail', 'voltbase_status', 'voltbase_reliability']) {
  check(mcpText.includes(name), `POST /mcp tools/list missing ${name}`);
}
check(
  typeof mcpList.headers.get('x-request-id') === 'string' && mcpList.headers.get('x-request-id') !== '',
  'POST /mcp missing x-request-id',
);

const mcpGet = await app.request('/mcp');
check(mcpGet.status === 405, `GET /mcp status ${mcpGet.status}, expected 405`);

if (failed) process.exit(1);
process.stdout.write('smoke-check: / + /healthz + search + site + status + mcp green\n');
