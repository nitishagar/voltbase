/**
 * Worker isolation (I10/I5): ocpp-ws-io is a devDependency of the sessions
 * package for generator/eval/test scope only — the Worker never imports it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sessionsDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = join(sessionsDir, '..', 'mcp', 'worker');

describe('sim lib stays out of the Worker', () => {
  it('lists ocpp-ws-io under devDependencies only', () => {
    const pkg = JSON.parse(readFileSync(join(sessionsDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.['ocpp-ws-io']).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.dependencies?.['ocpp-ws-io']).toBeUndefined();
  });

  it('has no ocpp-ws-io import string under packages/mcp/worker/', () => {
    for (const file of readdirSync(workerDir).filter((f) => f.endsWith('.ts'))) {
      const body = readFileSync(join(workerDir, file), 'utf8');
      expect(body, file).not.toContain('ocpp-ws-io');
    }
  });
});
