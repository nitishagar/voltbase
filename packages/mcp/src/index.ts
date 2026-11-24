/**
 * `@voltbase/mcp` (S4) — the ONE MCP composition root + Worker/CLI surfaces.
 * `buildMcpServer` serves stdio (CLI) and stateless HTTP (Worker `POST /mcp`)
 * with an identical 6-tool set (IS-07). No KV/D1; no fetch in v0.1.
 */
export type { McpDeps, ToolName } from './server.ts';
export {
  ALLOWED_ARGS,
  TOOL_NAMES,
  buildMcpServer,
  depotFaultsSchema,
  depotSessionsSchema,
  reliabilitySchema,
  searchSitesSchema,
  siteDetailSchema,
  statusSchema,
} from './server.ts';
export type { BBox, SiteQuery } from '../worker/store.ts';
export { SERVABLE_SITES, STALE_AFTER_MS, filterSites, findServableById, resultAttribution, staleInfo } from '../worker/store.ts';
export { DEPOT_BUILD, DEPOT_REJECTED_COUNT, DEPOT_RETRIEVED_AT, SERVABLE_SESSIONS } from '../worker/depot.ts';
export type { ChargerFaultCount, DepotIndex, SessionQuery } from '@voltbase/sessions';
export { buildSessionIndex, depotFaults, faultCountsByCharger, filterSessions, findSessionById, isFaultRow } from '@voltbase/sessions';
