/**
 * S6 write-budget guard (packages/providers/src/dynamic/budget.ts).
 *
 * ADR-002 §W1 math: KV allows 1k writes/d and D1 100k rows written/d (D1
 * hard-fails with binding/REST errors until midnight UTC since 2026-09-01).
 * Counters stop at 80% of each cap — never approaching the hard-fail line.
 * On stop the caller serves the last-good prebuilt cut + stale label with the
 * typed `UPSTREAM_FAILED` code (IS-06), never a paid tier (IS-10: cut scope,
 * never upgrade — the guard path serves only the servable-only cut and never
 * widens the licence filter).
 */
export const KV_WRITES_PER_DAY = 1000;
export const D1_ROWS_WRITTEN_PER_DAY = 100_000;

/** Stop ratio: halt writes at 80% of each daily cap. */
export const WRITE_GUARD_RATIO = 0.8;

/** Derived guard lines: 800 KV writes/d, 80k D1 rows/d. */
export const KV_WRITE_GUARD = Math.floor(KV_WRITES_PER_DAY * WRITE_GUARD_RATIO);
export const D1_ROW_WRITE_GUARD = Math.floor(D1_ROWS_WRITTEN_PER_DAY * WRITE_GUARD_RATIO);

/** Typed budget-stop error: the request/cron seam maps this to the cut-to-artifact fallback. */
export class UpstreamFailedError extends Error {
  readonly code = 'UPSTREAM_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamFailedError';
  }
}

/**
 * Per-invocation write counters (fresh instance per cron run / request —
 * IS-06 null-cache: never shared across requests). One cron invocation books
 * one KV marker write; each journaled transition books one D1 row.
 */
export class WriteBudget {
  private kvWrites = 0;
  private d1Rows = 0;

  recordKvWrites(n = 1): void {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('kv write count must be a non-negative integer');
    this.kvWrites += n;
  }

  recordD1Rows(n = 1): void {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('d1 row count must be a non-negative integer');
    this.d1Rows += n;
  }

  get kvUsed(): number {
    return this.kvWrites;
  }

  get d1Used(): number {
    return this.d1Rows;
  }

  /** True once either counter reaches its 80% guard line. */
  get exhausted(): boolean {
    return this.kvWrites >= KV_WRITE_GUARD || this.d1Rows >= D1_ROW_WRITE_GUARD;
  }

  /** Throws the typed `UPSTREAM_FAILED` error when the guard line is reached. */
  check(): void {
    if (this.exhausted) {
      throw new UpstreamFailedError(
        `write budget exhausted at 80% guard (kv ${String(this.kvWrites)}/${String(KV_WRITES_PER_DAY)}, ` +
          `d1 ${String(this.d1Rows)}/${String(D1_ROWS_WRITTEN_PER_DAY)}) — serving last-good prebuilt cut`,
      );
    }
  }
}
