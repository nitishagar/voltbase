/**
 * S6 facade gates (node pool): `getReliability` serves journal rollups when
 * the budget holds and the last-good prebuilt cut + stale label with typed
 * UPSTREAM_FAILED when the 80% guard has tripped (e.g. 800 simulated KV
 * writes). Guard failure never widens serving — the cut covers servable ids
 * only (callers 404 closed ids first).
 */
import { describe, expect, it } from 'vitest';
import { WriteBudget } from './budget.ts';
import { TransitionJournal } from './journal.ts';
import { getReliability } from '../reliability.ts';

const NOW = Date.parse('2026-09-14T12:00:00.000Z');
const H = 3_600_000;

describe('reliability facade (journal vs cut-to-artifact)', () => {
  it('serves journal rollups from the servedFrom=journal lane when the budget holds', () => {
    const journal = new TransitionJournal();
    journal.observe({ id: 'OCM:900000', status: 'AVAILABLE', observedAt: new Date(NOW - 10 * H).toISOString() });
    journal.observe({ id: 'OCM:900000', status: 'OUT_OF_SERVICE', observedAt: new Date(NOW - 2 * H).toISOString() });
    const answer = getReliability({
      id: 'OCM:900000',
      startStatus: 'AVAILABLE',
      entries: journal.entriesFor('OCM:900000'),
      observedAt: new Date(NOW - 30 * 60_000).toISOString(),
      nowMs: NOW,
      windowMs: 10 * H,
      budget: new WriteBudget(),
    });
    expect(answer.ok).toBe(true);
    if (answer.ok) {
      expect(answer.data.servedFrom).toBe('journal');
      expect(answer.data.uptime).toBe(0.8);
      expect(answer.data.transitions).toBe(1);
      expect(answer.data.stale).toBe(false);
    }
  });

  it('800 simulated KV writes trip the guard: UPSTREAM_FAILED + stale artifact cut', () => {
    const budget = new WriteBudget();
    budget.recordKvWrites(800);
    const answer = getReliability({
      id: 'OCM:900000',
      startStatus: 'AVAILABLE',
      entries: [],
      observedAt: new Date(NOW - 30 * 60_000).toISOString(),
      nowMs: NOW,
      budget,
    });
    expect(answer.ok).toBe(false);
    if (!answer.ok) {
      expect(answer.code).toBe('UPSTREAM_FAILED');
      expect(answer.cut.servedFrom).toBe('artifact');
      expect(answer.cut.stale).toBe(true);
      expect(answer.cut.staleReason ?? '').toContain('prebuilt cut');
      expect(answer.cut.id).toBe('OCM:900000');
      expect(answer.cut.uptime).toBe(0.97);
    }
  });
});
