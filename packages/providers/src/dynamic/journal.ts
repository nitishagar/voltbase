/**
 * S6 status-transition journal (packages/providers/src/dynamic/journal.ts).
 *
 * ADR-002 §W1: the poller journals STATUS TRANSITIONS ONLY, never full
 * upserts — even hourly full upserts of ~2k sites/feed would break the D1
 * 100k rows/d cap; transitions (~5%/hr ESTIMATE) cost ≈7k rows/d total.
 * The journal appends ONCE per observed transition: repeat polls of an
 * unchanged status append nothing, and first sighting seeds the baseline
 * without an entry.
 */
import type { Status } from '@voltbase/core';

/** One polled observation (one upstream subrequest per sample at the poller). */
export interface StatusSample {
  id: string;
  status: Status;
  /** ISO-8601 instant the status was observed. */
  observedAt: string;
}

/** One journaled transition: the ONLY write the poller performs per change. */
export interface JournalEntry {
  id: string;
  from: Status;
  to: Status;
  /** ISO-8601 instant of the observation that witnessed the transition. */
  at: string;
}

/**
 * In-memory transition detector. Fresh instance per cron run / request
 * (IS-06 null-cache: never shared across requests); the durable shape is
 * documented in `migrations/0001_reliability_journal.sql` (no D1 binding in
 * v0.1 — memory + prebuilt artifact only).
 */
export class TransitionJournal {
  private readonly lastById = new Map<string, Status>();
  private readonly log: JournalEntry[] = [];

  /**
   * Observes one sample. Returns the appended entry iff the status changed
   * since the last sighting of the same id, else null (no write — never a
   * full upsert).
   */
  observe(sample: StatusSample): JournalEntry | null {
    const prev = this.lastById.get(sample.id);
    this.lastById.set(sample.id, sample.status);
    if (prev === undefined || prev === sample.status) return null;
    const entry: JournalEntry = { id: sample.id, from: prev, to: sample.status, at: sample.observedAt };
    this.log.push(entry);
    return entry;
  }

  /** Transitions for one site, oldest first (each counted exactly once). */
  entriesFor(id: string): JournalEntry[] {
    return this.log.filter((entry) => entry.id === id);
  }

  get size(): number {
    return this.log.length;
  }

  /** Copy of the full log (callers never alias the mutable log). */
  snapshot(): JournalEntry[] {
    return [...this.log];
  }
}
