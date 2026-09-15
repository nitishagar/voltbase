#!/usr/bin/env bash
# scripts/verify.sh — S1 gate chain (mirrors the lumen validate chain):
# typecheck && lint && build && test && smoke && check:banned.
#
# Bundle note: the 1.5 MB gzip worker budget is a voltbase self-imposed
# cold-start budget, NOT a platform cap (platform: 64 MiB uncompressed).
set -euo pipefail

npm run typecheck
npm run lint
npm run build
npm test
npm run smoke
npm run check:banned

STAGE="$(node --input-type=module -e "import('./src/lib/stage.ts').then((m) => console.log(m.STAGE))")"
echo "VERIFY OK stage=${STAGE}"
