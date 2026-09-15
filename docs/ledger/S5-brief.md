# S5 brief — Pages docs + landing (local preview)

Role: builder. Sequential only. No remotes, no secrets, no publish.
Inputs: PLAN.md §4 S5; IS-03/04/10; ADR-002 (per-feed licences), ADR-003 (Collective); docs/stack.md S5 line (Depends S4 PASSED; site/dist + pagefind ≥ threshold; static no runtime fetch; open-licenced only; local preview; robots; legal DRAFT incl DPDP); existing site/ shell (astro.config base /voltbase, build.mjs, index.astro, tests), packages/mcp server (tool docs source), worker routes (API ref source).

## Tasks
1. `site/`: Astro static base /voltbase pages: index (value, how-it-works, pricing placeholder free/paid self-serve, CTA), quickstart, api-reference (hand-written from worker routes + contract-tested snippets), mcp-onboarding (stdio + HTTP tools), providers/BYOK (OCM key by name, NOBIL/Mobilithek second-wave notes), attributions (OCM CC BY 4.0 + provider rows excluded, OSM ODbL, NL CC0, LU CC0-KML-only + 2nd-set ticket, FR Etalab, NOBIL CC BY), legal DRAFT markers (DPDP Act 2023 note for India data-only). Single hand-written stylesheet (ADR-001 CSS default). pagefind index (or pagefind-compatible index file if binary unavailable offline — must satisfy ≥threshold test honestly labelled). robots.txt allow public docs only. All shown data open-licenced (servable fixtures only, no closed rows). Static: fetches nothing at runtime.
2. Build emits `site/dist/` (+ pagefind index). Local preview only (private repo, no publish). Add `.github/workflows/pages.yml` SCAFFOLD trigger-guarded (if: github.event.repository.visibility == 'public' or manual dispatch on public) — never runs while private.
3. STAGE 4→5 everywhere. Files owned: `site/**`, pages workflow scaffold. No Worker changes except stage literals.

## Min tests 8 (keep 90 green → ≥98)
build emits site/dist/index.html + per-page html; pagefind index exists ≥ threshold bytes/entries; no closed/non-public data in dist (grep closed ids absent, licences open only); internal links resolve (all hrefs map to dist files); legal DRAFT markers present (DPDP + DRAFT strings); robots allows docs; artifact static (no fetch() in dist js/html); BYOK names-only (no key values). Place `site/tests/*.test.ts`.

## Extra gates
VERIFY OK stage=5; remote empty; no publish.
Return files + verify + tests. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
