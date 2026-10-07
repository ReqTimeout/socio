# Revamp /pesan — Platform Chip Icon (2026-10-07)

> **DOKUMEN REPLIKASI `.my`**: seluruh perubahan di bawah ini WAJIB direplikasi
> identik ke `socio.my` saat duplicate (Fase order-flow). Struktur config-driven
> (`@socio/core/catalog.ts`) membuat replika = copy file + copy page.

## Masalah asal

- Dropdown "Kategori" memuat **1.132 nama kategori mentah provider** (mojibake,
  unicode-style, duplikat: `[ Provider ] Instagram Followers [ ARAB ]`,
  `21222`, `New`, `Campaign`), termasuk ~224 kategori TANPA layanan aktif.
- Dropdown "Layanan" memuat **8.413 layanan** sekaligus.
- Kolom `services.type` 99,9% = `"Default"` → fitur Custom Comments (`type ===
  "Custom Comments"`) MATI total tanpa disadari.
- Flow mobile: 2 dropdown raksasa + scroll panjang.

## Keputusan desain (final, sudah disetujui owner)

1. **Setiap platform & setiap jenis WAJIB punya icon sendiri** — tidak ada
   icon generik/shared. Daftar final 11 platform + 17 jenis di bawah.
2. **Nol sampah**: nama kategori mentah TIDAK PERNAH tampil di UI lagi.
3. **Hilang otomatis**: semua yang tampil difilter `status = 1` LIVE per request
   (tanpa cache) → layanan/kategori yang dinonaktifkan hilang sendiri.
4. Tetap dipertahankan: validasi link + cek silang platform, kupon, QtyStepper,
   price summary, bottom-CTA mobile, anti-bocor harga (hanya `pricePer1k`).
5. Dikerjakan di `.id` dulu, `.my` inherit.

## Daftar final: 11 platform (urutan tampil = urutan chip)

| # | id | Label | Icon | Layanan aktif* |
|---|---|-------|------|---:|
| 1 | `instagram` | Instagram | `instagram` | 1.756 |
| 2 | `tiktok` | TikTok | `tiktok` (BARU, fill) | 1.567 |
| 3 | `youtube` | YouTube | `youtube` | 875 |
| 4 | `facebook` | Facebook | `facebook` | 799 |
| 5 | `x` | X (Twitter) | `twitter` | 554 |
| 6 | `telegram` | Telegram | `telegram` | 1.017 |
| 7 | `whatsapp` | WhatsApp | `whatsapp` | 55 |
| 8 | `spotify` | Spotify | `spotify` (BARU, fill) | 273 |
| 9 | `musik` | Musik | `music` | 44 |
| 10 | `kwai` | Kwai | `play` | 161 |
| 11 | `other` | Lainnya | `globe` | ~1.308 |

\* per 2026-10-07. Chip yang hitungannya 0 TIDAK dirender (otomatis).

## Daftar final: 18 jenis (urutan tampil = `KIND_ORDER`)

followers (`user_plus`), likes (`heart`), views (`eye`), **live (`activity`)**,
comments (`message`),
subscribers (`users`), members (`users`), shares (`share` BARU), reactions
(`zap`), plays (`play`), reviews (`star`), saves (`bookmark` BARU),
impressions (`chart`), reach (`trending_up`), watchtime (`clock`), traffic
(`globe`), mentions (`hash`), other/Lainnya (`tag`).

## File yang diubah (replikasi 1:1 ke `.my`)

| File | Perubahan |
|------|-----------|
| `packages/core/src/catalog.ts` | **BARU.** `PLATFORMS`, `KINDS`, `KIND_ORDER`, `detectPlatform()`, `detectKind()`, `isCustomCommentsService()`, `PLATFORM_LINK_NAME`. Murni string, aman di client. |
| `packages/core/package.json` | Export `./catalog`. |
| `packages/ui/src/components/Icon.svelte` | Icon baru: `tiktok`, `spotify` (fill), `share`, `bookmark` (stroke). Dukungan `FILL_ICONS` (fill=currentColor, stroke=none). |
| `packages/db/src/schema/services.ts` | Index `status_idx` (status). |
| `packages/db/drizzle/0003_services_status_idx.sql` | **BARU.** `ALTER TABLE services ADD INDEX status_idx (status)`. **Sudah di-apply ke TiDB prod 2026-10-07.** `.my` (DB `socio_my` kosong) dapat otomatis via migrate. |
| `app/src/routes/(app)/pesan/+page.server.ts` | `load()` tidak lagi kirim 1.132 kategori. Ganti agregasi platform+count live (`status=1`). Deep-link `?service=` ikut bawa `platform`+`kind`. Import `categories`/`whitelabel`/`asc` yang tak terpakai dibuang. |
| `app/src/routes/(app)/pesan/services/+server.ts` | Param baru: `platform`, `kind`, `q` (search, LIKE, max 60), `kinds=1` (agregasi jenis `{id,count}`). `cat` tetap didukung (kompat). Tiap baris ditempeli `platform`+`kind`. Cap 500 baris. |
| `app/src/routes/(app)/pesan/+page.svelte` | Flow baru: search global → chip platform (icon+count) → chip jenis (icon+count, auto-pilih pertama) → card radio layanan (nama+Rp/1000+min+ badge Termurah/Refill). `Select` dibuang. `isCustomComments` dari **nama** (`isCustomCommentsService`) — fitur komen custom hidup lagi (216 layanan). Validasi silang pakai `PLATFORM_LINK_NAME` (kanonik, bukan regex nama). Step: Platform → Layanan → Order. Summary: "Platform" ganti "Kategori". CSS baru: `.platform-chip`, `.kind-chip`, `.svc-card`, `.platform-rail` (transform/opacity only + reduced-motion). |

## Aturan mapping (jangan diubah sepihak — ubah di `catalog.ts`, beraku dua repo)

- `detectPlatform(namaLayanan, namaKategori?)`: cek spesifik dulu
  (spotify → musik; blacklist long-tail → other: xiaohongshu, bluesky,
  shopee/tokopedia, backlink/SEO, press release, coingecko, trustpilot).
  Tak dikenali → `other` (masuk Lainnya, BUKAN hilang).
- `detectKind(namaLayanan)`: watchtime dicek SEBELUM views; subscribers
  dipisah dari followers; tak dikenali → `other`.
- Validasi silang link: `PLATFORM_LINK_NAME[platform]` vs hasil `validateLink()`.
  Platform non-link (WA/Spotify/Musik/Kwai/Lainnya) = string kosong = tidak dicek.

## Follow-up 2026-10-07 malam (feedback owner: "kurang, ga lengkap, livestream ga ada")

1. **3 bucket kepotong cap 500** (IG followers 750, TikTok followers 577, IG likes
   523) → cap naik ke **1000** (`services/+server.ts`). Bucket terbesar muat penuh.
2. **Jenis baru `live`** (icon `activity`, urutan ke-4 setelah views):
   `detectKind` cek `/live|livestream|live-stream|stay time|concurrent/` SEBELUM
   views → 706 layanan live keluar dari kubangan views jadi chip sendiri.
3. **Search ditokenisasi + alias** (`normalizeSearchQuery` di catalog.ts):
   semua token harus cocok (AND). "livestream view" → live AND view;
   "followers ig" → followers AND instagram. Alias: ig/tt/yt/fb/tg/wa,
   subs/sub, pengikut, suka, tonton/lihat, komentar/komen, pelanggan, anggota,
   bagikan, ulasan, simpan. Query tanpa token valid → kosong (bukan full scan).
4. **Mobile: chip platform = ICON SAJA** (label/count hanya desktop lg+ via CSS;
   nama tetap di `aria-label`+`title`). Touch target 52px, icon 22px dalam
   bingkai 2.3rem.

## Verifikasi (2026-10-07, sesi ini)

- [x] Mapping diuji ke 8.413 nama asli: distribusi wajar, bucket other = long-tail
      legit (Snapchat/Quora/BlueSky), custom-comments = 216 layanan.
- [x] `svelte-check`: 0 error. ESLint pesan: 0 error. Prettier: file app OK
      (Icon.svelte + schema dikecualikan — tanpa plugin svelte di packages/ui).
- [x] `app build` sukses.
- [x] Migrasi 0003 applied ke TiDB prod (`EXPLAIN` pakai `status_idx`).
- [ ] **MANUAL (owner, di HP)**: buka `/pesan` → tap chip IG → tap Followers →
      tap 1 card → isi link → qty → Pesan. Cek: (a) search "likes tiktok" muncul,
      (b) deep-link Favorit (`?service=`) buka bucket benar, (c) layanan komen
      custom tampil textarea, (d) mismatch link IG vs TikTok muncul warning.

## Catatan `.my` (saat duplicate)

1. Copy `catalog.ts` + export + 5 icon persis. Label platform kemungkinan
   butuh versi Melayu/EN — ubah HANYA field `label`, jangan `id`/`icon`.
2. Mata uang `.my` = RM — `formatRupiah` di card/search ganti formatter
   (fungsi tampil saja, `pricePer1k` tetap angka).
3. QR TnG tidak mengubah flow ini (bayar di `/saldo`, bukan `/pesan`).
4. Jalankan `0003` via migrate di DB `socio_my` (DB kosong → otomatis).
