/**
 * Session error mapping (I9): Stop-without-Start rejection, open-session and
 * energyUnknown row flags, and UPSTREAM_FAILED on an empty corpus.
 */
import { describe, expect, it } from 'vitest';
import { buildSessionIndex } from './depot.ts';
import { normaliseTrace, type SimTrace } from './session.ts';

const trace = (events16: SimTrace['events16']): SimTrace => ({
  charger: 'CP-ERR',
  dialect: 'ocpp1.6',
  retrievedAt: '2026-11-24T10:00:00.000Z',
  licenceHint: 'CC0-1.0',
  events16,
});

describe('session error mapping', () => {
  it('rejects Stop-without-Start with reason + charger + txid', () => {
    const { sessions, rejected } = normaliseTrace(
      trace([{ type: 'stop', transactionId: 42, meterStopWh: 5, at: '2026-11-24T10:00:00.000Z' }]),
    );
    expect(sessions).toHaveLength(0);
    expect(rejected).toEqual([{ reason: 'stop-without-start', charger: 'cp-err', transactionId: '42', at: '2026-11-24T10:00:00.000Z' }]);
  });

  it('serves open sessions with the openSession flag instead of failing', () => {
    const { sessions, rejected } = normaliseTrace(
      trace([{ type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 7, at: '2026-11-24T10:00:00.000Z' }]),
    );
    expect(rejected).toEqual([]);
    expect(sessions[0]?.openSession).toBe(true);
    expect(sessions[0]?.qualityFlags).toContain('openSession');
  });

  it('flags rolled-over registers as energyUnknown with null energy', () => {
    const { sessions } = normaliseTrace(
      trace([
        { type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 900, at: '2026-11-24T10:00:00.000Z' },
        { type: 'stop', transactionId: 1, meterStopWh: 100, at: '2026-11-24T10:01:00.000Z' },
      ]),
    );
    expect(sessions[0]?.energyWh).toBeNull();
    expect(sessions[0]?.qualityFlags).toContain('energyUnknown');
  });

  it('answers UPSTREAM_FAILED when the corpus is empty', () => {
    expect(buildSessionIndex([])).toEqual({ ok: false, code: 'UPSTREAM_FAILED', message: 'depot corpus is empty' });
  });
});
