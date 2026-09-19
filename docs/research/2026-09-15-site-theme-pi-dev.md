---
date: 2026-09-15T16:10:00+05:30
researcher: orchestrator (ZCode)
git_commit: 28780a8ac86a269b4b9fe6110afc924f906480b7
branch: master
repository: nitishagar/voltbase
topic: "Re-theme the voltbase docs site to match pi.dev's visual design (styles + shared templates) while keeping the static artifact gate green"
tags: [research, codebase, site, theme, pi-dev]
scale: medium
status: complete
last_updated: 2026-09-15
last_updated_by: orchestrator (ZCode)
---

# Research: voltbase site theme match to pi.dev

## Research Question
"Update https://nitishagar.github.io/voltbase/ theme more like https://pi.dev/ — re-theme the site in ~/repos/learn/voltbase to the pi.dev design language, test locally, push. What must the change uphold?"

## Summary
The voltbase site is a fully static 7-page docs artifact: one hand-written stylesheet (`site/src/styles.css`, 169 lines) plus a canonical generator (`site/build.mjs`) whose `PAGES` object emits all HTML, with 7 `.astro` files kept in sync by hand as the future Astro-build path. An artifact gate suite (`site/tests/site-s5.test.ts`, 12 tests) asserts structural, licensing and security properties of the BUILT `site/dist` — a re-theme may change every color/font/spacing token and the shared `doc()`/`navFor()`/`FOOT` templates, but must keep all gate assertions, the zero-`<script>` property, and the `/voltbase/` base path. pi.dev (verified from its live stylesheet) is a dark-first editorial-terminal design: serif body/display type with monospace accents, steel-blue accent on near-black blue surfaces, a `data-theme` light/dark system driven by JS (not portable here), 18px root. Font licensing splits the decision space: Plantin MT Pro is commercial Monotype (system serif fallback required), while Commit Mono and Departure Mono are SIL OFL and legally self-hostable (~46 KB and ~22 KB per woff2). Single hard core: a cohesive re-theme of shared template + stylesheet that keeps the zero-script static artifact gate fully green.

## Detailed Findings

### Seam A — stylesheet (`site/src/styles.css`)
- Single hand-written file, no build step; ADR-001 notes "CSS default" — `site/src/styles.css:1` [V]
- Token set: `--ink #14202b, --muted #51606f, --line #d9e1e8, --wash #f4f7f9, --accent #0b6e4f (green), --accent-ink #fff, --warn-bg #fff8e6, --warn-line #d9a400, --code-bg #eef2f5, --max 46rem` — `site/src/styles.css:2-13` [V]
- Body: system-ui sans, 1rem/1.6, white background — `site/src/styles.css:17-22` [V]
- Components: `.skip`, `.site-head` (wash bg, bottom border), `.wrap` (max 46rem), `.brand`, `nav ul` flex, `nav a[aria-current]`, `.lede`, `.notice` (warning box), `pre`/`code`, `table`, `.cta-row`, `.cta` + `.cta.secondary`, `.grid-3`, `.card`, `footer.site-foot` — `site/src/styles.css:24-169` [V]
- Copied verbatim into dist by build: `site/build.mjs:354` [V]

### Seam B — emit + templates (`site/build.mjs`, `site/src/pages/*.astro`)
- build.mjs is the canonical static emit ("Emits site/dist from hand-written templates mirroring src/pages/*.astro; astro build stays the future path; kept in sync by hand") — `site/build.mjs:2-8` [V]
- 7 pages in `PAGES` (index, quickstart, api-reference, mcp-onboarding, providers, attributions, legal), each `{title, desc, body}`; bodies are full HTML fragments with `<h1>`, `.lede`, `.grid-3` cards, `pre/code`, tables, links — `site/build.mjs:86-252` [V]
- Shared template `doc()`: emits `<link rel="stylesheet" href="/voltbase/styles.css" />`, `<base href="/voltbase/" />`, `.skip` link, `navFor()` header, `<main id="main" data-pagefind-body>`, `FOOT` footer — `site/build.mjs:50-83` [V]
- Hard fail-fast: any `<script` in emitted HTML throws — `site/build.mjs:370-373` [V]
- Pagefind: real binary over dist, ships INDEX DATA only, prunes runtime `pagefind*.js|css` + `wasm.*`; labelled fallback JSON if binary unavailable — `site/build.mjs:280-337` [V]
- `.astro` mirrors duplicate the same copy (e.g. providers.astro body == build.mjs PAGES.providers.body) — `site/src/pages/providers.astro:30-59` vs `site/build.mjs:199-215` [V]
- Astro config: static output, `site: nitishagar.github.io`, `base: '/voltbase'`; comment IS-08 "the site fetches nothing at runtime" — `site/astro.config.mjs:1-12` [V]
- Advisor note adopted: build.mjs + .astro heads each carry their own `<head>`, so a re-theme touches 9 files on Seam B (build.mjs + 7 astro + styles.css) — agent_52d26902 [R], file count verified by audit [V]
- Audit-flagged divergence inside the mirror: build.mjs emits `<base href="/voltbase/" />` but the .astro heads do not — the two sides are NOT byte-identical today; a restyle must not deepen this divergence silently — audit item 9, `site/build.mjs:72` vs `site/src/pages/providers.astro:6-14` [V]

### Seam C — artifact gate (`site/tests/site-s5.test.ts` + `artifact.test.ts`)
- Gate tests the BUILT dist, never rebuilds (global-setup throws if dist missing) — `site/tests/global-setup.ts:6-15` [V]
- S1 artifact gate (separate file): `site/dist/index.html` exists and mentions voltbase — `site/tests/artifact.test.ts:7-11` [V] (added by audit)
- Gate wiring: site vitest config registers globalSetup "requires a prior build BY DESIGN (no silent rebuilds)"; pagefind pinned 1.5.2; `npm run check` chains build→test — `site/vitest.config.ts`, `site/package.json:17-23` [V] (added by audit)
- Smoke consumer: `npm run smoke` = `scripts/smoke.sh` (`package.json:22`), run as the CI `smoke` job (`.github/workflows/ci.yml:56-64`) and locally in verify; it serves/requests dist and asserts check-bundle + check-ttfb — `package.json:22`, `.github/workflows/ci.yml:56-64` [V] (added by audit)
- Assertions that a re-theme must keep: 7 pages exist, each contains 'voltbase', `data-pagefind-body`, an `<h1>`; `dist/styles.css` exists, contains `:root`, and is linked from every page as `/voltbase/styles.css` — `site/tests/site-s5.test.ts:29-46` [V]
- Closed-data never leaks: CLOSED_IDS (OCM:910001, DATEX2:LU-2ND-001, DATEX2:FR-UNK-001, OCM:920001/920002) and CLOSED_NAMES absent; no 'providerCopyrighted'; no `licence: CLOSED|UNKNOWN` shape — `site/tests/site-s5.test.ts:75-81` [V]
- Open-licence tokens present end-to-end: CC0, ODbL, Etalab, CC BY 4.0 — `site/tests/site-s5.test.ts:83-88` [V]
- Link gate: every `href|src` in HTML must resolve to a dist file, or be an external http(s) URL whose host is in the allowlist {openchargemap.io, www.openstreetmap.org, opendata.ndw.nu, data.public.lu, transport.data.gouv.fr, info.nobil.no} — `site/tests/site-s5.test.ts:90-129` [V]
- Advisor correction (load-bearing): the gate scans ONLY HTML `href|src` — CSS `url()`/`@import` are NOT checked, and self-hosted font `url()` targets are never existence-checked — agent_52d26902 [R], consistent with regex `(?:href|src)="([^"]+)"` at `site/tests/site-s5.test.ts:122` [V]
- Zero-runtime gate: no `<script` and no `fetch(` in any html; no `fetch(` in css — `site/tests/site-s5.test.ts:145-153` [V]
- Pagefind threshold: real index ≥7 pages & ≥8192 bytes, or fallback ≥7 entries & ≥2048 bytes — `site/tests/site-s5.test.ts:48-73` [V]
- Robots gate: Allow: lines present, contains /voltbase/, no blanket `Disallow: /` — `site/tests/site-s5.test.ts:138-143` [V]
- BYOK names-only: OCM_API_KEY + NOBIL_API_KEY present; no key=value shapes; no ghp_/AKIA/sk- secret shapes; no 'BEGIN PRIVATE KEY' — `site/tests/site-s5.test.ts:155-162` [V]
- Content token sets pinned: api-reference (13 tokens incl. '"stage":5', 'POST /mcp'), mcp-onboarding (7 tokens incl. 4 tool names) — `site/tests/site-s5.test.ts:164-198` [V]
- Legal markers: 'DRAFT', 'DPDP Act 2023', legal page contains 'data-only' — `site/tests/site-s5.test.ts:131-136` [V]

### Seam D — pi.dev design system (primary source, fetched 2026-09-15)
- Layer order `reset, tokens, base, layout, components, pages, utilities, overrides`; reset zeroes margins — pi.dev/style.css @layer tokens [V — fetched /tmp/pidev/style.css, lines 54-92]
- Dark-first: `:root { color-scheme: dark; … }`; light via `:root[data-theme="light"] { color-scheme: light; … }`; JS toggle sets data-theme + data-theme-mode (system/light/dark) — pi.dev/style.css:100-246, 246-330; theme-toggle.js in pi.dev/index.html [V]
- Dark tokens: `--bg-deep #0d1116, --bg-canvas #161d27, --line-base #495059, --line-strong-base #757d89, --text-base #d5d8db, --muted-base #9fa4ab, --text #ebe7e4, --muted #9fa4abad, --muted-strong #d5d8dbcc, --accent #6a9fcc, --accent-rust #8f3222, --surface-tint #ffffff05` — pi.dev/style.css:103-160 [V]
- Light tokens: bg-deep=parchment #dacbc2, bg-canvas=moonstone #ebe7e4, panel #f4f2f0, text=evening-blue #252f3df5, muted=driftwood #5c5752c4, accent=tidal-blue #4b607c, accent-rust=terracotta-light #b86b52 — pi.dev/style.css:246-300 [V]
- Named palette: parchment #dacbc2, moonstone #ebe7e4, driftwood #5c5752, evening-blue #252f3d, terracotta #844f3b/#b86b52, sunkissed #e1b06e — pi.dev/style.css:95-102 [V]
- Type: `--serif: "Plantin MT Pro", "Plantin MT Std", Plantin, Georgia, serif` (style.css:202); `--mono: "Commit Mono", …, monospace` (style.css:204-205); `--accent-mono: "Departure Mono", "Commit Mono", …` (style.css:203); html font-size 18px, antialiased (style.css:446-453); body base uses var(--serif), line-height 1.6, text-wrap pretty (style.css:461-464); form labels use accent-mono at ~11px, letter-spacing 0.12em, uppercase-muted style (style.css:207-211) [V]
- Structure: sticky top nav, hero header with h1.hero-subtitle, repeated `h2.section-title` sections (clamp(2rem, 4vw, 2.75rem) — style.css:3654-3655), callout sections, site-footer; asciinema terminal demo embedded [V — pi.dev/index.html landmarks]
- Container widths observed: 44rem and 34rem max-widths; hero subtitle max 31rem — pi.dev/style.css:2320, 2363, 652-653 [V]
- What cannot port 1:1: the theme toggle is JS (theme-toggle.js + nav-sheet.js); voltbase artifact forbids any `<script>` — `site/build.mjs:370-373` [V]

### Seam E — font licensing (web-verified, sources inline)
- Plantin MT Pro is a commercial Monotype family: commercial listings via Monotype/Adobe Fonts channels (WhatFontIs flags it "commercial font sold via Adobe.com"; it appears in Adobe Fonts subscription listings); "free download" sites offering it (e.g. cufonfonts) are unofficial and grant no redistribution rights — whatfontis.com, fonts.adobe.com, cufonfonts.com/font/plantin-mt-pro [R] (re-sourced after audit; the web-licence-vs-desktop split is standard Monotype practice but was not directly sourced — treat redistribution of Plantin files as prohibited regardless)
- Plantin directly inspired Times New Roman → a Times/Georgia system stack is a legitimate zero-download descendant fallback; EB Garamond named as "closest option" by one secondary source (no canonical substitute exists; Noto Serif claim dropped — unsourced per audit) — madegooddesigns.com/plantin-font [R]
- Commit Mono: SIL OFL 1.1 ("Licensed under the SIL Open Font License" per repo README), free for commercial use, self-hosting permitted; woff2 ≈46-48 KB per weight (latin, 400: 48,128 B, 700: 47,304 B) — commitmono.com, github.com/eigilnikolajsen/commit-mono, jsdelivr @fontsource/commit-mono@5.3.0 [R] (auditor-CONFIRMED with measured bytes)
- Departure Mono: SIL OFL (v1.500, 1,186 glyphs), Regular style only in release assets; woff2 = 22,496 B (≈22 KB), woff = 25,256 B, otf = 84,480 B — github.com/rektdeckard/departure-mono releases + jsdelivr gh-package data API (measured 2026-09-15) [V] (upgraded from [R] after audit)
- Any font CDN host is excluded in practice: HTML-level externals would fail the allowlist gate, and CSS-level externals would violate the repo's no-runtime-loads invariant (IS-08) even though the gate would not catch them — derived from Seam C facts [V]

### Seam F — deploy + CI wiring
- Pages workflow publishes `site/dist` on every push to master touching `site/**` (repo is public; guard skips private) — `.github/workflows/pages.yml:8-11, 25` [V]
- CI required contexts on protected master: typecheck, lint, build, test, smoke (smoke job at `.github/workflows/ci.yml:56-64`) — `.github/workflows/ci.yml:9-64` [V] (cite corrected per audit item 20); branch protection strict with these 5 contexts (verified 2026-09-15 via the branch-protection API)
- Root scripts: `npm run build` = `node site/build.mjs`; `npm test` runs workspace vitest incl. site gate — `package.json:17-27` [V]
- Bundle check exists but measures the WORKER, not the site: `scripts/check-bundle.sh:13` gzips `packages/mcp/worker/*.ts packages/core/src/index.ts …` (source proxy, 33,959 gz) against the 1.5 MiB self-budget — `site/dist` has NO size gate today. Actual dist measured 2026-09-15: 43,220 B raw / 27,736 B gz (advisory finding, main-context verified) [V]

## Implicit Spec — invariants any change here must uphold
> Requirements, not designs.
- **Zero scripts, zero runtime fetches** — emitted HTML must contain no `<script` (build throws AND gate asserts) and no `fetch(` literal in html or css (gate-only: build.mjs does not check `fetch(`). (`site/build.mjs:370-373`, `site/tests/site-s5.test.ts:145-153` [V]) Edge: any pi.dev JS behaviour (theme toggle, nav sheet) must be re-expressed in CSS or dropped.
- **Document charset + viewport declared** — every emitted page carries `<meta charset="utf-8" />` and the viewport meta; no gate pins these, so a restyled `doc()`/head could drop them silently — keep them. (`site/build.mjs:66-68` [V]; audit gap 14)
- **Readable contrast under the new palette** — body text on its background must meet WCAG AA (≥4.5:1; large display text ≥3:1) in every shipped colour scheme. Note: styles.css contains zero `@media` rules today, so responsive/adaptive behaviour arrives fresh with this change and needs its own verification pass. (`site/src/styles.css` full read [V]; audit gap 15)
- **Base path integrity** — every page keeps `<base href="/voltbase/" />`, stylesheet link exactly `/voltbase/styles.css`, internal links under `/voltbase/…`; every internal link must resolve to a real dist file. (`site/build.mjs:71-72`, `site/tests/site-s5.test.ts:90-129` [V]) Edge: renaming/moving any page or asset breaks the resolution gate.
- **External host allowlist (HTML level)** — external `href|src` hosts limited to the 6 attribution hosts; adding e.g. fonts.googleapis.com or pi.dev links to HTML fails the gate. (`site/tests/site-s5.test.ts:90-129` [V]) Bounding assumption: CSS `url()` is not gate-checked, but IS-08 ("fetches nothing at runtime") still applies as a repo invariant. (`site/astro.config.mjs:6-7` [V])
- **Pagefind index contract** — index over the themed markup must still yield ≥7 pages (real) or ≥7 fallback entries with the honest-generator label; runtime JS/wasm stays pruned. (`site/build.mjs:280-337`, `site/tests/site-s5.test.ts:48-73` [V])
- **Structural anchors per page** — `<main id="main" data-pagefind-body>`, one `<h1>`, 'voltbase' string, skip link, nav with `aria-current="page"`, footer. (`site/build.mjs:55-83`, `site/tests/site-s5.test.ts:29-46` [V])
- **Licensing content pins** — open-licence tokens (CC0, ODbL, Etalab, CC BY 4.0) present; closed ids/names and 'providerCopyrighted' absent; DRAFT + 'DPDP Act 2023' + 'data-only' markers present; BYOK key names present with no secret-shaped values. (`site/tests/site-s5.test.ts:75-88, 131-162` [V]) Edge: copy edits during re-theme must not drop these strings.
- **Content token pins** — api-reference 13-token set and mcp-onboarding 7-token set must survive any markup restyle. (`site/tests/site-s5.test.ts:164-198` [V])
- **Hand-sync of emit and sources** — build.mjs `PAGES`/templates and `site/src/pages/*.astro` mirror the same headings and copy; the re-theme must update both sides or they diverge. (`site/build.mjs:2-8, 85` [V])
- **Bundle budget** — dist self-budget 1.5 MiB gz; currently ~34 KB gz. Self-hosted font binaries (~22-48 KB each per weight, pre-gzip ≈22-84 KB raw) consume this budget; count them. (smoke check-bundle output 2026-09-15 [V]; font sizes [R])
- **Font redistribution legality** — no font file may ship in the artifact or the repo unless its licence permits redistribution with the project (SIL OFL families do, with licence + copyright text included); Plantin MT Pro files must not be committed in any form (commercial Monotype family, unofficial free-download sites grant no rights). (Seam E [R/V]) Edge: OFL requires the licence text to accompany redistributions.
- **Theme mechanism constraint** — no `<script>` may implement theme switching (zero-script invariant above); whatever theme behaviour is chosen (fixed scheme, CSS-only `prefers-color-scheme`, or other CSS-only mechanism) is the plan's decision — the requirement here is only that it works with zero JS. (`site/build.mjs:370-373` [V]; audit flag 16 — dual-vs-fixed deliberately left open)
- **Deploy coupling** — pushing to master with `site/**` changes publishes Pages immediately (public repo); local verification must precede push. (`.github/workflows/pages.yml:8-11` [V]; user instruction: test locally before push)
- **Accessibility floor preserved** — skip link, `aria-label`ed nav, `aria-current`, semantic tables/lists, visible focus styles must survive the restyle (existing markup + a11y conventions; tests pin only some). (`site/build.mjs:55-83` [V])
- **Bounding assumptions** — (1) "match pi.dev" means adopt its visual language (palette, type, spacing, component styling), not copy its markup, fonts files, or JS; (2) page copy stays substantively as-is (content pins above); (3) pi.dev's exact current rendering is its live stylesheet fetched 2026-09-15 — it may change upstream at any time; (4) theme work targets the emitted artifact (build.mjs) as source of truth, astro files kept in sync.

## Workload & Scale Envelope
> Static docs site; the only quantitative envelope that matters is artifact budget and index thresholds. No runtime ops model applies.
- **Artifact budget**: the 1,572,864-byte self-budget is enforced on the WORKER source proxy only (`scripts/check-bundle.sh:13`); `site/dist` has no size gate. Measured dist 2026-09-15: 43,220 B raw / 27,736 B gz across 20 files [V]. Candidate font payloads: Commit Mono ≈46-48 KB/weight, Departure Mono 22,496 B (woff2, raw) [V/R].
- **Index thresholds**: pagefind real ≥8192 bytes / ≥7 pages; fallback ≥2048 bytes / ≥7 entries (`site/tests/site-s5.test.ts:48-73` [V]).
- **Pages**: 7 emitted pages, fixed NAV of 7 entries (`site/build.mjs:40-48` [V]).
- **Distribution**: n/a (no runtime data categories; all numbers above are build/emit-time).

## Hard Cores
- Primary hard core: one cohesive re-theme (stylesheet + shared templates across 9 hand-synced files) that lands the pi.dev visual language while every zero-script/static/base-path/licensing gate stays green.
- Audit-honesty note (item 19): two failure modes are logically independent of visual cohesion and must not be lost by the planner — (1) font-licensing legality (committing Monotype files would be a legal failure with all gates green), and (2) the licence-token/allowlist content pins (a copy edit could break them independently). They are side-constraints on the one build effort, not separate build cycles; recorded here so the plan's decomposition keeps them as explicit gates.

## Evidence table
| Claim | Evidence | Trust | Load-bearing |
|---|---|---|---|
| build.mjs is canonical emit; astro mirrors kept in sync by hand | `site/build.mjs:2-8` | V | yes |
| Zero `<script>` enforced twice (build throw + gate) | `site/build.mjs:370-373`, `site/tests/site-s5.test.ts:145-153` | V | yes |
| Stylesheet must contain `:root` and be linked as /voltbase/styles.css everywhere | `site/tests/site-s5.test.ts:39-46` | V | yes |
| Link/allowlist gate scans HTML href\|src only, not CSS url() | regex at `site/tests/site-s5.test.ts:122` | V (regex) / R (implication) | yes |
| Open-licence + DRAFT/DPDP/BYOK token pins | `site/tests/site-s5.test.ts:75-88,131-162` | V | yes |
| Content token pins for api-reference & mcp-onboarding | `site/tests/site-s5.test.ts:164-198` | V | yes |
| Pagefind thresholds + runtime pruning | `site/build.mjs:280-337`, `site/tests/site-s5.test.ts:48-73` | V | yes |
| pi.dev dark/light tokens, serif/mono/accent-mono stacks, 18px root | pi.dev/style.css:95-246, 202-211, 246-300, 446-464 (fetched 2026-09-15) | V | yes |
| pi.dev theme toggle is JS-driven (data-theme) | theme-toggle.js + style.css:936-960 | V | yes |
| Plantin MT Pro commercial Monotype family; unofficial free-download sites grant no rights | whatfontis.com ("commercial font sold via Adobe.com"); fonts.adobe.com listings; cufonfonts flagged unofficial | R (re-sourced + audit round 1) | yes |
| Commit Mono OFL 1.1, ≈46-48 KB/weight woff2 | commitmono.com; github.com/eigilnikolajsen/commit-mono; jsdelivr @fontsource (measured 48,128/47,304 B) | R → auditor-CONFIRMED | yes |
| Departure Mono OFL v1.500, Regular only, woff2 22,496 B | github.com/rektdeckard/departure-mono + jsdelivr gh data API (measured) | V (upgraded after audit) | yes |
| Times/Georgia as Plantin-descendant fallback; EB Garamond "closest option" | madegooddesigns.com/plantin-font | R | no |
| Bundle budget 1.5 MiB gz; current 33,959 gz | smoke check-bundle output 2026-09-15 | V | yes |
| Pages publishes on push to master (site/** paths) | `.github/workflows/pages.yml:8-11` | V | yes |
| Master protected, 5 required CI contexts | `.github/workflows/ci.yml` + branch-protection API (verified 2026-09-15) | V | yes |

## Architecture Insights
- The site deliberately has no build-time transformation of the stylesheet and no JS at all — the "theme" is exactly styles.css + the `doc()`/`navFor()`/`FOOT` template strings; everything else is page copy. A theme change is therefore concentrated in ~3 template functions, 1 CSS file, and the mirror pass.
- The gate suite is the real specification of the artifact; it pins structure and licensing content, not visuals — visuals are free to change wholesale.
- pi.dev's design tokens map cleanly onto a `:root`-variable swap in voltbase's existing token architecture (both are CSS-custom-property-driven); the delta is semantic naming and a dark surface system.
- pi.dev body copy is serif with mono reserved for code/labels/accents — inverting voltbase's current sans-body/mono-code split is the core typographic change.

## Historical Context
- Prior stage history is maintained in an orchestrator handoff log kept outside the published repo; nothing in `site/` depends on it.

## Coverage & Open Questions
- Searched: 100% of site source (12 files, 1,254 lines read in full), both CI workflows, root package.json/scripts, live pi.dev HTML + full stylesheet (7,782 lines, token/base/typography regions read). Audit round 1 (of ≤2 for medium) applied: 4 modality gaps closed, 2 load-bearing [R] claims re-sourced/upgraded, spec de-smuggled.
- Deliberately bounded: pi.dev's per-component CSS (7,000+ lines of nav/hero/docs styling) was sampled for tokens, structure and key metrics only — pixel-level cloning of its nav/hero is neither required nor attempted; the plan decides the voltbase-adapted interpretation.
- By-history mode (audit item 4): `git log -- site/` shows only 2 commits (95e1f60 S1, 8082d1d S5) — no hidden history constraints.
- Font-weight count and post-port styles.css size are unbounded by any gate (audit items 18): the plan must state the intended font payload and keep the 1.5 MiB budget assertion green.
- Open to plan: (a) fixed dark theme vs CSS-only prefers-color-scheme dual theme; (b) self-host Commit Mono/Departure Mono (with OFL licence files + build.mjs copy step) vs pure system stacks; (c) exact serif substitute choice; (d) how far to carry the terminal aesthetic (labels, badges, callouts) within the existing component vocabulary; (e) whether to also fix the pre-existing `<base href>` astro-mirror divergence (audit item 9).
- Unconfirmed: web-licence-vs-desktop split for Plantin (unverifiable without a Monotype account) — irrelevant to the plan since Plantin files are prohibited outright.
