/**
 * S3 guard unit gates (node pool): the capping fetcher rejects oversize
 * bodies before/during reads, the public-URL guard refuses private targets,
 * the ADR-002 allowlist admits feed hosts only, the guarded seam never calls
 * the inner fetcher for blocked targets, and the key/rate/request-id helpers
 * behave at the unit level.
 */
import { describe, expect, it } from 'vitest';
import {
  ALLOWED_OUTBOUND_HOSTS,
  OutboundBlockedError,
  UpstreamTooLargeError,
  cappedBodyStream,
  createCappingFetcher,
  createRateLimiter,
  isAllowedOutboundHost,
  isAuthorized,
  isBlockedHost,
  fetchAllowed,
  readByok,
  resolveRequestId,
  validatePublicHttpUrl,
  MAX_BODY_BYTES,
  type Fetcher,
} from './guards.ts';

const stubFetcher = (res: Response): Fetcher => ({ fetch: async () => res });

describe('capping fetcher (2.5 MB)', () => {
  it('rejects Content-Length overruns before reading the body', async () => {
    let bodyRead = false;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          bodyRead = true;
          controller.enqueue(new Uint8Array(16));
        },
      },
      { highWaterMark: 0 },
    );
    const res = new Response(stream, { headers: { 'content-length': String(MAX_BODY_BYTES + 1) } });
    await expect(createCappingFetcher(stubFetcher(res)).fetch(new URL('https://opendata.ndw.nu/big'))).rejects.toThrow(
      UpstreamTooLargeError,
    );
    expect(bodyRead).toBe(false);
  });

  it('aborts a lying stream mid-read with the typed code', async () => {
    const chunk = new Uint8Array(1024 * 1024);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
    });
    const out = await createCappingFetcher(stubFetcher(new Response(stream))).fetch(
      new URL('https://opendata.ndw.nu/forever'),
    );
    const reader = out.body?.getReader();
    if (reader === undefined) throw new Error('expected a body stream');
    let err: unknown = null;
    for (let i = 0; i < 5; i += 1) {
      try {
        const { done } = await reader.read();
        if (done) break;
      } catch (e) {
        err = e;
        break;
      }
    }
    expect(err).toBeInstanceOf(UpstreamTooLargeError);
    expect((err as UpstreamTooLargeError).code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('passes small responses through byte-identical', async () => {
    const payload = JSON.stringify({ ok: true });
    const res = new Response(payload, { headers: { 'content-length': String(payload.length) } });
    const out = await createCappingFetcher(stubFetcher(res)).fetch(new URL('https://opendata.ndw.nu/small'));
    expect(await out.text()).toBe(payload);
  });

  it('cappedBodyStream errors exactly at the overrun point', async () => {
    const chunk = new Uint8Array(Math.floor(MAX_BODY_BYTES / 2) + 1);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
    });
    const reader = cappedBodyStream(stream, 'host.example').getReader();
    await reader.read();
    await expect(reader.read()).rejects.toThrow(UpstreamTooLargeError);
  });
});

describe('public-URL guard (SSRF)', () => {
  it('refuses private, loopback, link-local, ULA, and localhost targets', async () => {
    for (const raw of [
      'http://10.0.0.1/x',
      'http://172.16.5.4/x',
      'http://192.168.1.1/x',
      'http://127.0.0.1/x',
      'http://localhost/x',
      'http://sub.localhost/x',
      'http://localhost./x',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/x',
      'http://[fc00::1]/x',
      'ftp://opendata.ndw.nu/x',
      'not a url',
      '',
    ]) {
      expect(validatePublicHttpUrl(raw).ok, raw).toBe(false);
    }
    for (const host of ['10.0.0.1', '192.168.0.1', '127.0.0.1', 'localhost', '169.254.169.254', '::1']) {
      expect(isBlockedHost(host), host).toBe(true);
    }
  });

  it('allows public https feed URLs', () => {
    const guard = validatePublicHttpUrl('https://opendata.ndw.nu/api/ocpi/2.2.1/locations');
    expect(guard.ok).toBe(true);
  });
});

describe('outbound allowlist (ADR-002)', () => {
  it('admits exactly the feed hosts (+ subdomains), nothing else', () => {
    expect(ALLOWED_OUTBOUND_HOSTS.length).toBeGreaterThan(0);
    expect(isAllowedOutboundHost('opendata.ndw.nu')).toBe(true);
    expect(isAllowedOutboundHost('tiles.opendata.ndw.nu')).toBe(true);
    expect(isAllowedOutboundHost('evil.example')).toBe(false);
    expect(isAllowedOutboundHost('opendata.ndw.nu.evil.example')).toBe(false);
    expect(isAllowedOutboundHost('10.0.0.1')).toBe(false);
  });

  it('fetchAllowed never calls the inner fetcher for blocked targets', async () => {
    let calls = 0;
    const counting: Fetcher = {
      fetch: async () => {
        calls += 1;
        return new Response('{}');
      },
    };
    await expect(fetchAllowed(new URL('https://evil.example/x'), undefined, counting)).rejects.toThrow(
      OutboundBlockedError,
    );
    await expect(fetchAllowed(new URL('http://10.0.0.1/x'), undefined, counting)).rejects.toThrow(OutboundBlockedError);
    expect(calls).toBe(0);
    const ok = await fetchAllowed(new URL('https://opendata.ndw.nu/small'), undefined, counting);
    expect(ok.status).toBe(200);
    expect(calls).toBe(1);
  });
});

describe('key gate + BYOK + rate limiter + request-id units', () => {
  it('allows public reads with no key configured; enforces the header with one', () => {
    expect(isAuthorized(new Headers(), {})).toBe(true);
    const env = { VOLTBASE_API_KEY: 'k1' };
    expect(isAuthorized(new Headers(), env)).toBe(false);
    expect(isAuthorized(new Headers({ 'x-voltbase-key': 'wrong' }), env)).toBe(false);
    expect(isAuthorized(new Headers({ 'x-voltbase-key': 'k1' }), env)).toBe(true);
  });

  it('reads BYOK by header NAME only; unknown names yield undefined', () => {
    expect(readByok(new Headers({ 'x-ocm-key': 'v1' }), 'OCM_API_KEY')).toBe('v1');
    expect(readByok(new Headers(), 'OCM_API_KEY')).toBeUndefined();
    expect(readByok(new Headers({ 'x-ocm-key': 'v1' }), 'UNKNOWN_NAME')).toBeUndefined();
  });

  it('slides the rate-limit window with an injected clock', () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(false);
    t = 1001;
    expect(limiter.check('ip').allowed).toBe(true);
  });

  it('echoes sane request-ids and mints otherwise', () => {
    expect(resolveRequestId(new Headers({ 'x-request-id': 'a-b_c1' }), () => 'minted').id).toBe('a-b_c1');
    expect(resolveRequestId(new Headers(), () => 'minted').id).toBe('minted');
    expect(resolveRequestId(new Headers({ 'x-request-id': 'has spaces' }), () => 'minted').id).toBe('minted');
  });
});
