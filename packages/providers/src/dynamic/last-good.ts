/**
 * S6 last-good prebuilt cut (packages/providers/src/dynamic/last-good.ts).
 *
 * TS mirror of `packages/providers/artifacts/reliability.json` (see
 * `./artifact.ts` for the sync contract). Read-only const — never mutated at
 * runtime (IS-06 null-cache: sharing a frozen value across requests is not
 * shared mutable state, same as SERVABLE_SITES). Entries cover servable-only
 * fixture ids; the route merges live attribution from the fixture row at
 * serve time, so this file carries no licence/attribution payload.
 */
import type { ReliabilityArtifact } from './artifact.ts';

export const LAST_GOOD_CUT: ReliabilityArtifact = {
  generatedAt: '2026-09-15T00:00:00.000Z',
  windowMs: 86_400_000,
  sites: [
    {
      id: 'OCM:900000',
      uptime: 0.97,
      upMs: 83_808_000,
      downMs: 2_592_000,
      transitions: 2,
      windowMs: 86_400_000,
      from: '2026-09-14T00:00:00.000Z',
      to: '2026-09-15T00:00:00.000Z',
    },
    {
      id: 'OCPI:NL-NDW-001',
      uptime: 0.92,
      upMs: 79_488_000,
      downMs: 6_912_000,
      transitions: 5,
      windowMs: 86_400_000,
      from: '2026-09-14T00:00:00.000Z',
      to: '2026-09-15T00:00:00.000Z',
    },
    {
      id: 'OSM:node/22000101',
      uptime: 0.88,
      upMs: 76_032_000,
      downMs: 10_368_000,
      transitions: 7,
      windowMs: 86_400_000,
      from: '2026-09-14T00:00:00.000Z',
      to: '2026-09-15T00:00:00.000Z',
    },
  ],
};
