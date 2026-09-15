#!/usr/bin/env bash
# scripts/check-bundle.sh — S3 worker bundle self-budget gate.
#
# Fails when the gzipped Worker sources exceed 1.5 MiB. The 1.5 MB gzip budget
# is a voltbase self-imposed cold-start choice, NOT a platform cap (platform:
# 64 MiB uncompressed). Until the worker build emits a dist bundle, this gates
# the source proxy (worker + its in-repo imports); S6+ swaps the measured path
# for the bundled output without changing the cap.
set -euo pipefail

CAP_BYTES=1572864 # 1.5 MiB
BYTES="$(gzip -c packages/mcp/worker/*.ts packages/core/src/index.ts packages/normalise/src/index.ts src/lib/stage.ts | wc -c)"
BYTES="$(echo "${BYTES}" | tr -d ' ')"

if [ "${BYTES}" -gt "${CAP_BYTES}" ]; then
  echo "check-bundle: FAIL — ${BYTES} gz bytes exceed the 1.5 MiB self-budget (${CAP_BYTES})" >&2
  exit 1
fi
echo "check-bundle: OK (${BYTES} gz bytes <= ${CAP_BYTES}; 1.5 MiB self-budget, platform cap 64 MiB uncompressed)"
