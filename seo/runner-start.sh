#!/bin/bash
# Dipakai CMD di Dockerfile. Pastikan state published sinkron dengan file MDX
# SEBELUM container masuk idle — karena file MDX ikut ke image dan kembali ke
# draft:true setiap rebuild. Lihat seo/restore-published.mjs.
set -u

# 1) Pulihkan draft:false yang hilang saat rebuild.
node seo/restore-published.mjs || echo "[start] restore-published gagal (lanjut)"

# 2) Heal queue yang desync dari file MDX.
#
# Kenapa perlu: queue.json menandai status tiap artikel, tapi publish.mjs menulis
# queue SEBELUM deploy. Kalau deploy gagal di tengah jalan (timeout Pages, Ctrl-C,
# OOM), queue sudah bilang "published" padahal file masih draft:true — atau
# sebaliknya. Item yang desync bikin publish.mjs berhenti dengan
# "FATAL: frontmatter tidak berubah — draft:true tidak ditemukan?" dan task
# publish per-jam GAGAL SETIAP JAM sampai orang intervensi manual.
#
# Sumber kebenaran = file MDX (itulah yang benar-benar tayang di situs).
node seo/heal-queue.mjs || echo "[start] heal-queue gagal (lanjut)"

exec node runner/idle.mjs
