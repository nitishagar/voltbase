<!-- SIGNPOST | 1/5: SPEC | requirements only, no designs | Next: PLAN.md
     Pipeline: SPEC -> PLAN -> PLAN_VALIDATION -> implement+review -> tests+TEST_VALIDATION -> green -->
# IMPLICIT_SPEC — S14 site re-theme (pi.dev visual language)

Source: docs/research/2026-09-15-site-theme-pi-dev.md (evidence ledger + audit round 1 applied).
Scope: the Pages artifact only (site/**) — the Worker, packages/* and docs/ copy are untouched.

## Invariants (each change must uphold all of them; evidence in the research ledger)

- **IS-A Zero scripts, zero runtime fetches** — no `<script` in emitted HTML (build throws AND gate asserts); no `fetch(` literal in emitted html or css (gate-only). (`site/build.mjs:370-373`, `site/tests/site-s5.test.ts:145-153`)
- **IS-B Document charset + viewport** — every emitted page declares `<meta charset="utf-8" />` and the viewport meta. (`site/build.mjs:66-68`; no gate pins this — do not lose it)
- **IS-C Readable contrast** — body text ≥4.5:1 against its background (display text ≥3:1) in every shipped colour scheme. styles.css has zero `@media` rules today; adaptive behaviour arrives with this change.
- **IS-D Base-path integrity** — `<base href="/voltbase/" />` and stylesheet link `/voltbase/styles.css` on every emitted page; internal links stay under `/voltbase/…`; every internal link resolves to a real dist file. (`site/build.mjs:71-72`, gate `site/tests/site-s5.test.ts:90-129`)
- **IS-E External-host allowlist (HTML)** — external `href|src` limited to the 6 attribution hosts. Adding any new external link in HTML (including pi.dev) fails the gate. CSS `url()` is not gate-checked but must still resolve locally (no runtime loads, IS-08). (`site/tests/site-s5.test.ts:90-129`, `site/astro.config.mjs:6-7`)
- **IS-F Pagefind contract** — index over the themed markup: real ≥7 pages / ≥8192 bytes or honest fallback ≥7 entries / ≥2048 bytes; runtime js/wasm stays pruned. (`site/build.mjs:280-337`, `site/tests/site-s5.test.ts:48-73`)
- **IS-G Structural anchors** — per page: `<main id="main" data-pagefind-body>`, one `<h1>`, 'voltbase', skip link, nav with `aria-current="page"`, footer. (`site/build.mjs:55-83`, `site/tests/site-s5.test.ts:29-46`)
- **IS-H Licensing content pins** — CC0, ODbL, Etalab, CC BY 4.0 tokens present; CLOSED_IDS/CLOSED_NAMES/'providerCopyrighted' absent; DRAFT + 'DPDP Act 2023' + legal 'data-only' present; OCM_API_KEY + NOBIL_API_KEY present, no secret-shaped values. (`site/tests/site-s5.test.ts:75-88,131-162`)
- **IS-I Content token pins** — api-reference 13-token set; mcp-onboarding 7-token set. (`site/tests/site-s5.test.ts:164-198`)
- **IS-J Hand-sync** — build.mjs `PAGES`/templates and `site/src/pages/*.astro` mirror the same headings/copy/markup classes; no silent divergence (pre-existing `<base href>` gap in astro heads may be closed, not widened). (`site/build.mjs:2-8`)
- **IS-K Dist size budget** — `site/dist` has NO size gate today (`scripts/check-bundle.sh:13` measures the Worker source proxy only); measured dist 2026-09-15: 43,220 B raw / 27,736 B gz. The change keeps the artifact small (same 1.5 MiB self-budget spirit as the Worker) and the plan must state the intended font payload; a size assertion may be added to the site gate (additive per IS-O).
- **IS-L Font redistribution legality** — only fonts whose licence permits redistribution ship (SIL OFL, licence + copyright text included in the repo and artifact-adjacent); Plantin MT Pro files never enter the repo. (research Seam E)
- **IS-M Theme mechanism** — zero JS; any theme behaviour must be CSS-only. (IS-A consequence)
- **IS-N Accessibility floor** — skip link, labelled nav, `aria-current`, semantic tables/lists, visible focus indication survive the restyle. (`site/build.mjs:55-83` + a11y conventions)
- **IS-O Gate suite honesty** — existing gate assertions pass UNCHANGED (no weakening of site/tests/*); new assertions may be added where the re-theme introduces unchecked surface (e.g. font asset existence).

## Bounding assumptions (recorded defaults — user may override before implementation)

1. "Match pi.dev" = adopt its visual language (dark-first editorial-terminal: dark surfaces, steel-blue accent, serif display/body + monospace accents); it does NOT mean cloning pi.dev markup, shipping its fonts, or copying its JS.
2. Dark-first default with a CSS-only light scheme via `prefers-color-scheme` (pi.dev is dark-first; its JS toggle is not portable under IS-A). No manual toggle ships.
3. Typography: serif = system stack per pi.dev's own fallback (Georgia-first; Plantin MT Pro prohibited by IS-L); mono = Commit Mono (OFL) self-hosted for body-code/labels; pixel accent (Departure Mono, OFL) optional and only if bundle budget allows.
4. Page copy is unchanged except where IS-H/IS-I require it to survive verbatim; no new external links (IS-E).
5. The artifact gate suite remains the specification; new tests only tighten (IS-O).
6. Local verification precedes any push (Pages auto-publishes on push to master touching site/**); commits carry no co-author attribution.
