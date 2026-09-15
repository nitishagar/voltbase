# S5 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Mapping derived from
S5-brief Tasks/Min-tests/Extra-gates + docs/stack.md S5 line + ADR-001 (CSS
default), ADR-002 (per-feed licences), ADR-003 (Collective). No FAIL occurred.
PLAN.md/IMPLICIT_SPEC.md text lives outside the repo (plan bundle
`2026-09-14-voltbase/`); scope quotes below are S5-brief + stack.md S5 line
(same precedent as S4-verify-r1).

## G1 — Scope fidelity: every S5-brief task present (PASS)

- T1 `site/`: Astro static base /voltbase, 7 pages — index (value,
  how-it-works 3 cards, pricing free self-serve + paid placeholder, CTA row),
  quickstart (install → `npm run verify` → local dev → first search over
  `OCM:900000`), api-reference (hand-written from Worker routes:
  `/healthz`, `/api/v1/sites` + filters/pagination, `/:id`, `/status/:id`
  + staleReason, typed error table, `POST /mcp` + `GET /mcp` 405),
  mcp-onboarding (stdio `voltbase mcp` + HTTP, 4 locked tools + typed
  `UNAVAILABLE_S6`/`LOCAL_ONLY_CAPABILITY`), providers/BYOK (OCM
  `OCM_API_KEY` by name, `X-API-Key`/`key=`, NOBIL `NOBIL_API_KEY` +
  Mobilithek second-wave notes, names-only), attributions (OCM CC BY 4.0
  open rows only + provider-copyright excluded, OSM ODbL, NL CC0, LU
  CC0-KML-only + 2nd-set ticket, FR Etalab/Licence Ouverte, NOBIL CC BY),
  legal DRAFT (DPDP Act 2023 India data-only note, per-feed drafts, hosting
  local-preview). Single hand-written `site/src/styles.css` (ADR-001 CSS
  default, `:root` tokens). Pagefind REAL binary index 1.5.2 over
  `site/dist` (index data only + honest `PAGEFIND_NOTE.txt`; vendor JS/wasm
  pruned so artifact stays zero-script). `robots.txt` allow-lists the 7
  public docs paths, no blanket disallow. All shown data open-licenced
  (servable fixtures only, closed ids absent). Static: zero `<script>`,
  zero `fetch(` in dist html/css ✓. Verified in dist (see G5).
- T2 Build emits `site/dist/` (20 files: 7 html + styles.css + robots.txt +
  11 pagefind data files) + local preview only (private repo, no publish).
  `.github/workflows/pages.yml` SCAFFOLD trigger-guarded
  (`if: github.event.repository.visibility == 'public'`, `workflow_dispatch`
  still skips while private, no secrets) — never runs while private ✓.
- T3 STAGE 4→5 everywhere: `src/lib/stage.ts` (`STAGE = 5`), `/healthz`
  serves live STAGE, `verify.sh` prints `VERIFY OK stage=5` (stage read
  live), `smoke-check.mjs` asserts `STAGE === 5`. Files owned: `site/**` +
  pages workflow scaffold. Worker diff is stage literals only
  (`index.ts` S4→S5 comments/stage-5 string, `healthz.workers.test.ts` +
  `scaffold.test.ts` 4→5 asserts) ✓.
- Min tests: 12 new S5 (`site/tests/site-s5.test.ts`) covering 7-page emit,
  stylesheet linked site-wide, pagefind ≥ threshold, no closed rows, open
  tokens end to end, links resolve + external allowlist, DRAFT+DPDP+
  data-only, robots, static, BYOK names-only, api-reference contract
  tokens, 4 locked MCP tools; S1–S4 90 still green → 102 total (≥98) ✓.

## G2 — Green chain (PASS)

- `$ npm install` → `found 0 vulnerabilities` (Node v22.23.2, npm 10.9.8).
- `$ npm run verify` → typecheck ✓, lint ✓, build
  (`site/build.mjs: emitted 20 files to site/dist (+ pagefind real index,
  15592 bytes)`) ✓, `check-bundle: OK (29810 gz bytes <= 1572864; 1.5 MiB
  self-budget, platform cap 64 MiB uncompressed)` ✓,
  `Test Files 14 passed (14) / Tests 102 passed (102)` ✓,
  `smoke-check: / + /healthz + search + site + status + mcp green` + bundle
  + `SMOKE OK` ✓, `check-banned: OK` ✓, final line `VERIFY OK stage=5` ✓.
- `$ npx vitest run` → 14 files / 102 passed: core 8 + normalise 13 +
  fixtures 6 + artifact 1 + scaffold 6 + api 20 + guards 12 + server 12 +
  worker-mcp 5 + cli-mcp 4 + cli-help 1 + healthz workers ×2 (pools
  mcp-node/mcp-workers) + site-s5 12 ✓. `$ npx vitest run
  site/tests/site-s5.test.ts` → 12/12 ✓.
- `$ npm run lint` → exit 0 ✓. `$ npm run check:banned` →
  `check-banned: OK` ✓. `$ npm run smoke` → `SMOKE OK` ✓.
  `$ git remote -v` → empty ✓.
- Exact pins: vitest 4.1.11 (overridden), typescript 5.9.3,
  @cloudflare/vitest-plugin 1.1.9, eslint 10.10.0, wrangler 4.131.2,
  hono 4.13.7, zod 4.6.5, @modelcontextprotocol/sdk 1.30.0, astro 7.3.2,
  pagefind 1.5.2 ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)

- `$ git remote -v` → empty ✓. `$ git status --short` → S5 builder file
  set only (9 modified + 9 untracked incl. brief family), zero unexpected
  modifications; `site/dist/` ignored, not tracked ✓.
- `npm run check:banned` → OK ✓ (briefs + this report excluded by design).
- Secret-value grep over dist + tree: no `OCM_API_KEY=`/`NOBIL_API_KEY=`
  values (exit 1), no `ghp_*`/`BEGIN PRIVATE KEY` (exit 1); BYOK by header
  name `x-ocm-key` / env name `OCM_API_KEY` only ✓.

## G4 — Mutation kill (PASS, proof)

- Mutation (1 line, dist artifact `site/dist/legal/index.html`):
  `data-only` → `XXX-MUTATION-G4` (python one-liner, backup to /tmp).
- `$ npx vitest run site/tests/site-s5.test.ts` under mutation →
  `Test Files 1 failed (1) / Tests 1 failed | 11 passed (12)` at
  `site-s5.test.ts:135 expect(readHtml('legal')).toContain('data-only')` ✓.
- Reverted via backup copy (`grep -c MUTATION` → 0, `data-only` count 3);
  `site-s5` → 12/12, full `npx vitest run` → 102/102 green; `npm run
  build` re-emit (15569 bytes, page_count 7) still green ✓.

## G5 — Exactness re-checks (PASS)

- 7 pages + stylesheet + robots + pagefind ≥ threshold: 7 html
  (`index.html` + 6 `*/index.html`), `styles.css` (2661 B, `:root`, linked
  from every page), `robots.txt` (Allow ×7, no `Disallow: /`), pagefind
  real (`pagefind-entry.json` languages `{en: page_count 7}`, 15592 B first
  verify run / 15569 B rebuild, both ≥ 8192; 7 fragments + index +
  `.pf_meta` + `PAGEFIND_NOTE.txt`; total dist 20 files) ✓.
- No closed data in dist: `OCM:910001` / `DATEX2:LU-2ND-001` /
  `Proprietary Netz` etc. all exit 1; no `providerCopyrighted`, no
  `CLOSED`/`UNKNOWN` licence strings ✓. Open tokens `CC0` + `ODbL` +
  `Etalab` + `CC BY 4.0` present end to end ✓.
- Links resolve: site-s5 allowlisted-external + internal-resolve test
  12/12 (hosts: openchargemap.io, openstreetmap.org, opendata.ndw.nu,
  data.public.lu, transport.data.gouv.fr, info.nobil.no) ✓.
- DRAFT+DPDP markers: `DRAFT` 8× legal + footer site-wide, `DPDP Act
  2023` 3× legal + footer site-wide, `data-only` legal-only (3×) ✓.
- Robots: `Allow: /voltbase/` + 6 subpaths, no blanket disallow ✓.
- Static (no fetch): `<script` exit 1, `fetch(` exit 1 across dist ✓.
- BYOK names-only: `OCM_API_KEY` (providers ×2 + mcp-onboarding),
  `NOBIL_API_KEY` present; `NAME=`-value and secret shapes exit 1 ✓.
- pages.yml guarded: `if: github.event.repository.visibility ==
  'public'`, no secrets, scaffold echo only ✓.
- STAGE=5: `stage.ts`, `/healthz` live `{"ok":true,"stage":5}` (node +
  workerd pools ×2), smoke assertion, scaffold + workerd tests `toBe(5)`,
  api-reference `"stage":5` snippet ✓.
- Priors green: S1+S2+S3+S4 90/90 inside the 102 (core 8, normalise 13,
  fixtures 6, artifact 1, scaffold 6, api 20, guards 12, server 12,
  worker-mcp 5, cli-mcp 4, cli-help 1, healthz ×2) ✓.

## G6 — Process (PASS)

- No commit made; `LEDGER.md` untouched (`git diff -- LEDGER.md` empty) ✓.
  Only write is this report: `docs/ledger/S5-verify-r1.md` ✓.

Verdict: **PASS** — S5 meets brief + stack.md S5 line + ADR-001/002/003
gates. Ready for orchestrator ledger + `S5:` commit.
