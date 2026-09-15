/**
 * S6 prebuilt artifact seam (packages/providers/src/dynamic/artifact.ts).
 *
 * Cut-to-artifact (ADR-002 §W1): when the write-budget guard stops the poller,
 * the API serves the last-good prebuilt JSON cut + stale label instead of
 * failing. `renderArtifactCut` serialises the cut checked in at
 * `packages/providers/artifacts/reliability.json`; the TS const in
 * `./last-good.ts` mirrors that file and the artifact test asserts they stay
 * in sync, so the Worker (which bundles TS, not JSON) and the checked-in
 * file can never drift.
 */
export interface ArtifactSiteCut {
  id: string;
  uptime: number;
  upMs: number;
  downMs: number;
  transitions: number;
  windowMs: number;
  from: string;
  to: string;
}

export interface ReliabilityArtifact {
  generatedAt: string;
  windowMs: number;
  sites: ArtifactSiteCut[];
}

/** Serialises a cut to the checked-in `artifacts/reliability.json` shape. */
export const renderArtifactCut = (artifact: ReliabilityArtifact): string =>
  `${JSON.stringify(artifact, null, 2)}\n`;

/** Parses a rendered cut back (round-trip seam for the writer test). */
export const parseArtifactCut = (raw: string): ReliabilityArtifact =>
  JSON.parse(raw) as ReliabilityArtifact;

/** Last-good entry for one site, if the cut covers it. */
export const artifactEntryFor = (
  artifact: ReliabilityArtifact,
  id: string,
): ArtifactSiteCut | undefined => artifact.sites.find((site) => site.id === id);
