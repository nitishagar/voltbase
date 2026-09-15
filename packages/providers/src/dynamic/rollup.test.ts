/**
 * S6 rollup gates (node pool): known transition sequences yield exact uptime
 * (up/(up+down), transitions counted once), and observations beyond the 60min
 * SLO are stale-labelled (S3 stale-SLO reused).
 */
import { describe, expect, it } from 'vitest';
import { reliabilityStale, rollupUptime } from './rollup.ts';
import type { JournalEntry } from './journal.ts';

const H = 3_600_000;
const T0 = Date.parse('2026-09-14T00:00:00.000Z');

describe('uptime rollup math (up/(up+down), transitions once)', () => {
  it('8h up + 2h down over 10h yields exactly 0.8 with 1 transition', () => {
    const entries: JournalEntry[] = [
      { id: 'OCM:900000', from: 'AVAILABLE', to: 'OUT_OF_SERVICE', at: new Date(T0 + 8 * H).toISOString() },
    ];
    const numbers = rollupUptime({ id: 'OCM:900000', entries, fromMs: T0, toMs: T0 + 10 * H, startStatus: 'AVAILABLE' });
    expect(numbers.transitions).toBe(1);
    expect(numbers.upMs).toBe(8 * H);
    expect(numbers.downMs).toBe(2 * H);
    expect(numbers.uptime).toBe(0.8);
  });

  it('OCCUPIED counts as up; flap out-and-back counts 2 transitions', () => {
    const entries: JournalEntry[] = [
      { id: 'OCM:900000', from: 'OCCUPIED', to: 'OUT_OF_SERVICE', at: new Date(T0 + 6 * H).toISOString() },
      { id: 'OCM:900000', from: 'OUT_OF_SERVICE', to: 'AVAILABLE', at: new Date(T0 + 8 * H).toISOString() },
    ];
    const numbers = rollupUptime({ id: 'OCM:900000', entries, fromMs: T0, toMs: T0 + 10 * H, startStatus: 'OCCUPIED' });
    expect(numbers.transitions).toBe(2);
    expect(numbers.upMs).toBe(8 * H);
    expect(numbers.downMs).toBe(2 * H);
    expect(numbers.uptime).toBe(0.8);
  });
});

describe('stale handling (60min SLO)', () => {
  it('fresh observations are fresh; SLO-old ones are stale with a reason', () => {
    expect(reliabilityStale('2026-09-14T06:00:00.000Z', Date.parse('2026-09-14T06:30:00.000Z')).stale).toBe(false);
    const stale = reliabilityStale('2026-09-14T06:00:00.000Z', Date.parse('2026-09-14T08:00:00.000Z'));
    expect(stale.stale).toBe(true);
    expect(stale.reason ?? '').toContain('60min');
  });
});
