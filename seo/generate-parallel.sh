#!/usr/bin/env bash
# seo/generate-parallel.sh — generate N artikel dengan P worker paralel.
# Cepat 3-5x dibanding serial: tiap keyword ditugaskan di muka (tanpa race),
# worker tulis MDX + --defer-queue; queue di-merge SEKALI di akhir.
# Portabel macOS bash 3.2 (tanpa mapfile).
#
# Pemakaian:
#   bash seo/generate-parallel.sh 12        # 12 artikel, 4 worker
#   bash seo/generate-parallel.sh 20 6      # 20 artikel, 6 worker
#   GROQ_API_KEY=... bash seo/generate-parallel.sh 20 4   # via Groq (cepat)
#
# PENTING: worker pakai `--split` (3 panggilan kecil per artikel). Tanpa itu, satu
# prompt 1200-1400 kata tidak sanggup ditulis model gratis — diuji 4 Okt: 0 dari 4
# artikel lolos, semuanya ditolak gate. Lihat `buildPartPrompt` di prompts.ts.
# Set SEO_NO_SPLIT=1 untuk memakai prompt besar (hanya andal kalau model kuat).
set -u
cd "$(dirname "$0")/.."

COUNT="${1:-8}"
WORKERS="${2:-4}"
KWFILE="/tmp/seo-kws-$$.txt"

# Mode split default (3 panggilan kecil per artikel). SEO_NO_SPLIT=1
# memaksa prompt besar — hanya andal kalau model-nya kuat.
if [ "${SEO_NO_SPLIT:-0}" = "1" ]; then SPLIT=""; else SPLIT="--split"; fi

echo "== ambil $COUNT target =="
node seo/generate.mjs --count="$COUNT" --list="$COUNT" 2>/dev/null | sed -n 's/^KW:://p' > "$KWFILE"
NKWS=$(wc -l < "$KWFILE" | tr -d ' ')
echo "dapat $NKWS keyword"

n=0
while IFS= read -r kw; do
  [ -z "$kw" ] && continue
  while [ "$(jobs -p | wc -l)" -ge "$WORKERS" ]; do sleep 5; done
  n=$((n + 1))
  echo "[$n/$NKWS] start: $kw"
  node seo/generate.mjs --keyword="$kw" $SPLIT --defer-queue > "/tmp/seo-w-$n.log" 2>&1 &
done < "$KWFILE"
wait
rm -f "$KWFILE"

echo "== merge queue =="
node seo/generate.mjs --merge-queue
echo "== selesai =="
