/**
 * S3 in-memory fixture index (packages/mcp/worker/store.ts).
 *
 * Serves the S2 EU + IN fixtures, servable-only via `isServable()`:
 * self-reported/provider-copyright and otherwise closed rows are excluded at
 * index build time and can never leak through the API (unknown ids ⇒ 404,
 * never a "closed" signal).
 *
 * ADR-003 Collective discipline: serve-time filters rows per-partition and
 * never constructs cross-partition joins between OSM and non-OSM rows — each
 * served row keeps its own `(feature_type, regional_cut, source, licence)`
 * key, source-prefixed id, and per-partition attribution (IS-03/IS-04).
 *
 * Memory only, no KV/D1/DO/R2 (IS-06, ADR-002): adding persistence needs an
 * ADR + write-budget math first.
 */
import { isServable, type Attribution, type ChargePoint } from '@voltbase/core';
import { licenceFilter, renormalise } from '@voltbase/normalise';
import { EU_FIXTURES } from '../../normalise/fixtures/eu.ts';
import { INDIA_FIXTURES } from '../../normalise/fixtures/india.ts';

/** Refresh SLO for served rows: retrievedAt older than this ⇒ stale label (ADR-002 cut-to-artifact). */
export const STALE_AFTER_MS = 3_600_000; // 60 minutes

/** Servable-only snapshot built once at module load (35 rows: 27 EU + 8 IN). */
export const SERVABLE_SITES: ReadonlyArray<ChargePoint> = (() => {
  const { servable } = licenceFilter(renormalise([...EU_FIXTURES, ...INDIA_FIXTURES]));
  return servable.filter((site) => isServable(site));
})();

export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface SiteQuery {
  bbox?: BBox;
  connector?: string;
  minPower?: number;
  openOnly?: boolean;
}

/**
 * Filter-then-serve per row: narrows the servable set without merging,
 * joining, or cross-referencing OSM and non-OSM rows (ADR-003 test 1).
 */
export const filterSites = (query: SiteQuery): ChargePoint[] => {
  const connector = query.connector?.toLowerCase();
  const minPower = query.minPower;
  const bbox = query.bbox;
  const openOnly = query.openOnly === true;
  return SERVABLE_SITES.filter((site) => {
    if (openOnly && site.status !== 'AVAILABLE') return false;
    if (connector !== undefined && !site.connectors.some((c) => c.standard.toLowerCase().includes(connector))) {
      return false;
    }
    if (minPower !== undefined && !site.connectors.some((c) => c.powerKw >= minPower)) return false;
    if (bbox !== undefined && (site.lon < bbox.minLon || site.lon > bbox.maxLon || site.lat < bbox.minLat || site.lat > bbox.maxLat)) {
      return false;
    }
    return true;
  });
};

/** Servable-only lookup: closed/self rows are absent from the index ⇒ 404 at the route. */
export const findServableById = (id: string): ChargePoint | undefined =>
  SERVABLE_SITES.find((site) => site.id === id);

/** Stale label for a retrievedAt instant against a caller-supplied clock (tests inject `nowMs`). */
export const staleInfo = (
  retrievedAt: string,
  nowMs: number,
): { stale: boolean; reason?: string } => {
  const at = Date.parse(retrievedAt);
  if (Number.isNaN(at)) return { stale: true, reason: 'retrievedAt is not a valid instant' };
  if (nowMs - at > STALE_AFTER_MS) {
    return {
      stale: true,
      reason: `retrievedAt ${retrievedAt} is older than the 60min refresh SLO (serving last-good static cut)`,
    };
  }
  return { stale: false };
};

/** Unique per-partition attribution over a result set (credit preserved end-to-end, IS-03/IS-04). */
export const resultAttribution = (sites: ReadonlyArray<ChargePoint>): Attribution[] => {
  const seen = new Map<string, Attribution>();
  for (const site of sites) {
    const key = `${site.attribution.text}|${site.attribution.url ?? ''}`;
    if (!seen.has(key)) seen.set(key, site.attribution);
  }
  return [...seen.values()];
};
