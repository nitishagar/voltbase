import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** Plain-node gate: the `voltbase` bin prints usage and exits 0. */
describe('CLI --help (plain node)', () => {
  it('voltbase --help exits 0 and mentions voltbase + usage', () => {
    const res = spawnSync('node', ['packages/cli/bin/voltbase.js', '--help'], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.toLowerCase();
    expect(out).toContain('voltbase');
    expect(out).toContain('usage');
  });
});
