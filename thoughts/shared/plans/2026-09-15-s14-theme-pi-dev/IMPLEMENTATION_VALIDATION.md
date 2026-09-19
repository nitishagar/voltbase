<!-- SIGNPOST | 4/5: IMPLEMENTATION_VALIDATION | adversarial review of the S14 diff | Prev: PLAN_VALIDATION.md | Next: TEST_VALIDATION -->
# S14 — Implementation Validation (adversarial review)

Reviewer: independent (not the implementer). Standard: every item defaults to FAIL until the diff earns PASS with `file:line` evidence; plan divergence is FAIL unless the plan itself was wrong.

Diff reviewed (git status/diff, 2026-09-15): `site/src/styles.css` (rewrite), `site/build.mjs` (2 edits), 7 × `site/src/pages/*.astro` (brand-glyph edit), `site/tests/site-s5.test.ts` (zlib import + 4 tests), new `site/src/fonts/` (3 woff2 + 2 OFL .txt). Untracked `thoughts/` plan artifacts excluded per review brief.

## 1. Plan conformance

| Plan element | Verdict | Evidence |
|---|---|---|
| Dark tokens mapped from pi.dev (#161d27/#0d1116 canvas/deep, #ebe7e4 ink, #9fa4ab muted, #495059 line, #6a9fcc accent) | PASS | `site/src/styles.css:10-19` — values match research Seam D exactly (line as 50%-alpha #49505980, consistent with pi.dev's alpha-token pattern) |
| rust/warn tokens | PASS (note) | `site/src/styles.css:20-21` — warn = sunkissed #e1b06e exact; rust = terracotta-light #b86b52, not dark accent-rust #8f3222. Plan says "mapped", value unpinned; #8f3222 would be a sub-3:1 border on canvas, so the lighter terracotta is the defensible mapping. Non-text use only (notice border, `styles.css:227`) |
| Georgia-first serif / Commit Mono code / Departure Mono accent | PASS | `site/src/styles.css:26-28` |
| `--max: 44rem`, 18px root | PASS | `site/src/styles.css:25`, `:79` |
| @font-face ×3 with font-display swap | PASS | `site/src/styles.css:52-74` (400/700 Commit Mono, 400 Departure Mono; all `font-display: swap`) |
| `@media (prefers-color-scheme: light)` with AA-adjusted solid tokens | PASS | `site/src/styles.css:31-50`; all 7 recorded light pairs verified numerically ≥4.5:1 (§2, IS-C) |
| CTA primary = accent fill + dark canvas text | PASS | `site/src/styles.css:301-302` with `--accent-ink: #0d1116` (`:19`); 6.71:1 measured. Light adaptation #f4f2f0/#4b607c = 5.76:1 (recorded pair) |
| notice = rust-tinted | PASS (note) | `site/src/styles.css:225-232` — rust border + left 3px, background is the warn tint (--warn-bg), strong uses --warn (`:234-236`). Rust is present as the defining edge; plan pinned both rust and warn tokens, not the notice background hex |
| cards = flat tinted panels | PASS | `site/src/styles.css:332-337` — `--panel` surface tint (#ffffff08 dark / #f4f2f0 light solid) + line border; radius 0.25rem unchanged from S5 ("no radius inflation") |
| tables = horizontal-rule style, mono uppercase headings | PASS | Horizontal rules: `site/src/styles.css:270-275` (border-bottom only; old all-around border dropped vs `git show HEAD`); mono uppercase `:277-286`; **tinted heading row present — `th { background: var(--panel) }` (`:284`)**, contrast verified both schemes (§2) |
| :focus-visible ring | PASS | `site/src/styles.css:96-99` — 2px accent outline, offset 2px, global |
| brand-glyph span in navFor + all 7 astro mirrors | PASS | `site/build.mjs:56` and all 7 astro headers byte-identical (verified programmatically), matching the plan's literal markup `❯</span> voltbase` (PLAN.md:39) including the text space; `.brand-glyph` carries colour only, no margin (`styles.css:142-144`) |
| fonts copied to dist/fonts | PASS | `site/build.mjs:358-362`; verified on disk after build: 3 woff2 + 2 OFL txt in `site/dist/fonts/` |
| 4 additive tests exactly as specified (Phase 4) | PASS | `site/tests/site-s5.test.ts:205-243` — (1) every css url() resolves inside dist via /voltbase/ prefix (`:205-215`), (2) no `@import` (`:217-220`), (3) summed gzip ≤ 1,572,864 (`:222-235`), (4) charset+viewport on all 7 pages (`:237-243`). All four match PLAN.md:104 |
| existing 12 tests untouched | PASS | `git diff` on the test file shows the zlib import + additions only; HEAD had 12 `it(` blocks, working tree 16 |
| Light-scheme element coverage | PASS | Every color declaration consumes a token that is overridden in the light block; the one hard-coded value, `::selection` background `#4b607c40` (`styles.css:91-94`), was verified in both schemes (dark 11.18:1, light 7.83:1 on the composited selection background) |

**Divergences found in the first pass — all five fixed in place and re-verified (Re-validation 2026-09-15, second pass):**
1. Licence filenames: now `site/src/fonts/LICENSE-CommitMono.txt` / `LICENSE-DepartureMono.txt` per PLAN.md:76; OFL texts with copyright notices intact (`LICENSE-CommitMono.txt:1`, `LICENSE-DepartureMono.txt:1`); copied to `dist/fonts` by the same loop and md5-stable across rebuilds.
2. Table heading row: `th { background: var(--panel) }` added (`styles.css:284`).
3. Brand-glyph markup: literal text space added, byte-identical in `navFor` and all 7 astro files (`build.mjs:56`); `.brand-glyph` margin removed (`styles.css:142-144`); astro diff vs HEAD is exactly the 7 brand lines.
4. CTA label size: 0.75rem, inside the plan's 0.7-0.75rem band (`styles.css:298`).
5. IS-C light warn pair: `--warn` light now #6f4d13 (`styles.css:45`), pair verified and recorded (§2 IS-C).

## 2. Spec invariants (IMPLICIT_SPEC.md)

- **IS-A zero scripts/fetches** — PASS. Build throws on `<script` (`site/build.mjs:376-381`, pre-existing); no `fetch(` in css or html (gate `site-s5.test.ts:146-154` green); new css loads nothing at runtime — 3 url()s, all `/voltbase/fonts/*.woff2`, all gate-asserted (`:205-215`).
- **IS-B charset/viewport** — PASS. `doc()` head untouched (`site/build.mjs:67-68`); now gate-pinned (`site-s5.test.ts:237-243`).
- **IS-C contrast** — PASS. Recorded pairs verified: token values in `styles.css` match the claimed set exactly — dark [#d5d8db/#161d27 = 11.84, #ebe7e4/#161d27 = 13.79, #9fa4ab/#161d27 = 6.76, #6a9fcc/#161d27 = 6.01, #0d1116/#6a9fcc = 6.71, #9fa4ab/#0d1116 = 7.55, #d5d8db/#142433 = 11.03], light [#384251/#ebe7e4 = 8.27, #252f3d/#ebe7e4 = 11.00, #5c5752/#ebe7e4 = 5.81, #4b607c/#ebe7e4 = 5.23, #f4f2f0/#4b607c = 5.76, #5c5752/#dacbc2 = 4.52, #252f3d/#eef1f3 = 11.92] — all ≥4.5:1. The first pass found `.notice strong` in the light scheme (then #8a6420 on the composited tint) at 4.23:1 < 4.5:1 with the pair unrecorded. **Fixed: light `--warn` is now #6f4d13 (`styles.css:45`), computing 6.05:1 on the composited #eacd7c1f-over-#ebe7e4 notice background; dark `.notice strong` #e1b06e on the composited #e1b06e0d-over-#161d27 tint computes 7.89:1 (both recorded here as part of the set, satisfying plan decision 4's "notice text" enumeration for both schemes).** Tinted `th` row verified: 6.23:1 dark (muted on --panel over canvas), 6.40:1 light (5c5752/f4f2f0).
- **IS-D base path** — PASS. `<base href="/voltbase/">` (`site/build.mjs:72`) and stylesheet link (`:71`) untouched; link-resolution gate green.
- **IS-E allowlist** — PASS. No new external hosts (astro diff = brand line only); CSS url() loophole closed by the additive test (`site-s5.test.ts:205-215`).
- **IS-F pagefind** — PASS. Real binary index path and labelled fallback (`site/build.mjs:280-337`) byte-untouched per `git diff`; threshold test green (real index, page_count ≥ 7).
- **IS-G anchors** — PASS. h1/main/skip/nav/footer and `aria-current` untouched; suite green.
- **IS-H/IS-I pins** — PASS. Content untouched (PAGES bodies unchanged per `git diff`); 13-token and 7-token sets green.
- **IS-J hand-sync** — PASS. Brand anchor byte-identical in `navFor` and all 7 astro files; astro diff vs HEAD = brand line only; programmatic astro-vs-PAGES body diff shows only pre-existing whitespace formatting (`<ul> <li>` vs `<ul><li>`) and the pre-existing `(IS-04)` marker in attributions (present in HEAD) — no new drift, pre-existing drift deliberately not widened (consistent with the plan's treatment of the `<base>` gap).
- **IS-K dist budget** — PASS. Gate added (`site-s5.test.ts:222-235`); measured: 25 files, 150,005 B summed gzip vs 1,572,864 cap.
- **IS-L font legality** — PASS. Only OFL files committed; both licence texts carry copyright notices (`site/src/fonts/LICENSE-CommitMono.txt:1`, `site/src/fonts/LICENSE-DepartureMono.txt:1`) under the plan-conforming filenames and ship into `dist/fonts` (OFL redistribution requirement satisfied artifact-adjacent). No Plantin files anywhere.
- **IS-M theme mechanism** — PASS. Only `@media (prefers-color-scheme: light)` (`styles.css:31`); zero JS.
- **IS-N a11y floor** — PASS. `:focus-visible` ring global (`styles.css:96-99`); skip link visible on focus with an AA pair (accent bg + accent-ink text, `styles.css:106-113`; 6.71:1 dark / 5.76:1 light); nav `aria-label`/`aria-current` untouched; tables remain semantic `<thead>/<tbody>`.
- **IS-O gate honesty** — PASS. Additions only; all pre-existing assertions byte-identical per `git diff`.

## 3. Failure edges

- **Build idempotency** — PASS. `rmSync` then `mkdirSync` (`site/build.mjs:340-341`); two consecutive `npm run build` runs produced md5-identical `styles.css` and all 5 `dist/fonts` files (pagefind index byte-drift of ~9 B between runs is pre-existing binary behaviour, not diff-introduced).
- **copyFileSync fail-fast** — PASS. `readdirSync` throws if `src/fonts/` is missing and `copyFileSync` throws ENOENT per missing file (`site/build.mjs:360-361`); no try/catch swallows it; the why-comment (`:355-357`) documents the intent. Matches plan decision 5 (no bespoke fail-fast).
- **Pagefind fallback path untouched** — PASS. `site/build.mjs:280-337` absent from the diff.

## 4. Cost-model conformance

PASS. Fonts (118 KB raw, ~incompressible) are the only new payload; the copy loop adds nothing else, and `dist` measured 150,005 B summed gzip (10.5× headroom) — the new gate (`site-s5.test.ts:222-235`) asserts the plan's exact 1,572,864 B cap. No unbudgeted artifact cost anywhere in the diff.

## 5. Anti-pattern sweep

PASS. The build change is a 6-line copy loop — no DI/abstraction/config/retained state. CSS: no specificity conflicts found (the two same-specificity collisions — `nav a:hover` vs `nav a[aria-current="page"]`, `.cta:hover` vs `.cta.secondary:hover` — resolve correctly by source order, `styles.css:167-175`, `:309-323`); no missing fallbacks (font stacks end in generic families, `styles.css:26-28`); no light-scheme gaps (§1); selection contrast verified both schemes. One recorded note: `html { font-size: 18px }` (`styles.css:79`) overrides the user's browser font-size preference — plan-pinned value (PLAN.md:18), so not a divergence, but it should be revisited as `112.5%` in a future pass.

## 6. Common defects

PASS with notes. No unhandled errors or swallowed exceptions introduced (`build.mjs:312` catch is the pre-existing pagefind fallback, untouched). No off-by-one (budget cap = plan's exact bytes; url() slice strips exactly `/voltbase/`). **No scope creep**: the diff touches exactly the six planned surfaces; Worker/packages/CI/package.json untouched; PAGES copy byte-identical; astro edits limited to the brand line. Markup drift between `navFor` and the 7 astro headers: none (byte-identical). Note: PLAN.md:108 says "13 existing + 4 new = 17" — a plan-side miscount of the site-s5 suite (12+4=16, per PLAN.md:19/:104); with the pre-existing S1 artifact gate the full site suite is 17 green — see findings note 9. `docs/ledger/S14-*` stage reports (PLAN.md:106) are not yet written — local-only docs step, outside the reviewed diff.

## 7. Convention fit

PASS. Hand-written style preserved (no build step, ADR-001 noted in the header comment, `styles.css:1-7`); comments are why-only (build.mjs:355-357 licence/fail-fast rationale; test file :201-203 S14 scope note; styles.css header theme rationale — no what-restating). `npx tsc --noEmit` exit 0; `npx eslint site/` exit 0. `npm test` 134/134 green (130 baseline + 4 new); `npm run verify` → VERIFY OK stage=8, matching the plan's baseline stage.

## Findings summary

### First pass (2026-09-15) — MINOR-FAIL
1. IS-C light miss: `.notice strong` #8a6420 on #eacd7c1f-over-canvas = 4.23:1 < 4.5 (`styles.css:45,46,236`); pair absent from the recorded set.
2. Table heading row not tinted vs PLAN.md:86 (`styles.css:278-286`).
3. Licence filenames diverged from PLAN.md:76.
4. Brand-glyph markup lacked the plan's literal space (PLAN.md:39); spacing via `styles.css:144` instead.
5. CTA label 0.78rem outside the plan's 0.7-0.75rem band (PLAN.md:86).

### Re-validation (2026-09-15, second pass) — all five fixed and re-verified
- Light `--warn` → #6f4d13 (`styles.css:45`): `.notice strong` pair recomputes to 6.05:1 light / 7.89:1 dark (composited); pair now recorded in §2 IS-C.
- `th { background: var(--panel) }` added (`styles.css:284`); heading-row contrast 6.23:1 dark / 6.40:1 light.
- Licence files renamed to `LICENSE-CommitMono.txt` / `LICENSE-DepartureMono.txt` per PLAN.md:76; copyright notices intact; emitted to `dist/fonts` and md5-stable across rebuilds.
- Brand markup now `❯</span> voltbase` (literal space) byte-identical in `site/build.mjs:56` and all 7 astro mirrors; `.brand-glyph` margin removed (`styles.css:142-144`); astro diff vs HEAD is exactly the 7 brand lines.
- `.cta` font-size 0.75rem (`styles.css:298`), inside the band.

Re-run evidence: `npm run build` ×2 → md5-identical `dist/styles.css` + all 5 `dist/fonts` files; site suite 17/17 (12 existing + 4 S14 additive in `site-s5.test.ts` + 1 in `artifact.test.ts`); full suite 134/134; `npx tsc --noEmit` exit 0; `npx eslint site/` exit 0; dist 150,012 B summed gzip vs 1,572,864 cap; emitted `dist/index.html` carries the spaced brand markup and `dist/styles.css` the #6f4d13 token.

### Notes accepted without change (for the record)
6. Token rename `--wash`/`--warn-line` → `--panel`/`--rust`/`--warn` accepted as plan-internal: Phase 2's own token list (PLAN.md:86) governs over the "Default choices" paragraph (PLAN.md:61); no dangling references.
7. Dark `--rust` uses pi.dev terracotta-light #b86b52 rather than dark accent-rust #8f3222 (`styles.css:20`) — plan unpinned, non-text use only.
8. `--panel` #ffffff08 vs pi.dev surface-tint #ffffff05 (`styles.css:17`) — 3/255 alpha delta, plan unpinned.
9. Test-count arithmetic: site suite = 16 (`site-s5.test.ts`: 12 existing + 4 S14 additive) + 1 (`artifact.test.ts`) = 17 green, matching PLAN.md:19's "12 existing UNCHANGED plus 4 additive" plus the S1 artifact gate; PLAN.md:108's "17" was a plan-side miscount, now consistent.
10. `html { font-size: 18px }` (`styles.css:79`) kept — plan-pinned; recorded as a future a11y refinement candidate (user font-size preference override).
11. `docs/ledger/S14-*` stage reports (PLAN.md:106) remain pending — local-only docs step, outside the reviewed diff.

No open findings remain: all five first-pass divergences/misses are fixed with verified evidence; no correctness break, no gate weakening, no scope creep, no budget breach.

VERDICT: PASS
