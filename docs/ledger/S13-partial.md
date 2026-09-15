# S13 partial — private push OK, stopped at credential wall (2026-09-15)

Names only. Zero secret values in this file or in git.

## Preconditions (verified)
- `npm run verify` → `VERIFY OK stage=8` (23 test files / 130 tests pass, smoke green, `check-banned: OK`)
- `git remote -v` before push → empty (no output)
- `gh auth status` → `Logged in to github.com account nitishagar` (ssh protocol)

## 1. Private push — DONE
Command:
- `gh repo create nitishagar/voltbase --private --source=. --remote=origin --push`

Output:
- `https://github.com/nitishagar/voltbase`
- `To github.com:nitishagar/voltbase.git`
- `* [new branch] HEAD -> master`
- `branch 'master' set up to track 'origin/master'.`

Confirm:
- `git remote -v` →
  - `origin git@github.com:nitishagar/voltbase.git (fetch)`
  - `origin git@github.com:nitishagar/voltbase.git (push)`
- `git branch -vv` → `* master 72477be [origin/master] S8: pass clean-clone audit`
- `git ls-remote --heads origin` → `72477be... refs/heads/master`
- `gh api repos/nitishagar/voltbase --jq '{default_branch, visibility, private}'` →
  `{"default_branch":"master","private":true,"visibility":"private"}`
- Default branch detected: `master`

## 2. Branch protection — ATTEMPTED, NOT APPLIED (platform limit, not forced)
Command:
- `gh api repos/nitishagar/voltbase/branches/master/protection -X PUT -f required_status_checks[strict]=true -f required_status_checks[contexts][]=ci -F enforce_admins=false -F required_pull_request_reviews=null -F restrictions=null`

Output:
- `{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","documentation_url":"https://docs.github.com/rest/branches/branch-protection#update-branch-protection","status":"403"}`
- `gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)`
- `EXIT:1`

Verify:
- `gh api repos/nitishagar/voltbase/branches/master/protection` → same 403 on GET.
- `gh api repos/nitishagar/voltbase/branches/master --jq .protected` path reports `protected:false` (via full branch payload).
- Per brief: recorded exact attempt + outcome, did NOT force. Do NOT flip repo to public to work around this.

## 3. Wrangler dry-run — DONE (no creds needed)
Command:
- `npx wrangler deploy --dry-run`

Output (tail):
- `wrangler 4.131.2`
- `Total Upload: 2118.36 KiB / gzip: 383.63 KiB`
- `Binding: env.ENVIRONMENT ("development") Environment Variable`
- `--dry-run: exiting now.`
- `EXIT:0`

Real deploy: NOT RUN per brief (dry-run only).

## 4. STOP — not attempted
- Do NOT flip visibility to public.
- Do NOT tag (tag follows successful deploy per PLAN).
- Do NOT run real `wrangler deploy`.
- Do NOT wire Pages publish / live URL / npm publish.

## 5. Banned + no-trailer checks — PASS
- `bash scripts/check-banned.sh` → `check-banned: OK` (`BANNED_EXIT:0`)
- Trailer grep over last 5 commit bodies (4 patterns per scripts/check-banned.sh) → no matches (exit 1, clean)

## BLOCKED (exact credential/condition names)
1. Real `wrangler deploy` (`wrangler deploy --config packages/mcp/worker/wrangler.jsonc`, Worker `voltbase-api`, incl. the S6 cron; corrected 2026-09-15 from the root dev config, which lacks `triggers.crons`) — needs:
   - `CLOUDFLARE_API_TOKEN` (ABSENT, verified `[ -z "${CLOUDFLARE_API_TOKEN+x}" ]`)
   - `CLOUDFLARE_ACCOUNT_ID` (ABSENT, verified)
   - Source of names: `docs/env.md`, `docs/runbook.md` (deploy section). Never invent values.
2. `wrangler secret put OCM_API_KEY` (BYOK runtime key rotation/live search check) — needs value for name `OCM_API_KEY` (names-only per `docs/env.md`).
3. Pages publish / live URL on public flip — needs public visibility + `GITHUB_TOKEN` (Actions) per `docs/env.md`; flip requires explicit approval mid-run — NOT given, NOT attempted.
4. Branch protection require-CI (`ci`) — BLOCKED by platform rule: private repo on free plan returns HTTP 403 (see §2). Alternate path (make public) explicitly banned this run.
5. npm workspaces publish — NOT attempted: `private:true` stays; script default is dry-run only (`node scripts/publish-workspaces.mjs`).

## Notes
- `LEDGER.md` untouched per brief.
- Repo stays PRIVATE at `github.com/nitishagar/voltbase.git`, `master` tracks `origin/master`.
- This file (`docs/ledger/S13-partial.md`) written post-push; intentionally uncommitted this run (brief orders write only, no follow-up commit/tag/flip).

## Addendum — 2026-09-15 post-flip (orchestrator)
- Public flip DONE (user-approved): repo now PUBLIC; Pages enabled `build_type=workflow`; pages.yml wired to publish (`configure-pages@v5` → `upload-pages-artifact@v3` → `deploy-pages@v4`, master trigger fixed from main) — commit 9add3a5; https://nitishagar.github.io/voltbase/ serves 200.
- CI green on GitHub for the first time (all 5 jobs): latent CI-only failure fixed — publish-workspaces CI guard scoped to `--publish` (commit 5dca212; repro: `CI=true npx vitest run tests/release-ttfb.test.ts`).
- STILL BLOCKED, unchanged: `wrangler deploy` (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID), `wrangler secret put OCM_API_KEY` (needs value), tag `v0.1.0` (follows successful deploy per §4). Branch protection now possible (public).
