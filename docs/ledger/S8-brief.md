# S8 brief — clean-clone audit (fresh agent in a clone)

Role: auditor (fresh eyes). Sequential only. No remotes, no secrets, no deploy/publish. Report-only except blocking fixes + STAGE→8 bump.
Inputs: PLAN.md §4 S8 + §1 kill-gates; IMPLICIT_SPEC (all IS); docs/stack.md S8 line (Depends S7 PASSED; fresh-clone install+verify+e2e green; 8 random S2–S6 tasks re-verified with citations; ADR↔code + spec↔route coverage; security scrub diff since S5; kill-4 re-check NAPSPAN + OCM #237); all ADRs; docs/architecture.md + runbook.md.

## Tasks
1. Fresh clone: `git clone /home/nitish/repos/learn/voltbase /tmp/voltbase-S8-audit` (file-local clone, no remote), `node --version && npm install && npm run verify` + `npx vitest run` in the CLONE (record outputs; expect VERIFY OK stage=7 pre-bump, then 130/130).
2. Re-verify 8 RANDOM tasks S2–S6 with citations (pick spanning normalise partition key, licence filter, closed-exclusion, rate-limit/SSRF, MCP parity/key-isolation, site artifact, journal-once, 80% guard — cite file:line each).
3. Coverage: ADR↔code (ADR-001 pins/Hono, ADR-002 feed order/budgets/cron, ADR-003 partition/no-join/closed) + spec↔route (docs/spec.md vs worker routes + MCP tools). List gaps or confirm full.
4. Security scrub sign-off on diff since S5 (`git log --oneline S5..HEAD` equivalent: S6+S7 diffs): injection/auth/secrets/SSRF/traversal review of poller/guard/cron/e2e/publish script. Kill-4 re-check: NAPSPAN proprietary + OCM #237 open ⇒ no trigger (cite ADR-002 + plan; no network needed, record as code-evidence recheck).
5. Write `docs/ledger/S8-audit.md` in SOURCE repo: verdict PASS or BLOCKING/MINOR list; include clone outputs, 8 citations, coverage tables, sec sign-off, kill-4 line. Fix BLOCKING items in source (if any) then re-run verify.
6. If PASS: bump STAGE 7→8 (stage.ts, worker/scaffold/healthz literals, smoke-check, verify.sh) + `npm run verify` → VERIFY OK stage=8. Status → READY_FOR_CREDENTIALS (record in report). Files owned: report only (+ blocking fixes + stage bump).

## Extra gates
Fresh-clone green; VERIFY OK stage=8 in source; remote empty; no publish.
Return verdict + counts. Do NOT commit, do NOT touch LEDGER.md (report file only + fixes). ≤15 lines.
