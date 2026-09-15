import { describe, expect, it } from 'vitest';
import { app } from './index.ts';

/**
 * Workers-pool smoke (workerd via @cloudflare/vitest-plugin): the Hono app
 * answers /healthz inside the isolate with zero live network.
 */
describe('S1 worker pool smoke', () => {
  it('GET /healthz answers {"ok":true,"stage":8} in workerd', async () => {
    const res = await app.request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stage: 8 });
  });
});
