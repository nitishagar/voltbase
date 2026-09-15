/**
 * S6 budget-guard gates (node pool): counters stop at 80% of the KV 1k
 * writes/d and D1 100k rows/d caps with the typed UPSTREAM_FAILED error
 * (ADR-002 §W1); below the guard line `check()` passes silently.
 */
import { describe, expect, it } from 'vitest';
import {
  D1_ROW_WRITE_GUARD,
  KV_WRITE_GUARD,
  UpstreamFailedError,
  WriteBudget,
} from './budget.ts';

describe('write-budget guard (80% of KV/D1 daily caps)', () => {
  it('stops at 800 KV writes with typed UPSTREAM_FAILED', () => {
    const budget = new WriteBudget();
    budget.recordKvWrites(KV_WRITE_GUARD - 1);
    expect(budget.exhausted).toBe(false);
    expect(() => budget.check()).not.toThrow();
    budget.recordKvWrites(1);
    expect(budget.exhausted).toBe(true);
    expect(() => budget.check()).toThrowError(UpstreamFailedError);
    try {
      budget.check();
    } catch (error) {
      expect((error as UpstreamFailedError).code).toBe('UPSTREAM_FAILED');
    }
  });

  it('stops at 80k D1 rows with typed UPSTREAM_FAILED', () => {
    const budget = new WriteBudget();
    budget.recordD1Rows(D1_ROW_WRITE_GUARD - 1);
    expect(budget.exhausted).toBe(false);
    budget.recordD1Rows(1);
    expect(budget.exhausted).toBe(true);
    expect(() => budget.check()).toThrowError(UpstreamFailedError);
  });
});
