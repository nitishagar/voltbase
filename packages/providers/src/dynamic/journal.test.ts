/**
 * S6 journal gates (node pool): the transition detector appends ONCE per
 * status change and never performs full upserts — repeat polls of an
 * unchanged status append nothing (ADR-002 §W1 transition-only writes).
 */
import { describe, expect, it } from 'vitest';
import { TransitionJournal } from './journal.ts';

describe('transition journal (append once per transition)', () => {
  it('double-poll of the same state yields exactly 1 entry after one change', () => {
    const journal = new TransitionJournal();
    expect(journal.observe({ id: 'OCM:900000', status: 'AVAILABLE', observedAt: '2026-09-14T06:00:00.000Z' })).toBeNull();
    expect(journal.observe({ id: 'OCM:900000', status: 'AVAILABLE', observedAt: '2026-09-14T07:00:00.000Z' })).toBeNull();
    const entry = journal.observe({
      id: 'OCM:900000',
      status: 'OUT_OF_SERVICE',
      observedAt: '2026-09-14T08:00:00.000Z',
    });
    expect(entry).toMatchObject({ id: 'OCM:900000', from: 'AVAILABLE', to: 'OUT_OF_SERVICE' });
    expect(journal.observe({ id: 'OCM:900000', status: 'OUT_OF_SERVICE', observedAt: '2026-09-14T09:00:00.000Z' })).toBeNull();
    expect(journal.size).toBe(1);
    expect(journal.entriesFor('OCM:900000')).toHaveLength(1);
  });

  it('never full-upserts: N unchanged samples across M sites append 0 entries', () => {
    const journal = new TransitionJournal();
    const ids = ['OCM:900000', 'OCPI:NL-NDW-001', 'OSM:node/22000101'];
    for (let round = 0; round < 5; round += 1) {
      for (const id of ids) {
        expect(
          journal.observe({ id, status: 'AVAILABLE', observedAt: `2026-09-14T0${String(round)}:00:00.000Z` }),
        ).toBeNull();
      }
    }
    expect(journal.size).toBe(0);
    expect(journal.snapshot()).toEqual([]);
  });
});
