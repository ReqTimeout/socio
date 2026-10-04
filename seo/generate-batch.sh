#!/usr/bin/env bash
# seo/generate-batch.sh — BATCH GENERATOR (A8).
# Loop generate.mjs 1 artikel per iterasi -> kumpulin buffer draft.
# - Stop otomatis setelah N gagal beruntun (kemungkinan gate Fase F tertutup,
#   opencode error, atau keyword bermasalah) supaya tidak boros token/loop liar.
# - generate.mjs exit 1 kalau ada fail di batch-nya; --count=1 bikin semantics
#   "gagal beruntun" presisi per-artikel (bukan per-blob).
# - Gate Fase F: kalau daftar keyword belum di-approve, generate exit 1 ->
#   batch berhenti dalam <=3 iterasi (aman, tidak generate diam-diam).
#
# Pemakaian:
#   bash seo/generate-batch.sh              # default: maks 80 iterasi, stop 3-fail
#   bash seo/generate-batch.sh 120          # maks 120 artikel dicoba
#   bash seo/generate-batch.sh 120 5        # ... stop setelah 5 gagal beruntun
set -uo pipefail
cd "$(dirname "$0")/.."

MAX_ITER="${1:-80}"
STOP_AFTER_FAILS="${2:-3}"

ok=0
fail=0
consec=0
iter=0

while [ "$iter" -lt "$MAX_ITER" ]; do
  iter=$((iter + 1))
  echo ""
  echo "==================== BATCH ITER $iter/$MAX_ITER ===================="
  if node seo/generate.mjs --count=1; then
    ok=$((ok + 1))
    consec=0
  else
    rc=$?
    fail=$((fail + 1))
    consec=$((consec + 1))
    echo "[batch] generate exit $rc (gagal beruntun=$consec)"
    if [ "$consec" -ge "$STOP_AFTER_FAILS" ]; then
      echo "[batch] STOP: $consec gagal beruntun. Cek alasan di log di atas."
      echo "[batch] Kalau 'GATE FASE F TERTUTUP' -> approve keyword dulu (pnpm seo:geo -> review -> pnpm seo:geo:promote)."
      break
    fi
  fi
done

echo ""
echo "===================================================="
echo "[batch] SUMMARY: iter=$iter  ok=$ok  fail=$fail"
echo "[batch] Draft MDX ada di BLOG_DIR (override SEO_CONTENT_DIR). Queue item -> status 'draft'."
echo "===================================================="

if [ "$ok" -eq 0 ] && [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
