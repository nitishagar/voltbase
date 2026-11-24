/**
 * S3 REST route handlers (packages/mcp/worker/routes.ts).
 *
 * Locked surface: `GET /api/v1/sites?...`, `GET /api/v1/sites/:id`,
 * `GET /api/v1/status/:id`. Every error is the single typed envelope
 * `{error:{code,message}}` (lumen rest.ts pattern). Served rows carry their
 * own attribution + provenance; the list response additionally aggregates the
 * per-partition credits (IS-03/IS-04, ADR-003).
 */
import type { Context } from 'hono';
import { MAX_POWER_KW } from '@voltbase/normalise';
import { depotFaults, faultCountsByCharger, filterSessions, type BuildDepotResult } from '@voltbase/sessions';
import { DEPOT_BUILD, DEPOT_REJECTED_COUNT, DEPOT_RETRIEVED_AT, SERVABLE_SESSIONS } from './depot.ts';
import { filterSites, findServableById, resultAttribution, staleInfo, type BBox } from './store.ts';

export type ApiErrorCode =
  | 'INVALID_ARGUMENTS'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'UPSTREAM_BLOCKED'
  | 'UPSTREAM_FAILED'
  | 'PAYLOAD_TOO_LARGE';

export const errorJson = (code: ApiErrorCode, status: number, message: string): Response =>
  Response.json({ error: { code, message } }, { status });

export interface RouteDeps {
  now: () => number;
  /** Depot build override (tests inject failure; production uses the module build). */
  depotBuild?: BuildDepotResult;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const parseLimitOffset = (
  params: URLSearchParams,
): { ok: true; limit: number; offset: number } | { ok: false; message: string } => {
  const rawLimit = params.get('limit') ?? String(DEFAULT_LIMIT);
  const rawOffset = params.get('offset') ?? '0';
  if (!/^[0-9]+$/.test(rawLimit) || !/^[0-9]+$/.test(rawOffset)) {
    return { ok: false, message: 'limit and offset must be non-negative integers' };
  }
  const limit = Number(rawLimit);
  const offset = Number(rawOffset);
  if (limit < 1 || limit > MAX_LIMIT) {
    return { ok: false, message: `limit must be between 1 and ${String(MAX_LIMIT)}` };
  }
  if (offset < 0 || offset > 100_000) {
    return { ok: false, message: 'offset must be between 0 and 100000' };
  }
  return { ok: true, limit, offset };
};

const parseBBox = (params: URLSearchParams): { ok: true; bbox?: BBox } | { ok: false; message: string } => {
  const raw = params.get('bbox');
  if (raw === null || raw === '') return { ok: true };
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return { ok: false, message: 'bbox must be four finite numbers: minLon,minLat,maxLon,maxLat' };
  }
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90 || minLon > maxLon || minLat > maxLat) {
    return { ok: false, message: 'bbox out of range (lon ±180, lat ±90) or min exceeds max' };
  }
  return { ok: true, bbox: { minLon, minLat, maxLon, maxLat } };
};

const parseOpenOnly = (params: URLSearchParams): { ok: true; openOnly: boolean } | { ok: false; message: string } => {
  const raw = params.get('openOnly');
  if (raw === null || raw === '') return { ok: true, openOnly: false };
  if (raw === 'true' || raw === '1') return { ok: true, openOnly: true };
  if (raw === 'false' || raw === '0') return { ok: true, openOnly: false };
  return { ok: false, message: 'openOnly must be true or false' };
};

/** Decodes a path id segment (`:` and `/` arrive percent-encoded from clients). */
const decodeId = (raw: string): string => {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

/** GET /api/v1/sites?bbox=&connector=&minPower=&openOnly=&limit=&offset= */
export const handleListSites = (c: Context): Response => {
  const params = new URL(c.req.url).searchParams;
  const paging = parseLimitOffset(params);
  if (!paging.ok) return errorJson('INVALID_ARGUMENTS', 400, paging.message);
  const bbox = parseBBox(params);
  if (!bbox.ok) return errorJson('INVALID_ARGUMENTS', 400, bbox.message);
  const openOnly = parseOpenOnly(params);
  if (!openOnly.ok) return errorJson('INVALID_ARGUMENTS', 400, openOnly.message);

  const rawConnector = params.get('connector');
  if (rawConnector !== null && (rawConnector.trim() === '' || rawConnector.length > 64)) {
    return errorJson('INVALID_ARGUMENTS', 400, 'connector must be a non-empty string of at most 64 chars');
  }
  const rawMinPower = params.get('minPower');
  let minPower: number | undefined;
  if (rawMinPower !== null && rawMinPower !== '') {
    minPower = Number(rawMinPower);
    if (!Number.isFinite(minPower) || minPower < 0 || minPower > MAX_POWER_KW) {
      return errorJson('INVALID_ARGUMENTS', 400, `minPower must be within 0..${String(MAX_POWER_KW)}`);
    }
  }

  const filtered = filterSites({
    ...(bbox.bbox === undefined ? {} : { bbox: bbox.bbox }),
    ...(rawConnector === null || rawConnector === '' ? {} : { connector: rawConnector }),
    ...(minPower === undefined ? {} : { minPower }),
    openOnly: openOnly.openOnly,
  });
  const data = filtered.slice(paging.offset, paging.offset + paging.limit);
  return Response.json({
    data,
    page: { limit: paging.limit, offset: paging.offset, total: filtered.length },
    attribution: resultAttribution(data),
  });
};

/** GET /api/v1/sites/:id — servable rows only; closed/self ids answer 404 (never a closed signal). */
export const handleGetSite = (c: Context): Response => {
  const raw = c.req.param('id');
  const site = raw === undefined ? undefined : findServableById(decodeId(raw));
  if (site === undefined) return errorJson('NOT_FOUND', 404, 'unknown site id');
  return Response.json({ data: site });
};

/** Depot build failed (injected in tests; static corpus keeps it ok in production). */
const depotFailed = (deps: RouteDeps): boolean => !(deps.depotBuild ?? DEPOT_BUILD).ok;

/** GET /api/v1/depot/sessions?chargerRef=&dialect=&openOnly=&limit=&offset= */
export const handleListDepotSessions = (c: Context, deps: RouteDeps): Response => {
  if (depotFailed(deps)) return errorJson('UPSTREAM_FAILED', 503, 'depot corpus is empty');
  const params = new URL(c.req.url).searchParams;
  const paging = parseLimitOffset(params);
  if (!paging.ok) return errorJson('INVALID_ARGUMENTS', 400, paging.message);
  const openOnly = parseOpenOnly(params);
  if (!openOnly.ok) return errorJson('INVALID_ARGUMENTS', 400, openOnly.message);

  const rawCharger = params.get('chargerRef');
  if (rawCharger !== null && (rawCharger.trim() === '' || rawCharger.length > 64)) {
    return errorJson('INVALID_ARGUMENTS', 400, 'chargerRef must be a non-empty string of at most 64 chars');
  }
  const rawDialect = params.get('dialect');
  if (rawDialect !== null && rawDialect !== '' && rawDialect !== 'ocpp1.6' && rawDialect !== 'ocpp2.0.1') {
    return errorJson('INVALID_ARGUMENTS', 400, 'dialect must be ocpp1.6 or ocpp2.0.1');
  }

  const filtered = filterSessions(SERVABLE_SESSIONS, {
    ...(rawCharger === null || rawCharger === '' ? {} : { chargerRef: rawCharger }),
    ...(rawDialect === null || rawDialect === '' ? {} : { dialect: rawDialect as 'ocpp1.6' | 'ocpp2.0.1' }),
    openOnly: openOnly.openOnly,
  });
  const data = filtered.slice(paging.offset, paging.offset + paging.limit);
  const info = staleInfo(DEPOT_RETRIEVED_AT, deps.now());
  return Response.json({
    data,
    page: { limit: paging.limit, offset: paging.offset, total: filtered.length },
    attribution: resultAttribution(data),
    meta: { rejectedCount: DEPOT_REJECTED_COUNT },
    stale: info.stale,
    ...(info.reason === undefined ? {} : { staleReason: info.reason }),
  });
};

/** GET /api/v1/depot/faults?chargerRef=&limit= — fault rows + per-charger counts. */
export const handleListDepotFaults = (c: Context, deps: RouteDeps): Response => {
  if (depotFailed(deps)) return errorJson('UPSTREAM_FAILED', 503, 'depot corpus is empty');
  const params = new URL(c.req.url).searchParams;
  if (params.get('offset') !== null) {
    return errorJson('INVALID_ARGUMENTS', 400, 'offset is not supported on faults (limit only)');
  }
  const paging = parseLimitOffset(params);
  if (!paging.ok) return errorJson('INVALID_ARGUMENTS', 400, paging.message);

  const rawCharger = params.get('chargerRef');
  if (rawCharger !== null && (rawCharger.trim() === '' || rawCharger.length > 64)) {
    return errorJson('INVALID_ARGUMENTS', 400, 'chargerRef must be a non-empty string of at most 64 chars');
  }

  const filtered = depotFaults(SERVABLE_SESSIONS, rawCharger === null || rawCharger === '' ? undefined : rawCharger);
  const data = filtered.slice(0, paging.limit);
  const info = staleInfo(DEPOT_RETRIEVED_AT, deps.now());
  return Response.json({
    data,
    counts: faultCountsByCharger(filtered),
    page: { limit: paging.limit, offset: 0, total: filtered.length },
    attribution: resultAttribution(data),
    meta: { rejectedCount: DEPOT_REJECTED_COUNT },
    stale: info.stale,
    ...(info.reason === undefined ? {} : { staleReason: info.reason }),
  });
};

/** GET /api/v1/status/:id — live status + stale label against the refresh SLO. */
export const handleGetStatus = (c: Context, deps: RouteDeps): Response => {
  const raw = c.req.param('id');
  const site = raw === undefined ? undefined : findServableById(decodeId(raw));
  if (site === undefined) return errorJson('NOT_FOUND', 404, 'unknown site id');
  const info = staleInfo(site.provenance.retrievedAt, deps.now());
  return Response.json({
    data: {
      id: site.id,
      status: site.status,
      retrievedAt: site.provenance.retrievedAt,
      source: site.source,
      stale: info.stale,
      ...(info.reason === undefined ? {} : { staleReason: info.reason }),
      attribution: site.attribution,
    },
  });
};
