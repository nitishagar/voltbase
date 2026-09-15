/**
 * S6 poller gates (node pool): fan-out never exceeds 6 concurrent fetches or
 * 50 subrequests per invocation (Workers free-tier ceilings, enforced); wider
 * ticks are refused with the typed cap error; an exhausted write budget stops
 * the run with UPSTREAM_FAILED for the cut-to-artifact fallback.
 */
import { describe, expect, it } from 'vitest';
import { WriteBudget } from './budget.ts';
import { TransitionJournal } from './journal.ts';
import { MAX_CONCURRENT_OUTBOUND, MAX_SUBREQUESTS_PER_INVOCATION, PollerCapError, runPoller } from './poller.ts';

const tick = (id: string, minute: number): string => `2026-09-14T00:${minute.toString().padStart(2, '0')}:00.000Z`;

describe('poller fan-out caps (≤50 subrequests, ≤6 concurrent)', () => {
  it('runs 50 targets within caps and reports the observed concurrency', async () => {
    let active = 0;
    let maxObserved = 0;
    const targets = Array.from({ length: MAX_SUBREQUESTS_PER_INVOCATION }, (_, i) => ({ id: `OCM:${String(900000 + i)}` }));
    const result = await runPoller(
      targets,
      async (target) => {
        active += 1;
        if (active > maxObserved) maxObserved = active;
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return { id: target.id, status: 'AVAILABLE', observedAt: tick(target.id, 1) };
      },
      { journal: new TransitionJournal(), budget: new WriteBudget() },
    );
    expect(result.observed).toBe(50);
    expect(result.subrequests).toBeLessThanOrEqual(50);
    expect(result.maxConcurrent).toBeLessThanOrEqual(MAX_CONCURRENT_OUTBOUND);
    expect(result.maxConcurrent).toBeLessThanOrEqual(6);
    expect(maxObserved).toBeLessThanOrEqual(6);
    expect(result.stopped).toBeNull();
  });

  it('refuses ticks beyond the subrequest budget with the typed cap error', async () => {
    const targets = Array.from({ length: MAX_SUBREQUESTS_PER_INVOCATION + 1 }, (_, i) => ({
      id: `OCM:${String(900000 + i)}`,
    }));
    await expect(
      runPoller(targets, async (target) => ({ id: target.id, status: 'AVAILABLE', observedAt: tick(target.id, 1) })),
    ).rejects.toThrowError(PollerCapError);
  });
});

describe('poller budget stop (cut-to-artifact signal)', () => {
  it('stops with UPSTREAM_FAILED once the 80% guard trips mid-run', async () => {
    const budget = new WriteBudget();
    budget.recordD1Rows(79_999);
    const targets = [{ id: 'OCM:900000' }, { id: 'OCM:900001' }, { id: 'OCM:900002' }];
    // Seed baselines so every fresh OUT_OF_SERVICE sample is a real transition (one D1 row each).
    const journal = new TransitionJournal();
    for (const target of targets) {
      journal.observe({ id: target.id, status: 'AVAILABLE', observedAt: tick(target.id, 1) });
    }
    const result = await runPoller(
      targets,
      async (target) => ({ id: target.id, status: 'OUT_OF_SERVICE', observedAt: tick(target.id, 2) }),
      { journal, budget, maxConcurrent: 1 },
    );
    expect(budget.exhausted).toBe(true);
    expect(result.stopped).toBe('UPSTREAM_FAILED');
    expect(result.appended).toBeGreaterThan(0);
    expect(result.observed).toBeLessThanOrEqual(targets.length);
  });
});
