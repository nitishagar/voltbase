<!-- SIGNPOST | 5/5: TEST_VALIDATION | adversarial review of the S14 gate additions | pipeline: SPEC -> PLAN -> PLAN_VALIDATION -> implement+review -> tests+TEST_VALIDATION -> green -->
# TEST_VALIDATION — S14 additive site gates (adversarial test review)

Reviewed: `site/tests/site-s5.test.ts` (4 S14 additions, lines 201–243), `site/tests/artifact.test.ts`, `site/tests/global-setup.ts` against `IMPLICIT_SPEC.md` (IS-A…IS-O) and `PLAN.md` (Phase 4 + Testing Strategy). Artifact under test: `site/dist` (read-only; **not** rebuilt).

Method: suite run twice (root cwd: 17/17 green; `site/` cwd: 16/17 — see F1), plus mutation probing: exact replicas of the 4 new assertion bodies executed against mutated **copies** of dist in `/tmp/vb-probe` (real dist untouched; `git status` confirms only `site/tests/site-s5.test.ts` modified). Every fail direction below was reproduced empirically, not reasoned by eye.

**Re-validation (2026-09-15, after the 5 findings were addressed in place):** both test files re-read; suite re-run from root AND `site/` cwd — 17/17 from both; diff hunks re-checked; all strengthened assertions re-probed against mutated dist copies. Results recorded inline per finding; all five now hold. Final verdict below updated to match.

## Checklist 1 — Invariant coverage

| Invariant | Gate that catches a future violation | Status |
|---|---|---|
| IS-A zero scripts/fetches | build throw `site/build.mjs:378-381` (`<script`), gate `site-s5.test.ts:146-154` (`<script`/`fetch(` in html, `fetch(` in css), **NEW** font/url test `:206-215` (css `url()` local), **NEW** t2 `:223-226` (no `@import`, case-insensitive). Any runtime load requires a script tag, css `url()`, or `@import` — all three gated. | PASS |
| IS-B charset + viewport | **NEW** head-integrity test `:243-255`. Was unpinned (spec flagged it); now pinned. Mutation-verified: removing either meta from any page fails. | PASS |
| IS-B charset + viewport | **NEW** t4 `:237-243`. Was unpinned (spec flagged it); now pinned. Mutation-verified: removing either meta from any page fails. | PASS |
| IS-C readable contrast | No gate — deliberate per `PLAN.md:112-113` (numeric verification, no colour-parsing dependency). All 26 text/background pairs computed from `dist/styles.css` tokens (table below): minimum 4.52:1, all ≥ 4.5. | JUSTIFIED-MANUAL |
| IS-D base-path integrity | `:45` (stylesheet link), `:91-130` (internal links resolve to dist files), and — after re-validation — `<base href="/voltbase/" />` asserted per page in the head-integrity test (`:248`); removal mutation-verified FAIL. | PASS |
| IS-E external-host allowlist | HTML side `:104-108`; CSS side closed by **NEW** font/url test `:206-215` — mutation-verified: `url("https://fonts.example.com/…")` and relative `url(./fonts/x.woff2)` both fail. The IS-E "CSS url() is not gate-checked" carve-out in the spec is now stale in the good direction. | PASS |
| IS-F pagefind contract | `:49-74`, honest dual branch. Current artifact is the real branch (entry `page_count: 7`, 8 KB threshold met); fallback branch demands `/fallback/i` generator + ≥7 entries + ≥2048 B. Both branches have real thresholds; no silent pass. | PASS |
| IS-G structural anchors | `:32-37` pins existence, 'voltbase', `data-pagefind-body`, `<h1`. After re-validation, skip link (`class="skip"`), nav `aria-current="page"`, and `site-foot` are asserted per page in the head-integrity test (`:249-251`); each removal mutation-verified FAIL. | PASS |
| IS-H licensing pins | `:76-88`, `:132-137`, `:156-163` (presence + absence + secret-shape). | PASS |
| IS-I content tokens | `:165-199` (13-token + 7-token sets). | PASS |
| IS-J hand-sync | No automated test; `PLAN.md:114` verifier diff of astro vs PAGES bodies. Feasible as a containment test but plan-scoped manual. | JUSTIFIED-MANUAL |
| IS-K dist budget | **NEW** t3 `:228-241`. Mutation-verified: +2 MB high-entropy font → total 2,247,855 > cap FAIL; +1.6 MB → 1,788,960 FAIL; +100 KB css → pass (no false trip). | PASS |
| IS-L font legality | After re-validation, the font test pins OFL redistribution: `dist/fonts/LICENSE-CommitMono.txt` + `LICENSE-DepartureMono.txt` must exist and match `/SIL Open Font License/i` (`:216-220`); deletion and non-OFL-text mutations verified FAIL. Licence-legality itself remains human judgement (a licence can be OFL-named but misapplied), but the redistribution artefacts are now gate-pinned. | PASS |
| IS-M theme mechanism CSS-only | Transitive via IS-A mechanisms: zero-script throw, css `url()` local, no `@import`. A JS toggle cannot enter the artifact unnoticed. | PASS |
| IS-N accessibility floor | Contrast half verified numerically (IS-C row); after re-validation the presence half is pinned: skip link, `aria-current="page"`, footer per page and `:focus-visible` in css (`:249-254`) — each removal mutation-verified FAIL. `main id="main"` remains transitively pinned via `#main`-targeting skip link resolution + `data-pagefind-body`. | PASS |
| IS-O gate honesty | `git diff -U0` hunk placement re-verified after re-validation: site-s5.test.ts hunks are only the `node:zlib` import (`:4`) and the S14 region (`:200+`) — existing 12 assertions byte-identical; artifact.test.ts change is the F1 fix (same assertion, robust path anchor — a strengthening, not a weakening). Count reconciles with `PLAN.md:108`: 12 + 4 = 16 in site-s5 + 1 in artifact.test.ts = 17 site-project tests, 17/17 from both root and `site/` cwd. | PASS |

### Phase-4 claims vs the 4 tests (each fail-direction reproduced)

1. "every css url() resolves to a dist file" (now also shipping OFL licences) → `site-s5.test.ts:206-221`. External font url FAIL (verified), font file deleted with url kept FAIL (verified), relative url FAIL, `@IMPORT url(https://…)` FAIL via t1 even though t2 misses uppercase. Has the anti-tautology guard `urls.length > 0` so regex rot cannot silently vacate it. Re-validation adds: licence file deletion FAIL, non-OFL licence text FAIL. **PASS.**
2. "no @import in dist css" → `:223-226`. Lowercase `@import "theme.css"` FAIL (verified). Re-validation: the regex is now `/@import/i` — the previously evasive uppercase `@IMPORT "theme.css"` string form FAILs (verified). Residual false-positive on the literal token inside comments is fail-closed, acceptable. **PASS.**
3. "dist gz ≤ 1,572,864" → `:228-241`. Would it catch a 2 MB font? Yes — probed with 2 MB of `crypto.randomBytes` (realistic incompressible woff2; a naive single-byte buffer is RLE-compressible to ~2 KB and is NOT a valid probe — first probe attempt proved exactly that trap): gz 2,097,815 → total 2,247,855 → FAIL. **PASS.**
4. "charset + viewport + head integrity + structural anchors on every page" → `:243-255`. Removal of charset, viewport, `<base href>`, skip link, `aria-current="page"`, or footer on any slug FAILs (all verified); css `:focus-visible` removal FAILs (verified). Note it pins exact emit bytes: a spec-valid `charset="UTF-8"` variant FAILs (verified) — strict pin of the canonical `doc()` form; acceptable for a gate, not a semantic check. **PASS.**

## Checklist 2 — Real assertions

All four new tests assert concrete artifact properties with proven fail directions (table above); no `expect(true)`, no no-exception tests, no try/catch swallowing. t1's `toBeGreaterThan(0)` guard prevents the classic "regex matched nothing → loop vacuously passes" tautology. t2 is the weakest (single substring) but is mutation-verified sensitive. **PASS.**

## Checklist 3 — Over-mocking

N/A — all tests read the real built artifact from disk; no mocks, no module stubbing anywhere in the reviewed files. **PASS.**

## Checklist 4 — Determinism

- **Pagefind real-vs-fallback:** branch is selected by which file exists in the built artifact (`:55`), not by network or environment at test time; both branches carry real thresholds. Current dist is the real branch and satisfies it. No flake.
- **Gzip sums:** `gzipSync` is deterministic for fixed input; zlib version drift across node 22 patch releases shifts output by bytes, against 1,422,852 B (90.5%) headroom at the current 150,012 B total — irrelevant. No flake.
- **Paths:** all site tests (including `artifact.test.ts:9` after the F1 fix) anchor `dist` to `import.meta.url` — verified cwd-independent: 17/17 green from repo root AND from `site/` (re-verified after re-validation). The canonical root invocation (`npm test`, CI `ci.yml:53-54`, ubuntu-latest + node 22) and the workspace invocation (`npm run test -w @voltbase/site`) are both green.
- **Ordering / mutable state:** the new tests are pure reads of dist, no shared globals, no writeback, order-independent; `readdirSync` ordering is irrelevant to sums and existence checks. **PASS.**

## Checklist 5 — Repo test-style fit

Same `describe`/`it` block, same vitest public API imports, same `node:`-prefixed fs/path imports, same file-located `dist` constant and `SLUGS`/`readHtml` helpers as the existing file; comments follow the existing style (S14 additions banner mirrors the file's voice). No vitest config, global-setup, or CI changes required or made; global-setup fail-fast ("no silent rebuilds") untouched. **PASS.**

## IS-C contrast ratios (recorded per PLAN Approach decision 4; WCAG 2.x, alpha tokens composited)

| Pair | Dark | Light | Need |
|---|---|---|---|
| body text / canvas | 11.84 | 8.27 | 4.5 |
| heading ink / canvas | 13.79 | 11.00 | 4.5 |
| muted lede + nav links / canvas | 6.76 | 5.81 | 4.5 |
| footer muted / bg-deep | 7.55 | **4.52 (tightest)** | 4.5 |
| accent link / canvas | 6.01 | 5.23 | 4.5 |
| cta primary ink / accent fill | 6.71 | 5.76 | 4.5 |
| cta secondary accent / canvas | 6.01 | 5.23 | 4.5 |
| notice warn + text / warn-bg over canvas | 8.58 / 11.84 | 6.22 / 8.27 | 4.5 |
| code ink / code-bg | 11.03 | 11.92 | 4.5 |
| th muted / panel over canvas | 6.76 | 5.81 | 4.5 |
| brand ink / bg-deep | 15.41 | 8.57 | 4.5 |

The pre-empted white-on-accent (2.82:1) pairing does not exist: `.cta` uses `--accent-ink` on accent fill. All pairs clear AA.

## Findings (re-validation status)

- **F1 (was: minor, pre-existing) — RESOLVED** `site/tests/artifact.test.ts:9` — dist now resolved via `import.meta.url`; verified 17/17 from root AND `site/` cwd.
- **F2 (was: minor, new code) — RESOLVED** `site/tests/site-s5.test.ts:225` — regex is now `/@import/i`; the previously evasive `@IMPORT "x.css"` mutation now FAILs (re-probed).
- **F3 (was: gap, pre-existing) — RESOLVED** `site/tests/site-s5.test.ts:248` — `<base href="/voltbase/" />` asserted per page; removal mutation FAILs.
- **F4 (was: gap, pre-existing) — RESOLVED** `site/tests/site-s5.test.ts:249-254` — skip link, `aria-current="page"`, `site-foot`, and css `:focus-visible` asserted; each removal mutation FAILs.
- **F5 (was: gap) — RESOLVED** `site/tests/site-s5.test.ts:216-220` — `dist/fonts/LICENSE-{CommitMono,DepartureMono}.txt` must exist and match `/SIL Open Font License/i`; deletion and non-OFL-text mutations FAIL. Both shipped licence files verified to contain the OFL string (no false positive).
- **F6 (note, fail-closed, accepted)** `site-s5.test.ts:212` — a `data:`-URI font in css `url()` fails the font test (stricter than the HTML-side allowlist which permits `data:`); intentional-looking, and inline fonts would blow the IS-K budget anyway. `@import` inside a css comment trips t2 (fail-closed).
- **F7 (positive, verified)** Budget enforcement is real: 2 MB high-entropy font → 2,247,855 B > 1,572,864 FAIL; 1.6 MB → 1,788,960 FAIL; today's 150,012 B leaves 90.5% headroom — no zlib-drift flake possible.
- **F8 (positive, verified)** IS-O holds after re-validation: site-s5.test.ts diff confined to the import line + S14 region (existing 12 assertions byte-identical); still exactly 4 additive tests, strengthened in place; counts reconcile with PLAN.md:108 (17 site-project tests, 17/17 green from both cwds); PLAN.md Phase 4 text updated to describe the strengthened tests accurately.

Substantively the four S14 gates do what Phase 4 claims and fail when they should (empirically proven, not assumed). At first review the verdict was MINOR-FAIL on F1/F2 plus the F3–F5 coverage gaps; re-validation confirms all five were addressed in place and each fix was re-probed for a real fail direction (not just eyeballed). The suite is now honest, sensitive, deterministic from both invocation cwds, and style-consistent, with no weakening of the pre-existing gates.

VERDICT: PASS
