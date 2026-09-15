# S2 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Mapping derived from
S2-brief Tasks/Min-tests/Extra-gates + PLAN §4 S2 + ADR-003 + IS-03/04/09/10.
No FAIL occurred.

## G1 — Scope fidelity: every S2-brief task present (PASS)
- T1 `packages/core/src/index.ts`: types ChargePoint, Connector, Status,
  Attribution, Provenance + per-row `licence` + `source` + `providerCopyrighted`;
  partition key `(feature_type, regional_cut, source, licence)` via
  `partitionKey()` tuple + `partitionKeyString()`; licence union
  `CC0-1.0 | Etalab-2.0 | CC-BY-4.0 | ODbL-1.0 | CLOSED | UNKNOWN` ✓;
  ULID (`createUlid`/`isUlid`/`parseUlidTime`) + ISO-time (`toIsoTime`/`isIsoTime`)
  helpers ✓; `isServable()` false for UNKNOWN/CLOSED/provider-copyright ✓;
  `stableId()` source-prefixed deterministic ids ✓; zero standalone `any`
  (grep `\bany\b` clean, no `allow-any` needed) ✓.
- T2 `packages/normalise/src/index.ts`: mappers OCM→core (enforces
  `opendata=true`, provider-copyright ⇒ CLOSED), OSM→core (extract objects,
  always ODbL-1.0, never Overpass — no fetch/http import), OCPI 2.2.1→core
  (NL shape, CC0-1.0, flattened EVSE connectors), DATEX II→core (dataset
  licence via `normaliseLicence`, Not-Specified/unrecognised ⇒ UNKNOWN) +
  `licenceFilter` (unknown⇒closed via `closeUnknownLicence`, then
  servable/closed split) + `validateChargePoint` + deterministic idempotent
  `renormalise()` (fixed `DEFAULT_RETRIEVED_AT`, no clock on default path) ✓.
- T3 fixtures `packages/normalise/fixtures/`: `eu.ts` 30 inputs (8× NL OCPI +
  6× LU Chargy KML/CC0 + 6× FR IRVE/Etalab + 5× OCM open/CC-BY + 2× OSM/ODbL =
  27 servable + 3 closed: OCM provider-copyright, LU 2nd-set Not-Specified,
  unrecognised licence) + `india.ts` 10 inputs (8× OSM/IN servable + 2× OCM
  closed: provider-copyright, `isOpenData:false`); counts asserted in
  `fixtures.test.ts` ✓.
- T4 `src/lib/stage.ts` STAGE 1→2; `scripts/verify.sh` chain unchanged, prints
  `VERIFY OK stage=2` (stage read live); `packages/mcp/worker/index.ts`
  `/healthz` returns `{ok:true,stage:STAGE}`; `scripts/smoke-check.mjs`
  asserts `STAGE === 2` ✓.
- T5 TS strict (`tsc --noEmit` clean), exact pins only (no `^`/`~` in any
  workspace package.json), `eslint .` clean ✓. Files owned: `packages/core`,
  `packages/normalise`, fixtures only (+ owned-line stage bump in
  `src/lib/stage.ts`, worker healthz, smoke/verify scripts). No KV/D1/DO/R2
  (wrangler jsonc comments only, IS-06). No remote fetch ✓.
- Min tests: 27 new S2 (core 8 + normalise 13 + fixtures 6) covering each
  mapper happy + each licence-reject (OCM provider-copyright, opendata=false,
  UNKNOWN/Not-Specified, explicit CLOSED) + idempotent re-normalise +
  boundary (empty/malformed/max-size/unicode/negative-kW) + attribution
  preserved (OCM/OSM/NAP strings) + fixture counts (30+10, 27+3/8+2 splits) +
  partition discipline; S1's 10 still green → 37 total ✓.

## G2 — Green chain (PASS)
- `$ npm install` → `up to date, audited 443 packages`, `found 0
  vulnerabilities`.
- `$ npm run verify` → typecheck ✓, lint ✓, build
  (`site/build.mjs: emitted site/dist/index.html`) ✓,
  `Test Files 8 passed (8) / Tests 37 passed (37)` ✓,
  `smoke-check: / + /healthz green / SMOKE OK` ✓, `check-banned: OK` ✓,
  final line `VERIFY OK stage=2` ✓.
- `$ npx vitest run --reporter=verbose` → 8 files / 37 passed: core 8
  (partition tuple, key string, open licences servable, UNKNOWN/CLOSED
  unservable, provider-copyright unservable, ULID, ISO-time, stableId),
  normalise 13 (4 mapper happy, 4 licence-reject, 1 idempotent, 3 boundary,
  1 attribution), fixtures 6 (counts 30+10, splits 27+3/8+2, closed-never-
  served, validator-clean, all-OSM-or-all-non-OSM per cut, no shared ids),
  S1 10 (site artifact, 6 scaffold, 2 workerd healthz, 1 plain-node CLI) ✓.
- `$ npm run lint` → exit 0 ✓. `$ npm run check:banned` → `check-banned:
  OK` ✓. `$ npm run smoke` → `SMOKE OK` ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)
- `$ git remote -v` → empty ✓. `$ git status --short` → S2 builder file set
  only (11 modified + S2-brief/tests/fixtures untracked), zero unexpected
  modifications ✓.
- `npm run check:banned` (scans `git ls-files --cached --others
  --exclude-standard`, briefs + this report excluded by design) → OK ✓.
  Banned-pattern grep for `co-authored|generated with|claude` hits only
  `scripts/fixtures/banned.txt` (intentional S1 fixture, excluded) ✓.
- Secret-value grep (`AKIA|ghp_|GITHUB_TOKEN=` with value): hits only the
  intentional banned.txt fixture ✓. No `.dev.vars` tracked ✓.

## G4 — Mutation kill (PASS, proof)
- Mutation (1 line): `packages/core/src/index.ts:90`
  `return site.licence !== 'UNKNOWN' && site.licence !== 'CLOSED';` →
  `return true; // MUTATION-G4: force servable even for CLOSED`.
- `$ npx vitest run` under mutation → `Test Files 3 failed | 5 passed (8) /
  Tests 7 failed | 30 passed (37)` (core isServable, normalise licence-
  rejects, fixtures closed-never-served all kill) ✓.
- Reverted via backup copy; `diff` byte-identical, no `MUTATION` residue;
  `$ npx vitest run` → `8 passed (8) / 37 passed (37)` green ✓.

## G5 — Exactness re-checks (PASS)
- Partition key: `partitionKey()` returns
  `[featureType, regionalCut, source, licence]` in order; every mapper sets
  `regionalCut` from 2-letter country code; served cuts all-OSM or
  all-non-OSM asserted; OSM/non-OSM share no ids ✓.
- unknown⇒closed enforced: `normaliseLicence` maps Not-Specified/unspecified/
  unrecognised/empty/non-string ⇒ UNKNOWN; `closeUnknownLicence` ⇒ CLOSED;
  `licenceFilter` splits via `isServable` ✓.
- Closed rows never servable: `isServable` false for CLOSED, UNKNOWN,
  provider-copyright; fixture closed rows all `CLOSED` + `isServable false`;
  EU 27+3 / India 8+2 splits exact ✓.
- Idempotent renormalise: same batch ⇒ byte-identical output incl. stable ids
  (`OCM:…`/`OSM:…`/`OCPI:…`/`DATEX2:…`) asserted ✓.
- Attribution preserved: OCM `via Open Charge Map`, OSM `© OpenStreetMap
  contributors`, OCPI `opendata.ndw.nu`, DATEX2 `via <publisher>` + dataset
  URL, mirrored in `provenance.attribution` ✓.
- STAGE=2 everywhere: `src/lib/stage.ts` (`STAGE = 2`), worker `/healthz`,
  smoke-check assertion, scaffold + workerd tests `toBe(2)` ✓.
- S1 still green: scaffold subset rerun `3 passed (3) / 8 passed (8)`; full
  run includes all S1 10 ✓. Licence union exact, no `any`, exact pins
  (typescript 5.9.3, vitest 4.1.11, eslint 10.10.0, wrangler 4.131.2), no
  KV/D1 bindings, no fetch in normalise ✓.

## G6 — Process (PASS)
- No commit made; `LEDGER.md` untouched (`git diff --name-only | grep
  LEDGER` → 0) ✓. Only write is this report:
  `docs/ledger/S2-verify-r1.md` ✓.

Verdict: **PASS** — S2 meets brief + PLAN §4 S2 + ADR-003. Ready for
orchestrator ledger + `S2:` commit.
