/**
 * Depot query layer (pure, no I/O): session index build + filters over
 * normalised rows. The Worker binds these to the module-load index.
 */
import type { SessionRow } from '@voltbase/core';
import { normaliseTrace, type SimTrace } from './session.ts';

export interface DepotIndex {
  sessions: SessionRow[];
  rejectedCount: number;
}

export type BuildDepotResult =
  | { ok: true; index: DepotIndex }
  | { ok: false; code: 'UPSTREAM_FAILED'; message: string };

/** Build the servable session index from traces (empty corpus ⇒ typed failure). */
export function buildSessionIndex(traces: readonly SimTrace[]): BuildDepotResult {
  if (traces.length === 0) {
    return { ok: false, code: 'UPSTREAM_FAILED', message: 'depot corpus is empty' };
  }
  const sessions: SessionRow[] = [];
  let rejectedCount = 0;
  for (const trace of traces) {
    const result = normaliseTrace(trace);
    sessions.push(...result.sessions);
    rejectedCount += result.rejected.length;
  }
  return { ok: true, index: { sessions, rejectedCount } };
}

export interface SessionQuery {
  chargerRef?: string;
  dialect?: SessionRow['dialect'];
  openOnly?: boolean;
}

/** Filter-then-serve per row (no joins; chargerRef stays opaque). */
export function filterSessions(sessions: readonly SessionRow[], query: SessionQuery): SessionRow[] {
  const charger = query.chargerRef?.trim().toLowerCase();
  return sessions.filter((row) => {
    if (charger !== undefined && charger !== '' && row.chargerRef !== charger) return false;
    if (query.dialect !== undefined && row.dialect !== query.dialect) return false;
    if (query.openOnly === true && !row.openSession) return false;
    return true;
  });
}

export const findSessionById = (sessions: readonly SessionRow[], id: string): SessionRow | undefined =>
  sessions.find((row) => row.id === id);

/** Fault rows carry data-quality flags other than openSession. */
export function isFaultRow(row: SessionRow): boolean {
  return row.qualityFlags.some((f) => f !== 'openSession');
}

export function depotFaults(sessions: readonly SessionRow[], chargerRef?: string): SessionRow[] {
  return filterSessions(sessions, { ...(chargerRef === undefined ? {} : { chargerRef }) }).filter(isFaultRow);
}

export interface ChargerFaultCount {
  chargerRef: string;
  faults: number;
}

/** Per-charger fault counts, most-faulted first (ties: chargerRef ascending). */
export function faultCountsByCharger(sessions: readonly SessionRow[]): ChargerFaultCount[] {
  const counts = new Map<string, number>();
  for (const row of sessions.filter(isFaultRow)) {
    counts.set(row.chargerRef, (counts.get(row.chargerRef) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([chargerRef, faults]) => ({ chargerRef, faults }))
    .sort((a, b) => b.faults - a.faults || (a.chargerRef < b.chargerRef ? -1 : 1));
}
