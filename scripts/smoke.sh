#!/usr/bin/env bash
# scripts/smoke.sh — S1 smoke: imports the Worker app directly (no wrangler
# dev needed) and asserts / + /healthz, then checks the bundle-budget comment
# in scripts/verify.sh (self-budget note, not a platform cap).
set -euo pipefail

node scripts/smoke-check.mjs
grep -q '1\.5' scripts/verify.sh
grep -q '64 MiB' scripts/verify.sh
echo 'SMOKE OK'
