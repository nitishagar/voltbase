# S0-ARCH brief — stack/services ADRs, stack.md, env.md

Role: architect. Sequential only (ratelimit). No app code, no commits, no remotes, no secrets.
Inputs (absolute): research `/home/nitish/Documents/personal-development/thoughts/shared/research/2026-09-14-voltbase-open-core-ev-data-tooling.md`; plan bundle `/home/nitish/Documents/personal-development/thoughts/shared/plans/2026-09-14-voltbase/{PLAN.md,IMPLICIT_SPEC.md,LEDGER.md,PLAN_VALIDATION.md}` (W1-W7 + pass-8 addendum); sibling reports `/home/nitish/repos/learn/voltbase/docs/research/{frameworks.md,feeds.md}` + `/home/nitish/repos/learn/voltbase/docs/free-tier-limits.md`.

## Tasks
1. `docs/adr/ADR-001-stack.md`: stack decision from R1 rubric (Hono-default vs itty vs plain; adopt only on ≥10pt win + spike pass — record actual margins); npm-vs-pnpm rationale (lumen parity, W2); TS 5.9.x/6.0.x pin (not 7.0) + vitest 4.1.x + `@cloudflare/vitest-plugin` rationale; Go/Rust verdict (honest, with evidence; rejected-with-reasons or adopted on ≥10pt + spike); CSS single-stylesheet default unless S0 proves lighter.
2. `docs/adr/ADR-002-feeds.md`: feed order NL→LU(CC0-KML-only)→FR with per-dataset licence+access evidence table (URLs + observed dates); DE/SE-NO second-wave with reasons; LU second-set + PT Mobi.e + OCM with-key check as open tickets; poll cadence × write-budget math answering W1 (per-minute naive vs KV 1k/d + D1 100k/d + hard-fail guard; cut-to-artifact fallback).
3. `docs/adr/ADR-003-licence-boundary.md`: served index = ODbL Collective (per feature-type/regional-cut partition, no cross-referencing — cite OSMF tests or UNVERIFIED) vs Derivative (publish under ODbL). Decide partitioning for S2 (per-row source+licence key). Unknown licence ⇒ closed.
4. `docs/stack.md`: layout (packages/*: core/normalise/providers/mcp/cli + site), scripts, bindings (no KV/D1 until ADR + budget), test invocation, S1 mapping. `docs/env.md`: BYOK NAMES only (incl. OCM key name), never values. `docs/research/package-check.md`: `npm view` proofs incl. peer pins (vitest 4.1.x, TS ≤6.0.x).
5. S5–S8 Depends/Extra-gates/Files-owned lines (W7/W9): propose explicit lines per stage for S0 sign-off.
6. Kill-4 re-check line (§1.10): NAPSPAN proprietary + OCM #237 open ⇒ no trigger (re-check S8).

## Return contract (STRICT)
Six files: `docs/adr/ADR-001-stack.md`, `docs/adr/ADR-002-feeds.md`, `docs/adr/ADR-003-licence-boundary.md`, `docs/stack.md`, `docs/env.md`, `docs/research/package-check.md`. Requirements language: WHAT + WHY + evidence; no HOW beyond file/layout naming S1 needs. `docs/env.md` must contain ZERO secret values (names only). Hard cap: 200 lines total. Do NOT commit, do NOT touch LEDGER.md. Reply with paths + decisions (stack/feed-order/collective-vs-derivative) + open tickets in ≤15 lines.
