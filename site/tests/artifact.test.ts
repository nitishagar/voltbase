import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** Pages artifact gate (S1): the build emits site/dist/index.html. */
describe('site artifact (S1)', () => {
  it('site/dist/index.html exists and mentions voltbase', () => {
    const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
    expect(existsSync(join(dist, 'index.html'))).toBe(true);
    const html = readFileSync(join(dist, 'index.html'), 'utf8');
    expect(html.toLowerCase()).toContain('voltbase');
  });
});
