/**
 * S6 reliability gates (node pool): `GET /api/v1/reliability/:id` serves
 * uptime rollups for servable ids, 404s closed ids, answers typed
 * UPSTREAM_FAILED + the stale prebuilt cut on an exhausted budget, keeps
 * exactly one cron trigger (≤5 ceiling), builds fresh per-request
 * composition (null-cache, IS-06), and the scheduled tick runs the poller
 * within caps.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WriteBudget } from '@voltbase/providers';
import { createApp, scheduled } from './index.ts';
import { handleGetReliability, runScheduledPoll } from './reliability.ts';

const stripComments = (raw: string): string => raw.replace(/^[\t ]*\/\/.*$/gm, '');

describe('reliability endpoint', () => {
  it('serves uptime rollups with attribution for a servable id', async () => {
    const res = await createApp({}).request('/api/v1/reliability/OCM%3A900000');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string; uptime: number; transitions: number; stale: boolean; attribution: { text: string } };
    };
    expect(body.data.id).toBe('OCM:900000');
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(body.data.uptime).toBeLessThanOrEqual(1);
    expect(body.data.attribution.text.length).toBeGreaterThan(0);
  });

  it('404s closed ids (never a closed signal)', async () => {
    const res = await createApp({}).request('/api/v1/reliability/OCM%3A910001');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) as unknown } });
  });

  it('exhausted budget answers UPSTREAM_FAILED + stale prebuilt cut', async () => {
    const budget = new WriteBudget();
    budget.recordKvWrites(800);
    // Direct handler seam with the exhausted budget (the route builds a fresh
    // per-request budget, so the guard is injected here for the assertion).
    const guarded = await Promise.resolve(
      handleGetReliability({ req: { param: () => 'OCM:900000' } } as never, { now: Date.now, budget }),
    );
    expect(guarded.status).toBe(503);
    const body = (await guarded.json()) as {
      error: { code: string };
      cut: { id: string; stale: boolean; staleReason: string };
    };
    expect(body.error.code).toBe('UPSTREAM_FAILED');
    expect(body.cut.id).toBe('OCM:900000');
    expect(body.cut.stale).toBe(true);
    expect(body.cut.staleReason).toContain('prebuilt cut');
  });
});

describe('cron + null-cache (IS-06)', () => {
  it('declares exactly one hourly-class cron (≤5 ceiling)', () => {
    const raw = readFileSync('packages/mcp/worker/wrangler.jsonc', 'utf8');
    const config = JSON.parse(stripComments(raw)) as { triggers?: { crons?: string[] } };
    expect(config.triggers?.crons).toEqual(['17 * * * *']);
    expect(config.triggers?.crons?.length ?? 99).toBeLessThanOrEqual(5);
  });

  it('fresh composition per request: sequential calls are deep-equal with no shared state', async () => {
    const fixedNow = Date.parse('2026-09-15T00:17:00.000Z');
    const app = createApp({}, { now: () => fixedNow });
    const first = (await (await app.request('/api/v1/reliability/OCM%3A900000')).json()) as unknown;
    const second = (await (await app.request('/api/v1/reliability/OCM%3A900000')).json()) as unknown;
    expect(second).toEqual(first);
    // Mutating one parsed body cannot affect the next (no shared mutable cut).
    (first as { data: { transitions: number } }).data.transitions = -1;
    const third = (await (await app.request('/api/v1/reliability/OCM%3A900000')).json()) as {
      data: { transitions: number };
    };
    expect(third.data.transitions).not.toBe(-1);
  });

  it('scheduled tick polls within caps (35 ids ≤ 50 subrequests, ≤6 concurrent)', async () => {
    const stats = await runScheduledPoll(Date.parse('2026-09-15T00:17:00.000Z'));
    expect(stats.observed).toBe(35);
    expect(stats.subrequests).toBeLessThanOrEqual(50);
    expect(stats.maxConcurrent).toBeLessThanOrEqual(6);
    expect(stats.stopped).toBeNull();
    let waited = false;
    await scheduled({ cron: '17 * * * *', scheduledTime: Date.parse('2026-09-15T00:17:00.000Z') }, {}, {
      waitUntil: () => {
        waited = true;
      },
    });
    expect(waited).toBe(true);
  });
});
