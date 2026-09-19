#!/usr/bin/env node
/**
 * scripts/publish-workspaces.mjs — S7 release script (IS-01, private-then-public).
 *
 * Mirrors the lumen release shape: clear `private`, exact-pins check, repoint
 * `exports` to `dist/`, build, then restore the working tree on exit.
 *
 * - Dry-run is the default: validate + report the planned edits, write nothing.
 * - `--publish` opts in to the local mutate → `npm run build` → restore cycle.
 *   Even then there is NO registry write in v0.1 (real publish waits for the
 *   S13 public flip); the tree is restored before exit.
 * - `--publish` never runs in CI while private: with `CI` set and any manifest
 *   still carrying `private:true`, the script prints a skip line and exits 0
 *   without touching the tree. The dry-run is read-only, so it stays available
 *   in CI (the S7 gate asserts its DRY-RUN output there).
 *
 * Usage:
 *   `node scripts/publish-workspaces.mjs` (dry-run)
 *   `node scripts/publish-workspaces.mjs --publish` (local mutate/build/restore)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = join(here, '..');

/** Manifests the exact-pins gate scans (root + packages + site). */
export const MANIFESTS = [
  'package.json',
  'packages/core/package.json',
  'packages/normalise/package.json',
  'packages/providers/package.json',
  'packages/mcp/package.json',
  'packages/cli/package.json',
  'site/package.json',
];

/**
 * Manifests the release MUTATES (clear private, repoint exports). site/ is a
 * docs artifact, not an npm package — its private flag is never cleared.
 */
export const PUBLISH_MANIFESTS = MANIFESTS.filter((rel) => !rel.startsWith('site/'));

/** True for an exact `1.2.3` pin (optional build/prerelease suffix allowed). */
export const isExactPin = (version) => {
  if (typeof version !== 'string') return false;
  return /^\d+\.\d+\.\d+([+-][0-9A-Za-z.-]+)?$/.test(version.trim());
};

/** Internal workspace links (`@voltbase/*: *`) are exempt from the pins gate. */
const isExemptInternal = (name, version) => name.startsWith('@voltbase/') && version === '*';

const pinSections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'overrides'];

/** Returns a list of non-exact pin violations across the manifests. */
export const collectPinViolations = (manifests) => {
  const violations = [];
  for (const rel of manifests) {
    const raw = readFileSync(join(rootDir, rel), 'utf8');
    const manifest = JSON.parse(raw);
    for (const section of pinSections) {
      const entries = manifest[section];
      if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) continue;
      for (const [name, version] of Object.entries(entries)) {
        if (typeof version !== 'string' || isExemptInternal(name, version)) continue;
        if (!isExactPin(version)) violations.push(`${rel} ${section}.${name}=${version}`);
      }
    }
  }
  return violations;
};

/** Planned release edits for one manifest (pure: no disk writes). */
export const plannedEdits = (manifest) => {
  const edits = [];
  if (manifest.private === true) edits.push('clear private:true');
  const exportsField = manifest.exports;
  if (exportsField !== null && typeof exportsField === 'object' && !Array.isArray(exportsField)) {
    for (const [key, value] of Object.entries(exportsField)) {
      if (typeof value === 'string' && value.includes('./src/') && value.endsWith('.ts')) {
        edits.push(`repoint exports[${key}] ${value} -> ./dist/index.js`);
      }
    }
  }
  return edits;
};

/** Applies the release edits in memory (caller writes + restores). */
const applyEdits = (manifest) => {
  const next = JSON.parse(JSON.stringify(manifest));
  delete next.private;
  if (next.exports !== null && typeof next.exports === 'object' && !Array.isArray(next.exports)) {
    for (const [key, value] of Object.entries(next.exports)) {
      if (typeof value === 'string' && value.includes('./src/') && value.endsWith('.ts')) {
        next.exports[key] = './dist/index.js';
      }
    }
  }
  return next;
};

const readManifests = () =>
  PUBLISH_MANIFESTS.map((rel) => ({ rel, raw: readFileSync(join(rootDir, rel), 'utf8') }));

const anyPrivate = (entries) =>
  entries.some(({ raw }) => {
    try {
      return JSON.parse(raw).private === true;
    } catch {
      return false;
    }
  });

const isMain = process.argv[1] !== undefined && process.argv[1].endsWith('publish-workspaces.mjs');

export const runRelease = ({ publish = false } = {}) => {
  const entries = readManifests();

  // Exact-pins gate first: fail before any mutation (scans ALL manifests incl. site).
  const violations = collectPinViolations(MANIFESTS);
  if (violations.length > 0) {
    process.stderr.write(`publish-workspaces: FAIL — non-exact pins:\n${violations.join('\n')}\n`);
    process.exitCode = 1;
    return { ok: false, violations };
  }

  // CI guard: never mutate or publish from CI while the tree is private.
  if (publish && (process.env.CI ?? '') !== '' && anyPrivate(entries)) {
    process.stdout.write('publish-workspaces: SKIP — CI + --publish while private:true (mutate/build/restore stays local; no registry write in v0.1)\n');
    return { ok: true, skipped: true };
  }

  const plans = entries.map(({ rel, raw }) => ({ rel, edits: plannedEdits(JSON.parse(raw)) }));
  const total = plans.reduce((n, p) => n + p.edits.length, 0);

  if (!publish) {
    process.stdout.write(`publish-workspaces: DRY-RUN — ${String(total)} planned edit(s) across ${String(plans.length)} manifest(s); tree untouched\n`);
    for (const { rel, edits } of plans) {
      for (const edit of edits) process.stdout.write(`  ${rel}: ${edit}\n`);
    }
    process.stdout.write('publish-workspaces: DRY-RUN — re-run with --publish for the local mutate/build/restore cycle (no registry write in v0.1)\n');
    return { ok: true, dryRun: true, plans };
  }

  // Opt-in path: mutate on disk, build, restore on exit (finally).
  const originals = new Map(entries.map(({ rel, raw }) => [rel, raw]));
  try {
    for (const { rel, raw } of entries) {
      const next = applyEdits(JSON.parse(raw));
      writeFileSync(join(rootDir, rel), `${JSON.stringify(next, null, 2)}\n`);
    }
    process.stdout.write(`publish-workspaces: --publish — applied ${String(total)} edit(s); running build (tree will be restored)\n`);
    execFileSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'pipe' });
    process.stdout.write('publish-workspaces: --publish — build OK; no registry write in v0.1 (real publish at the S13 public flip)\n');
    return { ok: true, published: false, plans };
  } finally {
    for (const [rel, raw] of originals) writeFileSync(join(rootDir, rel), raw);
    process.stdout.write('publish-workspaces: tree restored (private + exports back)\n');
  }
};

if (isMain) {
  runRelease({ publish: process.argv.includes('--publish') });
  if (process.exitCode === undefined || process.exitCode === 0) {
    // runRelease sets exitCode 1 on pins failure; otherwise fall through OK.
  }
}
