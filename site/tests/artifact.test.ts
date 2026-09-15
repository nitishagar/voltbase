import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Pages artifact gate (S1): the build emits site/dist/index.html. */
describe('site artifact (S1)', () => {
  it('site/dist/index.html exists and mentions voltbase', () => {
    expect(existsSync('site/dist/index.html')).toBe(true);
    const html = readFileSync('site/dist/index.html', 'utf8');
    expect(html.toLowerCase()).toContain('voltbase');
  });
});
