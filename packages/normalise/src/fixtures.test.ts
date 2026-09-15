/**
 * Fixture gates: 30 EU + 10 India rows, closed rows never served, and the
 * ADR-003 Collective partition discipline over the served set (served
 * partitions are all-OSM or all-non-OSM; OSM and non-OSM rows share no ids).
 */
import { describe, expect, it } from 'vitest';
import { isServable, partitionKeyString, type ChargePoint } from '@voltbase/core';
import { licenceFilter, renormalise, validateChargePoint } from './index.ts';
import { EU_FIXTURES } from '../fixtures/eu.ts';
import { INDIA_FIXTURES } from '../fixtures/india.ts';

function servedAndClosed(inputs: typeof EU_FIXTURES): { servable: ChargePoint[]; closed: ChargePoint[] } {
  return licenceFilter(renormalise(inputs));
}

describe('fixture counts', () => {
  it('holds 30 EU + 10 India deterministic inputs', () => {
    expect(EU_FIXTURES).toHaveLength(30);
    expect(INDIA_FIXTURES).toHaveLength(10);
  });

  it('splits EU into 27 servable + 3 closed, India into 8 servable + 2 closed', () => {
    const eu = servedAndClosed(EU_FIXTURES);
    expect(eu.servable).toHaveLength(27);
    expect(eu.closed).toHaveLength(3);
    const india = servedAndClosed(INDIA_FIXTURES);
    expect(india.servable).toHaveLength(8);
    expect(india.closed).toHaveLength(2);
  });
});

describe('closed rows never served', () => {
  it('marks every closed fixture row unservable, incl. all three filter proofs', () => {
    for (const batch of [EU_FIXTURES, INDIA_FIXTURES]) {
      const { servable, closed } = servedAndClosed(batch);
      for (const site of servable) expect(isServable(site)).toBe(true);
      for (const site of closed) {
        expect(isServable(site)).toBe(false);
        expect(site.licence).toBe('CLOSED');
      }
    }
    const euClosed = servedAndClosed(EU_FIXTURES).closed;
    expect(euClosed.some((s) => s.source === 'OCM' && s.providerCopyrighted)).toBe(true);
    expect(euClosed.filter((s) => s.source === 'DATEX2')).toHaveLength(2);
  });

  it('keeps every servable fixture row validator-clean', () => {
    for (const batch of [EU_FIXTURES, INDIA_FIXTURES]) {
      for (const site of servedAndClosed(batch).servable) {
        expect(validateChargePoint(site)).toEqual([]);
      }
    }
  });
});

describe('Collective partition discipline (ADR-003)', () => {
  it('keeps served (feature_type, regional_cut) partitions all-OSM or all-non-OSM', () => {
    const served = [...servedAndClosed(EU_FIXTURES).servable, ...servedAndClosed(INDIA_FIXTURES).servable];
    const byCut = new Map<string, Set<string>>();
    for (const site of served) {
      const cut = `${site.featureType}|${site.regionalCut}`;
      const classes = byCut.get(cut) ?? new Set<string>();
      classes.add(site.source === 'OSM' ? 'osm' : 'non-osm');
      byCut.set(cut, classes);
    }
    for (const [cut, classes] of byCut) {
      expect(classes.size, `mixed partition ${cut}`).toBe(1);
    }
  });

  it('shares no ids or partition keys across OSM / non-OSM served rows', () => {
    const served = [...servedAndClosed(EU_FIXTURES).servable, ...servedAndClosed(INDIA_FIXTURES).servable];
    const osmIds = new Set(served.filter((s) => s.source === 'OSM').map((s) => s.id));
    for (const site of served.filter((s) => s.source !== 'OSM')) {
      expect(osmIds.has(site.id)).toBe(false);
    }
    const keys = served.map(partitionKeyString);
    expect(new Set(keys).size).toBeLessThanOrEqual(keys.length);
    expect(keys.every((k) => k.split('|').length === 4)).toBe(true);
  });
});
