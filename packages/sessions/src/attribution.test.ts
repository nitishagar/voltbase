/**
 * Session attribution mirror (I8): every served session row carries source,
 * retrieved-at, and attribution end-to-end.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normaliseTrace, type SimTrace } from './session.ts';

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus');

describe('session attribution', () => {
  it('carries source + retrievedAt + credit on every row of every dialect', () => {
    for (const file of ['ocpp16-full.json', 'ocpp16-hostile.json', 'ocpp201-events.json']) {
      const trace = JSON.parse(readFileSync(join(corpusDir, file), 'utf8')) as SimTrace;
      const { sessions } = normaliseTrace(trace);
      expect(sessions.length, file).toBeGreaterThan(0);
      for (const row of sessions) {
        expect(row.source).toBe('OCPP');
        expect(row.provenance.source).toBe('OCPP');
        expect(row.provenance.retrievedAt).toBe(trace.retrievedAt);
        expect(row.attribution.text.length).toBeGreaterThan(0);
        expect(row.provenance.attribution.text).toBe(row.attribution.text);
      }
    }
  });
});
