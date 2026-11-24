/**
 * Session PII bounds (I7): driver identifiers in traces never reach rows,
 * served payloads, or (in Phase 2) the depot page. Corpus idTags are the
 * banned strings.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normaliseTrace, type SimTrace } from './session.ts';

const corpusDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus');
const BANNED = ['DRIVER-A', 'DRIVER-B'];

describe('driver identifier redaction', () => {
  it('drops idTags from every normalised row on all 3 dialects', () => {
    for (const file of ['ocpp16-full.json', 'ocpp16-hostile.json', 'ocpp201-events.json']) {
      const trace = JSON.parse(readFileSync(join(corpusDir, file), 'utf8')) as SimTrace;
      const { sessions } = normaliseTrace(trace);
      const payload = JSON.stringify(sessions);
      for (const banned of BANNED) {
        expect(payload, `${file} leaks ${banned}`).not.toContain(banned);
      }
    }
  });
});
