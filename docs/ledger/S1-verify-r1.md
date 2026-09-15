# S1 verify r1 — PASS (2026-09-15, verifier re-run, builder report not trusted)

Gate order G1–G6 per PLAN §5 (stop at first FAIL). Template :190-238 text is not
in-repo; mapping below is derived from S1-brief Tasks/Extra-gates + PLAN §4 S1 +
IS-09. No FAIL occurred.

## G1 — Scope fidelity: every S1-brief task present (PASS)
- T1 root configs: `package.json` (name voltbase, private, Apache-2.0,
  workspaces packages/*+site, scripts dev/build/typecheck/lint/format/
  format:check/test/smoke/verify/check:banned, no db/cache:reset, no deploy) ✓;
  `LICENSE` Apache-2.0 (Copyright 2026 Nitish Agarwal) ✓; README links LEDGER ✓;
  tsconfig.base strict + tsconfig.json ✓; eslint flat config ✓; vitest.config.ts
  (node pool + @cloudflare/vitest-plugin workers pool + plain-node) ✓;
  `.dev.vars.example` names-only (`OCM_API_KEY=`, `CLOUDFLARE_API_TOKEN=`,
  `CLOUDFLARE_ACCOUNT_ID=`, `GITHUB_TOKEN=`, all empty) ✓; `wrangler.jsonc`
  (name voltbase-api, compat 2026-08-04, nodejs_compat +
  global_fetch_strictly_public, no KV/D1/R2/DO) ✓; `.gitignore` covers
  .dev.vars, node_modules, dist, site/dist, coverage ✓; `docs/spec.md` exists
  (IS-01/05/06/09/10 + S1 scope) ✓.
- T2 worker: `packages/mcp/worker/index.ts` Hono `GET /` (html has "voltbase") +
  `GET /healthz` → `{"ok":true,"stage":1}` via `src/lib/stage.ts` (`STAGE=1`) ✓.
- T3 packages shell: core/normalise/providers/mcp/cli package.jsons ✓;
  `packages/cli/bin/voltbase.js` plain node, `--help` prints usage exit 0 ✓.
- T4 site shell: `site/astro.config.mjs` base /voltbase ✓,
  `site/src/pages/index.astro` ✓, `site/build.mjs` emits `site/dist/index.html` ✓.
- T5 scripts: check-banned.sh (excludes self+fixture+briefs via split patterns;
  clean→0, banned→1) ✓; smoke.sh (direct app import + 1.5MB/64MiB comment
  check) ✓; verify.sh chain typecheck→lint→build→test→smoke→check:banned,
  prints `VERIFY OK stage=1` ✓.
- T6 CI: `.github/workflows/ci.yml` jobs = build/lint/smoke/test/typecheck,
  zero deploy refs outside a no-deploy comment (python yaml.safe_load parsed) ✓.
- T7 pins exact, no ^/~ (grep clean): typescript 5.9.3, vitest 4.1.11,
  @cloudflare/vitest-plugin 1.1.9, hono 4.13.7, wrangler 4.131.2, zod 4.6.5,
  eslint 10.10.0, typescript-eslint 8.70.0, @modelcontextprotocol/sdk 1.30.0,
  astro 7.3.2, pagefind 1.5.2; node v22.23.2 (≥22) ✓.
- Min tests: 6/6 brief tests present in `packages/mcp/worker/scaffold.test.ts`
  + workers-pool, site-artifact, plain-node extras (10 total) ✓.

## G2 — Green chain (PASS)
- `$ node --version && npm install` → v22.23.2, 0 vulnerabilities.
- `$ npm run verify` → typecheck ✓, lint ✓, build
  (`site/build.mjs: emitted site/dist/index.html`) ✓,
  `Test Files 5 passed (5) / Tests 10 passed (10)` ✓,
  `smoke-check: / + /healthz green / SMOKE OK` ✓, `check-banned: OK` ✓,
  final line `VERIFY OK stage=1` ✓.
- `$ npx vitest run` → 5 files / 10 passed (verbose: healthz shape+stage,
  index voltbase, check-banned fixtures, no-persistence skip, pages artifact,
  CLI --help, workerd healthz ×2, site artifact, plain-node CLI) ✓.
- `$ bash scripts/check-banned.sh scripts/fixtures/clean.txt` → exit 0
  (`check-banned: OK`); `... banned.txt` → exit 1 with both hits ✓.
- `$ bash scripts/smoke.sh` → `SMOKE OK` ✓.

## G3 — Hygiene: secrets / trailers / remote / CI (PASS)
- `$ git remote -v` → empty ✓. `$ git status --short` → untracked S1 files only,
  zero modifications ✓.
- `grep -rEi 'co-authored|generated with|claude|🤖'`: hits ONLY in
  `scripts/fixtures/banned.txt` (intentional fixture) + `docs/ledger/S1-brief.md`
  (gate description, excluded from scan) — both excluded by check-banned.sh;
  live scan `npm run check:banned` → OK ✓.
- Secret-value grep (`ghp_|AKIA|sk-(live|test)|PRIVATE KEY`): hit ONLY in
  banned.txt fixture ✓.

## G4 — Mutation kill (PASS, proof)
- Mutation: `src/lib/stage.ts` line 5 `export const STAGE = 1;` →
  `export const STAGE = 999;` (one line).
- `$ npx vitest run packages/mcp/worker/scaffold.test.ts` → `Test Files 1
  failed (1) / Tests 1 failed | 5 passed (6)` (healthz shape+stage kills) ✓.
- Reverted via backup copy; `$ npx vitest run` → `5 passed (5) / 10 passed
  (10)` green; `git diff --stat` empty ✓.

## G5 — Exactness re-checks (PASS)
- No `^`/`~` in any workspace package.json (grep clean) ✓. LICENSE has 4×
  "Apache License" + Version 2.0 header ✓. wrangler name/compat/flags verified
  in both root and `packages/mcp/worker/wrangler.jsonc` ✓. CI YAML parses,
  no deploy job ✓.

## G6 — Process (PASS)
- No commit made; `LEDGER.md` untouched (this report is the only write:
  `docs/ledger/S1-verify-r1.md`) ✓.

Verdict: **PASS** — S1 meets brief + PLAN S1 + stack.md S1 mapping. Ready for
orchestrator ledger + `S1:` commit.
