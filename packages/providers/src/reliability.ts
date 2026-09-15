/**
 * S6 reliability facade (packages/providers/src/reliability.ts).
 *
 * Null-cache default preserved (IS-06, ADR-002 §W1): NO KV/D1 bindings are
 * added. Reliability is computed AT REQUEST TIME from per-request inputs —
 * the caller builds a fresh `WriteBudget` + journal snapshot per call, so
 * nothing mutable is shared across requests — or served from the read-only
 * prebuilt cut (`dynamic/last-good.ts`, never mutated). The durable journal
 * shape for a future binding is documented in
 * `migrations/0001_reliability_journal.sql` (memory/artifact only in v0.1).
 */
import type { Status } from '@voltbase/core';
import { UpstreamFailedError, type WriteBudget } from './dynamic/budget.ts';
import { artifactEntryFor } from './dynamic/artifact.ts';
import { LAST_GOOD_CUT } from './dynamic/last-good.ts';
import { RELIABILITY_WINDOW_MS, reliabilityStale, rollupUptime } from './dynamic/rollup.ts';
import type { JournalEntry } from './dynamic/journal.ts';

export interface ReliabilityRequest {
  id: string;
  /** Status prevailing at the window start (fixture row status on the request path). */
  startStatus: Status;
  /** Transition-only entries for this id (per-request snapshot, counted once each). */
  entries: ReadonlyArray<JournalEntry>;
  /** ISO-8601 instant of the freshest observation (fixture retrievedAt on the request path). */
  observedAt: string;
  nowMs: number;
  windowMs?: number;
  budget?: WriteBudget;
}

export interface ReliabilityData {
  id: string;
  uptime: number;
  upMs: number;
  downMs: number;
  transitions: number;
  windowMs: number;
  from: string;
  to: string;
  stale: boolean;
  staleReason?: string;
  servedFrom: 'journal' | 'artifact';
}

export type ReliabilityAnswer =
  | { ok: true; data: ReliabilityData }
  | { ok: false; code: 'UPSTREAM_FAILED'; message: string; cut: ReliabilityData };

const computedFor = (req: ReliabilityRequest, windowMs: number): ReliabilityData => {
  const toMs = req.nowMs;
  const fromMs = toMs - windowMs;
  const numbers = rollupUptime({ id: req.id, entries: req.entries, fromMs, toMs, startStatus: req.startStatus });
  const stale = reliabilityStale(req.observedAt, req.nowMs);
  return {
    id: req.id,
    uptime: numbers.uptime,
    upMs: numbers.upMs,
    downMs: numbers.downMs,
    transitions: numbers.transitions,
    windowMs,
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    stale: stale.stale,
    ...(stale.reason === undefined ? {} : { staleReason: stale.reason }),
    servedFrom: 'journal',
  };
};

/**
 * Cut-to-artifact fallback: the last-good prebuilt entry for this id (always
 * stale-labelled — a cut is by definition older than the SLO), or a freshly
 * computed rollup force-labelled stale when the cut does not cover the id.
 */
const cutFor = (req: ReliabilityRequest, windowMs: number, message: string): ReliabilityData => {
  const entry = artifactEntryFor(LAST_GOOD_CUT, req.id);
  const reason = `${message} (serving last-good prebuilt cut generatedAt ${LAST_GOOD_CUT.generatedAt})`;
  if (entry !== undefined) {
    return {
      id: entry.id,
      uptime: entry.uptime,
      upMs: entry.upMs,
      downMs: entry.downMs,
      transitions: entry.transitions,
      windowMs: entry.windowMs,
      from: entry.from,
      to: entry.to,
      stale: true,
      staleReason: reason,
      servedFrom: 'artifact',
    };
  }
  const computed = computedFor(req, windowMs);
  return { ...computed, stale: true, staleReason: reason, servedFrom: 'artifact' };
};

/**
 * Serves one site's reliability. The budget guard is checked first: on
 * `UPSTREAM_FAILED` the caller serves `cut` (+ stale label) instead of the
 * journal computation. Guard failure never widens serving — callers 404
 * closed ids BEFORE calling here, and the cut covers servable ids only.
 */
export const getReliability = (req: ReliabilityRequest): ReliabilityAnswer => {
  const windowMs = req.windowMs ?? RELIABILITY_WINDOW_MS;
  try {
    req.budget?.check();
  } catch (error) {
    if (error instanceof UpstreamFailedError) {
      return { ok: false, code: error.code, message: error.message, cut: cutFor(req, windowMs, error.message) };
    }
    throw error;
  }
  return { ok: true, data: computedFor(req, windowMs) };
};
