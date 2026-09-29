# PRD — Service Sync v2: White-label, Changelog, Notifikasi & News

> Status: **DRAFT untuk review user** · Ditulis 2026-09-29 · Pemilik: socio.id rebuild
> Sumber kebenaran: `REBUILD_PLAN.md`. Dokumen ini **belum** untuk dikoding sampai user memutuskan **Keputusan Kunci §3** (ada kontradiksi permintaan).

---

## 1. Latar belakang

Katalog layanan app disinkron dari provider SMM (SMMturk) lewat dua cron:

| Cron | Frekuensi | Kerja |
|---|---|---|
| `provider-sync` | **tiap 1 jam** (bukan harian) | `action=services` → mirror JSON mentah ke `provider_services` (diff-hash, hanya row berubah yang ditulis) |
| `service-sync` | dipanggil di akhir provider-sync | `provider_services` → `categories` + `services`, terapkan markup per level, auto create/update/enable/disable |

Temuan kondisi saat ini (verifikasi live di prod, 8.185 layanan / 1.136 kategori):

- **`services.type` di-hardcode `"Default"`** oleh `service-sync` padahal API mengirim `type` asli (`Default` / `Custom Comments` / `Package` / `Pick a comment`). Field `dripfeed` dari API **tidak disimpan sama sekali**. Keduanya dipakai flow order (`smmturkAddFor` branch) → bug laten.
- **Tidak ada `description`** dari API. Yang deskriptif hanya `name` + `category`. Kolom `services.note` tersedia tapi selalu ditulis string kosong oleh sync.
- **`services` tidak punya `created_at` / `updated_at`** — hanya `waktu` (TEXT, timestamp sync terakhir). Jadi tidak bisa jawab "layanan ini dibuat kapan? harga berubah kapan?".
- **Belum ada changelog** — perubahan nama/harga/min/max tidak tercatat history-nya.
- **Notif admin** sudah ada tapi sangat kasar: hanya ringkasan "X layanan baru / Y nonaktif", **harga yang berubah tidak pernah dinotif**, dan tidak ada detail per layanan.
- **Branding**: sesi ini baru saja memasang `whitelabel()` yang menghapus token "SMMTURK/SMMTÜRK" + kata marketing (Own/Exclusive) dari kategori & nama layanan, baik saat tulis maupun tampil. **User kini ingin arah branding ditinjau ulang** (lihat §3).

---

## 2. Tujuan & Non-Goals

### Tujuan
1. Simpan data **asli** provider (nama + kategori mentah) supaya tidak hilang dan bisa diaudit/di-search.
2. Tampilkan ke user nama yang **rebranding Socio, bahasa Indonesia, tanpa label "SMMturk"**, dengan **kode layanan** sebagai identitas stabil.
3. Ambil **semua field yang tersedia** dari API (termasuk `type` asli + `dripfeed`) dan biarkan ikut ter-update saat provider mengubahnya.
4. Catat **changelog** granular per layanan (dibuat, nama/kategori/harga/min/max/tipe/refill/cancel berubah, aktif/nonaktif) + timestamp `created_at`/`updated_at`/`price_changed_at`.
5. **Notifikasi admin** saat ada perubahan katalog, dengan detail & tautan ke riwayat.
6. (Opsional) Tuakan ringkasan update layanan ke **news/pengumuman**.

### Non-Goals (di luar scope versi ini)
- Multi-provider / provider kedua (G11) — tetap SMMturk saja.
- Auto-translate nama provider ke bahasa Indonesia secara machine (terlalu berisiko salah arti) — deskripsi ID dibuat via **template deterministik** + override manual admin.
- Ganti mekanisme harga/markup (tetap `pricing_rules`).
- Real-time SSE untuk admin (cukup notif in-app + poll).

---

## 3. ⚠️ KEPUTUSAN KUNCI — Branding (kontradiksi harus diselesaikan user)

Permintaan user saling bertabrakan:

- **Reading A**: "simpan name asli SMMturk, **user juga bisa lihat**, jangan di-whitelabel karena banyak yang pake itu."
- **Reading B**: "rebranding pake id layanan dan branding Socio **tanpa ada label SMMturk** dan bahasa Indonesia."

Keduanya **tidak bisa benar di kolom yang sama**. Rekomendasi: **Model Dual-Name (memenuhi A + B sekaligus)**:

| Konsep | Disimpan | Dipakai oleh |
|---|---|---|
| `provider_service_id` | ID asli SMMturk (anchor stabil) | sistem, order, referensi "pakai kode ini" |
| `service_code` (baru) | `SOCIO-<n>` (nomor Socio sendiri) | label identitas user-facing, anti-kenal provider |
| `service_name_raw` (baru) | nama mentah provider (mis. "… OWN SMMTURK 💙") | **admin saja** (tab "Asli provider"), search internal, jejak |
| `category_raw` (baru, di `categories`) | kategori mentah provider | admin saja |
| `display_name` (baru) | hasil `whitelabel()` + template ID | **user** (dropdown /pesan, /layanan) |

Dengan model ini: data asli **tidak pernah hilang** (A terpenuhi — admin bisa lihat/restore), tapi **user cuma lihat versi Socio Indonesia** (B terpenuhi). Kalau user tetap mau user ikut melihat nama mentah, tinggal tampilkan kolom `service_name_raw` — tinggal flip konfigurasi.

**Alternatif yang harus dipilih user:**
- **Opsi 1 (rekomendasi): Dual-name** — kolom baru, user lihat `display_name` (Socio ID), admin lihat keduanya.
- **Opsi 2: Full-raw** — batalkan whitelabel, `service_name` = mentah, user lihat "SMMTURK". (Paling sederhana, tapi branding bocor — kontradiktif dgn B.)
- **Opsi 3: Full-whitelabel (status sekarang)** — tetap seperti deploy 9438bd5, nama asli dibuang permanen. (Kontradiktif dgn A.)

> ✅ **KEPUTUSAN USER (2026-09-29) — TERKUNCI: Full-whitelabel untuk user + raw disimpan khusus admin.**
> User **selalu** melihat `display_name` = hasil `whitelabel()` (Socio, tanpa "SMMturk", istilah platform tetap Inggris). Nama/kategori **mentah** tetap disimpan (`service_name_raw`/`category_raw`) **hanya untuk admin** (jejak + restore). Tidak ada konfigurasi untuk menampilkan mentah ke user. Ini = mekanik Opsi 1, tapi display dipaksa whitelabel (Opsi 3 di sisi user).

---

## 4. Field yang bisa ikut ter-update (jawaban "update apa saja?")

Berdasarkan key asli API (terverifikasi dari `provider_services.raw`):

| Field API | Ada? | Masuk ke | Ter-update saat sync? | Catatan |
|---|---|---|---|---|
| `service` | ✅ | `provider_service_id` | tidak (ID, kunci) | anchor |
| `name` | ✅ | `service_name_raw` + turun ke `display_name` | ✅ | sumber deskripsi utama |
| `category` | ✅ | `category_raw` + `display_name` kategori | ✅ | |
| `rate` | ✅ (USD) | → konversi IDR → `price*` via markup | ✅ | harga berubah paling sering |
| `min` / `max` | ✅ | `min`/`max` | ✅ | |
| `type` | ✅ | `services.type` | ✅ | **FIX**: jangan hardcode "Default" |
| `refill` | ✅ | `is_refill` | ✅ | |
| `cancel` | ✅ | (baru) `allow_cancel` | ✅ | |
| `dripfeed` | ✅ | (baru) `is_dripfeed` | ✅ | **FIX**: selama ini dibuang |
| `description` | ❌ | — | — | **tidak disediakan API** → lihat §5 |

---

## 5. Deskripsi layanan (jawaban "deskripsinya bisa ikut terambil?")

**Tidak** — API tidak punya field `description`. Rencana:

1. Kolom baru `services.description` (TEXT, boleh kosong).
2. **Auto-generate** fallback berbahasa Indonesia dari data yang ada, deterministik, mis.:
   `"<display_name inti> — mulai <min> s/d <max> satuan, refill <ya/tidak>, mulai instan."`
3. **Override manual admin**: kalau admin mengisi `description`, sync **tidak menimpanya** (pakai flag `description_locked` tinyint). Samai pola `manual-off` yang sudah ada di `service-sync`.
4. `note` tetap untuk catatan internal admin, jangan tercampur dengan `description` publik.

---

## 6. Model data (perubahan skema)

Semua tambahan dibuat **idempotent** lewat pola `tryExec(ALTER …)` di `packages/db/src/ensure.ts` (sama seperti kolom `next_poll_at` dsb), bukan edit migration lama.

### 6.1 `services` — kolom baru
```
service_code       VARCHAR(32)   NULL  UNIQUE   -- 'SOCIO-<id>' (diisi setelah insert)
service_name_raw   VARCHAR(255)  NOT NULL DEFAULT ''  -- nama mentah provider
description        TEXT          NULL
description_locked TINYINT       NOT NULL DEFAULT 0  -- 1 = jangan timpa saat sync
allow_cancel       TINYINT       NOT NULL DEFAULT 0  -- dari API cancel
is_dripfeed        TINYINT       NOT NULL DEFAULT 0  -- dari API dripfeed
created_at         DATETIME      NULL
updated_at         DATETIME      NULL
price_changed_at   DATETIME      NULL
```
> `service_name` (existing) jadi **`display_name`** (hasil whitelabel + template). Biarkan nama kolom `service_name` = user-facing supaya tidak rombak query; raw pindah ke `service_name_raw`.

### 6.2 `categories` — kolom baru
```
name_raw  TEXT  NULL   -- kategori mentah provider (admin)
```
`name` existing = display ter-whitelabel (user).

### 6.3 Tabel baru `service_changelog`
```
id            INT PK AUTO
provider_id   INT NOT NULL
service_id    INT NULL          -- FK internal, null utk event 'created' sblm id ada
event         ENUM('created','name_changed','category_changed','price_changed',
                   'minmax_changed','type_changed','refill_changed','cancel_changed',
                   'dripfeed_changed','enabled','disabled') NOT NULL
field         VARCHAR(32) NULL  -- nama kolom yang berubah
old_value     TEXT NULL
new_value     TEXT NULL
detected_at   DATETIME NOT NULL
INDEX (service_id, detected_at), INDEX (event, detected_at)
```
Retensi: pangkas > **90 hari** (cron `cleanup` yang sudah ada, tambah satu hapus changelog). Estimasi volume murah karena hanya baris yang berubah (diff-hash provider-sync).

### 6.4 Notifikasi
Pakai `admin_notifications` existing (`type='system'`, `actionUrl='/admin/services?tab=history'`). Jangan bikin tabel notif baru.

---

## 7. Perubahan logika `service-sync`

Untuk tiap `ps` (provider_services) vs row `services` existing, bandingkan **per field**, kumpulkan daftar diff:

1. **Create baru** → isi `service_name_raw`, `display_name=whitelabel(name)`, `type` **asli dari API**, `allow_cancel`, `is_dripfeed`, `created_at=NOW()`, `description` auto-gen (kalau kosong). Generate `service_code='SOCIO-'+id` setelah insert. → changelog `event=created`.
2. **Sudah ada** → untuk tiap field yang beda, tulis changelog per field + update kolom. `rate` berubah → update harga & `price_changed_at=NOW()`. `name` provider berubah → update `service_name_raw` + regenerasi `display_name` **kecuali `description_locked`/display diubah manual (butuh flag edit user — lihat §9)**. → `updated_at=NOW()`.
3. **Hilang dari provider** → `status=0` + changelog `disabled` (kecuali `manual-off`).
4. **Kembali muncul** → `status=1` + changelog `enabled`.

**Anti-spam harga**: perubahan `rate` sangat sering (kurs). Simpan changelog `price_changed` **selalu** (audit), tapi **notif** digabung 1x/jam berisi ringkasan (bukan 1 notif per layanan).

---

## 8. Notifikasi admin (detil)

Setelah sync, kalau ada perubahan, kirim **1 notif agregat** per provider:
```
title:   "Sinkronisasi layanan: <N> perubahan"
message: "<created> baru · <price> harga · <name> nama · <enabled/disabled> status · <minmax> min/max"
actionUrl: /admin/services?tab=history
priority: created>50 || disabled>50 ? high : low
```
+ **opsional email** ke super-admin (pakai `notifyAdmins` yang sudah ada) — **hanya** untuk kejadian besar (created/disabled ≥ ambang), jangan tiap jam. Konfigurasi ambang via env `SOCIO_SYNC_NOTIFY_THRESHOLD` (default 10).

---

## 9. Admin UI (`/admin/services`)

1. Kolom baru di tabel: **Display name** (user-facing) + tombol/"i" untuk lihat **Raw provider name** (tooltip / expand). Filter "ada brand provider?".
2. Edit **description** + centang "kunci deskripsi (jangan timpa saat sync)" → `description_locked`.
3. Edit **display_name** manual → set flag `display_name_locked=1` supaya sync tak menimpa (perlu kolom kecil tambahan bila user mau override display; default off).
4. **Tab "Riwayat"** (`?tab=history`): daftar `service_changelog` terbaru, filter per event/tanggal/layanan; menampilkan kapan dibuat & tiap perubahan old→new.
5. Tampilkan `service_code` (SOCIO-…) & `provider_service_id`.

---

## 10. News / pengumuman (jawaban "bisa masuk news?")

Dua kanal, pilih oleh user:
- **In-app broadcast** (`broadcast_campaigns`, sudah ada) — auto-draft kampanye "Ada layanan baru" dari ringkasan sync; perlu tombol **approve admin** sebelum tayang (jangan auto-publish ke user, rawan spam).
- **Public news/blog landing** (Astro MDX) — lebih berat, butuh generate file + rebuild Pages. **Direkomendasikan TIDAK otomatis**; cukup tombol "Buat draf post" dari halaman history.

Default usulan: **auto-draf in-app broadcast, butuh approval**, publik/blog manual.

---

## 11. Rebranding template (bahasa Indonesia, tanpa "SMMturk")

- `service_code = 'SOCIO-' + provider_service_id` (atau nomor internal berurutan — **konfirmasi user**). ID adalah anchor; label user = `SOCIO-…`.
- `display_name`: `whitelabel(name)` (sudah teruji, hapus SMMTURK/SMMTÜRK + trim pemisah) → lalu **normalisasi istilah** ke ID (mis. "Followers"→"Pengikut"? **opsional, user memutuskan** — rekomendasi: pertahankan istilah platform Inggris "Followers/Likes/Views" karena sudah umum, cukup hilangkan brand).
- Template `description` ID (§5).
- Header/footer/label UI sudah ID; pastikan tidak ada string "SMMturk/Provider" di komponen layanan.

---

## 12. Migrasi & Rollback

- **Migrasi naik**: jalankan `ensure.ts` ALTER/CREATE (aman, idempotent). Lalu backfill sekali:
  - `service_name_raw` ← `provider_services.name` (join `provider_service_id`), `category_raw` ← provider category.
  - `display_name(service_name)` ← `whitelabel(raw)`, `type` ← API `type` (re-sync), isi `allow_cancel`/`is_dripfeed`.
  - `created_at` ← `MIN(detected)` tak tersedia → set ke `waktu` existing / `NOW()` (deklarasikan sebagai baseline).
  - **Restore vs keep** untuk 464 layanan & 74 kategori yang sempat di-whitelabel: kalau Opsi 1, nilai mentah diambil kembali dari `provider_services.raw` (masih utuh) → tidak ada data hilang.
- **Rollback**: kolom baru bersifat aditif; menghapus fitur cukup set flag off (display = raw). Tidak merusak yang lama.
- Deploy lewat Coolify (api `/api/v1/deploy`), webhook tak andal → trigger manual + cek image tag commit (prosedur sudah distandardisasi).

---

## 13. Keputusan (DIJAWAB USER 2026-09-29)

1. **Branding** → **Full-whitelabel** di sisi user (Socio, tanpa label SMMturk); raw disimpan admin-only. Istilah platform **tetap Inggris** (Followers/Likes/Views).
2. **Kode layanan** → boleh disamakan dgn `provider_service_id` (tidak kritis).
3. **Notif harga** → **per-event** dicatat; kalau ada perubahan harga / layanan baru → ikut masuk **news** berbahasa Indonesia, nama layanan mengikuti provider tapi **di-whitelabel** (SMMturk→Socio).
4. **News** → **in-app user saja** (lihat §10, titik news sudah ditemukan: `/admin/news` → `notifications` type `news` → user lihat di `/notif` tab "Info" + read-popup). Blog publik TIDAK.
5. **Retensi changelog** → (dulu no.6, user belum paham) = sampai berapa lama riwayat disimpan. Default aman: **simpan 180 hari**, yang lebih tua di-auto-hapus cron cleanup. Bisa diubah nanti.
6. **Drip-feed & Comments** → lihat hasil deep dive §16.

---

## 14. Tahapan implementasi (bila sudah disetujui)

| Tahap | Isi | Estimasi |
|---|---|---|
| S1 | Skema: kolom baru + `service_changelog` + ensure.ts | 0,5 hari |
| S2 | `service-sync` diff-granular + type/dripfeed fix + raw save | 1 hari |
| S3 | `whitelabel`/rebrand template + `display_name`/`description` gen | 0,5 hari |
| S4 | Changelog tulis + notif admin agregat + (opsional) broadcast draft | 0,5 hari |
| S5 | UI `/admin/services`: raw/display, lock description, tab Riwayat | 1 hari |
| S6 | Backfill/migrasi prod + verifikasi + deploy | 0,5 hari |
| **Total** | | **±4 hari** |

---

## 15. Acceptance Criteria

- [ ] Nama mentah provider tersimpan & tampil di admin; user tidak melihat "SMMturk" (bila Opsi 1/3).
- [ ] `type` & `dripfeed` & `cancel` terisi benar dari API; flow order Custom Comments/Package cocok.
- [ ] Tiap perubahan layanan tercatat di `service_changelog` dengan old→new + waktu; `created_at`/`updated_at`/`price_changed_at` terisi.
- [ ] Admin terima 1 notif agregat per sync berisi rincian jumlah perubahan + tautan Riwayat.
- [ ] `pnpm --filter app lint && typecheck && build` hijau; deploy finished; verifikasi live `/pesan` + `/admin/services`.
- [ ] Deskripsi: bila `description_locked=1`, sync tidak menimpa teks admin.

---

## 16. 🔬 DEEP DIVE — Drip-feed & Comments (hasil verifikasi docs resmi + data prod)

### 16.1 Drip-feed: **NATIVE di API, hampir nol beban server** ✅
Dokumentasi resmi `smmturk.org/api` (`action=add`, tab *Default*) menerima:
```
key, action=add, service, link, quantity, runs (opsional), interval (opsional, menit)
```
**Kesimpulan:** drip-feed **dikerjakan provider**, bukan kita. Satu order = **satu** panggilan API (`runs`= jumlah pembagian, `interval`= menit antar tahap). Provider yang mencicil delivery.
→ **TIDAK perlu** scheduler client-side / memecah jadi N sub-order. Beban VPS: **sama persis** dengan order biasa (+2 param). Tidak ada risiko queue membengkak.

**Coverage (data prod, 8.448 layanan mirrored):**
- `dripfeed=true`: **155 layanan (1,8%)** → hanya ini yang boleh menampilkan opsi drip-feed di UI.
- Sisanya 8.293 **tidak** support → UI tidak boleh kirim `runs/interval` (Provider bisa error/abaikan).
- **Jawaban "semua layanan support drip feed?" → TIDAK, cuma ~1,8%.** Gate UI per-flag `is_dripfeed` (§6.1).

**UX order (tambahan di `/pesan`):** kalau `svc.is_dripfeed` → tampil input *runs* + *interval*, terkirim ke `smmturkAddFor` (butuh perluasan param `runs`/`interval`). Validasi: `runs ≥ 2`, `quantity % runs == 0`, `interval` 5–1440.

### 16.2 Comments: **sudah ada di code, tapi MATI karena bug `type`** ⚠️
- Flow `/pesan` **sudah** menangani `type === "Custom Comments"` (textarea `comments`, qty = jumlah baris) & `type === "Package"`. `smmturkAddFor` sudah kirim param `comments`.
- **TAPI** `service-sync` menulis `type: "Default"` untuk SEMUA layanan → cabang `Custom Comments`/`Package` **tidak pernah aktif**. Ini bug fungsional, bukan sekadar cosmetic.
- Data tipe asli (prod): `Default` 6861 · `Package` 1042 · `Custom Comments` 285 · `Custom Comments Package` 128 · `Subscriptions` 92 · `Invites from Groups` 15 · `Comment Likes` 13 · sisanya kecil.
- **Fix minimal (scope ini):** simpan `type` **asli** dari API → `Package` & `Custom Comments` langsung berfungsi (sudah ada branch-nya). `dripfeed` → `is_dripfeed`.

### 16.3 Tipe lain yang butuh param khusus (dari docs) — **follow-up, bukan scope ini**
`SEO`(keywords) · `Mentions Custom List`(usernames) · `Mentions Hashtag`(hashtag) · `Mentions User Followers`(username) · `Comment Likes`(username) · `Poll`(answer_number) · `Invites from Groups`(groups) · `Subscriptions`(username,min,max,posts,delay,expiry).
→ Butuh form input baru per tipe. Volume kecil (≤ ~130 layanan). **Direkomendasikan di-catat dulu sebagai `type` benar tapi di-/pesan diblokir dgn pesan "layanan khusus, hubungi admin"** sampai form-nya dibuat di milestone terpisah.

### 16.4 Rekomendasi scope drip/comment untuk build ini
1. **Wajib (fix bug, biaya rendah):** sync `type` asli + `is_dripfeed` + `allow_cancel`; `Custom Comments` & `Package` aktif lagi (sudah ada UI-nya).
2. **Baru (ringan):** input `runs`/`interval` di `/pesan` khusus layanan `is_dripfeed`; `smmturkAddFor` kirim param tsb. Beban server ≈ 0 (native).
3. **Tangguhkan:** form untuk 8 tipe khusus lain (buat daftar `service_changelog`/blowout terpisah).
