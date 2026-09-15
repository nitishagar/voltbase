/**
 * S6 uptime rollup math (packages/providers/src/dynamic/rollup.ts).
 *
 * Per-site uptime over a window from the transition-only journal: segments
 * between consecutive transitions are attributed to the prevailing state, so
 * each transition is counted exactly once. `up` = AVAILABLE/OCCUPIED
 * (operational); `down` = OUT_OF_SERVICE/UNKNOWN. uptime = up/(up+down); an
 * empty denominator (no time in window) yields 1 — nothing was down.
 */
import type { Status } from '@voltbase/core';
import type { JournalEntry } from './journal.ts';

/** Refresh SLO shared with the S3 API (store STALE_AFTER_MS): older ⇒ stale. */
export const RELIABILITY_STALE_AFTER_MS = 3_600_000; // 60 minutes

/** Default rollup window: trailing 24h. */
export const RELIABILITY_WINDOW_MS = 86_400_000;

export const isUpStatus = (status: Status): boolean => status === 'AVAILABLE' || status === 'OCCUPIED';

export interface UptimeInput {
  id: string;
  entries: ReadonlyArray<JournalEntry>;
  fromMs: number;
  toMs: number;
  /** Status prevailing at the window start (baseline before the first entry). */
  startStatus: Status;
}

export interface UptimeNumbers {
  upMs: number;
  downMs: number;
  /** Transitions in the window, each counted exactly once. */
  transitions: number;
  uptime: number;
}

export const rollupUptime = (input: UptimeInput): UptimeNumbers => {
  const { id, fromMs, toMs } = input;
  if (!(toMs > fromMs)) return { upMs: 0, downMs: 0, transitions: 0, uptime: 1 };
  const inWindow = input.entries
    .filter((entry) => {
      if (entry.id !== id) return false;
      const at = Date.parse(entry.at);
      return !Number.isNaN(at) && at >= fromMs && at <= toMs;
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  let upMs = 0;
  let downMs = 0;
  let cursor = fromMs;
  let state = input.startStatus;
  for (const entry of inWindow) {
    const at = Date.parse(entry.at);
    if (isUpStatus(state)) upMs += at - cursor;
    else downMs += at - cursor;
    cursor = at;
    state = entry.to;
  }
  if (isUpStatus(state)) upMs += toMs - cursor;
  else downMs += toMs - cursor;
  const total = upMs + downMs;
  return { upMs, downMs, transitions: inWindow.length, uptime: total === 0 ? 1 : upMs / total };
};

/** Stale label against the 60min refresh SLO (mirrors store.staleInfo shape). */
export const reliabilityStale = (
  observedAt: string,
  nowMs: number,
): { stale: boolean; reason?: string } => {
  const at = Date.parse(observedAt);
  if (Number.isNaN(at)) return { stale: true, reason: 'observedAt is not a valid instant' };
  if (nowMs - at > RELIABILITY_STALE_AFTER_MS) {
    return {
      stale: true,
      reason: `observedAt ${observedAt} is older than the 60min refresh SLO (serving last-good static cut)`,
    };
  }
  return { stale: false };
};
