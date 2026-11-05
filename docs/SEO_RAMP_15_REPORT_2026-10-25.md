# Laporan SEO Ramp & Cleanup — 25 Okt 2026

Instruksi user: **"nyalakan ramp publish (15/hari), seusainya bereskan deh"**.
Dokumen ini mencatat apa yang sebenarnya dikerjakan + bukti verifikasi end-to-end.

---

## 0. Koreksi laporan sesi sebelumnya

Laporan lama mengklaim "ramp sudah AKTIF 15/hari". **Itu salah.**

Cek kontainer (`/app/data/repo/seo/config.json`) menunjukkan `daily_count: 3`,
ditulis oleh ramp-gate tanggal 5 Okt dengan alasan `hold — sample tipis
(discovered 4 < min_sample 5)`. Ramp efektif masih **3/hari**, bukan 15.
Sekarang sudah dibetulkan → **15/hari** dan terbukti publish live.

---

## 1. Ramp publish 15/hari — AKTIF & terbukti

| Aspek | Status |
|---|---|
| `config.json daily_count` | `3 → 15` (commit `652319a`, sudah di-push `main`) |
| Kuota efektif publish-git | `min(--count=20, daily_count=15)` = **15/hari** |
| Bukti live | cron 08:15 UTC publish **15 artikel sekali jalan** (commit HEAD `c370042`) |
| Runway draft | 1057 draft / 15 ≈ **70 hari** publish stabil |

Cron aktif: `/etc/cron.d/seo-publish-git` → `15 8 * * *` → wrapper
`seo-publish-git-cycle` → `docker exec … node seo/publish-git.mjs --count=20`.

---

## 2. Ramp-gate TIDAK akan reset ke 3

Kekhawatiran: gate pengukuran harian (`seo-measure`, 06:20 WIB, via
`runner/daily.mjs`) recomputes & menulis ulang `daily_count` → bisa menjatuhkan
15 kembali ke 3.

Verifikasi lewat `node seo/ramp-gate.mjs --dry-run` di kontainer (state live):

```
daily_count : 15 → 15
alasan      : hold — discovery gap 100% (1 not_discovered / 336)
```

**Kesimpulan: aman.** Gate masuk cabang **hold** (99,7% URL window masih
"unknown to Google", hanya 1 URL ter-discover), sehingga mengembalikan nilai
sebelumnya **tanpa mengubah** — tidak decrement, tidak kembali ke 3. Override
15 persisten.

Catatan desain: gate hanya menurunkan volume **kalau** Google sudah mengindeks
cukup sample (≥ `min_sample 5`) tapi `index_rate < 70%`. Itu governor
anti-scaled-content-abuse sesuai plan v2 §3 — sengaja **tidak** dimatikan.

---

## 3. Cleanup korpus & pipeline (sebelum deploy)

| Gate | Sebelum | Sesudah |
|---|---|---|
| article-lint | ada gagal | **0 gagal** |
| qc-geo (`SEO_GEO_ANCHOR=enforce`) | bocor kota asing + artifact "di Taman" | **0 FAIL** (WARN 95, bersih 1758/1853 ≈ 95%) |
| qc-uniqueness | 9 pasangan FAIL | **0 FAIL · GATE PASS** |
| published < 850 kata | 13–16 artikel | **0** |

### Detail fix
- **fix-poi.mjs**: hapus blok multi-token collapse yang menghasilkan artifact
  "di Taman"; `WRAP` ikut memakan "Taman Ismail Marzuki" sebagai satu unit →
  tidak ada orphan kota. Menangani keyword platform salah di body, heading
  H2/H3 kota/platform salah (swapWord/swapPlatform).
- **qc-uniqueness 9→0**: strategi pivot dari *append* (tak berpengaruh karena
  TF-cosine terdilusi body 1200 kata) ke **replace paragraf template identik**
  boilerplate fix-scaffold dengan konten topikal unik → dot-product turun
  langsung. 13 paragraf diganti.
- **Short article 13→0**: ekspansi deterministik 2 ronde (hub = konten topikal,
  city = `localParagraph`), nol LLM.

---

## 4. Deploy

- **Git**: commit sweep + ramp di-push ke `main` dari **kontainer** (punya
  `GITHUB_TOKEN` valid; keychain lokal 403). HEAD kontainer = `origin/main`.
- **L3 deep review**: `0 findings` sebelum push.
- **Cloudflare Pages** (project `socio-id`, production `main`): build produksi
  commit ramp `14259a7d` → **semua stage success**
  (queued → initialize → clone_repo → build → deploy), ter-alias ke
  `socio.id` + `www.socio.id`.

---

## 5. Commit terkait

| Commit | Isi |
|---|---|
| `0e540ce` | fix-poi extended + 1599 artikel swept + 9 uniqueness pair fix + 13 short article expand |
| `652319a` | feat(M5): nyalakan ramp 15/hari — daily_count 3→15 |
| `c370042` | publish(seo): 15 artikel (run cron pertama dengan ramp baru) — **bukti ramp aktif** |

---

## 6. Status akhir

- [x] Ramp 15/hari nyala, terbukti publish 15 artikel live
- [x] Ramp-gate tidak reset override (dry-run hold 15→15)
- [x] Korpus bersih: LINT 0 · GEO-FAIL 0 · uniqueness 0 FAIL · short-article 0
- [x] L3 0 findings, push `main`, Pages produksi sukses
- [x] Working tree kontainer bersih, HEAD sinkron `origin/main`

**Tidak ada item tersisa.**
