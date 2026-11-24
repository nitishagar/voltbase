/**
 * Depot session index (Worker binding over `@voltbase/sessions`).
 *
 * Servable-only snapshot built once at module load from the golden corpus:
 * normalised, licence-filtered, then `isServable()`-gated like the site
 * index. No OSM content exists here (CC0-by-authorship sim traces), and
 * depot rows never join site rows (chargerRef stays opaque, ADR-003).
 */
import { isServable, type SessionRow } from '@voltbase/core';
import { licenceFilter } from '@voltbase/normalise';
import { DEPOT_TRACES, buildSessionIndex, type BuildDepotResult } from '@voltbase/sessions';

/** Module-load depot build (index + rejected count, or typed failure). */
export const DEPOT_BUILD: BuildDepotResult = buildSessionIndex([...DEPOT_TRACES]);

/** Servable-only session snapshot built once at module load. */
export const SERVABLE_SESSIONS: ReadonlyArray<SessionRow> = (() => {
  if (!DEPOT_BUILD.ok) return [];
  const { servable } = licenceFilter(DEPOT_BUILD.index.sessions);
  return servable.filter((row) => isServable(row));
})();

/** Rejected ingest events (Stop-without-Start) surfaced on depot responses. */
export const DEPOT_REJECTED_COUNT: number = DEPOT_BUILD.ok ? DEPOT_BUILD.index.rejectedCount : 0;

/** Corpus record instant (fixed at generation); staleness anchor for depot data. */
export const DEPOT_RETRIEVED_AT: string = DEPOT_TRACES[0]?.retrievedAt ?? '';
