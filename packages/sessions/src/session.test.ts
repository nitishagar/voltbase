/**
 * Session normaliser goldens: all 3 corpus dialects, every schema field
 * asserted; dedupe, rollover, orphan, replay, and open-session edges.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SessionNormaliseError,
  dedupeKey,
  normalizeChargerRef,
  normaliseTrace,
  validateSession,
  type SimTrace,
} from './session.ts';

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus');
const load = (name: string): SimTrace => JSON.parse(readFileSync(join(corpusDir, name), 'utf8')) as SimTrace;

describe('golden sessions (all 3 dialects, 100% field coverage)', () => {
  it('normalises the 1.6J full flow to one exact row', () => {
    const { sessions, rejected } = normaliseTrace(load('ocpp16-full.json'));
    expect(rejected).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual({
      id: 'OCPP:cp-16a:1008',
      featureType: 'ChargeSession',
      regionalCut: 'XX',
      source: 'OCPP',
      licence: 'CC0-1.0',
      providerCopyrighted: false,
      chargerRef: 'cp-16a',
      connectorId: 1,
      dialect: 'ocpp1.6',
      startedAt: '2026-11-24T10:00:00.000Z',
      endedAt: '2026-11-24T10:02:00.000Z',
      openSession: false,
      energyWh: 1500,
      meterStartWh: 1000,
      meterStopWh: 2500,
      qualityFlags: [],
      orphanCount: 0,
      lateCount: 0,
      replayCount: 0,
      attribution: { text: 'voltbase simulated CC0 trace' },
      provenance: {
        source: 'OCPP',
        retrievedAt: '2026-11-24T10:00:00.000Z',
        attribution: { text: 'voltbase simulated CC0 trace' },
      },
    });
  });

  it('normalises the 2.0.1 flow to one exact row with string txid', () => {
    const { sessions, rejected } = normaliseTrace(load('ocpp201-events.json'));
    expect(rejected).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual({
      id: 'OCPP:cp-201:station-tx-1',
      featureType: 'ChargeSession',
      regionalCut: 'XX',
      source: 'OCPP',
      licence: 'CC0-1.0',
      providerCopyrighted: false,
      chargerRef: 'cp-201',
      connectorId: 1,
      dialect: 'ocpp2.0.1',
      startedAt: '2026-11-24T10:00:00.000Z',
      endedAt: '2026-11-24T10:02:00.000Z',
      openSession: false,
      energyWh: 1500,
      meterStartWh: 1000,
      meterStopWh: 2500,
      qualityFlags: [],
      orphanCount: 0,
      lateCount: 0,
      replayCount: 0,
      attribution: { text: 'voltbase simulated CC0 trace' },
      provenance: {
        source: 'OCPP',
        retrievedAt: '2026-11-24T10:00:00.000Z',
        attribution: { text: 'voltbase simulated CC0 trace' },
      },
    });
  });

  it('normalises the hostile dialect to two exact rows', () => {
    const { sessions, rejected } = normaliseTrace(load('ocpp16-hostile.json'));
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toEqual({
      id: 'OCPP:cp-16b:1009',
      featureType: 'ChargeSession',
      regionalCut: 'XX',
      source: 'OCPP',
      licence: 'CC0-1.0',
      providerCopyrighted: false,
      chargerRef: 'cp-16b',
      connectorId: 1,
      dialect: 'ocpp1.6',
      startedAt: '2026-11-24T10:00:00.000Z',
      endedAt: '2026-11-24T10:02:00.000Z',
      openSession: false,
      energyWh: 1500,
      meterStartWh: 1000,
      meterStopWh: 2500,
      qualityFlags: ['replayedStop', 'orphanReading'],
      orphanCount: 1,
      lateCount: 0,
      replayCount: 1,
      attribution: { text: 'voltbase simulated CC0 trace' },
      provenance: {
        source: 'OCPP',
        retrievedAt: '2026-11-24T10:00:00.000Z',
        attribution: { text: 'voltbase simulated CC0 trace' },
      },
    });
    expect(sessions[1]).toEqual({
      id: 'OCPP:cp-16b:1010',
      featureType: 'ChargeSession',
      regionalCut: 'XX',
      source: 'OCPP',
      licence: 'CC0-1.0',
      providerCopyrighted: false,
      chargerRef: 'cp-16b',
      connectorId: 1,
      dialect: 'ocpp1.6',
      startedAt: '2026-11-24T10:03:20.000Z',
      endedAt: '2026-11-24T10:04:20.000Z',
      openSession: false,
      energyWh: null,
      meterStartWh: 5000,
      meterStopWh: 4200,
      qualityFlags: ['energyUnknown'],
      orphanCount: 0,
      lateCount: 0,
      replayCount: 0,
      attribution: { text: 'voltbase simulated CC0 trace' },
      provenance: {
        source: 'OCPP',
        retrievedAt: '2026-11-24T10:00:00.000Z',
        attribution: { text: 'voltbase simulated CC0 trace' },
      },
    });
    expect(rejected).toEqual([
      { reason: 'stop-without-start', charger: 'cp-16b', transactionId: '9999', at: '2026-11-24T10:05:00.000Z' },
    ]);
  });
});

describe('dedupe + correlation rules', () => {
  it('keys on charger, stringified txid, and sequence position', () => {
    expect(dedupeKey('cp-1', 1008, '2026-11-24T10:02:00.000Z')).toBe('cp-1|1008|2026-11-24T10:02:00.000Z');
    expect(dedupeKey('cp-1', 'station-tx-1', 2)).toBe('cp-1|station-tx-1|2');
  });

  it('normalises charger identity to a lowercase-trim namespace', () => {
    expect(normalizeChargerRef('  CP-16A ')).toBe('cp-16a');
  });

  it('flags open sessions instead of zeroing energy', () => {
    const trace: SimTrace = {
      charger: 'CP-OPEN',
      dialect: 'ocpp1.6',
      retrievedAt: '2026-11-24T10:00:00.000Z',
      licenceHint: 'CC0-1.0',
      events16: [{ type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 100, at: '2026-11-24T10:00:00.000Z' }],
    };
    const { sessions } = normaliseTrace(trace);
    expect(sessions[0]?.openSession).toBe(true);
    expect(sessions[0]?.energyWh).toBeNull();
    expect(sessions[0]?.qualityFlags).toContain('openSession');
  });

  it('counts post-Stop readings as flagged late readings, never silent drops', () => {
    const trace: SimTrace = {
      charger: 'CP-LATE',
      dialect: 'ocpp1.6',
      retrievedAt: '2026-11-24T10:00:00.000Z',
      licenceHint: 'CC0-1.0',
      events16: [
        { type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 100, at: '2026-11-24T10:00:00.000Z' },
        { type: 'stop', transactionId: 1, meterStopWh: 200, at: '2026-11-24T10:02:00.000Z' },
        { type: 'meter', connectorId: 1, valueWh: 210, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: '2026-11-24T10:03:00.000Z' },
      ],
    };
    const { sessions } = normaliseTrace(trace);
    expect(sessions[0]?.lateCount).toBe(1);
    expect(sessions[0]?.qualityFlags).toContain('lateReading');
    expect(sessions[0]?.energyWh).toBe(100);
  });

  it('orphans id-less readings past the 24h pairing bound instead of pairing', () => {
    const trace: SimTrace = {
      charger: 'CP-SKEW',
      dialect: 'ocpp1.6',
      retrievedAt: '2026-11-24T10:00:00.000Z',
      licenceHint: 'CC0-1.0',
      events16: [
        { type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 100, at: '2026-11-24T10:00:00.000Z' },
        { type: 'meter', connectorId: 1, valueWh: 150, measurand: 'Energy.Active.Import.Register', unit: 'Wh', at: '2026-12-24T10:00:00.000Z' },
      ],
    };
    const { sessions } = normaliseTrace(trace);
    expect(sessions[0]?.orphanCount).toBe(1);
    expect(sessions[0]?.qualityFlags).toContain('orphanReading');
  });

  it('rejects non-energy meter readings loudly instead of mis-summing', () => {
    const trace: SimTrace = {
      charger: 'CP-POWER',
      dialect: 'ocpp1.6',
      retrievedAt: '2026-11-24T10:00:00.000Z',
      licenceHint: 'CC0-1.0',
      events16: [
        { type: 'start', transactionId: 1, connectorId: 1, idTag: 'X', meterStartWh: 100, at: '2026-11-24T10:00:00.000Z' },
        { type: 'meter', connectorId: 1, transactionId: 1, valueWh: 32, measurand: 'Current.Import', unit: 'A', at: '2026-11-24T10:01:00.000Z' },
      ],
    };
    expect(() => normaliseTrace(trace)).toThrowError(SessionNormaliseError);
    try {
      normaliseTrace(trace);
      expect.unreachable('non-energy reading must throw');
    } catch (error) {
      expect((error as SessionNormaliseError).code).toBe('NON_ENERGY_READING');
    }
    const trace201: SimTrace = {
      charger: 'CP-POWER',
      dialect: 'ocpp2.0.1',
      retrievedAt: '2026-11-24T10:00:00.000Z',
      licenceHint: 'CC0-1.0',
      events201: [
        { type: 'started', transactionId: 't', evseId: 1, connectorId: 1, seqNo: 0, meterWh: 100, measurand: 'Power.Active.Import', unit: 'W', at: '2026-11-24T10:00:00.000Z' },
      ],
    };
    expect(() => normaliseTrace(trace201)).toThrowError(SessionNormaliseError);
  });

  it('is deterministic: same trace twice yields deep-equal rows', () => {
    const trace = load('ocpp16-hostile.json');
    expect(normaliseTrace(trace)).toEqual(normaliseTrace(load('ocpp16-hostile.json')));
  });
});

describe('validateSession boundaries', () => {
  it('accepts golden rows and rejects malformed ones', () => {
    const { sessions } = normaliseTrace(load('ocpp16-full.json'));
    expect(validateSession(sessions[0]!)).toEqual([]);
    const bad = { ...sessions[0]!, connectorId: 0, energyWh: -5, endedAt: '2020-01-01T00:00:00.000Z' };
    const codes = validateSession(bad).map((i) => i.code);
    expect(codes).toContain('BAD_CONNECTOR');
    expect(codes).toContain('BAD_ENERGY');
    expect(codes).toContain('END_BEFORE_START');
  });
});
