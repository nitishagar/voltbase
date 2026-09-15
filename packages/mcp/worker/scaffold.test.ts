import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { STAGE } from '../../../src/lib/stage.ts';
import { app } from './index.ts';

/**
 * S1 scaffold gates (node pool): the six minimum tests from the S1 brief —
 * healthz shape+stage, index contains voltbase, check-banned fixtures,
 * no-persistence documented skip, Pages artifact, CLI --help smoke.
 */
describe('S1 scaffold gates', () => {
  it('GET /healthz returns {"ok":true,"stage":2}', async () => {
    const res = await app.request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, stage: 2 });
    expect(STAGE).toBe(2);
  });

  it('GET / contains voltbase', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('voltbase');
  });

  it('check-banned fixtures: clean passes, banned fails', () => {
    const clean = spawnSync('bash', ['scripts/check-banned.sh', 'scripts/fixtures/clean.txt'], {
      encoding: 'utf8',
    });
    expect(clean.status).toBe(0);
    const banned = spawnSync('bash', ['scripts/check-banned.sh', 'scripts/fixtures/banned.txt'], {
      encoding: 'utf8',
    });
    expect(banned.status).not.toBe(0);
  });

  it('no-persistence documented skip: no KV/D1 in wrangler.jsonc + ADR ref', () => {
    for (const file of ['wrangler.jsonc', 'packages/mcp/worker/wrangler.jsonc']) {
      const raw = readFileSync(file, 'utf8');
      expect(raw).not.toMatch(/kv_namespaces|d1_databases|r2_buckets|durable_objects|migrations/i);
    }
    // Documented skip: stack.md Bindings section pins the stateless default.
    const stack = readFileSync('docs/stack.md', 'utf8');
    expect(stack).toMatch(/None by default/);
    expect(stack).toMatch(/no KV\/D1/i);
  });

  it('Pages artifact dir assertion: site/dist/index.html exists', () => {
    expect(existsSync('site/dist/index.html')).toBe(true);
    expect(readFileSync('site/dist/index.html', 'utf8').toLowerCase()).toContain('voltbase');
  });

  it('CLI --help smoke: exit 0 + usage', () => {
    const res = spawnSync('node', ['packages/cli/bin/voltbase.js', '--help'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(`${res.stdout ?? ''}${res.stderr ?? ''}`.toLowerCase()).toContain('usage');
  });
});
