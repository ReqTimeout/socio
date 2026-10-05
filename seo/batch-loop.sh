#!/usr/bin/env bash
# seo/batch-loop.sh — generate artikel nonstop sampai antrean habis.
#
# Dipakai karena jalur LLM (seo/generate.mjs) yang menghasilkan artikel NYATA
# (lolos semua gate) memang lambat: ~4 menit/artikel, success rate ~58%. Untuk
# 999 keyword itu ~14 jam dengan 5 worker. Tidak masalah asal jalan terus —
# syaratnya progres tersimpan, jadi setiap batch langsung di-commit.
#
# Loop ini:
#   1. ambil 1 artikel (--count=1, pickTargets ambil priority tertinggi)
#   2. generate
#   3. kalau sukses → queue sudah di-mark draft oleh generate.mjs
#   4. commit
#   5. ulangi sampai tidak ada target pending
#
# Dipakai: nohup bash seo/batch-loop.sh 5 > /tmp/batch-loop.log 2>&1 &
set -u
cd "$(dirname "$0")/.."

WORKERS="${1:-5}"
i=0
berhasil=0
gagal=0

echo "== batch-loop mulai $(date '+%F %T') · workers=$WORKERS =="

while true; do
  # cek masih ada target?
  pending=$(node -e "
    import('./seo/paths.mjs').then(m=>{
      const fs=require('node:fs');
      const q=JSON.parse(fs.readFileSync(m.QUEUE_PATH,'utf8'));
      const n=(q.items||[]).filter(i=>i.status==='pending'&&i.keyword).length;
      process.stdout.write(String(n));
    });
  " 2>/dev/null)
  if [ -z "${pending:-}" ] || [ "$pending" = "0" ]; then
    echo "== antrean habis atau tidak terbaca. berhenti $(date '+%F %T') =="
    break
  fi
  echo "-- sisa target: $pending (sukses=$berhasil gagal=$gagal) $(date '+%H:%M:%S')"

  # satu batch paralel
  i=$((i+1))
  bash seo/generate-parallel.sh "$WORKERS" "$WORKERS" >> /tmp/batch-loop-w.log 2>&1

  # hitung hasil batch ini dari mdx yang baru muncul
  baru=$(git status --porcelain landing/src/content/blog/ 2>/dev/null | grep -c '^??')
  gagal=$((gagal+WORKERS-baru))
  berhasil=$((berhasil+baru))

  # commit progres
  if [ "$baru" -gt 0 ]; then
    git add -A landing/src/content/blog/ seo/queue.json seo/state.json >/dev/null 2>&1
    git commit -q -m "content(seo): +${baru} artikel (batch ${i}) — total sukses ${berhasil}" >/dev/null 2>&1 \
      && echo "   commit: +${baru} artikel (total ${berhasil})" \
      || echo "   commit GAGAL (skip)"
  else
    echo "   batch ${i}: tidak ada artikel baru"
  fi

  # Jeda antar batch supaya tidak membanjiri API
  sleep 20
done

echo "== selesai. sukses=${berhasil} gagal=${gagal} =="
