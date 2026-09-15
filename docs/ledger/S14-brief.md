# S14 brief — site re-theme to pi.dev visual language

Date: 2026-09-15 · Orchestrator/builder: ZCode (GLM-5.3-Flash) · Plan bundle:
`thoughts/shared/plans/2026-09-15-s14-theme-pi-dev/` (SPEC + PLAN + PLAN_VALIDATION
PASS + IMPLEMENTATION_VALIDATION PASS + TEST_VALIDATION PASS + HANDOFF_LEDGER).

## Scope executed

- `site/src/styles.css` — full re-theme: dark-first `:root` tokens mapped from
  pi.dev (canvas #161d27 / deep #0d1116 / ink #ebe7e4 / muted #9fa4ab / line
  #49505980 / accent #6a9fcc / rust / warn), `@media (prefers-color-scheme: light)`
  overrides with AA-adjusted solid tokens (moonstone #ebe7e4 / parchment #dacbc2 /
  evening-blue #252f3d / driftwood #5c5752 / tidal-blue #4b607c), `--max` 44rem,
  18px root, serif body/headings (Georgia-first stack — pi.dev's own fallback;
  Plantin MT Pro is commercial and prohibited), Commit Mono code (self-hosted
  woff2 400/700), Departure Mono accent labels (nav, table headings, CTAs),
  restyled cards/notice/cta/tables/footer with `:focus-visible` rings and
  `::selection`.
- `site/src/fonts/` — CommitMono-400.woff2 (48,128 B), CommitMono-700.woff2
  (47,304 B) from @fontsource/commit-mono@5.3.0, DepartureMono-Regular.woff2
  (22,496 B) from rektdeckard/departure-mono@v1.500, plus both OFL licence texts
  (`LICENSE-CommitMono.txt`, `LICENSE-DepartureMono.txt`).
- `site/build.mjs` — fonts copied to `dist/fonts/` (missing source throws);
  brand glyph `❯` span in `navFor()`.
- `site/src/pages/*.astro` — identical brand-glyph edit ×7 (byte-verified vs
  navFor by the impl reviewer).
- `site/tests/site-s5.test.ts` — 4 additive gates (existing 12 byte-identical):
  css url()-resolution + OFL licences in dist/fonts; no `@import` (case-
  insensitive); dist gz-size ≤ 1,572,864; head integrity (charset/viewport/base)
  + structural anchors (skip link, aria-current, site-foot, :focus-visible).
- `site/tests/artifact.test.ts` — dist path anchored to import.meta.url
  (workspace-invocation bug found by test reviewer, fixed in-cycle).
- `docs/research/2026-09-15-site-theme-pi-dev.md` — research doc (v2_6 protocol,
  audit round 1 applied).

## IS-C contrast record (WCAG, computed)

Dark: body 11.84 · headings 13.79 · muted 6.76 · links 6.01 · CTA text 6.71 ·
footer/nav muted-on-deep 7.55 · code 11.03. Light: body 8.27 · headings 11.00 ·
muted 5.81 · links 5.23 · CTA text 5.76 · footer/nav muted-on-deep 4.52 · code
11.92. Notice strong (composited bg): dark 7.89, light 6.05 (after `--warn`
light fix #8a6420 → #6f4d13, found by impl review round 1 at 4.23). All ≥ 4.5:1.

## Review cycle (fresh adversarial agents, sequential)

- Plan validator agent_68bfcdd4: r1 MINOR-FAIL (8) → r2 MINOR-FAIL (3 stale
  internal refs) → r3 **PASS**.
- Impl reviewer agent_67f02771: r1 MINOR-FAIL (5: light --warn contrast, th
  background, licence filenames, glyph space, cta 0.75rem band) → r2 **PASS**
  (build ×2 md5-identical, 134/134, tsc+eslint exit 0, dist 150,012 B gz vs
  1,572,864 cap).
- Test reviewer agent_8d1100fd: r1 MINOR-FAIL (5: artifact.test cwd bug, @import
  case, base-href + anchors unpinned, IS-L ungated) → r2 **PASS** (removal-verified
  fail directions for each new assertion).
- Security-reviewer: skipped with justification — diff touches no auth/input/
  crypto surface; the only file I/O is copyFileSync from repo-controlled sources;
  repo's own check-banned gate green.

## Verification

- `npm run verify` → VERIFY OK stage=8 (typecheck, lint, build, test 134/134,
  smoke incl. check-banned, bundle, TTFB).
- Site suite 17 green from repo root AND workspace cwd.
- Visual (local serve at /voltbase/, screenshots): desktop 1280 dark home +
  api-reference + errors table; mobile 390 dark home; light home + api-reference
  via forced-token harness (IAB cannot emulate prefers-color-scheme; harness is
  /tmp-only, same token values with the media wrapper removed — not committed).
- pagefind real index regenerated (15,581 B, 7 pages); dist 25 files, ~150 KB gz.

## Commit

Single commit to master (no co-author attribution, per user instruction). Push
triggers CI (5 contexts) + Pages publish (paths: site/**).
