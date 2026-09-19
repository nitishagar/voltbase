<!-- SIGNPOST | 2/5: PLAN | single source of truth; implementation must conform — divergence means changing the plan, not improvising
     Prev: IMPLICIT_SPEC.md | Next: PLAN_VALIDATION.md -->
# S14 — Re-theme voltbase site to pi.dev visual language — Implementation Plan
scale: medium

## Overview
Re-skin the 7-page static Pages artifact (stylesheet + shared emit templates + 7 astro mirrors) to pi.dev's dark-first editorial-terminal design: serif display/body, monospace accents, steel-blue on near-black, CSS-only light scheme — with four additive gate tests and zero changes to page copy, URLs, or the Worker. Single hard core (research §Hard Cores); one plan, phases are ordinary steps.

## Current State
All facts verified in the research doc's Evidence Ledger (docs/research/2026-09-15-site-theme-pi-dev.md); cited here, not restated:
- Light-only green-accented sans theme in `site/src/styles.css:2-13`; zero `@media` rules.
- Canonical emit `site/build.mjs` (doc/navFor/FOOT templates, `PAGES` copy at :86-252, zero-script throw at :370-373); 7 astro mirrors hand-synced (`IS-J`).
- Gate suite `site/tests/site-s5.test.ts` (12 tests) is the artifact specification; `site/dist` has no size gate (`scripts/check-bundle.sh:13` measures the Worker).
- pi.dev tokens/type facts: research Seam D. Font licences: research Seam E.
- Baseline: `npm run verify` → VERIFY OK stage=8 at commit 28780a8.

## Desired End State
- Every emitted page renders in the pi.dev visual language: dark-first surfaces (#161d27 canvas / #0d1116 deep), steel-blue accent (#6a9fcc), serif body+headings (Georgia-first system stack), Commit Mono for code/labels, mono-uppercase nav/CTA labels; light scheme via `prefers-color-scheme` with AA-adjusted tokens.
- `npm run verify` green with the 12 existing tests UNCHANGED plus 4 additive assertions (every css url() resolves to a dist file; no `@import`; dist size ≤ 1,572,864 gz bytes; charset+viewport declared on every page).
- Contrast recorded numerically for both schemes (IS-C); visual screenshots reviewed (desktop + mobile, both schemes) before push; single commit, no co-author attribution; push triggers Pages redeploy.

## What We're NOT Doing
- No Worker/API/package changes (packages/**, src/** untouched); no CI/workflow edits.
- No page copy rewrites, no new/removed pages or slugs, no URL or asset-name changes (`styles.css` stays; same 7 routes).
- No JavaScript of any kind in the artifact (no theme toggle, no search UI — pagefind runtime stays pruned, IS-F).
- No Plantin MT Pro files anywhere (IS-L); no font CDN/@import (IS-E/IS-A); no external links added (IS-E) — including no pi.dev attribution link.
- No astro build migration (build.mjs stays canonical); no `<base href>` added to astro heads (pre-existing divergence documented in research Seam B — not widened, not closed here).
- No logo asset creation; the brand stays text ("voltbase" + one text glyph).

## Approach
CSS-carried theme: the stylesheet carries ~90% of the change (token values + typography + component restyle); markup edits stay minimal and class-stable so the gate's structural anchors (IS-G) and content pins (IS-H/I) are untouched by construction. Fonts are committed files (argued below), copied by build.mjs. Light scheme is a media-query override of the same custom properties — zero JS (IS-M), and its token values are AA-adjusted derivatives of pi.dev's light palette rather than blind alpha copies (advisor finding 2: pi.dev's composited muted ≈3.6:1 on moonstone fails IS-C).

Key decisions tied to invariants:
1. **Self-host Commit Mono 400/700 + Departure Mono Regular (woff2) vs pure system stacks** — typography is the load-bearing carrier of the pi.dev look (mono labels + mono code are visible on every page); cost is 3 files ≈117 KB raw inside a 43 KB dist with a 1.5 MiB budget (IS-K arithmetic below) and both fonts are OFL with licence texts committed (IS-L). System-stack-only would save ~117 KB but lose the signature; rejected.
2. **Serif = `Georgia, 'Times New Roman', serif`** — exactly pi.dev's own fallback chain (`pi.dev/style.css:202`); Plantin MT Pro prohibited (IS-L); zero bytes.
3. **Dark-first `:root` + `@media (prefers-color-scheme: light)` overrides** — pi.dev is dark-first; CSS-only per IS-M; no manual toggle ships (IS-M; bounding assumption 2).
4. **Light tokens AA-adjusted by hand** — muted/lede tones chosen solid (e.g. driftwood #5c5752-family); ALL text/background pairs enumerated for verification: body, muted/lede, links/accent text, CTA text (both variants), notice text, code, footer, table headings. Known-failing pairing pre-empted: white text on accent fill #6a9fcc computes 2.82:1, so `.cta` primary uses accent fill with DARK canvas text (computed ≥4.5:1, e.g. #0d1116-class ink) and `.cta.secondary` uses accent border + accent text; ratios recorded in TEST_VALIDATION (IS-C).
5. **No new build fail-fast for fonts** — `copyFileSync` already throws ENOENT on a missing source; the additive dist-side test (every css url() resolves to a dist file) is the single checking mechanism (advisor finding 3 — no duplication).
6. **Class-stable markup edits only**: brand gets a terminal-prompt glyph span (`<span class="brand-glyph" aria-hidden="true">❯</span>`), index h1/lede get hero spacing purely via CSS; nav/footer markup unchanged except classes already present. Astro mirrors receive the identical edits (IS-J).

## Design Analysis  (medium — full)
- **Invariants → mechanism**:
  - IS-A zero scripts/fetches — CSS-only theme; no new markup loading anything; additive url()-resolution + no-`@import` tests.
  - IS-B charset/viewport — `doc()` template untouched in head except nothing removed; astro heads untouched in this respect.
  - IS-C contrast — AA-adjusted token values; numeric verification recorded during implementation (both schemes).
  - IS-D base path — no URL/asset renames; stylesheet keeps `/voltbase/styles.css`; `<base>` untouched.
  - IS-E allowlist — no new external links; fonts self-hosted; additive url()-resolution test closes the CSS-side loophole.
  - IS-F pagefind — page body text unchanged (same copy), so index quality unchanged; threshold test re-run.
  - IS-G anchors — class-stable edits; h1/main/skip/nav/footer preserved; gate re-run.
  - IS-H/I pins — copy untouched; gate re-run.
  - IS-J hand-sync — the astro edit is a mechanical repetition of the build.mjs edits (same 3 touch-points: brand glyph span, head font-preload none, any class additions); verifier diffs headings/copy between PAGES and astro bodies.
  - IS-K dist budget — additive test: sum of per-file gzip sizes of dist ≤ 1,572,864; fonts inside it (arithmetic below).
  - IS-L font legality — only OFL files (Commit Mono, Departure Mono) + their licence texts committed at `site/src/fonts/`.
  - IS-M theme mechanism — media queries only.
  - IS-N a11y — `:focus-visible` rings restyled (never removed); skip link restyled but visible on focus; nav `aria-*` untouched; tables keep semantic markup with pi.dev-style borders.
  - IS-O gate honesty — existing assertions untouched; additions only.
- **Failure & concurrency**: static single-process emit — no concurrency. Partial failure: build is rm-then-emit; a failed run leaves dist incomplete but the next run regenerates fully (idempotent); CI re-runs cleanly. Font source missing → copyFileSync throws (build fails loudly — intended). Pagefind binary absent offline → existing labelled-fallback path (`build.mjs:316-337`) unchanged. No tracked state, no cleanup gaps, no locks.
- **Simplicity guardrails**: no new dependencies (fonts committed, not npm packages — hermetic and offline-reproducible); no DI/abstraction/config; one `copyOrphans`-style loop in build.mjs (~6 lines); no retained state; no bespoke crypto/parsing.
- **Blast radius**: `styles.css` consumers = 7 emitted pages + 7 astro files (all updated in lockstep); build.mjs consumers = root `package.json:16` build script, CI build/test jobs (`.github/workflows/ci.yml:36-53`), Pages workflow (`.github/workflows/pages.yml:35`); real dist consumers = the site gates (`site/tests/site-s5.test.ts:6`, `site/tests/artifact.test.ts:7`) and the Pages upload step (`pages.yml:39`) — smoke-check/check-ttfb import the Worker directly and never touch dist (validator-corrected). Back-compat: URL structure and asset names unchanged; rollback = revert the single commit.
- **Alternatives considered**: (1) system-stacks-only — rejected per decision 1. (2) Migrate to real `astro build` as part of the theme — rejected: doubles blast radius for zero visual gain; build.mjs is canonical and proven. (3) Dark-only scheme — rejected: pi.dev ships both; AA-adjusted light tokens cost ~15 extra CSS lines; recorded as the one over-constraint relaxation kept deliberately (bounding assumption 2).
- **Default choices**: existing token NAMES kept (`--ink/--muted/--line/--wash/--accent/…`) with new values + a few additions (`--bg-deep`, `--font-serif`, `--font-mono`, `--font-accent`) — minimises template churn; `--max` 46rem → 44rem (pi.dev metric); default code font stays mono stack headed by Commit Mono. No deviations from repo conventions otherwise.

## Scale Cost Model
N/A — not perf/scale-sensitive (static emit, no runtime ops). The only cost unit is artifact bytes; computed once:
| Payload | raw | gz |
|---|---|---|
| dist today | 43,220 B | 27,736 B |
| + CommitMono 400/700 woff2 (48,128 + 47,304) | +95,432 B | ≈ +93 KB (fonts ~incompressible) |
| + DepartureMono Regular woff2 (22,496) | +22,496 B | ≈ +22 KB |
| **projected total** | ≈161 KB | ≈143 KB |
Verdict: ≈143 KB gz ≪ 1,572,864 B budget; flat regardless of future content growth (fonts are fixed-size). Accepted.

## Phase 1: Fonts in-repo + build emit
### Changes
#### Font assets — `site/src/fonts/`
Add `CommitMono-400.woff2` (48,128 B), `CommitMono-700.woff2` (47,304 B) — fontsource path `files/commit-mono-latin-<w>-normal.woff2` at @fontsource/commit-mono 5.3.0, OFL — and `DepartureMono-Regular.woff2` (rektdeckard/departure-mono v1.500, OFL), plus `LICENSE-CommitMono.txt`, `LICENSE-DepartureMono.txt` (OFL texts with copyright notices).
#### Emit — `site/build.mjs`
After the `styles.css` copy line (:354), copy `src/fonts/*` into `dist/fonts/` (mkdir + loop). The pagefind walk already covers new files automatically.
### Success Criteria
- [x] Automated: `npm run build` succeeds; `site/dist/fonts/` contains the 3 woff2 + licence files; existing gate green (`npm test`). (25 files emitted, 130/130 tests)
- [x] Manual: file sizes match Seam E numbers (±10%). (48,128 / 47,304 / 22,496 — exact)

## Phase 2: styles.css re-theme
### Changes
#### Stylesheet — `site/src/styles.css`
Full rewrite of values, same architecture: `:root` dark tokens mapped from pi.dev (canvas/deep/text/muted/line/accent/rust/surface tints + `--font-serif/--font-mono/--font-accent` stacks, `--max: 44rem`); `@font-face` ×3 (swap); `@media (prefers-color-scheme: light)` overrides with AA-adjusted solid tokens; body/headings serif per stacks; `pre/code` + nav/cta labels mono (nav/cta: accent-mono uppercase 0.7-0.75rem letter-spaced); `.card` → flat tinted panel (surface-tint + line border, no radius inflation); `.notice` → rust-tinted; `.cta` → mono bordered (primary = accent fill); tables → pi.dev rules (horizontal lines, tinted heading row); `:focus-visible` accent ring; `.skip`/`.site-head`/`.site-foot` restyled to deep/canvas zones. No `@import`, no `url()` except the three font files.
### Success Criteria
- [x] Automated: build + full test suite green; css contains no `@import`/`fetch(`.
- [x] Manual: computed contrast ratios for ALL text/background pairs enumerated in Approach decision 4, both schemes, all ≥4.5:1 — numbers recorded in docs/ledger/S14-brief.md (dark 6.01-13.79, light 4.52-11.92; notice strong re-computed 6.05 light / 7.89 dark after --warn fix).

## Phase 3: Template + astro mirror markup edits
### Changes
#### Emit templates — `site/build.mjs` (navFor/FOOT/doc/PAGES index)
Brand: `<a class="brand" …><span class="brand-glyph" aria-hidden="true">❯</span> voltbase</a>` in `navFor()` (:55-61). Index body: wrap nothing new — h1 + `.lede` get hero treatment via CSS only (phase 2); all other copy byte-identical.
#### Mirrors — 7 × `site/src/pages/*.astro`
Apply the identical brand-glyph edit to each header. No other astro changes.
### Success Criteria
- [x] Automated: build + tests green (all IS-G/IS-H/IS-I pins re-verified by the suite; 134/134).
- [x] Manual: diff of astro vs PAGES bodies shows only the brand-glyph delta vs pre-change state (impl reviewer byte-verified navFor vs all 7 astro headers).

## Phase 4: Additive gates + local verification + ship
### Changes
#### Gate — `site/tests/site-s5.test.ts`
Add 4 tests (existing 12 untouched; strengthened per TEST_VALIDATION): (1) every `url()` in dist/styles.css resolves to a file inside dist AND the OFL licence texts ship in dist/fonts (covers font files, closes the external-`url()` runtime-load loophole — validator F2 — and pins IS-L); (2) dist css has no `@import` (case-insensitive); (3) summed gzip size of all dist files ≤ 1,572,864; (4) every dist html declares charset + viewport + `<base href="/voltbase/" />` + skip link + aria-current + footer (IS-B/IS-D/IS-G post-edit verification — validator F4 + gaps 3/4), and dist css pins :focus-visible (IS-N). Also fixes artifact.test.ts to resolve dist via import.meta.url (workspace-invocation bug).
#### Docs/ledger
`docs/ledger/S14-*.md` stage reports; LEDGER.md updates (local-only); README theme note only if it contradicts (it doesn't).
### Success Criteria
- [x] Automated: `npm run verify` → VERIFY OK stage=8; site suite 17 green (12+4 S14 in site-s5.test.ts + 1 artifact gate), full suite 134/134.
- [x] Manual: served dist at /voltbase/; screenshots reviewed: desktop 1280 dark (home, api-reference, errors table), mobile 390 dark (home), light home + light api-reference via forced-token harness (IAB cannot emulate prefers-color-scheme; same token values, wrapper removed). Fonts confirmed loading. THEN commit (no co-author) + push; Pages/CI confirmed post-push.

## Testing Strategy
- Existing 12 gate tests = regression spec (unchanged). Additive: css url()-resolution, no-`@import`, dist budget, charset+viewport presence (IS-E/IS-A/IS-K/IS-B mechanisms).
- IS-C gets numeric verification (contrast ratios) recorded in the stage report, not a gate (no colour-parsing dependency justified for a one-off).
- IS-J gets a verifier diff of astro bodies vs PAGES bodies.
- Full `npm run verify` (typecheck, lint, build, test, smoke incl. worker checks) before any push.

## References
- Research: docs/research/2026-09-15-site-theme-pi-dev.md (Evidence Ledger + Seam D pi.dev tokens + Seam E licences)
- Spec: thoughts/shared/plans/2026-09-15-s14-theme-pi-dev/IMPLICIT_SPEC.md
- pi.dev/style.css (fetched 2026-09-15; tokens at :95-330, type at :202-211, :446-464 — reference only, not committed)
- Prior stage pattern: docs/ledger/S5-brief.md (site gate origin), docs/ledger/S13-brief.md (flip wiring)
