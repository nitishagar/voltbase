/**
 * `buildMcpServer` — the ONE MCP composition root (S4).
 *
 * stdio (CLI `voltbase mcp`) and HTTP (`POST /mcp` via `createMcpHandler`)
 * are composition roots over this same factory; the tool set is identical on
 * both transports (IS-07). Tools read the in-memory fixture index
 * (`worker/store.ts`, servable-only); v0.1 performs no fetch — the
 * allowlisted/capping fetch seam (`worker/guards.ts`) is the only outbound
 * path and is unused here. Per-request BYOK isolation (IS-05): the OCM key
 * VALUE arrives per call in `deps.ocmKey` (headers/env NAME resolved at the
 * composition root per request); handlers use it for nothing except the
 * `byokConfigured` boolean and never log, store, or echo the value.
 *
 * Results are JSON-in-text; unknown args ⇒ typed `INVALID_ARGUMENTS`
 * (zod 4.6.5 strictObject at the wire + handler-side strictArgs guard);
 * closed/self ids ⇒ typed `NOT_FOUND` (never a closed signal, ADR-003);
 * `voltbase_reliability` serves S6 uptime rollups on BOTH runtimes from the
 * in-memory fixture index + the read-only prebuilt cut — there is no
 * honestly remote-lacking compute, so S6 removes the S4/S5 LOCAL_ONLY lane
 * (documented here instead of kept). Every served payload carries
 * attribution + provenance (IS-04); list responses additionally aggregate
 * per-partition credits.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MAX_POWER_KW } from '@voltbase/normalise';
import { WriteBudget, getReliability } from '@voltbase/providers';
import {
  filterSites,
  findServableById,
  resultAttribution,
  staleInfo,
  type BBox,
} from '../worker/store.ts';
import { validatePublicHttpUrl } from '../worker/guards.ts';
import { z } from 'zod';

/** Per-request deps: fresh object per call, never shared across requests. */
export interface McpDeps {
  /** Clock for stale/after comparisons (tests inject a fixed clock). */
  now: () => number;
  /** BYOK OCM key VALUE snapshot for this request only (never logged/echoed). */
  ocmKey?: string;
  /** `local` = CLI stdio (full compute); `remote` = Worker HTTP (no local compute). */
  runtime: 'local' | 'remote';
}

/** The four locked tool names (IS-07: identical on stdio and HTTP). */
export const TOOL_NAMES = [
  'voltbase_search_sites',
  'voltbase_site_detail',
  'voltbase_status',
  'voltbase_reliability',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** Argument keys each handler accepts (strictArgs guard truth). */
export const ALLOWED_ARGS: Record<ToolName, readonly string[]> = {
  voltbase_search_sites: ['bbox', 'connector', 'minPower', 'openOnly', 'limit', 'offset'],
  voltbase_site_detail: ['id'],
  voltbase_status: ['id', 'after'],
  voltbase_reliability: ['id'],
};

export const searchSitesSchema = z.strictObject({
  bbox: z.string().max(128).optional(),
  connector: z.string().max(64).optional(),
  minPower: z.number().min(0).max(MAX_POWER_KW).optional(),
  openOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(100_000).default(0),
});

export const siteDetailSchema = z.strictObject({
  id: z.string().min(1).max(128),
});

export const statusSchema = z.strictObject({
  id: z.string().min(1).max(128),
  after: z.string().max(64).optional(),
});

export const reliabilitySchema = z.strictObject({
  id: z.string().min(1).max(128),
});

const text = (payload: unknown): CallToolResult['content'] => [
  { type: 'text', text: JSON.stringify(payload) },
];
const ok = (payload: unknown): CallToolResult => ({ content: text(payload) });
const err = (payload: object): CallToolResult => ({ isError: true, content: text(payload) });

interface StrictViolation {
  code: 'INVALID_ARGUMENTS';
  message: string;
}

const strictArgs = (args: Readonly<Record<string, unknown>>, allowed: readonly string[]): StrictViolation | null => {
  const unknownKeys = Object.keys(args).filter((k) => !allowed.includes(k));
  if (unknownKeys.length === 0) return null;
  return {
    code: 'INVALID_ARGUMENTS',
    message: `unknown argument(s): ${unknownKeys.join(', ')} — allowed: ${allowed.join(', ')}`,
  };
};

const invalid = (message: string): CallToolResult => err({ code: 'INVALID_ARGUMENTS', message });

const parseBBoxArg = (raw: string | undefined): { ok: true; bbox?: BBox } | { ok: false; message: string } => {
  if (raw === undefined || raw === '') return { ok: true };
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

const byokConfigured = (deps: McpDeps): boolean => deps.ocmKey !== undefined && deps.ocmKey !== '';

const SEARCH_DESC =
  'Search servable EV charging sites (fixture index): bbox as "minLon,minLat,maxLon,maxLat", ' +
  'connector substring (case-insensitive), minPower kW floor, openOnly (AVAILABLE only), limit/offset pagination. ' +
  'Attribution preserved per partition.';
const DETAIL_DESC = 'Detail for one servable site id (e.g. "OCM:900000"). Closed/self ids answer typed NOT_FOUND.';
const STATUS_DESC =
  'Live status for one site id with stale label (60min SLO). Optional after= (ISO instant): ' +
  'newer-only polling — returns newer:false when the row is not newer than after.';
const RELIABILITY_DESC =
  'Per-site reliability rollups (S6 change journal + trailing-24h uptime, stale-labelled). ' +
  'Served on both transports from the fixture index + prebuilt cut; exhausted budget answers typed UPSTREAM_FAILED with the cut.';

export const buildMcpServer = (deps: McpDeps): McpServer => {
  const server = new McpServer({ name: 'voltbase', version: '0.1.0' });
  // Runtime note: the installed SDK validates these zod 4.6.5 schemas via
  // duck-typing (`normalizeObjectSchema`); the `as unknown as AnySchema`
  // bridge documents the 4.6.5-direct vs SDK-bundled zod type-identity skew
  // (lumen parity: same cast style as its v1→v2 Server bridge). Handlers
  // re-narrow `args` through `z.infer` — no `any` anywhere.

  server.registerTool(
    'voltbase_search_sites',
    {
      title: 'Search sites',
      description: SEARCH_DESC,
      inputSchema: searchSitesSchema as unknown as AnySchema,
    },
    async (args: unknown) => {
      const a = args as unknown as z.infer<typeof searchSitesSchema>;
      const violation = strictArgs(a as Readonly<Record<string, unknown>>, ALLOWED_ARGS.voltbase_search_sites);
      if (violation !== null) return err(violation);
      const bbox = parseBBoxArg(a.bbox);
      if (!bbox.ok) return invalid(bbox.message);
      if (a.connector !== undefined && (a.connector.trim() === '' || a.connector.length > 64)) {
        return invalid('connector must be a non-empty string of at most 64 chars');
      }
      // URL/host guard reuse: connector is a label, never a URL — a URL-like
      // value is validated through the public-URL guard and refused as typed.
      if (a.connector !== undefined && a.connector.includes('://')) {
        const guard = validatePublicHttpUrl(a.connector);
        if (!guard.ok) return invalid(`connector is not a valid filter: ${guard.message}`);
        return invalid('connector must be a connector label, not a URL');
      }
      const filtered = filterSites({
        ...(bbox.bbox === undefined ? {} : { bbox: bbox.bbox }),
        ...(a.connector === undefined ? {} : { connector: a.connector }),
        ...(a.minPower === undefined ? {} : { minPower: a.minPower }),
        openOnly: a.openOnly,
      });
      const data = filtered.slice(a.offset, a.offset + a.limit);
      return ok({
        data,
        page: { limit: a.limit, offset: a.offset, total: filtered.length },
        attribution: resultAttribution(data),
        byokConfigured: byokConfigured(deps),
      });
    },
  );

  server.registerTool(
    'voltbase_site_detail',
    {
      title: 'Site detail',
      description: DETAIL_DESC,
      inputSchema: siteDetailSchema as unknown as AnySchema,
    },
    async (args: unknown) => {
      const a = args as unknown as z.infer<typeof siteDetailSchema>;
      const violation = strictArgs(a as Readonly<Record<string, unknown>>, ALLOWED_ARGS.voltbase_site_detail);
      if (violation !== null) return err(violation);
      const site = findServableById(a.id);
      if (site === undefined) return err({ code: 'NOT_FOUND', message: 'unknown site id' });
      return ok({ data: site, byokConfigured: byokConfigured(deps) });
    },
  );

  server.registerTool(
    'voltbase_status',
    {
      title: 'Site status',
      description: STATUS_DESC,
      inputSchema: statusSchema as unknown as AnySchema,
    },
    async (args: unknown) => {
      const a = args as unknown as z.infer<typeof statusSchema>;
      const violation = strictArgs(a as Readonly<Record<string, unknown>>, ALLOWED_ARGS.voltbase_status);
      if (violation !== null) return err(violation);
      const site = findServableById(a.id);
      if (site === undefined) return err({ code: 'NOT_FOUND', message: 'unknown site id' });
      if (a.after !== undefined) {
        const afterMs = Date.parse(a.after);
        if (Number.isNaN(afterMs)) return invalid('after must be an ISO-8601 instant');
        const retrievedMs = Date.parse(site.provenance.retrievedAt);
        if (!Number.isNaN(retrievedMs) && retrievedMs <= afterMs) {
          // Newer-only: nothing newer than `after` — typed empty, not a failure.
          return ok({
            id: site.id,
            newer: false,
            retrievedAt: site.provenance.retrievedAt,
            after: a.after,
            attribution: site.attribution,
            byokConfigured: byokConfigured(deps),
          });
        }
      }
      const info = staleInfo(site.provenance.retrievedAt, deps.now());
      return ok({
        data: {
          id: site.id,
          status: site.status,
          retrievedAt: site.provenance.retrievedAt,
          source: site.source,
          stale: info.stale,
          ...(info.reason === undefined ? {} : { staleReason: info.reason }),
          attribution: site.attribution,
        },
        ...(a.after === undefined ? {} : { newer: true }),
        byokConfigured: byokConfigured(deps),
      });
    },
  );

  server.registerTool(
    'voltbase_reliability',
    {
      title: 'Site reliability',
      description: RELIABILITY_DESC,
      inputSchema: reliabilitySchema as unknown as AnySchema,
    },
    async (args: unknown) => {
      const a = args as unknown as z.infer<typeof reliabilitySchema>;
      const violation = strictArgs(a as Readonly<Record<string, unknown>>, ALLOWED_ARGS.voltbase_reliability);
      if (violation !== null) return err(violation);
      const site = findServableById(a.id);
      if (site === undefined) return err({ code: 'NOT_FOUND', message: 'unknown site id' });
      // Fresh per-call composition (IS-06 null-cache): no shared journal or
      // budget across calls; the rollup derives from the fixture row +
      // read-only prebuilt cut, available on both transports.
      const answer = getReliability({
        id: site.id,
        startStatus: site.status,
        entries: [],
        observedAt: site.provenance.retrievedAt,
        nowMs: deps.now(),
        budget: new WriteBudget(),
      });
      if (!answer.ok) {
        return err({
          code: answer.code,
          message: answer.message,
          cut: { ...answer.cut, source: site.source, attribution: site.attribution },
        });
      }
      return ok({
        data: { ...answer.data, source: site.source, attribution: site.attribution },
        byokConfigured: byokConfigured(deps),
      });
    },
  );

  return server;
};
