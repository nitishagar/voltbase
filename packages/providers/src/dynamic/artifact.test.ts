/**
 * S6 artifact gates (node pool): the checked-in last-good cut
 * (`artifacts/reliability.json`) parses, matches the bundled TS mirror
 * (`dynamic/last-good.ts`, the Worker's zero-fs source), and round-trips
 * through the artifact writer — so the cut and the code can never drift.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseArtifactCut, renderArtifactCut, type ReliabilityArtifact } from './artifact.ts';
import { LAST_GOOD_CUT } from './last-good.ts';

describe('prebuilt reliability cut (cut-to-artifact source)', () => {
  it('checked-in JSON parses and deep-equals the bundled TS mirror', () => {
    const raw = readFileSync('packages/providers/artifacts/reliability.json', 'utf8');
    const file = JSON.parse(raw) as ReliabilityArtifact;
    expect(file).toEqual(LAST_GOOD_CUT);
    expect(file.windowMs).toBe(86_400_000);
    expect(file.sites.length).toBeGreaterThan(0);
    for (const site of file.sites) {
      expect(site.id.length).toBeGreaterThan(0);
      expect(site.uptime).toBeGreaterThanOrEqual(0);
      expect(site.uptime).toBeLessThanOrEqual(1);
      expect(site.upMs + site.downMs).toBe(site.windowMs);
      expect(Math.abs(site.upMs / site.windowMs - site.uptime)).toBeLessThan(1e-9);
    }
  });

  it('writer output round-trips byte-identical through the parser', () => {
    const rendered = renderArtifactCut(LAST_GOOD_CUT);
    expect(parseArtifactCut(rendered)).toEqual(LAST_GOOD_CUT);
    expect(rendered.endsWith('\n')).toBe(true);
  });
});
