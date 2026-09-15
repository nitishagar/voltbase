/**
 * S3 API gates (node pool): filters narrow, closed/self rows are invisible,
 * pagination is disjoint, key gate 401s, IP rate limit 429s, stale labels,
 * security + request-id headers, typed 404s, BYOK silence, attribution and
 * ADR-003 partition discipline end-to-end.
 */
import { describe, expect, it } from 'vitest';
import { isIsoTime } from '@voltbase/core';
import { createApp } from './index.ts';
import { SERVABLE_SITES } from './store.ts';

const CLOSED_IDS = ['OCM:910001', 'DATEX2:LU-2ND-001', 'DATEX2:FR-UNK-001', 'OCM:920001', 'OCM:920002'];

const idsOf = (body: { data: Array<{ id: string }> }): string[] => body.data.map((s) => s.id);

describe('sites search filters', () => {
  it('bbox narrows to the Amsterdam box only', async () => {
    const res = await createApp({}).request('/api/v1/sites?bbox=4.8,52.3,5.0,52.45&limit=100');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; lat: number; lon: number }> };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThan(SERVABLE_SITES.length);
    for (const site of body.data) {
      expect(site.lon).toBeGreaterThanOrEqual(4.8);
      expect(site.lon).toBeLessThanOrEqual(5.0);
      expect(site.lat).toBeGreaterThanOrEqual(52.3);
      expect(site.lat).toBeLessThanOrEqual(52.45);
    }
    expect(idsOf(body)).toContain('OCPI:NL-NDW-001');
  });

  it('connector narrows case-insensitively', async () => {
    const res = await createApp({}).request('/api/v1/sites?connector=chademo&limit=100');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ id: string; connectors: Array<{ standard: string }> }>;
    };
    expect(body.data.length).toBeGreaterThan(0);
    for (const site of body.data) {
      expect(site.connectors.some((c) => c.standard.toLowerCase().includes('chademo'))).toBe(true);
    }
  });

  it('minPower keeps only sites with a connector at or above the floor', async () => {
    const res = await createApp({}).request('/api/v1/sites?minPower=100&limit=100');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ id: string; connectors: Array<{ powerKw: number }> }>;
    };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThan(SERVABLE_SITES.length);
    for (const site of body.data) {
      expect(Math.max(...site.connectors.map((c) => c.powerKw))).toBeGreaterThanOrEqual(100);
    }
  });

  it('openOnly keeps AVAILABLE rows only', async () => {
    const res = await createApp({}).request('/api/v1/sites?openOnly=true&limit=100');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ status: string }> };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.length).toBeLessThan(SERVABLE_SITES.length);
    for (const site of body.data) expect(site.status).toBe('AVAILABLE');
  });

  it('rejects malformed bbox / limit / minPower / openOnly with typed 400s', async () => {
    const app = createApp({});
    for (const qs of ['bbox=1,2,3', 'bbox=a,b,c,d', 'limit=0', 'limit=101', 'limit=nope', 'minPower=-5', 'openOnly=maybe']) {
      const res = await app.request(`/api/v1/sites?${qs}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: { code: 'INVALID_ARGUMENTS', message: expect.any(String) as unknown },
      });
    }
  });
});

describe('closed/self rows are invisible', () => {
  it('answers 404 for every closed fixture id on site + status', async () => {
    const app = createApp({});
    for (const id of CLOSED_IDS) {
      const enc = encodeURIComponent(id);
      const site = await app.request(`/api/v1/sites/${enc}`);
      expect(site.status).toBe(404);
      expect(await site.json()).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) as unknown } });
      const status = await app.request(`/api/v1/status/${enc}`);
      expect(status.status).toBe(404);
    }
  });

  it('serves exactly the 35 servable rows, none closed', async () => {
    const res = await createApp({}).request('/api/v1/sites?limit=100');
    const body = (await res.json()) as { data: Array<{ id: string }>; page: { total: number } };
    expect(body.page.total).toBe(35);
    expect(body.data).toHaveLength(35);
    for (const id of CLOSED_IDS) expect(idsOf(body)).not.toContain(id);
  });

  it('paginates disjointly (limit/offset slices never overlap)', async () => {
    const app = createApp({});
    const first = (await (await app.request('/api/v1/sites?limit=5&offset=0')).json()) as {
      data: Array<{ id: string }>;
    };
    const second = (await (await app.request('/api/v1/sites?limit=5&offset=5')).json()) as {
      data: Array<{ id: string }>;
    };
    expect(first.data).toHaveLength(5);
    expect(second.data).toHaveLength(5);
    expect(new Set([...idsOf(first), ...idsOf(second)]).size).toBe(10);
  });
});

describe('abuse controls', () => {
  it('gates /api/* with 401 when a free key is configured (healthz stays public)', async () => {
    const app = createApp({ VOLTBASE_API_KEY: 'free-key-1' });
    const missing = await app.request('/api/v1/sites?limit=5');
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: expect.any(String) as unknown },
    });
    const wrong = await app.request('/api/v1/sites?limit=5', { headers: { 'x-voltbase-key': 'wrong' } });
    expect(wrong.status).toBe(401);
    const ok = await app.request('/api/v1/sites?limit=5', { headers: { 'x-voltbase-key': 'free-key-1' } });
    expect(ok.status).toBe(200);
    expect((await createApp({ VOLTBASE_API_KEY: 'free-key-1' }).request('/healthz')).status).toBe(200);
  });

  it('rate-limits a hot IP with 429 + retry-after (in-memory, per-app instance)', async () => {
    const app = createApp({}, { rateLimit: { limit: 2, windowMs: 60_000 } });
    const headers = { 'cf-connecting-ip': '203.0.113.7' };
    expect((await app.request('/api/v1/sites?limit=1', { headers })).status).toBe(200);
    expect((await app.request('/api/v1/sites?limit=1', { headers })).status).toBe(200);
    const limited = await app.request('/api/v1/sites?limit=1', { headers });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({
      error: { code: 'RATE_LIMITED', message: expect.any(String) as unknown },
    });
    expect(limited.headers.get('retry-after')).toMatch(/^[0-9]+$/);
    // A different IP still has budget: buckets are per-IP.
    expect((await app.request('/api/v1/sites?limit=1', { headers: { 'cf-connecting-ip': '203.0.113.8' } })).status).toBe(
      200,
    );
  });

  it('never echoes a BYOK value in any response body (IS-05)', async () => {
    const sentinel = 'ocm-sentinel-9f3k2';
    const app = createApp({});
    for (const path of ['/api/v1/sites?limit=5', '/api/v1/sites/OCM%3A900000', '/api/v1/status/OCM%3A900000']) {
      const res = await app.request(path, { headers: { 'x-ocm-key': sentinel } });
      expect(res.status).toBe(200);
      expect(await res.text()).not.toContain(sentinel);
    }
  });
});

describe('status + stale label', () => {
  it('flags fixture rows stale with a 60min-SLO reason under the live clock', async () => {
    const res = await createApp({}).request('/api/v1/status/OCM%3A900000');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string; status: string; retrievedAt: string; stale: boolean; staleReason: string };
    };
    expect(body.data.id).toBe('OCM:900000');
    expect(body.data.stale).toBe(true);
    expect(body.data.staleReason).toContain('60min');
  });

  it('reports fresh rows fresh with an injected clock', async () => {
    const app = createApp({}, { now: () => Date.parse('2026-09-14T06:30:00.000Z') });
    const res = await app.request('/api/v1/status/OCM%3A900000');
    const body = (await res.json()) as { data: { stale: boolean; staleReason?: string } };
    expect(body.data.stale).toBe(false);
    expect(body.data.staleReason).toBeUndefined();
  });

  it('answers 404 with the typed shape for unknown ids and routes', async () => {
    const app = createApp({});
    const site = await app.request('/api/v1/sites/NOPE%3A1');
    expect(site.status).toBe(404);
    expect(await site.json()).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) as unknown } });
    const route = await app.request('/api/v1/nope');
    expect(route.status).toBe(404);
    expect(await route.json()).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) as unknown } });
  });
});

describe('headers, identity, attribution, partitions', () => {
  it('sets security headers on API responses', async () => {
    const res = await createApp({}).request('/api/v1/sites?limit=1');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('presents and echoes request-ids', async () => {
    const app = createApp({});
    const minted = await app.request('/api/v1/sites?limit=1');
    expect(minted.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9_-]{8,}$/);
    const echoed = await app.request('/api/v1/sites?limit=1', { headers: { 'x-request-id': 'smoke-req-1' } });
    expect(echoed.headers.get('x-request-id')).toBe('smoke-req-1');
    const bad = await app.request('/api/v1/sites?limit=1', { headers: { 'x-request-id': 'has spaces!!' } });
    expect(bad.headers.get('x-request-id')).not.toBe('has spaces!!');
  });

  it('preserves attribution + provenance on site detail', async () => {
    const res = await createApp({}).request('/api/v1/sites/OCM%3A900000');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        id: string;
        attribution: { text: string; url?: string };
        provenance: { source: string; retrievedAt: string };
      };
    };
    expect(body.data.attribution.text.length).toBeGreaterThan(0);
    expect(body.data.attribution.url).toContain('openchargemap');
    expect(isIsoTime(body.data.provenance.retrievedAt)).toBe(true);
  });

  it('resolves slash-bearing OSM ids when percent-encoded', async () => {
    const res = await createApp({}).request('/api/v1/sites/OSM%3Anode%2F22000101');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe('OSM:node/22000101');
  });

  it('keeps every served row on its own partition (no OSM/non-OSM join, ADR-003)', async () => {
    const res = await createApp({}).request('/api/v1/sites?limit=100');
    const body = (await res.json()) as {
      data: Array<{ id: string; featureType: string; regionalCut: string; source: string; licence: string }>;
    };
    const byCut = new Map<string, Set<string>>();
    for (const site of body.data) {
      // Each served row carries a complete 4-part partition key (ADR-003).
      expect([site.featureType, site.regionalCut, site.source, site.licence].every((p) => typeof p === 'string' && p !== '')).toBe(
        true,
      );
      expect(site.id.startsWith(`${site.source}:`)).toBe(true);
      const cut = `${site.featureType}|${site.regionalCut}`;
      const classes = byCut.get(cut) ?? new Set<string>();
      classes.add(site.source === 'OSM' ? 'osm' : 'non-osm');
      byCut.set(cut, classes);
    }
    for (const classes of byCut.values()) expect(classes.size).toBe(1);
  });

  it('answers CORS preflight on the API surface without a key', async () => {
    const app = createApp({ VOLTBASE_API_KEY: 'free-key-1' });
    const res = await app.request('/api/v1/sites?limit=1', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-headers')).toContain('x-voltbase-key');
  });
});
