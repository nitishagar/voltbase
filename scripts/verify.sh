#!/usr/bin/env bash
# scripts/verify.sh — S5 gate chain (mirrors the lumen validate chain):
# typecheck && lint && build && bundle-budget && test && smoke && check:banned,
# then print VERIFY OK stage=<N> with the stage read live from src/lib/stage.ts.
#
# Bundle note: the 1.5 MB gzip worker budget is a voltbase self-imposed
# cold-start budget, NOT a platform cap (platform: 64 MiB uncompressed).
set -euo pipefail

npm run typecheck
npm run lint
npm run build
bash scripts/check-bundle.sh
npm test
npm run smoke
npm run check:banned

STAGE="$(node --input-type=module -e "import('./src/lib/stage.ts').then((m) => console.log(m.STAGE))")"
echo "VERIFY OK stage=${STAGE}"
