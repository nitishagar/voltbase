# S13 brief — private push + public flip + deploy (credentials required, partial allowed)

Role: builder. Sequential only. Credentials: `gh nitishagar` present; CLOUDFLARE_API_TOKEN/ACCOUNT_ID ABSENT (do NOT invent; never ask for values in output; stop before any step needing them).
Inputs: PLAN.md §4 S13-equivalent + §1.3/1.4/1.10; docs/runbook.md (deploy section); docs/stack.md; LEDGER §§1/5 (gh verified 2026-09-14, no creds until S13).

## Preconditions (verified 2026-09-15)
- `npm run verify` → VERIFY OK stage=8; tree clean; `git remote -v` empty; `gh auth status` = nitishagar.

## Tasks (in order, STOP at first credential wall)
1. `gh repo create nitishagar/voltbase --private --source=. --remote=origin --push` (private first). Confirm `git remote -v` shows origin + remote branch pushed.
2. Branch protection on default branch (require CI): `gh api repos/nitishagar/voltbase/branches/master/protection` (or main — detect default first) with required_status_checks (ci) + enforce_admins false; if API shape differs, record exact attempt + outcome, do not force.
3. Wrangler production env + secrets + `wrangler deploy`: ATTEMPT `npx wrangler deploy --dry-run` (no creds needed) to prove deployability; do NOT run real deploy (needs CF token/account — record as BLOCKED with exact missing names).
4. STOP before public flip / Pages / live URL / npm publish (all need either CF creds or explicit flip approval mid-run). Do NOT flip visibility, do NOT tag (tag follows successful deploy per PLAN).
5. Banned + no-trailer checks: `bash scripts/check-banned.sh` + `git log --format=%B -5 | grep -iE 'co-authored|generated with|claude|🤖'` = 0.

## Return contract
Write `docs/ledger/S13-partial.md` (commands + outputs + what is BLOCKED and the exact credential names needed). Do NOT touch LEDGER.md. Reply ≤15 lines: pushed? protection? dry-run? blocked items.
