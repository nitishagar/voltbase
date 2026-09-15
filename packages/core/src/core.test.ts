/**
 * Core S2 gates: partition key shape, serve gate, ULID + ISO-time helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  createUlid,
  isIsoTime,
  isServable,
  isUlid,
  parseUlidTime,
  partitionKey,
  partitionKeyString,
  stableId,
  toIsoTime,
  type ChargePoint,
} from './index.ts';

function row(overrides: Partial<ChargePoint> = {}): ChargePoint {
  return {
    id: 'OCM:1',
    featureType: 'ChargePoint',
    regionalCut: 'NL',
    source: 'OCM',
    licence: 'CC-BY-4.0',
    providerCopyrighted: false,
    name: 'Test site',
    lat: 52.37,
    lon: 4.8952,
    connectors: [{ standard: 'CCS2', powerKw: 50 }],
    status: 'AVAILABLE',
    attribution: { text: 'Test' },
    provenance: { source: 'OCM', retrievedAt: '2026-09-14T00:00:00.000Z', attribution: { text: 'Test' } },
    ...overrides,
  };
}

describe('partition key (ADR-003)', () => {
  it('exposes the (feature_type, regional_cut, source, licence) tuple in order', () => {
    expect(partitionKey(row())).toEqual(['ChargePoint', 'NL', 'OCM', 'CC-BY-4.0']);
  });

  it('serialises deterministically for map keys', () => {
    expect(partitionKeyString(row())).toBe('ChargePoint|NL|OCM|CC-BY-4.0');
    expect(partitionKeyString(row())).toBe(partitionKeyString(row()));
  });
});

describe('isServable licence boundary (IS-03)', () => {
  it('serves every open licence class', () => {
    for (const licence of ['CC0-1.0', 'Etalab-2.0', 'CC-BY-4.0', 'ODbL-1.0'] as const) {
      expect(isServable(row({ licence }))).toBe(true);
    }
  });

  it('never serves UNKNOWN or CLOSED', () => {
    expect(isServable(row({ licence: 'UNKNOWN' }))).toBe(false);
    expect(isServable(row({ licence: 'CLOSED' }))).toBe(false);
  });

  it('never serves provider-copyright rows even with an open licence label', () => {
    expect(isServable(row({ licence: 'CC-BY-4.0', providerCopyrighted: true }))).toBe(false);
  });
});

describe('ULID + ISO-time helpers', () => {
  it('creates canonical time-ordered ULIDs carrying the given timestamp', () => {
    const a = createUlid(1_757_824_000_000);
    const b = createUlid(1_757_824_000_001);
    expect(isUlid(a)).toBe(true);
    expect(isUlid(b)).toBe(true);
    expect(parseUlidTime(a)).toBe(1_757_824_000_000);
    expect(parseUlidTime(b)).toBe(1_757_824_000_001);
    expect(a < b).toBe(true);
    expect(isUlid('not-a-ulid')).toBe(false);
    expect(() => parseUlidTime('bogus')).toThrow(RangeError);
  });

  it('round-trips ISO instants and rejects junk', () => {
    expect(toIsoTime(new Date('2026-09-14T00:00:00.000Z'))).toBe('2026-09-14T00:00:00.000Z');
    expect(isIsoTime('2026-09-14T00:00:00.000Z')).toBe(true);
    expect(isIsoTime('')).toBe(false);
    expect(isIsoTime('next Tuesday-ish')).toBe(false);
  });

  it('derives deterministic source-prefixed stable ids', () => {
    expect(stableId('OSM', 'node/1')).toBe('OSM:node/1');
    expect(stableId('OSM', 'node/1')).toBe(stableId('OSM', 'node/1'));
    expect(stableId('OCM', 'node/1')).not.toBe(stableId('OSM', 'node/1'));
  });
});
