/**
 * voltbase Worker (S8): the thin remote surface.
 * - `GET /` — static landing fragment (contains "voltbase").
 * - `GET /healthz` — `{"ok":true,"stage":8}` with STAGE from src/lib/stage.ts.
 * - `GET /api/v1/sites?...` — bbox / connector / minPower / openOnly filters
 *   with limit/offset pagination over the in-memory fixture index.
 * - `GET /api/v1/sites/:id` — one servable site (closed/self ids ⇒ 404).
 * - `GET /api/v1/status/:id` — status + stale label against the 60min SLO.
 * - `GET /api/v1/reliability/:id` — S6 uptime rollup (journal + prebuilt cut,
 *   stale-labelled; exhausted budget ⇒ typed UPSTREAM_FAILED + cut).
 * - `POST /mcp` — MCP over Streamable HTTP via `createMcpHandler`
 *   (stateless, per-request `buildMcpServer` over `mcpComposition`); the same
 *   4-tool set as CLI stdio (IS-07). `GET /mcp` ⇒ typed 405 JSON-RPC error.
 * - `scheduled()` — ONE hourly-class cron (`triggers.crons ["17 * * * *"]`,
 *   the only cron on the account for v0.1) running the S6 poller with the
 *   80% write-budget guard (≤50 subrequests / ≤6 concurrent per invocation).
 * Abuse controls (IS-05/IS-08/IS-10): optional free-key gate (401), in-memory
 * IP rate limit 60/min (429), outbound allowlist + capping fetcher +
 * public-URL guard (S6 seam, unused on the read-only paths), per-request
 * BYOK by header name (never logged/stored), CORS-minimal, security headers,
 * request-id + JSON logs with no PII (method + path + status + request-id
 * only — no IPs, headers, query values, or key material).
 * Stateless edge (IS-06): no KV/D1/DO/R2 bindings, no sessions.
 */
import { Hono } from 'hono';
import { createMcpHandler } from 'agents/mcp/server';
import { STAGE } from '../../../src/lib/stage.ts';
import { buildMcpServer } from '../src/server.ts';
import { mcpComposition } from './composition.ts';
import {
  CORS_HEADERS,
  FREE_KEY_HEADER,
  REQUEST_ID_HEADER,
  createRateLimiter,
  isAuthorized,
  isCorsSurface,
  readByok,
  resolveRequestId,
  withResponseHeaders,
  type KeyGateEnv,
} from './guards.ts';
import { errorJson, handleGetSite, handleGetStatus, handleListSites } from './routes.ts';
import {
  handleGetReliability,
  runScheduledPoll,
  type CronEvent,
  type ScheduledCtx,
} from './reliability.ts';

export interface WorkerEnv extends KeyGateEnv {
  ENVIRONMENT?: string;
}

export interface AppOptions {
  now?: () => number;
  rateLimit?: { limit: number; windowMs: number };
}

const DEFAULT_RATE_LIMIT = 60;
const DEFAULT_RATE_WINDOW_MS = 60_000;

/** Client IP for the rate-limit bucket key only — never logged (no PII in logs). */
const clientIp = (headers: Headers): string => {
  const cf = headers.get('cf-connecting-ip');
  if (cf !== null && cf.trim() !== '') return cf.trim();
  const xff = headers.get('x-forwarded-for');
  if (xff !== null) {
    const first = xff.split(',')[0]?.trim();
    if (first !== undefined && first !== '') return first;
  }
  return 'unknown';
};

/** Single-line JSON access log: method + path + status + request-id. No PII by construction. */
const logRequest = (method: string, pathname: string, status: number, requestId: string): void => {
  console.log(JSON.stringify({ level: 'info', service: 'voltbase-api', method, path: pathname, status, requestId }));
};

export const createApp = (
  env: WorkerEnv = {},
  opts: AppOptions = {},
): Hono<{ Bindings: WorkerEnv }> => {
  const now = opts.now ?? Date.now;
  const rateLimit = opts.rateLimit?.limit ?? DEFAULT_RATE_LIMIT;
  const limiter = createRateLimiter({
    limit: rateLimit,
    windowMs: opts.rateLimit?.windowMs ?? DEFAULT_RATE_WINDOW_MS,
    now,
  });
  const app = new Hono<{ Bindings: WorkerEnv }>();

  // Outer envelope: request-id → route → security/CORS/request-id headers + access log.
  app.use('*', async (c, next) => {
    const { id: requestId } = resolveRequestId(c.req.raw.headers, () => crypto.randomUUID());
    // Per-request BYOK: read the OCM key VALUE by header NAME only so the seam
    // is exercised on every call; the value is used for nothing in S3 (no
    // outbound on read paths) and is never stored, logged, or echoed (IS-05).
    void readByok(c.req.raw.headers, 'OCM_API_KEY');
    await next();
    const pathname = new URL(c.req.url).pathname;
    c.res = withResponseHeaders(c.res, { requestId, cors: isCorsSurface(pathname) });
    logRequest(c.req.method, pathname, c.res.status, requestId);
  });

  // Abuse controls on the API + MCP surfaces only (/ + /healthz stay public).
  // Preflight never requires a key or a rate-limit token.
  const checkAbuse = (headers: Headers): Response | null => {
    if (!isAuthorized(headers, env)) {
      return Response.json(
        { error: { code: 'UNAUTHORIZED', message: `missing or invalid API key (send header ${FREE_KEY_HEADER})` } },
        { status: 401 },
      );
    }
    const decision = limiter.check(clientIp(headers));
    if (!decision.allowed) {
      return Response.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: `rate limit exceeded (${String(rateLimit)}/min per IP); retry in ${String(decision.retryAfterSec)}s`,
          },
        },
        { status: 429, headers: { 'retry-after': String(decision.retryAfterSec) } },
      );
    }
    return null;
  };
  app.use('/api/*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }
    const refused = checkAbuse(c.req.raw.headers);
    if (refused !== null) return refused;
    await next();
  });
  app.use('/mcp', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }
    const refused = checkAbuse(c.req.raw.headers);
    if (refused !== null) return refused;
    await next();
  });

  app.get('/', (c) =>
    c.html(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>voltbase</title></head>' +
        '<body><h1>voltbase</h1><p>open-core EV charging-data tooling (stage 8 API + MCP)</p></body></html>',
    ),
  );

  app.get('/healthz', (c) => c.json({ ok: true, stage: STAGE }));

  app.options('/api/v1/*', () => new Response(null, { status: 204, headers: CORS_HEADERS }));
  app.options('/mcp', () => new Response(null, { status: 204, headers: CORS_HEADERS }));

  app.get('/api/v1/sites', (c) => handleListSites(c));
  app.get('/api/v1/sites/:id', (c) => handleGetSite(c));
  app.get('/api/v1/status/:id', (c) => handleGetStatus(c, { now }));
  app.get('/api/v1/reliability/:id', (c) => handleGetReliability(c, { now }));

  app.post('/mcp', async (c) => {
    // Fresh per-request server over the per-request BYOK composition (IS-05/IS-06);
    // the factory form matches the installed agents createMcpHandler API.
    // The installed agents handler is typed against the MCP SDK v2 factory;
    // the v1 McpServer is runtime-compatible via its legacy lane — the cast
    // documents exactly that bridge (lumen parity).
    const handler = createMcpHandler(() => buildMcpServer(mcpComposition(c.req.raw.headers, env)) as never, {
      route: '/mcp',
      corsOptions: false, // this Worker applies its own CORS via withResponseHeaders
      allowedOriginHostnames: '*', // authless permissive v1 (key gate above owns abuse)
    });
    const holder = c as unknown as {
      executionCtx: { waitUntil: (p: Promise<unknown>) => void; passThroughOnException: () => void };
    };
    // `app.request()` test/SMOKE mode has no ExecutionContext (Hono getter
    // throws); workerd always provides one. Fall back to a no-op stub.
    let ctx: { waitUntil: (p: Promise<unknown>) => void; passThroughOnException: () => void };
    try {
      ctx = holder.executionCtx;
    } catch {
      ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
    }
    return handler(c.req.raw, env, ctx as never);
  });

  // Stateless has no session stream to hold: non-POST methods get the typed
  // JSON-RPC protocol error (405), never an MCP session.
  app.get('/mcp', () =>
    Response.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: 'Method not allowed: use POST /mcp for Streamable HTTP (stateless)' },
      },
      { status: 405 },
    ),
  );

  app.notFound(() => errorJson('NOT_FOUND', 404, 'unknown route'));

  return app;
};

export const app = createApp({});

/**
 * Hourly-class cron entry point (S6, ADR-002 §W1): runs the transition-only
 * poller with the 80% write-budget guard. The default export below exposes
 * both `fetch` (the Hono app) and `scheduled` so workerd discovers the
 * single `triggers.crons ["17 * * * *"]` tick from worker/wrangler.jsonc.
 */
export const scheduled = async (event: CronEvent, _env: WorkerEnv, ctx: ScheduledCtx): Promise<void> => {
  const done = runScheduledPoll(event.scheduledTime);
  ctx.waitUntil(done);
  await done;
};

export default { fetch: app.fetch.bind(app), scheduled };

/** Re-exported for tests and the S6 wiring point (request-id header name for clients). */
export { REQUEST_ID_HEADER };
