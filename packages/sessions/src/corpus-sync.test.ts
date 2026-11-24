/**
 * Corpus sync: the TS mirror (`src/corpus.ts`, what the Worker/tests import)
 * stays byte-deep-equal to the recorded JSON corpus (what the generator
 * writes). Regenerate with record-corpus; never hand-edit either side.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEPOT_TRACES } from './corpus.ts';

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus');

describe('corpus TS mirror sync', () => {
  it('deep-equals the recorded JSON files', () => {
    const json = ['ocpp16-full.json', 'ocpp16-hostile.json', 'ocpp201-events.json'].map((f) =>
      JSON.parse(readFileSync(join(corpusDir, f), 'utf8')),
    );
    expect(DEPOT_TRACES).toEqual(json);
  });
});
