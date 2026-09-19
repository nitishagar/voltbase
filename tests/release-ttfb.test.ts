/**
 * S7 unit gates (node pool): the release dry-run leaves the tree untouched
 * (`private` back, `exports` back) and the TTFB budget parser is exact.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('release dry-run restores the tree', () => {
  it('dry-run writes nothing: private back, exports back', () => {
    const res = spawnSync('node', ['scripts/publish-workspaces.mjs'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(`${res.stdout ?? ''}`).toMatch(/DRY-RUN/);
    expect(readFileSync('package.json', 'utf8')).toContain('"private": true');
    expect(readFileSync('packages/core/package.json', 'utf8')).toContain('"private": true');
    expect(readFileSync('packages/core/package.json', 'utf8')).toContain('./src/index.ts');
    expect(readFileSync('packages/core/package.json', 'utf8')).not.toContain('./dist/index.js');
  });

  it('never plans a mutation for the site workspace (docs artifact, not an npm package)', () => {
    const res = spawnSync('node', ['scripts/publish-workspaces.mjs'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(`${res.stdout ?? ''}`).not.toContain('site/package.json');
    expect(readFileSync('site/package.json', 'utf8')).toContain('"private": true');
  });
});

describe('TTFB thresholds parse', () => {
  it(
    'defaults to 300ms and accepts explicit budgets, rejecting bad input',
    () => {
      const res = spawnSync(
        'node',
        [
          '--input-type=module',
          '-e',
          [
            `import('./scripts/check-ttfb.mjs').then((m) => {`,
            `  const assert = (cond, label) => { if (!cond) { console.error('FAIL ' + label); process.exit(1); } };`,
            `  assert(m.TTFB_BUDGET_MS === 300, 'budget');`,
            `  assert(m.parseBudgetMs(undefined) === 300, 'default');`,
            `  assert(m.parseBudgetMs('') === 300, 'empty');`,
            `  assert(m.parseBudgetMs('150') === 150, 'explicit');`,
            `  for (const bad of ['nope', '-5', '0']) {`,
            `    let threw = false;`,
            `    try { m.parseBudgetMs(bad); } catch { threw = true; }`,
            `    assert(threw, 'reject:' + bad);`,
            `  }`,
            `  console.log('TTFB-PARSE OK');`,
            `})`,
          ].join('\n'),
        ],
        { encoding: 'utf8' },
      );
      expect(res.status).toBe(0);
      expect(`${res.stdout ?? ''}`).toContain('TTFB-PARSE OK');
    },
    20_000,
  );
});
