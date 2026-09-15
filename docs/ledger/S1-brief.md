# S1 brief — scaffold, tooling, gates

Role: builder. Sequential only (ratelimit). No remotes, no secrets, no deploy.
Inputs (read first): `/home/nitish/Documents/personal-development/thoughts/shared/plans/2026-09-14-voltbase/PLAN.md` §4 S1; `IMPLICIT_SPEC.md` IS-01/05/06/09/10; repo `docs/stack.md` §S1 mapping + Scripts + Bindings + Test invocation; `docs/adr/ADR-001-stack.md`; `docs/research/package-check.md` (exact pins); `docs/env.md` (names only); lumen exemplar `~/repos/learn/lumen` (package.json workspaces, tsconfig.base.json, eslint.config.js, vitest.config.ts, packages/mcp/worker/{index.ts,wrangler.jsonc,capping-fetcher.ts}, scripts) — mirror topology, do not copy secrets.

## Tasks (PLAN S1 + stack.md S1 mapping)
1. Root: `package.json` (name voltbase, private:true, Apache-2.0, workspaces ["packages/*","site"], scripts: dev, build, typecheck, lint, format, format:check, test, smoke, verify, check:banned — NO db/cache:reset yet, no deploy), `LICENSE` Apache-2.0, `README.md` (+LEDGER link), `tsconfig.base.json`+`tsconfig.json` strict, `eslint.config.js`, `vitest.config.ts` (node pool unit + @cloudflare/vitest-plugin workers pool), `.dev.vars.example` names-only, `wrangler.jsonc` (name voltbase-api, compat date ≥2026-08-04 and ≤60d old i.e. use 2026-08-04, nodejs_compat + global_fetch_strictly_public, NO KV/D1/R2/DO), `.gitignore` (.dev.vars, node_modules, dist, site/dist, coverage), `docs/spec.md` (spec excerpts copy).
2. Worker: `packages/mcp/worker/index.ts` Hono app with `GET /` (html contains "voltbase") + `GET /healthz` → `{"ok":true,"stage":1}` importing STAGE from `src/lib/stage.ts` (create `src/lib/stage.ts` exporting `STAGE=1`). `src/index.ts` re-export if needed. No KV/D1.
3. Packages shell: `packages/core/package.json`, `packages/normalise/package.json`, `packages/providers/package.json`, `packages/mcp/package.json`, `packages/cli/package.json` (bin {voltbase: ./bin/voltbase.js}, `--help` prints usage, exit 0), `packages/cli/bin/voltbase.js` plain node (no build).
4. Site shell: `site/package.json` + `site/astro.config.mjs` (base /voltbase) + `site/src/pages/index.astro` minimal + build script emitting `site/dist/index.html` (plain script OK, no astro install needed if pinned astro breaks — but prefer `astro build` if astro 7.3.2 installs cleanly; else static emit script + contract test on site/dist).
5. Scripts: `scripts/check-banned.sh` (fails on secret-like values + co-authored/generated with/claude/🤖; passes fixtures in `scripts/fixtures/{clean.txt,banned.txt}`), `scripts/smoke.sh` (curls / + /healthz on wrangler dev or imports app directly + checks bundle comment), `scripts/verify.sh` printing `VERIFY OK stage=1` after typecheck+lint+build+test+smoke (mirror lumen validate chain; bundle ≤1.5MB gzip comment noting self-budget not platform cap).
6. CI: `.github/workflows/ci.yml` (install, typecheck, lint, build, test, smoke — NO deploy job; YAML must parse).
7. Exact pins (no ^/~): typescript 5.9.3, vitest 4.1.11, @cloudflare/vitest-plugin 1.1.9, hono 4.13.7, wrangler 4.131.2, zod 4.6.5, eslint 10.10.0, typescript-eslint 8.70.0, @modelcontextprotocol/sdk 1.30.0, astro 7.3.2, pagefind 1.5.2. Node ≥22.

## Min tests 6 (vitest run green)
- healthz shape+stage; index contains voltbase; check-banned fixtures (clean pass/banned fail); no-persistence documented skip (test asserts no KV/D1 in wrangler.jsonc + ADR ref); Pages artifact dir assertion (site/dist/index.html exists); CLI --help smoke (exit 0 + usage).
- Place under `packages/mcp/worker/*.test.ts` (node pool ok) + `test/*.test.mjs` if needed. `npm test` = `vitest run`.

## Extra gates
- `npm run verify` prints `VERIFY OK stage=1`. `python3 -c yaml.safe_load` or node parses ci.yml. `git remote -v` stays empty. No secrets in git.
- Files owned: configs, scripts, site shell, workflows/ci, src/lib/stage.ts, packages/mcp/worker (S1 slice), packages/cli shell, docs/spec.md, README, LICENSE.

## Return contract
Reply with files created + `npm run verify` output + `npx vitest run` summary. Do NOT commit, do NOT touch LEDGER.md. ≤15 lines.
