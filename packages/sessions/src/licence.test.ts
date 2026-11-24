/**
 * Session licence boundary (I1): session rows flow through the shared
 * generic filter; unknown session licences close and never serve.
 */
import { describe, expect, it } from 'vitest';
import { isServable } from '@voltbase/core';
import { closeUnknownLicence, licenceFilter } from '@voltbase/normalise';
import { normaliseTrace, type SimTrace } from './session.ts';

const hint = (licenceHint: string): SimTrace => ({
  charger: 'CP-LIC',
  dialect: 'ocpp1.6',
  retrievedAt: '2026-11-24T10:00:00.000Z',
  licenceHint,
  events16: [
    { type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 0, at: '2026-11-24T10:00:00.000Z' },
    { type: 'stop', transactionId: 1, meterStopWh: 10, at: '2026-11-24T10:01:00.000Z' },
  ],
});

describe('session licence filter', () => {
  it('serves CC0 session rows through the shared generic filter', () => {
    const { sessions } = normaliseTrace(hint('CC0-1.0'));
    const { servable, closed } = licenceFilter(sessions);
    expect(servable).toHaveLength(1);
    expect(closed).toHaveLength(0);
    expect(servable[0]?.licence).toBe('CC0-1.0');
  });

  it('closes unknown session licences; closed rows never serve', () => {
    const { sessions } = normaliseTrace(hint('not specified'));
    expect(sessions[0]?.licence).toBe('UNKNOWN');
    const closed = closeUnknownLicence(sessions[0]!);
    expect(closed.licence).toBe('CLOSED');
    expect(sessions[0]?.licence).toBe('UNKNOWN');
    const split = licenceFilter(sessions);
    expect(split.servable).toHaveLength(0);
    expect(split.closed).toHaveLength(1);
    expect(isServable(split.closed[0]!)).toBe(false);
  });
});
