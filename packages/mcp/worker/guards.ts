/**
 * S3 abuse-control guards (packages/mcp/worker/guards.ts).
 *
 * Pure, dependency-free helpers behind the public REST API (mirrors the lumen
 * `packages/mcp/worker/{capping-fetcher,cors}` patterns, adapted to voltbase):
 * outbound allowlist + 2.5 MB capping fetcher + public-URL (SSRF) guard,
 * in-memory IP rate limiting, optional free-key gating, per-request BYOK,
 * request-id, CORS-minimal and security headers.
 *
 * Memory only, no KV/D1/DO/R2: persistence (shared rate-limit state, key
 * storage) needs an ADR + budget math first (IS-06, ADR-002). Rate-limit
 * buckets therefore hold per-isolate; a multi-colo deployment would need a
 * shared counter, accepted out of scope for v0.1.
 */

/* ------------------------------------------------------------------ */
/* Capping fetcher (mirror lumen capping-fetcher.ts, voltbase Fetcher). */
/* ------------------------------------------------------------------ */

/** 2.5 MB cap on every upstream read: cold-start/CPU headroom, not a platform cap. */
export const MAX_BODY_BYTES = 2_500_000;

/** Minimal fetch surface so the cap wraps any inner fetcher (incl. S6 feed clients). */
export interface Fetcher {
  fetch: (url: URL, init?: RequestInit) => Promise<Response>;
}

/** Typed oversize error: names the upstream host and the observed size. */
export class UpstreamTooLargeError extends Error {
  readonly code = 'PAYLOAD_TOO_LARGE';
  readonly host: string;
  readonly bytes: number;
  constructor(host: string, bytes: number) {
    super(
      `upstream response from ${host} exceeds the ${String(MAX_BODY_BYTES)} byte cap ` +
        `(${String(bytes)} bytes observed) — fetch this feed locally instead`,
    );
    this.name = 'UpstreamTooLargeError';
    this.host = host;
    this.bytes = bytes;
  }
}

/** Wraps a body stream so cumulative reads beyond the cap error out mid-stream. */
export const cappedBodyStream = (
  body: ReadableStream<Uint8Array>,
  host: string,
): ReadableStream<Uint8Array> => {
  const reader = body.getReader();
  let total = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller): Promise<void> {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel('payload too large').catch(() => {});
        controller.error(new UpstreamTooLargeError(host, total));
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason?: unknown): Promise<void> {
      return reader.cancel(reason).catch(() => {});
    },
  });
};

/** Rejects Content-Length overruns BEFORE reading; caps lying streams mid-read. */
export const createCappingFetcher = (inner: Fetcher): Fetcher => ({
  fetch: async (url: URL, init?: RequestInit): Promise<Response> => {
    const res = await inner.fetch(url, init);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      await res.body?.cancel().catch(() => {});
      throw new UpstreamTooLargeError(url.host, contentLength);
    }
    if (res.body === null) return res;
    return new Response(cappedBodyStream(res.body, url.host), res);
  },
});

/* ------------------------------------------------------------------ */
/* Public-URL (SSRF) guard: scheme whitelist + private-host blocklist.  */
/* ------------------------------------------------------------------ */

/** `protocol` includes the trailing colon, as `URL.protocol` provides. */
export const isAllowedScheme = (protocol: string): boolean => {
  const p = protocol.toLowerCase();
  return p === 'http:' || p === 'https:';
};

const V4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8 — unspecified
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 — link-local incl. cloud metadata
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
];

const ipv4ToInt = (s: string): number | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (m === null) return null;
  let value = 0;
  for (const part of m.slice(1)) {
    const n = Number(part);
    if (!Number.isInteger(n) || n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
};

const isBlockedIpv4 = (ip: number): boolean => {
  for (const [lo, hi] of V4_RANGES) if (ip >= lo && ip <= hi) return true;
  return false;
};

const parseIpv6 = (input: string): bigint | null => {
  let s = input;
  const lastColon = s.lastIndexOf(':');
  if (lastColon !== -1 && s.slice(lastColon + 1).includes('.')) {
    const v4 = ipv4ToInt(s.slice(lastColon + 1));
    if (v4 === null) return null;
    s = `${s.slice(0, lastColon)}:${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] === '' ? [] : (halves[0] as string).split(':');
  const right = halves.length < 2 || halves[1] === '' ? [] : (halves[1] as string).split(':');
  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;
    groups = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  } else {
    groups = s.split(':');
  }
  if (groups.length !== 8) return null;
  let value = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    value = (value << 16n) | BigInt(Number.parseInt(g, 16));
  }
  return value;
};

const V6_RANGES: ReadonlyArray<readonly [bigint, bigint]> = [
  [0x0n, 0x0n], // :: unspecified
  [0x1n, 0x1n], // ::1 loopback
  [0xfc00n << 112n, (0xfdffn << 112n) | ((1n << 121n) - 1n)], // fc00::/7 ULA
  [0xfe80n << 112n, (0xfebfn << 112n) | ((1n << 118n) - 1n)], // fe80::/10 link-local
];

const isBlockedIpv6 = (addr: bigint): boolean => {
  for (const [lo, hi] of V6_RANGES) if (addr >= lo && addr <= hi) return true;
  if (addr >> 32n === 0xffffn) return isBlockedIpv4(Number(addr & 0xffffffffn)); // IPv4-mapped
  if (addr >> 32n === 0n) return isBlockedIpv4(Number(addr & 0xffffffffn)); // IPv4-compatible ::<v4>
  return false;
};

/** Strips brackets, zone ids and trailing FQDN dots from a URL hostname. */
const normalizeHost = (hostname: string): string => {
  let host = hostname;
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  const zone = host.indexOf('%');
  if (zone !== -1) host = host.slice(0, zone);
  return host.toLowerCase().replace(/\.+$/, '');
};

/** Host-only blocklist decision (scheme NOT considered). */
export const isBlockedHost = (hostname: string): boolean => {
  const host = normalizeHost(hostname);
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  const v4 = ipv4ToInt(host);
  if (v4 !== null) return isBlockedIpv4(v4);
  const v6 = parseIpv6(host);
  if (v6 !== null) return isBlockedIpv6(v6);
  return false; // plain DNS name — allowlist + runtime public-fetch flag own it
};

export type UrlGuardResult = { ok: true; url: URL } | { ok: false; message: string };

const truncate = (s: string, max = 200): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Validates a caller-supplied URL: public http(s) only, never private/loopback/metadata. */
export const validatePublicHttpUrl = (raw: string | null | undefined): UrlGuardResult => {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: false, message: 'a url is required' };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: `malformed url: ${truncate(raw)}` };
  }
  if (!isAllowedScheme(url.protocol)) {
    return { ok: false, message: `unsupported scheme "${url.protocol}" — only http/https are allowed` };
  }
  if (isBlockedHost(url.hostname)) {
    return {
      ok: false,
      message: `refusing non-public target "${url.host}" (private, loopback, link-local, and ULA ranges are blocked)`,
    };
  }
  return { ok: true, url };
};

/* ------------------------------------------------------------------ */
/* Outbound allowlist (ADR-002 feed hosts only) + guarded fetch seam.   */
/* ------------------------------------------------------------------ */

/**
 * Exact feed hosts the Worker may call (ADR-002 evidence table). OSM is
 * deliberately absent: extracts run in CI, NEVER live from the Worker.
 * Subdomains of a listed host are allowed (same operator surface).
 */
export const ALLOWED_OUTBOUND_HOSTS: ReadonlyArray<string> = [
  'opendata.ndw.nu', // NL NDW OCPI 2.2.1 (CC0)
  'www.ndw.nu', // NL NDW copyright/terms page
  'data.public.lu', // LU Chargy KML (CC0)
  'transport.data.gouv.fr', // FR IRVE (Etalab-2.0)
  'api.openchargemap.io', // OCM v3 (BYOK, opendata=true rows only)
];

export const isAllowedOutboundHost = (hostname: string): boolean => {
  const host = normalizeHost(hostname);
  return ALLOWED_OUTBOUND_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

/** Typed allowlist/SSRF refusal for the guarded fetch seam (S6 wiring point). */
export class OutboundBlockedError extends Error {
  readonly code = 'UPSTREAM_BLOCKED';
  readonly host: string;
  constructor(host: string, reason: string) {
    super(`outbound fetch to ${host} refused: ${reason}`);
    this.name = 'OutboundBlockedError';
    this.host = host;
  }
}

/**
 * Guarded outbound fetch: public-URL guard, then allowlist, then the capping
 * fetcher. S3 serves from memory and never calls this; S6 feed clients must
 * flow through it exclusively. (Runtime backstop: wrangler sets
 * `global_fetch_strictly_public`, so private-origin fetch is impossible even
 * if a caller bypasses this seam.)
 */
export const fetchAllowed = async (
  url: URL,
  init: RequestInit | undefined,
  fetcher: Fetcher,
): Promise<Response> => {
  const guard = validatePublicHttpUrl(url.href);
  if (!guard.ok) throw new OutboundBlockedError(url.host, guard.message);
  if (!isAllowedOutboundHost(url.hostname)) {
    throw new OutboundBlockedError(url.host, 'host is not on the ADR-002 outbound allowlist');
  }
  return createCappingFetcher(fetcher).fetch(url, init);
};

/* ------------------------------------------------------------------ */
/* In-memory IP rate limit (60/min default ⇒ 429 typed).                */
/* ------------------------------------------------------------------ */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
}

/** Sliding-window limiter over a caller-supplied key (client IP at the route). */
export const createRateLimiter = (opts: RateLimitOptions): { check: (key: string) => RateLimitDecision } => {
  const clock = opts.now ?? Date.now;
  const hits = new Map<string, number[]>();
  return {
    check: (key: string): RateLimitDecision => {
      const t = clock();
      const windowStart = t - opts.windowMs;
      const prior = hits.get(key) ?? [];
      const recent = prior.filter((stamp) => stamp > windowStart);
      if (recent.length >= opts.limit) {
        const oldest = recent[0] ?? t;
        const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - t) / 1000));
        hits.set(key, recent);
        return { allowed: false, retryAfterSec };
      }
      recent.push(t);
      hits.set(key, recent);
      return { allowed: true, retryAfterSec: 0 };
    },
  };
};

/* ------------------------------------------------------------------ */
/* Optional free-key gating + per-request BYOK (IS-05).                 */
/* ------------------------------------------------------------------ */

/** Free-key gate header. Header only — keys never ride query strings (URLs get logged). */
export const FREE_KEY_HEADER = 'x-voltbase-key';

/** BYOK env-var NAME → per-request header NAME (values ride headers, never env dumps). */
export const HEADER_FOR_ENV: Record<string, string> = {
  OCM_API_KEY: 'x-ocm-key',
};

/** Constant-time compare so key checks do not leak prefix length via timing. */
const keysEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  return diff === 0;
};

export interface KeyGateEnv {
  VOLTBASE_API_KEY?: string;
}

/**
 * Optional free-key gating: with no `VOLTBASE_API_KEY` configured, public
 * reads are allowed (v0.1 default, documented); with one configured, the
 * request must present the matching `x-voltbase-key` header or it is 401.
 */
export const isAuthorized = (headers: Headers, env: KeyGateEnv): boolean => {
  const required = env.VOLTBASE_API_KEY;
  if (required === undefined || required === '') return true;
  return keysEqual(headers.get(FREE_KEY_HEADER) ?? '', required);
};

/**
 * Per-request BYOK read (IS-05): resolves a third-party key VALUE from its
 * header by env-var NAME at call time. Callers must use the value immediately
 * (one outbound call) and never log, store, cache, or echo it.
 */
export const readByok = (headers: Headers, name: string): string | undefined => {
  const header = HEADER_FOR_ENV[name];
  if (header === undefined) return undefined;
  const value = headers.get(header);
  return value === null || value === '' ? undefined : value;
};

/* ------------------------------------------------------------------ */
/* Request-id, security headers, CORS-minimal.                          */
/* ------------------------------------------------------------------ */

export const REQUEST_ID_HEADER = 'x-request-id';

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Echoes a sane client request-id; otherwise mints one (never logs PII either way). */
export const resolveRequestId = (
  headers: Headers,
  generate: () => string,
): { id: string; echoed: boolean } => {
  const incoming = headers.get(REQUEST_ID_HEADER);
  if (incoming !== null && REQUEST_ID_RE.test(incoming)) return { id: incoming, echoed: true };
  return { id: generate(), echoed: false };
};

/** Security headers on every response (API + landing + errors + 404). */
export const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

/** Minimal CORS for the browser-readable API + MCP surfaces (not /healthz, not /). */
export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers':
    'Content-Type, Accept, mcp-session-id, MCP-Protocol-Version, x-voltbase-key, x-ocm-key',
  'access-control-expose-headers': 'mcp-session-id',
  'access-control-max-age': '86400',
};

/** CORS surface: exactly the versioned API + the MCP gateway (mirrors the lumen isCorsSurface pattern). */
export const isCorsSurface = (pathname: string): boolean =>
  pathname.startsWith('/api/v1/') || pathname === '/mcp';

/** Applies security (+ CORS on the API surface) and request-id headers to a response. */
export const withResponseHeaders = (
  res: Response,
  opts: { requestId: string; cors: boolean },
): Response => {
  const headers = new Headers(res.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (opts.cors) {
    for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  }
  headers.set(REQUEST_ID_HEADER, opts.requestId);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};
