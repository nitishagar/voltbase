/**
 * @voltbase/core (S2) — domain types for the partitioned Collective index.
 *
 * Every row carries the ADR-003 partition key
 * `(feature_type, regional_cut, source, licence)`. v0.1 regional cuts are
 * country-level ISO-3166 codes (coarse and defensible). Within one
 * `(feature_type, regional_cut)` partition, served rows are all-OSM or
 * all-non-OSM; mixing would re-classify the index as a Derivative Database.
 * Unknown licences are treated as closed and never served (IS-03).
 */
export const CORE_PACKAGE = '@voltbase/core';

/** Per-row licence. UNKNOWN rows are closed by the licence filter. */
export type Licence = 'CC0-1.0' | 'Etalab-2.0' | 'CC-BY-4.0' | 'ODbL-1.0' | 'CLOSED' | 'UNKNOWN';

/** Ingest source. One mapper per source in `@voltbase/normalise`. */
export type Source = 'OCM' | 'OSM' | 'OCPI' | 'DATEX2';

/** v0.1 serves a single feature type (ADR-003 test 2 granularity). */
export type FeatureType = 'ChargePoint';

/** Country-level regional cut, e.g. `'NL'`. Validated, not branded. */
export type RegionalCut = string;

/** Served status values (feed-specific strings are mapped, never passed through). */
export type Status = 'AVAILABLE' | 'OCCUPIED' | 'OUT_OF_SERVICE' | 'UNKNOWN';

export interface Connector {
  /** Connector standard label, e.g. `'CCS2'`, `'Type 2'`, `'CHAdeMO'`. */
  standard: string;
  /** Nameplate power in kW. Must be finite and >= 0 (validators enforce). */
  powerKw: number;
}

export interface Attribution {
  /** End-user visible credit, preserved end-to-end (IS-03/IS-04). */
  text: string;
  url?: string;
}

export interface Provenance {
  source: Source;
  /** ISO-8601 retrieval timestamp (IS-04: source + retrieved-at on every row). */
  retrievedAt: string;
  attribution: Attribution;
}

export interface ChargePoint {
  /** Deterministic id: `<SOURCE>:<native key>` via `stableId()`. */
  id: string;
  featureType: FeatureType;
  /** Country-level cut, e.g. `'NL'`, `'IN'`. */
  regionalCut: string;
  source: Source;
  licence: Licence;
  /**
   * True for OCM provider-copyright rows (provider terms, not open terms).
   * Such rows are never servable even if `licence` looks open.
   */
  providerCopyrighted: boolean;
  name: string;
  lat: number;
  lon: number;
  connectors: Connector[];
  status: Status;
  attribution: Attribution;
  provenance: Provenance;
}

/** ADR-003 partition key tuple: `(feature_type, regional_cut, source, licence)`. */
export type PartitionKey = readonly [FeatureType, string, Source, Licence];

/** Partition key tuple for a row (stable field order, no serialisation). */
export function partitionKey(site: ChargePoint): PartitionKey {
  return [site.featureType, site.regionalCut, site.source, site.licence];
}

/** Delimited partition key for use as a map key or log label. */
export function partitionKeyString(site: ChargePoint): string {
  return `${site.featureType}|${site.regionalCut}|${site.source}|${site.licence}`;
}

/**
 * Serve gate (IS-03): UNKNOWN / CLOSED / provider-copyright rows are never
 * served. Validators (in `@voltbase/normalise`) handle data quality; this
 * function handles licence boundary only.
 */
export function isServable(site: Pick<ChargePoint, 'licence' | 'providerCopyrighted'>): boolean {
  if (site.providerCopyrighted) return false;
  return site.licence !== 'UNKNOWN' && site.licence !== 'CLOSED';
}

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

/**
 * Random time-ordered ULID (128 bit: 48-bit ms time + 80-bit randomness).
 * Mappers do NOT use this for row ids (ids must be deterministic via
 * `stableId()`); it exists for run ids / future write paths.
 */
export function createUlid(nowMs: number = Date.now()): string {
  let time = Math.floor(nowMs);
  if (!Number.isFinite(time) || time < 0) time = 0;
  if (time > 0xffffffffffff) time = 0xffffffffffff;
  const timeChars = new Array<string>(10);
  for (let i = 9; i >= 0; i -= 1) {
    timeChars[i] = ULID_ALPHABET[time % 32] ?? '0';
    time = Math.floor(time / 32);
  }
  const rand = new Uint8Array(10);
  globalThis.crypto.getRandomValues(rand);
  let value = 0n;
  for (const byte of rand) value = (value << 8n) | BigInt(byte);
  const randChars = new Array<string>(16);
  for (let i = 15; i >= 0; i -= 1) {
    randChars[i] = ULID_ALPHABET[Number(value & 31n)] ?? '0';
    value >>= 5n;
  }
  return timeChars.join('') + randChars.join('');
}

/** True for canonical 26-char Crockford ULIDs (first char 0-7: 48-bit time). */
export function isUlid(value: string): boolean {
  return ULID_RE.test(value);
}

/** Milliseconds since epoch encoded in the first 10 ULID chars. Throws RangeError when invalid. */
export function parseUlidTime(ulid: string): number {
  if (!isUlid(ulid)) throw new RangeError(`invalid ULID: ${ulid.slice(0, 32)}`);
  let time = 0;
  for (let i = 0; i < 10; i += 1) {
    time = time * 32 + (ULID_ALPHABET.indexOf(ulid[i] ?? '') & 31);
  }
  return time;
}

/** ISO-8601 UTC instant for a Date or epoch ms (IS-04 retrieved-at shape). */
export function toIsoTime(value: Date | number): string {
  return new Date(value).toISOString();
}

/** True for strings that round-trip through Date parsing (non-empty, valid). */
export function isIsoTime(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  return !Number.isNaN(Date.parse(value));
}

/**
 * Deterministic row id: `<SOURCE>:<normalised native key>`. Same input key
 * always yields the same id, so re-normalise is idempotent by construction
 * (ADR-003 test 1: source-prefixed ids can never cross-reference OSM rows).
 */
export function stableId(source: Source, nativeKey: string | number): string {
  const key = String(nativeKey).trim().replace(/\s+/g, ' ').slice(0, 64);
  return `${source}:${key.length === 0 ? 'unknown' : key}`;
}
