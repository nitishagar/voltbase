/**
 * @voltbase/normalise (S2) — feed mappers OCM / OSM / OCPI 2.2.1 / DATEX II
 * into `@voltbase/core` rows, plus the licence filter and validators.
 *
 * Licence boundary (ADR-003, IS-03): unknown licence ⇒ CLOSED, never served.
 * OCM enforces `opendata=true` (non-open rows arrive CLOSED) and maps
 * provider-copyright rows to CLOSED. OSM rows come from extract objects only
 * (never live Overpass). Feed order + per-feed licences per ADR-002.
 *
 * Determinism: row ids come from `stableId()` (source + native key) and the
 * default `retrievedAt` is a fixed constant, so `renormalise()` is idempotent:
 * same input ⇒ byte-identical output. No remote fetch, no clock reads on the
 * default path.
 */
import {
  isServable,
  stableId,
  type ChargePoint,
  type Connector,
  type Licence,
  type Source,
  type Status,
} from '@voltbase/core';

export const NORMALISE_PACKAGE = '@voltbase/normalise';

/** Fixed default retrieved-at so re-normalise stays idempotent without a clock. */
export const DEFAULT_RETRIEVED_AT = '2026-09-14T00:00:00.000Z';

export const MAX_CONNECTORS_PER_SITE = 16;
export const MAX_NAME_CHARS = 280;
export const MAX_POWER_KW = 2000;

/** Typed mapper failure: structurally malformed input (never a licence outcome). */
export class NormaliseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'NormaliseError';
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Input shapes (minimal raw-record views per feed, ADR-002 evidence). */
/* ------------------------------------------------------------------ */

/** Open Charge Map POI view. `isOpenData` mirrors the `opendata=true` filter. */
export interface OcmPoiInput {
  id: string | number;
  lat: number;
  lon: number;
  title?: string;
  countryCode?: string;
  /** False ⇒ row was fetched outside the open-data filter ⇒ CLOSED. */
  isOpenData: boolean;
  /** True for provider © rows (provider terms, not CC BY) ⇒ CLOSED. */
  providerCopyrighted?: boolean;
  dataProviderTitle?: string;
  operatorTitle?: string;
  /** Raw licence hint; unrecognised ⇒ UNKNOWN ⇒ CLOSED by the filter. */
  licenceHint?: string;
  retrievedAt?: string;
  status?: string;
  connections?: ReadonlyArray<{ powerKw?: number; connectorType?: string }>;
}

/** OSM node view from a licensed extract (Geofabrik/planet, never Overpass). */
export interface OsmNodeInput {
  id: string | number;
  lat: number;
  lon: number;
  countryCode?: string;
  name?: string;
  retrievedAt?: string;
  tags?: Readonly<Record<string, string>>;
}

/** NL NDW OCPI 2.2.1 location view (CC0 site-wide, ADR-002). */
export interface OcpiLocationInput {
  uid: string | number;
  countryCode: string;
  city?: string;
  operatorName?: string;
  coordinates: { latitude: number; longitude: number };
  retrievedAt?: string;
  evses?: ReadonlyArray<{
    evseId: string;
    status?: string;
    connectors?: ReadonlyArray<{ standard?: string; maxElectricPower?: number }>;
  }>;
}

/**
 * Generic NAP DATEX II station view. Covers LU Chargy KML rows (CC0),
 * FR IRVE rows (Etalab-2.0) and the LU second multi-operator set whose
 * licence is "Not Specified" (⇒ UNKNOWN ⇒ CLOSED until cleared, ADR-002).
 */
export interface Datex2StationInput {
  stationId: string | number;
  countryCode: string;
  name?: string;
  lat: number;
  lon: number;
  operatorName?: string;
  /** Publishing programme, e.g. `'Chargy'`, `'IRVE'`. Preserved in attribution. */
  publisher: string;
  /** Dataset page URL, e.g. data.public.lu / transport.data.gouv.fr. */
  datasetUrl?: string;
  /** Raw dataset licence string; unrecognised ⇒ UNKNOWN. */
  datasetLicence: string;
  retrievedAt?: string;
  status?: string;
  connectors?: ReadonlyArray<{ type?: string; powerKw?: number }>;
}

export type NormaliseInput =
  | { kind: 'ocm'; record: OcmPoiInput }
  | { kind: 'osm'; record: OsmNodeInput }
  | { kind: 'ocpi'; record: OcpiLocationInput }
  | { kind: 'datex2'; record: Datex2StationInput };

/* ------------------------------------------------------------------ */
/* Licence mapping: unknown ⇒ UNKNOWN (the filter below closes it).    */
/* ------------------------------------------------------------------ */

const LICENCE_ALIASES: ReadonlyArray<readonly [string, Licence]> = [
  ['cc0-1.0', 'CC0-1.0'],
  ['cc0 1.0', 'CC0-1.0'],
  ['cc0', 'CC0-1.0'],
  ['creativecommons zero', 'CC0-1.0'],
  ['etalab-2.0', 'Etalab-2.0'],
  ['etalab 2.0', 'Etalab-2.0'],
  ['etalab', 'Etalab-2.0'],
  ['licence ouverte', 'Etalab-2.0'],
  ['cc-by-4.0', 'CC-BY-4.0'],
  ['cc by 4.0', 'CC-BY-4.0'],
  ['cc by', 'CC-BY-4.0'],
  ['odbl-1.0', 'ODbL-1.0'],
  ['odbl 1.0', 'ODbL-1.0'],
  ['odbl', 'ODbL-1.0'],
  ['closed', 'CLOSED'],
  ['not-specified', 'UNKNOWN'],
  ['not specified', 'UNKNOWN'],
  ['unspecified', 'UNKNOWN'],
];

/** Map a raw licence string to the core union; unrecognised ⇒ UNKNOWN. */
export function normaliseLicence(raw: unknown): Licence {
  if (typeof raw !== 'string') return 'UNKNOWN';
  const key = raw.trim().toLowerCase().replace(/[_/]+/g, '-').replace(/\s+/g, ' ');
  if (key === '') return 'UNKNOWN';
  for (const [alias, licence] of LICENCE_ALIASES) {
    if (key === alias) return licence;
  }
  return 'UNKNOWN';
}

/* ------------------------------------------------------------------ */
/* Small guards (throw NormaliseError on structurally malformed input). */
/* ------------------------------------------------------------------ */

function requireRecord(input: unknown, what: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new NormaliseError('MALFORMED', `${what}: expected an object record`);
  }
  return input as Record<string, unknown>;
}

function requireNativeId(value: unknown, what: string): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new NormaliseError('MALFORMED', `${what}: missing id`);
  }
  const id = String(value).trim();
  if (id === '') throw new NormaliseError('MALFORMED', `${what}: empty id`);
  return id;
}

function requireCoords(lat: unknown, lon: unknown, what: string): { lat: number; lon: number } {
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new NormaliseError('MALFORMED', `${what}: missing or non-finite coordinates`);
  }
  return { lat, lon };
}

function cutOf(countryCode: unknown, fallback: string): string {
  if (typeof countryCode === 'string' && /^[A-Za-z]{2}$/.test(countryCode.trim())) {
    return countryCode.trim().toUpperCase();
  }
  return fallback;
}

function retrievedAtOf(value: unknown): string {
  if (typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return DEFAULT_RETRIEVED_AT;
}

function connectorOf(standard: unknown, powerKw: unknown, fallbackStandard: string): Connector {
  const label = typeof standard === 'string' && standard.trim() !== '' ? standard.trim().slice(0, 64) : fallbackStandard;
  const power = typeof powerKw === 'number' && Number.isFinite(powerKw) ? powerKw : 0;
  return { standard: label, powerKw: power };
}

function statusOf(raw: unknown): Status {
  if (typeof raw !== 'string') return 'UNKNOWN';
  const key = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (key === 'AVAILABLE') return 'AVAILABLE';
  if (key === 'OCCUPIED' || key === 'BLOCKED' || key === 'INUSE') return 'OCCUPIED';
  if (key === 'OUTOFORDER' || key === 'OUTOFSERVICE' || key === 'FAULTED' || key === 'UNAVAILABLE') {
    return 'OUT_OF_SERVICE';
  }
  return 'UNKNOWN';
}

/* ------------------------------------------------------------------ */
/* Mappers (one per source; licence enforced here, closed rows kept for */
/* audit but never servable).                                          */
/* ------------------------------------------------------------------ */

/**
 * OCM → core. Enforces `opendata=true`: rows outside the open filter and
 * provider-copyright rows are emitted CLOSED (kept for audit, never served).
 */
export function mapOcmPoi(input: OcmPoiInput): ChargePoint {
  const record = requireRecord(input, 'ocm');
  const nativeId = requireNativeId(record['id'], 'ocm');
  const { lat, lon } = requireCoords(record['lat'], record['lon'], 'ocm');
  const source: Source = 'OCM';
  const isOpenData = record['isOpenData'] === true;
  const providerCopyrighted = record['providerCopyrighted'] === true;
  const hint = typeof record['licenceHint'] === 'string' ? (record['licenceHint'] as string) : undefined;
  let licence: Licence;
  if (providerCopyrighted || !isOpenData) {
    licence = 'CLOSED';
  } else {
    licence = normaliseLicence(hint ?? 'CC-BY-4.0');
  }
  const operatorTitle = typeof record['operatorTitle'] === 'string' ? (record['operatorTitle'] as string).trim() : '';
  const providerTitle =
    typeof record['dataProviderTitle'] === 'string' ? (record['dataProviderTitle'] as string).trim() : '';
  const title = typeof record['title'] === 'string' ? (record['title'] as string).trim() : '';
  const rawConnections = Array.isArray(record['connections'])
    ? (record['connections'] as ReadonlyArray<{ powerKw?: number; connectorType?: string }>)
    : [];
  const connectors = rawConnections.map((c) => connectorOf(c.connectorType, c.powerKw, 'Type 2'));
  return {
    id: stableId(source, nativeId),
    featureType: 'ChargePoint',
    regionalCut: cutOf(record['countryCode'], 'XX'),
    source,
    licence,
    providerCopyrighted,
    name: title !== '' ? title.slice(0, MAX_NAME_CHARS) : `OCM ${nativeId}`.slice(0, MAX_NAME_CHARS),
    lat,
    lon,
    connectors: connectors.length > 0 ? connectors : [{ standard: 'Type 2', powerKw: 0 }],
    status: statusOf(record['status']),
    attribution: {
      text: operatorTitle !== '' ? `${operatorTitle} (via Open Charge Map)` : (providerTitle !== '' ? providerTitle : 'Open Charge Map contributors'),
      url: 'https://openchargemap.io',
    },
    provenance: {
      source,
      retrievedAt: retrievedAtOf(record['retrievedAt']),
      attribution: {
        text: operatorTitle !== '' ? `${operatorTitle} (via Open Charge Map)` : (providerTitle !== '' ? providerTitle : 'Open Charge Map contributors'),
        url: 'https://openchargemap.io',
      },
    },
  };
}

/** OSM extract node → core. Always ODbL-1.0 with contributor attribution. */
export function mapOsmNode(input: OsmNodeInput): ChargePoint {
  const record = requireRecord(input, 'osm');
  const nativeId = requireNativeId(record['id'], 'osm');
  const { lat, lon } = requireCoords(record['lat'], record['lon'], 'osm');
  const source: Source = 'OSM';
  const tags = (
    typeof record['tags'] === 'object' && record['tags'] !== null && !Array.isArray(record['tags'])
      ? (record['tags'] as Record<string, string>)
      : {}
  ) as Readonly<Record<string, string>>;
  const tagName = tags['name'];
  const explicitName = typeof record['name'] === 'string' ? (record['name'] as string).trim() : '';
  const name = (typeof tagName === 'string' && tagName.trim() !== '' ? tagName.trim() : explicitName) || `OSM ${nativeId}`;
  const socketTag = tags['socket'];
  const capacityTag = tags['capacity'];
  const capacity = typeof capacityTag === 'string' ? Number(capacityTag) : NaN;
  return {
    id: stableId(source, nativeId),
    featureType: 'ChargePoint',
    regionalCut: cutOf(record['countryCode'], 'XX'),
    source,
    licence: 'ODbL-1.0',
    providerCopyrighted: false,
    name: name.slice(0, MAX_NAME_CHARS),
    lat,
    lon,
    connectors: [connectorOf(socketTag, Number.isFinite(capacity) ? capacity : 0, 'unknown')],
    status: 'UNKNOWN',
    attribution: {
      text: '© OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org/copyright',
    },
    provenance: {
      source,
      retrievedAt: retrievedAtOf(record['retrievedAt']),
      attribution: {
        text: '© OpenStreetMap contributors',
        url: 'https://www.openstreetmap.org/copyright',
      },
    },
  };
}

/** NL NDW OCPI 2.2.1 location → core (CC0-1.0, NDW attribution). */
export function mapOcpiLocation(input: OcpiLocationInput): ChargePoint {
  const record = requireRecord(input, 'ocpi');
  const nativeId = requireNativeId(record['uid'], 'ocpi');
  const coords = requireRecord(record['coordinates'], 'ocpi.coordinates');
  const { lat, lon } = requireCoords(coords['latitude'], coords['longitude'], 'ocpi.coordinates');
  const source: Source = 'OCPI';
  const operatorName =
    typeof record['operatorName'] === 'string' && (record['operatorName'] as string).trim() !== ''
      ? ((record['operatorName'] as string).trim())
      : 'NDW';
  const city = typeof record['city'] === 'string' ? (record['city'] as string).trim() : '';
  const rawEvses = Array.isArray(record['evses'])
    ? (record['evses'] as NonNullable<OcpiLocationInput['evses']>)
    : [];
  const connectors: Connector[] = [];
  let status: Status = 'UNKNOWN';
  for (const evse of rawEvses) {
    const evseStatus = statusOf(evse.status);
    if (status === 'UNKNOWN' && evseStatus !== 'UNKNOWN') status = evseStatus;
    const rawConnectors = Array.isArray(evse.connectors) ? evse.connectors : [];
    for (const c of rawConnectors) {
      connectors.push(connectorOf(c.standard, c.maxElectricPower, 'IEC_62196_T2'));
    }
  }
  return {
    id: stableId(source, nativeId),
    featureType: 'ChargePoint',
    regionalCut: cutOf(record['countryCode'], 'XX'),
    source,
    licence: 'CC0-1.0',
    providerCopyrighted: false,
    name: (city !== '' ? `${operatorName} ${city}` : `${operatorName} ${nativeId}`).slice(0, MAX_NAME_CHARS),
    lat,
    lon,
    connectors: connectors.length > 0 ? connectors : [{ standard: 'IEC_62196_T2', powerKw: 0 }],
    status,
    attribution: {
      text: `${operatorName} (opendata.ndw.nu)`,
      url: 'https://opendata.ndw.nu',
    },
    provenance: {
      source,
      retrievedAt: retrievedAtOf(record['retrievedAt']),
      attribution: {
        text: `${operatorName} (opendata.ndw.nu)`,
        url: 'https://opendata.ndw.nu',
      },
    },
  };
}

/**
 * NAP DATEX II station → core. The dataset licence decides the row licence;
 * "Not Specified" and anything unrecognised ⇒ UNKNOWN (closed by the filter
 * until the licence is cleared — ADR-002 LU second-set ticket).
 */
export function mapDatex2Station(input: Datex2StationInput): ChargePoint {
  const record = requireRecord(input, 'datex2');
  const nativeId = requireNativeId(record['stationId'], 'datex2');
  const { lat, lon } = requireCoords(record['lat'], record['lon'], 'datex2');
  const source: Source = 'DATEX2';
  const publisher =
    typeof record['publisher'] === 'string' && (record['publisher'] as string).trim() !== ''
      ? ((record['publisher'] as string).trim())
      : 'unknown-publisher';
  const datasetUrl = typeof record['datasetUrl'] === 'string' ? (record['datasetUrl'] as string).trim() : '';
  const operatorName =
    typeof record['operatorName'] === 'string' && (record['operatorName'] as string).trim() !== ''
      ? ((record['operatorName'] as string).trim())
      : publisher;
  const rawConnectors = Array.isArray(record['connectors'])
    ? (record['connectors'] as NonNullable<Datex2StationInput['connectors']>)
    : [];
  const connectors = rawConnectors.map((c) => connectorOf(c.type, c.powerKw, 'Type 2'));
  const name =
    typeof record['name'] === 'string' && (record['name'] as string).trim() !== ''
      ? ((record['name'] as string).trim())
      : `${publisher} ${nativeId}`;
  return {
    id: stableId(source, nativeId),
    featureType: 'ChargePoint',
    regionalCut: cutOf(record['countryCode'], 'XX'),
    source,
    licence: normaliseLicence(record['datasetLicence']),
    providerCopyrighted: false,
    name: name.slice(0, MAX_NAME_CHARS),
    lat,
    lon,
    connectors: connectors.length > 0 ? connectors : [{ standard: 'Type 2', powerKw: 0 }],
    status: statusOf(record['status']),
    attribution: {
      text: `${operatorName} (via ${publisher})`,
      ...(datasetUrl !== '' ? { url: datasetUrl } : {}),
    },
    provenance: {
      source,
      retrievedAt: retrievedAtOf(record['retrievedAt']),
      attribution: {
        text: `${operatorName} (via ${publisher})`,
        ...(datasetUrl !== '' ? { url: datasetUrl } : {}),
      },
    },
  };
}

/** Deterministic dispatch over a mixed feed batch (same input ⇒ same output). */
export function renormalise(inputs: readonly NormaliseInput[]): ChargePoint[] {
  return inputs.map((item) => {
    switch (item.kind) {
      case 'ocm':
        return mapOcmPoi(item.record);
      case 'osm':
        return mapOsmNode(item.record);
      case 'ocpi':
        return mapOcpiLocation(item.record);
      case 'datex2':
        return mapDatex2Station(item.record);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Validators (data quality; licence servability stays in `isServable`). */
/* ------------------------------------------------------------------ */

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

/** Semantic checks on a built row. Empty ⇒ row is well-formed. */
export function validateChargePoint(site: ChargePoint): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (site.id.trim() === '') {
    issues.push({ field: 'id', code: 'EMPTY_ID', message: 'id must be non-empty' });
  }
  if (!/^[A-Z]{2}$/.test(site.regionalCut)) {
    issues.push({
      field: 'regionalCut',
      code: 'BAD_REGIONAL_CUT',
      message: 'regionalCut must be a 2-letter uppercase country code',
    });
  }
  if (
    !Number.isFinite(site.lat) ||
    !Number.isFinite(site.lon) ||
    site.lat < -90 ||
    site.lat > 90 ||
    site.lon < -180 ||
    site.lon > 180
  ) {
    issues.push({ field: 'location', code: 'BAD_COORDINATES', message: 'lat must be within ±90, lon within ±180' });
  }
  if (site.name.length > MAX_NAME_CHARS) {
    issues.push({
      field: 'name',
      code: 'NAME_TOO_LONG',
      message: `name must be at most ${String(MAX_NAME_CHARS)} chars`,
    });
  }
  if (site.connectors.length === 0) {
    issues.push({ field: 'connectors', code: 'EMPTY_CONNECTORS', message: 'at least one connector is required' });
  }
  if (site.connectors.length > MAX_CONNECTORS_PER_SITE) {
    issues.push({
      field: 'connectors',
      code: 'TOO_MANY_CONNECTORS',
      message: `at most ${String(MAX_CONNECTORS_PER_SITE)} connectors per site`,
    });
  }
  site.connectors.forEach((connector, index) => {
    if (connector.standard.trim() === '') {
      issues.push({
        field: `connectors[${String(index)}].standard`,
        code: 'EMPTY_CONNECTOR_STANDARD',
        message: 'connector standard must be non-empty',
      });
    }
    if (!Number.isFinite(connector.powerKw) || connector.powerKw < 0 || connector.powerKw > MAX_POWER_KW) {
      issues.push({
        field: `connectors[${String(index)}].powerKw`,
        code: 'BAD_POWER_KW',
        message: `powerKw must be within 0..${String(MAX_POWER_KW)}`,
      });
    }
  });
  if (typeof site.provenance.retrievedAt !== 'string' || Number.isNaN(Date.parse(site.provenance.retrievedAt))) {
    issues.push({
      field: 'provenance.retrievedAt',
      code: 'BAD_RETRIEVED_AT',
      message: 'retrievedAt must be an ISO-8601 instant',
    });
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Licence filter: unknown ⇒ closed, then split servable / closed.     */
/* ------------------------------------------------------------------ */

/** Close UNKNOWN licences in place-value (returns a copy, input untouched). */
export function closeUnknownLicence(site: ChargePoint): ChargePoint {
  if (site.licence !== 'UNKNOWN') return site;
  return { ...site, licence: 'CLOSED' };
}

/**
 * Apply the licence boundary to a batch: UNKNOWN rows become CLOSED, then
 * the batch splits into servable vs closed via `isServable()`.
 */
export function licenceFilter(sites: readonly ChargePoint[]): {
  servable: ChargePoint[];
  closed: ChargePoint[];
} {
  const servable: ChargePoint[] = [];
  const closed: ChargePoint[] = [];
  for (const site of sites) {
    const row = closeUnknownLicence(site);
    if (isServable(row)) servable.push(row);
    else closed.push(row);
  }
  return { servable, closed };
}
