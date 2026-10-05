#!/bin/bash
# Dipakai CMD di Dockerfile. Pastikan state published sinkron dengan file MDX
# SEBELUM container masuk idle — karena file MDX ikut ke image dan kembali ke
# draft:true setiap rebuild. Lihat seo/restore-published.mjs.
set -u
node seo/restore-published.mjs || echo "[start] restore-published gagal (lanjut)"
exec node runner/idle.mjs
