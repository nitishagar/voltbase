<!-- SIGNPOST | 3/5: PLAN_VALIDATION | adversarial re-derivation of the Design Analysis; verdict gates implementation
     Prev: PLAN.md | Next: implement+review -->
# PLAN_VALIDATION — S14 site re-theme (pi.dev visual language)

Reviewer: independent adversarial review (did not author SPEC/PLAN). Date: 2026-09-15.
Scale: medium — full Design Analysis re-derived (spec coverage + blast radius + anti-pattern sweep); cost model declared N/A and sanity-checked against the plan's own budget table. Every factual premise re-verified against code and live sources; nothing accepted because it "looks reasonable".

Inputs read in full: IMPLICIT_SPEC.md, PLAN.md, docs/research/2026-09-15-site-theme-pi-dev.md, site/build.mjs, site/src/styles.css, site/src/pages/*.astro (7), site/tests/{site-s5,artifact,global-setup}.*, site/{package.json,vitest.config.ts,astro.config.mjs}, scripts/{check-bundle,smoke,verify,check-banned,smoke-check,check-ttfb}, .github/workflows/{ci,pages}.yml, root package.json, vitest.config.ts, .gitignore, git state.

## 0. Factual premise verification (independently re-checked)

| Premise | Plan/research claim | Re-derived result | Verdict |
|---|---|---|---|
| styles.css copy line | `site/build.mjs:354` | `copyFileSync(join(here,'src','styles.css'), join(outDir,'styles.css'))` at build.mjs:354 | CONFIRMED |
| Zero-script throw | build.mjs:370-373 | `/<script/i` loop + `throw` at 370-373 | CONFIRMED |
| doc()/navFor()/PAGES cites | :55-61, :66-68, :71-72, :86-252 | all match (navFor 55-61; charset/viewport 67-68; link+base 71-72; PAGES 86-252) | CONFIRMED |
| Pagefind + fallback cites | :280-337, :316-337 | match (fallback `mkdirSync` at 316) | CONFIRMED |
| Gate suite shape | 12 tests, additive room | exactly 12 `it(` blocks in site-s5.test.ts (13th grep hit is `raw.split('#')`); plain vitest `describe`, `include: ['tests/**/*.test.ts']` — additive `it`s fit with zero config change | CONFIRMED |
| Gate scans HTML href\|src only | regex at site-s5.test.ts:122 | `/(?:href|src)="([^"]+)"/g` at :122; CSS `url()` untouched by any existing test | CONFIRMED |
| styles.css zero `@media` | full read | zero `@media` in the 169-line file | CONFIRMED |
| dist baseline | 43,220 raw / 27,736 gz | raw re-measured: 43,220 B (exact). gz re-measured with `gzip -c` per-file sum: 28,091 B — gz numbers are tool-dependent (plan used another measurement); immaterial at 55x margin | CONFIRMED (raw exact; gz tool-dependent) |
| check-bundle measures Worker only | scripts/check-bundle.sh:14 | true claim, but the gzip command is line 13 (line 14 is the `tr`); cite off by one | CONFIRMED w/ cite fix |
| root build script | package.json:19 | `"build": "node site/build.mjs"` is line 16 (line 19 is `format`); cite off by three | CONFIRMED w/ cite fix |
| CI/Pages wiring | ci.yml:36-53, pages.yml:35 | build job 37-44, test job 46-54, pages build at :35, upload path `site/dist` at :39 | CONFIRMED |
| @fontsource/commit-mono@5.3.0 woff2 retrievable | Seam E sizes 47,304 (400) / 48,128 (700) | jsdelivr data API + downloaded both files: **400-normal.woff2 = 48,128 B; 700-normal.woff2 = 47,304 B — the plan's two weight↔size values are swapped** (total 95,432 B identical, so the budget table total is unaffected). Filename convention is `files/commit-mono-latin-400-normal.woff2`, NOT `files/woff2/latin/400-normal.woff2` (nothing in the plan cites the wrong path, so the premise "retrievable" holds). Package `/LICENSE` is the SIL OFL 1.1 text | CONFIRMED w/ swap fix |
| Departure Mono v1.500 woff2 | 22,496 B, OFL | downloaded v1.500 release zip: `DepartureMono-Regular.woff2` = 22,496 B exactly, `LICENSE` (OFL) included | CONFIRMED |
| Baseline commit | 28780a8 | HEAD = 28780a8; `git log -- site/` = 2 commits; LEDGER.md gitignored; no `.gitignore` pattern excludes woff2/fonts | CONFIRMED |
| **smoke-check consumes dist** | PLAN blast radius: "dist consumers = smoke-check (`GET /voltbase/`-serving checks)"; research Seam C: smoke "serves/requests dist" | **FALSE.** `scripts/smoke-check.mjs` imports the Worker app directly (`../packages/mcp/worker/index.ts`) and never touches site/dist; the Worker's `GET /` serves a hardcoded landing fragment (packages/mcp/worker/index.ts:149-150), not dist. check-ttfb.mjs likewise imports the Worker. smoke.sh = smoke-check + check-bundle (Worker sources) + check-ttfb — zero dist coupling. Real dist consumers: site/tests gates (site-s5.test.ts:6, artifact.test.ts:7), pages.yml:39 upload, live Pages URL | REFUTED (F1) |
| gzip-in-vitest constraint | none stated | site/vitest.config.ts runs `environment: 'node'` on Node 22; `node:zlib.gzipSync` is available and needs no config change | CONFIRMED — no missed constraint |

Contrast arithmetic (computed, WCAG relative luminance):
- pi.dev dark tokens on canvas #161d27: text #ebe7e4 = 13.79:1; muted-base #9fa4ab = 6.76:1; accent #6a9fcc as link text = 6.01:1 — all pass IS-C as solid tokens.
- pi.dev light tokens (solid, not alpha-composited): driftwood #5c5752 on moonstone #ebe7e4 = 5.81:1; tidal-blue #4b607c = 5.23:1; evening-blue #252f3d = 11.00:1 — plan decision 4's "solid AA-adjusted" approach is arithmetically sufficient.
- **white (#ffffff, today's `--accent-ink`) on accent #6a9fcc = 2.82:1 — fails both 4.5:1 and 3:1.** This is the one pairing arithmetically known to fail, and the current `.cta` markup pattern (accent fill + accent-ink text) carries it forward unless the text colour changes. Deep #0d1116 on accent = 6.71:1 passes; in the light scheme white on tidal-blue = 6.43:1 passes. Details under item (7)/F3.

## 1. Spec coverage re-derivation (IS-A … IS-O → named mechanism)

| Invariant | Plan mechanism | Independent assessment |
|---|---|---|
| IS-A zero scripts/fetches | CSS-only theme; no new loading markup; additive no-`@import` test; existing throw+gate untouched | PASS. Gap: the additive no-`@import` test does not catch an external `url()` inside `@font-face src` (the main CSS-side runtime-load vector). Phase 2's authored constraint "no `url()` except the three font files" covers the present change, but the plan's claim that the test "closes the CSS-side loophole" overstates (F2) |
| IS-B charset/viewport | `doc()` head untouched; astro heads untouched | Mechanism holds by construction (Phase 3 edits are confined to `navFor()`/brand anchor and astro bodies). But no success criterion — manual or automated — re-verifies charset/viewport after the edits, and no gate pins it (F4) |
| IS-C contrast | AA-adjusted solid tokens; accent pairings computed ≥4.5:1 before finalising (decision 4); numbers recorded in stage report | Mechanism named and the approach is arithmetically sound (section 0). BUT Phase 2's manual criterion enumerates only "body/muted/lede/link text vs their backgrounds" and Phase 2 leaves the `.cta` primary text colour unspecified while keeping "primary = accent fill" — the exact pairing that computes 2.82:1 if the carried-over `--accent-ink` default survives. Decision 4 implies it is caught; the phase text does not require it (F3) |
| IS-D base path | no URL/asset renames; `/voltbase/styles.css` kept; `<base>` untouched; link-resolution gate re-run | PASS |
| IS-E allowlist | no new external links; fonts self-hosted; additive no-`@import` test | PASS for HTML (allowlist gate re-run). CSS-side see IS-A/F2 — recommend the additive test reject any `url()` that does not resolve to a dist file |
| IS-F pagefind | copy unchanged → index quality unchanged; threshold test re-run; runtime pruning untouched | PASS. Brand-glyph span lands in the header (outside `data-pagefind-body`), fonts are non-HTML — index inputs unchanged |
| IS-G structural anchors | class-stable edits; h1/main/skip/nav/footer preserved; gate re-run | PASS. Verified: glyph span is inside `.brand`, adds no h1, keeps the 'voltbase' string |
| IS-H/IS-I content pins | copy untouched; gate re-run | PASS |
| IS-J hand-sync | mechanical repetition of the same brand-glyph edit across 7 astro files; verifier diff | PASS with wording note: "diff of astro vs PAGES bodies" literally always differs (syntax/heads); the checkable form is a git diff of both sides showing only the glyph delta. Manual-only is defensible (astro is mirror-only, S5 precedent) |
| IS-K dist budget | intended payload stated (3 woff2); additive summed-gzip ≤ 1,572,864 test | PASS. Arithmetic re-checked: 27,736 + 95,432 + 22,496 = 145,664 B ≈ 142 KiB ("≈143 KB", fine); per-file gzip sum is ≥ whole-stream gzip, i.e. conservative direction; margin ~10.8x |
| IS-L font legality | OFL-only files + licence texts committed at site/src/fonts/; copied into dist/fonts (artifact-adjacent-plus) | PASS. Both sources verified to ship OFL texts (section 0); Phase 1 criterion checks licence-file presence; no Plantin anywhere in the plan |
| IS-M theme mechanism | `@media (prefers-color-scheme: light)` override of custom properties; zero JS | PASS |
| IS-N a11y floor | `:focus-visible` restyled never removed; skip link visible on focus; nav aria untouched; tables semantic | PASS. Note: no gate asserts `aria-current` (verified — site-s5.test.ts has no such assertion), so survival rests on the "nav markup unchanged" construction, which Phase 3 states explicitly |
| IS-O gate honesty | existing assertions untouched; additions only | PASS. Verified additive surface: font-target existence, no-`@import`, size — none weaken existing tests |

Coverage: 15/15 invariants have a named mechanism. Two mechanisms need wording/scope strengthening (F2, F3) and one invariant lacks any verification line (F4).

## 2. Blast radius re-derivation

- Changed interfaces: (a) styles.css content — consumers: 7 emitted pages (build.mjs doc() :71), 7 astro files (e.g. index.astro:13), gate test 2 (site-s5.test.ts:39-46) — enumerated correctly, except the gate-as-consumer is absent from the blast-radius line though covered elsewhere in the plan; (b) build.mjs — consumers: root package.json:16 (plan says :19, F5), CI build/test jobs (ci.yml:37-54), pages.yml:35; (c) new site/src/fonts/* — consumers: build.mjs copy + styles.css `@font-face src`; (d) site/tests additions — consumer: root `npm test` via site/vitest.config.ts project registration (no config change needed — verified).
- **False entry (F1):** smoke-check is not a dist consumer (section 0). No real dist consumer is missed — the error over-states risk rather than hiding it, and the plan already runs full `verify` (which includes smoke) — but the premise is false and inherited unverified from research Seam C.
- Back-compat: URL structure, slug set, asset names (`styles.css`) unchanged — verified against build.mjs emit and robots/pins. Rollback: single commit revert; pages.yml redeploys only on push — consistent.
- Worker/pages/** untouched: verified consistent with `npm run verify` (smoke/ttfb/bundle all import the Worker, which the plan does not touch).

## 3. Anti-pattern sweep

- Needless DI/abstraction/config: none — plan states and the phase list confirms (no new files except fonts, no config, one ~6-line copy loop).
- Hand-rolled primitives: the gzip size check via node:zlib is a stdlib call, not a hand-rolled compressor. PASS.
- Needlesly retained state: none; build is rm-then-emit, stateless. PASS.
- Dev-scale-only I/O: no runtime I/O introduced; font copy is build-time. PASS.
- Overcomplex locking: none; single-process emit, no concurrency claimed — correct. PASS.
- Premature config: none. The `--max` 46→44rem change is a design value, not config surface.
- Choices that could be suspects, each with a named concrete need: (1) committed font files vs an `@fontsource` devDep — plan justifies (no new deps, hermetic offline build; the copy step must not depend on node_modules layout). Counter-note: pagefind is already an npm-provided build input (site/package.json devDep, resolved from node_modules in build.mjs:283-285), so the devDep pattern also fits; the plan's justification is adequate but not the only defensible one. (2) No permanent contrast gate — justified as a one-off (CSS colour-parsing gate is brittle for a single re-theme); numbers recorded instead. (3) No permanent astro/PAGES diff gate — justified by mirror-only status quo. All three accepted.

## 4. Cost model sanity check (declared N/A)

Declaration is correct: static emit, no runtime ops — no perf/scale model applies. The plan does not dodge the one real cost unit: the budget table is present and its arithmetic holds (145,664 B projected vs 1,572,864 cap; raw dist re-measured exactly 43,220 B). One nit: the font gz estimates (~93/22 KB) assume woff2 is gzip-neutral, which is right (woff2 is already compressed; gzip adds only framing bytes). N/A declaration: JUSTIFIED.

## 5. Decomposition check

Single hard core claim: honest. The research's audit-honesty note (item 19) demands font-legality and content-pin failure modes stay explicit gates — the plan keeps them as IS-L (Phase 1 licence files + criterion) and gate re-runs (Phase 3). Verified the two candidate "hidden second cores" are ordinary steps: (a) font acquisition — I retrieved both fonts, correct sizes and licence texts in three commands, so no separate acquisition/validation stage is needed; (b) light-scheme AA tuning — bounded: the solid pi.dev light tokens already clear 4.5:1 (5.81/5.23/11.00), so it is value-picking, not an open design problem. No phase hides a second hard core. 4 ordinary phases: fair.

## 6. Checklist verdicts

1. **Every spec invariant has a named mechanism — PASS** (15/15 named; IS-E wording overclaim F2, IS-C phase-text gap F3 tracked separately).
2. **Failure/partial-failure edges handled — PASS.** rm-then-emit is idempotent; a mid-emit failure leaves a partial dist that the gate then fails loudly (global-setup only checks existence, but test 2 `existsSync(styles.css)` and the new font-target test catch the missing pieces; `npm run verify` chains build→test so the throw stops the chain); `copyFileSync` ENOENT on a missing font fails the build by design (decision 5 — correctness preserved, not traded); pagefind-absent fallback path unchanged (build.mjs:316-337 verified). No tracked state exists to release; plan states this correctly.
3. **All callers/consumers enumerated + back-compat/rollback — PASS with required correction.** One enumerated consumer is false (F1: smoke-check consumes the Worker, not dist); the true consumer set (gates, pages.yml:39, live URL) is fully covered; URLs/asset names unchanged; rollback = revert single commit.
4. **No correctness traded for "simpler" — PASS.** Decision 5 keeps fail-fast; no test weakening anywhere (IS-O additive-only, verified against the 12 assertions).
5. **No unjustified new pattern — PASS.** Committed fonts vs the existing pagefind-devDep precedent: justified (hermeticity), noted as not the only defensible choice; everything else reuses existing mechanisms (token names, copy loop, gate file).
6. **No TBDs / no spec smuggling — PASS.** No open questions in the plan; the dual-theme decision is a spec bounding assumption explicitly labelled "user may override", matching the research's "open to plan" item (a) — recorded default, not smuggling.
7. **Success criteria verify the invariants — PASS with required strengthening.** Criteria tie to gates (15/15), font presence+sizes (IS-K/IS-L), contrast numbers (IS-C), sync diff (IS-J), screenshots+verify before push (deploy coupling). Deficiencies: F3 (contrast enumeration omits the accent-fill/CTA, notice, code-bg, footer pairings — the one arithmetically known-failing pairing lives exactly there), F4 (IS-B has no verification line at all).
8. **Anti-pattern sweep — PASS** (section 3; every deviation has a named present need).
9. **Decomposition honesty — PASS** (section 5).

## 7. Findings (fix in plan text before implementation)

- **F1 (factual, must fix):** Blast radius lists smoke-check as a dist consumer. Verified false: smoke-check.mjs/check-ttfb.mjs import the Worker directly (Worker `GET /` is a hardcoded fragment, packages/mcp/worker/index.ts:149-150); check-bundle.sh gzips Worker sources. Replace with the real dist consumers: site/tests gates (site-s5.test.ts:6, artifact.test.ts:7) and pages.yml:39 + live URL. The same error exists in research Seam C ("smoke ... serves/requests dist").
- **F2 (scope, must fix):** The additive no-`@import` test does not "close the CSS-side loophole" — an external `url()` in `@font-face src` is a runtime load neither it nor the HTML allowlist catches. Widen additive test (1) to: every `url(` in dist/styles.css resolves to a file under dist (equivalently: reject any non-`/voltbase/` url()), which subsumes the font-target check.
- **F3 (contrast, must fix):** Phase 2 leaves `.cta` primary text colour unspecified over "primary = accent fill"; white (`--accent-ink`, today's value) on pi.dev accent #6a9fcc computes 2.82:1 — fails IS-C. Decision 4 implies accent pairings are computed, but the phase text and the Phase-2 criterion enumeration ("body/muted/lede/link text vs their backgrounds") do not name CTA/accent-fill, muted-on-wash/deep zones, code-on-code-bg, or notice pairings. Fix: state the CTA text token (e.g. `--bg-deep` on accent = 6.71:1, or lighten the fill) and enumerate all text/background pairs in the criterion.
- **F4 (verification, must fix):** IS-B (charset/viewport) has a construction mechanism but no verification line anywhere. Add one manual criterion line (or a trivial additive assertion: every dist html contains the charset and viewport metas) — it is the only invariant with zero post-edit check.
- **F5 (citations, should fix):** `package.json:19` → :16; `scripts/check-bundle.sh:14` → :13. Plan claims all facts are ledger-verified; stale cites undermine that.
- **F6 (fact swap, must fix):** Commit Mono weight↔size values are swapped: 400-normal.woff2 = 48,128 B, 700-normal.woff2 = 47,304 B (verified by download). Total 95,432 B unchanged — budget table and IS-K arithmetic unaffected. Also note the actual fontsource path convention (`files/commit-mono-latin-<weight>-normal.woff2`) so the implementer does not hunt for `files/woff2/latin/…`.
- **F7 (wording, should fix):** Phase 3/IS-J criterion "diff of astro vs PAGES bodies" — state the checkable form: git diff of both sides vs pre-change shows only the brand-glyph delta on each side.
- **F8 (nit):** "15/15 site-gate assertions" counts site-s5.test.ts only; artifact.test.ts adds a 13th existing site assertion (16 after additions). Scope the phrasing or update the count.

No finding requires architecture, phasing, or scope change; F1–F6 are plan-text edits of roughly a dozen lines total.

## 8. Re-validation round 1 (2026-09-15, in-place plan update)

Per-item confirmation against the updated PLAN.md / IMPLICIT_SPEC.md / research doc:

- **F1 — RESOLVED.** PLAN.md:59 now lists the real dist consumers with cites (site-s5.test.ts:6, artifact.test.ts:7, pages.yml:39) and states smoke-check/check-ttfb import the Worker directly and never touch dist. Matches code (verified round 0).
- **F2 — RESOLVED at the mechanism, residual wording left.** PLAN.md:104 test (1) is now "every `url()` in dist/styles.css resolves to a file inside dist … closes the external-`url()` runtime-load loophole" — correct and subsumes font-target existence. Residual: PLAN.md:47 (IS-E bullet) still says "additive no-`@import` test closes the CSS-side loophole" — the exact overclaim F2 named; PLAN.md:43 (IS-A) mentions only no-`@import`; PLAN.md:38 (decision 5) parenthetical still reads "(font url() targets exist)"; PLAN.md:112 (Testing Strategy) lists the old trio. The operative Changes section governs, but the summary bullets now contradict it. → R3 below.
- **F3 — RESOLVED.** PLAN.md:37 (decision 4) enumerates ALL text/background pairs (body, muted/lede, links/accent text, CTA text both variants, notice, code, footer, table headings), pre-empts white-on-accent #6a9fcc = 2.82:1 explicitly, and pins `.cta` primary = accent fill + dark canvas text (≥4.5:1); PLAN.md:89 (Phase 2 manual criterion) binds the full enumerated list in both schemes.
- **F4 — RESOLVED.** PLAN.md:104 test (4): every dist html declares charset + viewport (IS-B post-edit verification).
- **F5 — PARTIAL.** `package.json:16` fixed in blast radius (PLAN.md:59). But PLAN.md:13 (Current State) still cites `scripts/check-bundle.sh:14` while the companions were both corrected to :13 (IMPLICIT_SPEC.md:20; research :82, :105) — the plan now contradicts its own companions. → R2 below.
- **F6 — RESOLVED.** PLAN.md:68 cost table "(48,128 + 47,304)" (sum 95,432 intact); PLAN.md:76 Phase 1 states per-weight sizes and the fontsource path `files/commit-mono-latin-<w>-normal.woff2`; research :74 and :127 corrected to 400=48,128 / 700=47,304. Matches downloaded reality.
- **F8 — PARTIAL.** PLAN.md:108 success criterion is correct ("13 existing + 4 new = 17"), but PLAN.md:7 (Overview) still says "three additive gate tests", PLAN.md:19 (Desired End State) still says "plus 3 additive assertions (font targets exist; no `@import` in css; dist size ≤ 1,572,864 gz bytes)" — omitting the new charset/viewport test — and PLAN.md:112 (Testing Strategy) lists three additive mechanisms. The single-source-of-truth document now asserts 3 and 4 in different sections. → R1 below.
- **F7 (should-fix, non-blocking):** PLAN.md:99 unchanged; acceptable as scoped.

Remaining findings (each a one-line plan edit; nothing factual-about-the-world remains wrong):

- **R1 (from F8):** Sync the additive-test count to four everywhere — PLAN.md:7, PLAN.md:19 (add "every dist html declares charset + viewport" to the list), PLAN.md:112.
- **R2 (from F5):** PLAN.md:13 `check-bundle.sh:14` → `:13` (align with IMPLICIT_SPEC.md:20 and research :82/:105).
- **R3 (from F2):** Sync PLAN.md:47 (IS-E) and :43 (IS-A) to credit the widened url()-resolution test (not no-`@import` alone) with closing the CSS-side loophole; update the decision-5 parenthetical at PLAN.md:38.

No re-derivation was repeated; mechanisms, arithmetic, blast radius, and decomposition from round 0 stand.

### Re-validation round 2 (2026-09-15) — residuals cleared

- **R1 cleared:** PLAN.md:7 now says "four additive gate tests"; PLAN.md:19 lists all four assertions by name (every css url() resolves to a dist file; no `@import`; dist size; charset+viewport on every page); PLAN.md:112 lists the four mechanisms with IS-B added to the invariant mapping. Consistent with Phase 4 (:104) and the 13+4=17 criterion (:108).
- **R2 cleared:** PLAN.md:13 now cites `scripts/check-bundle.sh:13`, matching IMPLICIT_SPEC.md:20 and the research doc.
- **R3 cleared:** PLAN.md:43 (IS-A) credits "additive url()-resolution + no-`@import` tests"; PLAN.md:47 (IS-E) credits the url()-resolution test with closing the CSS-side loophole; PLAN.md:38 (decision 5) parenthetical now reads "(every css url() resolves to a dist file)" — no font-scoped wording remains anywhere.

All round-0 findings (F1–F8) and round-1 residuals (R1–R3) are resolved; the plan is internally consistent and every factual premise checked in round 0 stands verified.

VERDICT: PASS
