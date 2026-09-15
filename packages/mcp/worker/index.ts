/**
 * voltbase Worker (S3): the thin remote surface.
 * - `GET /` — static landing fragment (contains "voltbase").
 * - `GET /healthz` — `{"ok":true,"stage":3}` with STAGE from src/lib/stage.ts.
 * - `GET /api/v1/sites?...` — bbox / connector / minPower / openOnly filters
 *   with limit/offset pagination over the in-memory fixture index.
 * - `GET /api/v1/sites/:id` — one servable site (closed/self ids ⇒ 404).
 * - `GET /api/v1/status/:id` — status + stale label against the 60min SLO.
 * Abuse controls (IS-05/IS-08/IS-10): optional free-key gate (401), in-memory
 * IP rate limit 60/min (429), outbound allowlist + capping fetcher +
 * public-URL guard (S6 seam, unused on the read-only S3 paths), per-request
 * BYOK by header name (never logged/stored), CORS-minimal, security headers,
 * request-id + JSON logs with no PII (method + path + status + request-id
 * only — no IPs, headers, query values, or key material).
 * Stateless edge (IS-06): no KV/D1/DO/R2 bindings, no sessions.
 */
import { Hono } from 'hono';
import { STAGE } from '../../../src/lib/stage.ts';
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

  // Abuse controls on the API surface only (/ + /healthz stay public).
  // Preflight never requires a key or a rate-limit token.
  app.use('/api/*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }
    if (!isAuthorized(c.req.raw.headers, env)) {
      return errorJson('UNAUTHORIZED', 401, `missing or invalid API key (send header ${FREE_KEY_HEADER})`);
    }
    const decision = limiter.check(clientIp(c.req.raw.headers));
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
    await next();
  });

  app.get('/', (c) =>
    c.html(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>voltbase</title></head>' +
        '<body><h1>voltbase</h1><p>open-core EV charging-data tooling (stage 3 API)</p></body></html>',
    ),
  );

  app.get('/healthz', (c) => c.json({ ok: true, stage: STAGE }));

  app.options('/api/v1/*', () => new Response(null, { status: 204, headers: CORS_HEADERS }));

  app.get('/api/v1/sites', (c) => handleListSites(c));
  app.get('/api/v1/sites/:id', (c) => handleGetSite(c));
  app.get('/api/v1/status/:id', (c) => handleGetStatus(c, { now }));

  app.notFound(() => errorJson('NOT_FOUND', 404, 'unknown route'));

  return app;
};

export const app = createApp({});

export default app;

/** Re-exported for tests and the S6 wiring point (request-id header name for clients). */
export { REQUEST_ID_HEADER };
