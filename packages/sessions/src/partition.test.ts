/**
 * Partition discipline for session rows (I2): sim sessions ride the non-OSM
 * side (CC0-by-authorship) and share no ids with OSM fixture rows; depot
 * payloads join nothing across the OSM boundary (chargerRef is opaque).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isServable, partitionKeyString } from '@voltbase/core';
import { licenceFilter, renormalise } from '@voltbase/normalise';
import { EU_FIXTURES } from '../../normalise/fixtures/eu.ts';
import { normaliseTrace, type SimTrace } from './session.ts';

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus');
const load = (name: string): SimTrace => JSON.parse(readFileSync(join(corpusDir, name), 'utf8')) as SimTrace;

describe('session partition discipline', () => {
  it('keeps session rows on the non-OSM side with no OSM id overlap', () => {
    const sessions = ['ocpp16-full.json', 'ocpp16-hostile.json', 'ocpp201-events.json'].flatMap(
      (f) => normaliseTrace(load(f)).sessions,
    );
    expect(sessions.length).toBeGreaterThan(0);
    for (const row of sessions) {
      expect(row.featureType).toBe('ChargeSession');
      expect(row.source).toBe('OCPP');
      const sourceClass: string = row.source;
      expect(sourceClass === 'OSM').toBe(false);
      expect(partitionKeyString(row).split('|')).toHaveLength(4);
    }
    const { servable } = licenceFilter(renormalise([...EU_FIXTURES]));
    const osmIds = new Set(servable.filter((s) => s.source === 'OSM').map((s) => s.id));
    for (const row of sessions.filter((s) => isServable(s))) {
      expect(osmIds.has(row.id)).toBe(false);
    }
  });
});
