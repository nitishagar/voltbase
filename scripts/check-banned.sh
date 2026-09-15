#!/usr/bin/env bash
# scripts/check-banned.sh — S1 secret/attribution-trailer gate (IS-05 / IS-09).
#
# Usage:
#   bash scripts/check-banned.sh [file ...]
# With no args, scans every git-tracked + untracked-but-not-ignored file
# (`git ls-files --cached --others --exclude-standard`), so local-only state
# (`.dev.vars`, node_modules, dist) is never scanned. With args, scans exactly
# those files — the gate tests use this for scripts/fixtures/{clean,banned}.txt.
#
# Fails (exit 1) on secret-like values (BYOK material, tokens, private keys)
# and on attribution trailers. Passes fixtures/clean.txt, fails
# fixtures/banned.txt. Exits 0 when clean.
#
# NOTE: patterns are built by concatenation so this file never matches itself.
set -euo pipefail

trailer_re="co-auth""ored-by|gener""ated with|cla""ude|"$'\xf0\x9f\xa4\x96'
secret_re="AK""IA[0-9A-Z]{16}|gh""p_[A-Za-z0-9]{36}|gh""o_[A-Za-z0-9]{36}|sk""-(live|test)-[A-Za-z0-9]{16,}|xo""x[bpas]-[A-Za-z0-9-]+|-----BEGIN [A-Z ]*PRIV""ATE KEY-----|(OCM_""API_KEY|CLOUDFLARE_""API_TOKEN|CLOUDFLARE_""ACCOUNT_ID|GITHUB_""TOKEN)[[:space:]]*=[[:space:]]*['\"]?[A-Za-z0-9_./-]{8,}"

files=()
if [ "$#" -gt 0 ]; then
  files=("$@")
else
  while IFS= read -r -d '' f; do
    case "$f" in
      scripts/check-banned.sh|scripts/fixtures/banned.txt|docs/ledger/*-brief.md) continue ;;
      *) files+=("$f") ;;
    esac
  done < <(git ls-files --cached --others --exclude-standard -z)
fi

hits=0
for f in ${files[@]+"${files[@]}"}; do
  [ -f "$f" ] || continue
  if grep -HnEIi -- "$trailer_re" "$f"; then hits=1; fi
  if grep -HnE -- "$secret_re" "$f"; then hits=1; fi
done

if [ "$hits" -ne 0 ]; then
  echo "check-banned: FAIL — banned content found (see hits above)" >&2
  exit 1
fi
echo "check-banned: OK"
