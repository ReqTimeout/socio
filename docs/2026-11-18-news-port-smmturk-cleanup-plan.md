# Plan Implementasi — Cleanup SMMfollows + Invariant Manual-Off + Port Sistem Berita .my

> **Tanggal:** 18 November 2026 · **Status:** P1 (data prod) + P3 (kode) SELESAI & terverifikasi lokal; menunggu instruksi eksplisit deploy.
> **Arahan owner (verbatim):**
> 1. "https://app.socio.id/admin/categories ini semua pastikan pakai smmturk, smmfollowe hapus aja."
> 2. "kalau sy disable kategori dan layanan jika provider sync tetap disable kan nanti?"
> 3. "sistem https://app.socio.my/admin/news ikuti .my sistem berita create news yang sy buat sendiri dan tampilannya samakan dengan .my implement di .id deep dive dulu."
>
> **Mandat tetap:** user MASIH LIVE di app.socio.id. Jangan ada kesalahan. Semua perubahan destruktif/migrasi wajib backup + GO eksplisit. Belum ada kode/DB yang diubah saat plan ini ditulis.

---

## §0 Ringkasan tiga bagian

| Bagian | Jenis | Kesimpulan deep-dive | Risiko |
|---|---|---|---|
| P1 — Kategori semua SMMturk + hapus SMMfollows | Data prod (destruktif) | Katalog aktif sudah 100% SMMturk. Sisa SMMfollows kecil + aman dihapus (0 order live, tanpa FK, tanpa INNER JOIN). | Rendah–sedang (backup wajib) |
| P2 — Disable kategori/layanan tahan sync? | Pertanyaan (jawab) | **YA, tahan** untuk layanan yang sudah ada (tag `[manual-off]`). Ada satu celah: layanan BARU di kategori yang di-disable bisa lahir aktif. | Informasi + opsional hardening |
| P3 — Port sistem berita .my (create news + tampilan) | Fitur (multi-file + migrasi) | .id sudah punya admin/news manual, tapi beda sistem dari .my (tanpa `title`, kategori teks bebas, tanpa popup detail, tanpa box Pengumuman). Port penuh = 10 item kerja. | Sedang (migrasi kolom + UI user-facing) |

---

## §1 P1 — Kategori semua SMMturk + hapus SMMfollows

### 1.1 Keadaan LIVE terverifikasi (probe read-only 18 Nov, container `rebicrj57r3afbg9knieq9ks`, db `socio_smm`)

```
provider id10  : name=SMMfollows, status=0 (dorman), api_key ada (84 char), url=https://smmfollows.com/api/v2
services p10   : 1 baris, status=0 (disabled)        ← dulu 704, sudah di-prune sejak revert
provider_services p10 (mirror) : 7554 baris (BEKU, tidak di-sync lagi)
orders p10     : 1 baris, status=Success (FINAL)     → live_orders = 0
categories     : total 911, hanya 1 kategori yang eksklusif berisi layanan p10
news p10       : 0        refill order p10 : 0        routing : 0
services p2 (SMMturk) : status1=7659 (aktif), status0=1222 (disabled)
news per source: manual=186, sync=2680
```

### 1.2 "Semua kategori pakai SMMturk" — SUDAH terpenuhi

- `getActiveProviderId()` = 2 (SMMturk). `category_provider_routing` = 0 baris.
- `runAllProviderSync` hanya sync `wantedIds` = provider aktif (2) + target routing (tidak ada) → **hanya SMMturk yang di-sync**. SMMfollows beku.
- Semua 7659 layanan orderable = provider 2. Tidak ada layanan SMMfollows aktif.
- `/admin/categories` sudah menyembunyikan provider dorman lewat `dormantProviderIds()` di `category-admin.ts` (P9 lebih dulu): kategori yang seluruh layanannya dari provider status=0 + tak ter-route difilter keluar, dan label "siapa punya" membuang provider dorman. Jadi halaman itu praktis sudah hanya menampilkan kategori SMMturk.

### 1.3 Kenapa hapus provider row SEKARANG aman (dulu dilarang)

Keputusan revert dulu (memory 98f59e90) **mempertahankan** baris provider + api_key karena status-polling membaca endpoint/key dari tabel provider via `orders.provider_id`. Kondisi itu sudah berubah:

- **0 order live** untuk p10. Satu-satunya order p10 = `Success` (final) → status-polling melewati order final, tidak butuh key lagi.
- **Tidak ada FK** di `orders.provider_id` (`int("provider_id").notNull().default(0)`, tanpa `references`) → hapus provider tidak gagal FK / tidak cascade.
- **Tidak ada INNER JOIN provider** di seluruh `app/src`. `admin/orders` pakai `leftJoin(users)` + `leftJoin(services)` saja → order lama TETAP tampil walau provider row hilang.
- `news` = 0 dan `refill` = 0 yang merujuk p10 → tidak ada yatim.

**Satu-satunya tradeoff (kosmetik):** order historis `Success` milik p10 kehilangan label nama provider (jadi "—"/unknown bila ada lookup nama) dan tidak bisa di-refill lagi (butuh key). Order itu sendiri tetap utuh + terlihat. Karena sudah final & lama, dampak praktis nol.

### 1.4 Target hapus + urutan aman (transaksi atomik, backup dulu)

Backup (snapshot di DB prod, nama bertanggal):
```
CREATE TABLE smmfollows_provider_bak_20261118 AS SELECT * FROM provider WHERE id=10;
CREATE TABLE smmfollows_services_bak_20261118 AS SELECT * FROM services WHERE provider_id=10;
CREATE TABLE smmfollows_mirror_bak_20261118   AS SELECT * FROM provider_services WHERE provider_id=10;
CREATE TABLE smmfollows_category_bak_20261118 AS SELECT * FROM categories WHERE id=<id kategori yatim p10>;
```
Hapus (dalam satu transaksi, urutan anak→induk):
```
START TRANSACTION;
DELETE FROM services          WHERE provider_id=10;                 -- 1 baris
DELETE FROM provider_services WHERE provider_id=10;                 -- 7554 baris mirror
DELETE FROM categories        WHERE id=<id kategori yatim p10>;     -- 1 kategori (verifikasi 0 layanan dulu)
DELETE FROM provider          WHERE id=10;                          -- baris + key
COMMIT;
```
- Kategori yatim: identifikasi id-nya (kategori yang `SUM(provider_id=10)=COUNT(*)`), pastikan setelah hapus services dia benar-benar kosong & tidak dirujuk `saved_links`/placeholder admin. Kalau ragu, **biarkan kategori kosong** (tampil sebagai placeholder, tidak berbahaya) — hapus services+mirror+provider saja sudah membuat SMMfollows lenyap dari katalog & sync.
- `provider_sync_log` / `service_changelog` lama p10 boleh dibiarkan (jejak historis, tidak aktif).

### 1.5 Durabilitas & jalur eksekusi

- Setelah baris provider hilang, cron tidak mungkin meng-sync/membuat ulang p10 (`wantedIds` hanya 2; fallback "sync semua ber-key" hanya aktif bila tidak ada provider aktif — tidak terjadi karena SMMturk aktif).
- Jalur UI `deleteProvider` (`admin/providers`) menolak selama masih ada services (count>0 → 409) dan **belum punya guard order-live** (gap W4 di plan gap sebelumnya). Untuk p10 live=0 jadi aman, tapi eksekusi lewat SQL atomik lebih bersih daripada UI (harus hapus service dulu satu-satu).
- **Tidak perlu deploy kode** untuk P1 (murni data). Guard W4 (tambah cek order-live di `deleteProvider`) tetap direkomendasikan sebagai hardening terpisah, bukan prasyarat hapus p10.

### 1.6 Verifikasi pasca-hapus
```
SELECT COUNT(*) FROM provider WHERE id=10;                 -- 0
SELECT COUNT(*) FROM services WHERE provider_id=10;        -- 0
SELECT COUNT(*) FROM provider_services WHERE provider_id=10;-- 0
SELECT COUNT(*) FROM orders WHERE provider_id=10;          -- 1 (Success, tetap ada)
```
+ buka `/admin/categories` & `/admin/providers`: SMMfollows tidak muncul; semua kategori aktif = SMMturk.

---

## §2 P2 — "Kalau saya disable kategori & layanan, provider-sync tetap disable kan?"

### 2.1 Jawaban: YA — untuk layanan yang sudah ada, disable MANUAL tahan dari sync

Mekanisme terverifikasi di kode .id:

1. **`categories` tidak punya kolom status** (`category-admin.ts` L12-17). "Kategori nonaktif" diwujudkan ke SELURUH `services` di dalamnya: `status=0` + note memuat tag `[manual-off]`.
2. **`setCategoryStatus(id,"off")`** (L195-213): semua layanan aktif kategori itu → `status=0` + tempel `[manual-off]` (CASE anti-dobel-tag). Disable layanan tunggal lewat edit modal juga menulis tag yang sama.
3. **`service-sync.ts` tidak pernah menulis `note`**: objek `patch` (L330-347) hanya berisi field katalog (harga/nama/min-max/flag), TIDAK ada `note` → tag `[manual-off]` selamat dari timpaan sync.
4. **Gerbang re-enable** (L439): `else if (!isManualOff && allowed)` → layanan `status=0` yang bertag `[manual-off]` **tidak dihidupkan lagi**. Hanya layanan mati TANPA tag (mis. route-off / hilang dari katalog provider) yang boleh hidup lagi.
5. **`setCategoryStatus(id,"on")`** (L215-248): hanya baris `status=0 AND note LIKE '%[manual-off]%'` yang dihidupkan + tag dikupas (DOUBLE REPLACE, fix be12f1c). Layanan yang mati karena alasan lain tetap mati.

Jadi: disable kategori/layanan lewat toggle admin → **tetap disable walau provider-sync jalan tiap jam**. Ini kontrak yang sudah teruji (memory 26e13f20 + 27b1b161).

### 2.2 Satu celah (jujur, perlu diketahui owner)

Cabang **CREATE** layanan baru (`service-sync.ts` L260-288) menentukan status hanya dari `providerAllowed(catId)` (routing/aktif global) — **tidak memeriksa apakah kategori itu sedang di-disable manual**. Akibatnya:

- Layanan yang SUDAH ada di kategori yang di-disable → tetap mati (aman, §2.1).
- Tapi bila provider (SMMturk) nanti **menambah layanan BARU** ke kategori yang Anda disable, sync akan **membuatnya aktif** (`status=1`), karena kategori tidak punya flag status sendiri dan CREATE tidak membaca tag layanan lama.

Ini edge case (provider jarang menambah layanan persis di kategori yang Anda matikan), tapi nyata. Kalau owner mau kategori yang di-disable **benar-benar kedap** (termasuk layanan baru), perlu hardening kecil:

**KEPUTUSAN OWNER (18 Nov): hardening DITOLAK.** Arahan: "kalau ada yang baru dari provider jangan disable dong" → layanan **BARU** dari provider harus tetap **AKTIF**, jangan di-disable. Ini persis perilaku CREATE sekarang (`status = providerAllowed(catId) ? 1 : 0`; untuk SMMturk aktif + routing 0 → `providerAllowed=true` → layanan baru lahir aktif). **P2 = TIDAK ADA perubahan kode.** Kontrak yang dipertahankan: layanan lama yang di-disable manual (bertag) tetap mati; layanan baru/kembali dari provider tetap aktif.

### 2.3 Catatan penting
- Disable lewat **routing** (route-off, `status=0` TANPA tag) bersifat reversibel by design — lepas routing → hidup lagi. Yang tahan-sync hanya disable **manual** (bertag). Toggle admin kategori/layanan = manual = tahan. ✓
- Jangan pernah menambah `note` ke objek `patch` service-sync di masa depan — itu menjebol kontrak ini.

---

## §3 P3 — Port sistem berita .my ke .id (create news + samakan tampilan)

### 3.1 Keadaan sekarang vs target

| Aspek | .id sekarang | .my (target owner) |
|---|---|---|
| Kolom `news.title` | **TIDAK ADA** | `varchar(255) NOT NULL DEFAULT ''` |
| Kategori manual | teks bebas + datalist emoji preset (satu rusak jadi `?`) | **KEY preset stabil**: `info/update/promo/maintenance/urgent` via SELECT |
| Validasi create | kategori bebas (≤128), konten wajib | kategori wajib preset (`isNewsCategoryKey`), **title wajib** (≤255), konten wajib |
| Chip kategori | `catTone()` cocokkan string inline | `newsCategory()` satu sumber (admin & user sama) |
| Kolom tabel admin | ID, Kategori, **Sumber**, Konten, Tanggal, Aksi | ID, Kategori(+badge sumber), **Tajuk(title)**, Konten, Tanggal, Aksi |
| Toggle tayang | semua baris | **hanya baris manual** |
| Feed user `/berita` | filter event saja; judul manual = teks kategori; kartu manual = div statis | + **filter sumber** (Semua/Manual/Sync); judul manual = `n.title`; chip `newsCategory`; kartu manual = **button → popup detail** |
| Popup detail | **TIDAK ADA** | `NewsDetailSheet.svelte` (Sheet + chip kategori + konten utuh) |
| Dashboard | 1 widget "Update" (campur manual+sync) | widget "Update" **sync-only** + box **"Pengumuman"** (manual, button→NewsDetailSheet) |
| i18n | inline Indonesia (konvensi .id) | `adminCopy`/`catalogFor` (EN) → **harus diadaptasi ke inline Indonesia** |

Komponen pendukung .id sudah ada: `Sheet`, `Icon` (glyph `info/tag/settings/megaphone/sparkles/alert/clock/eye_off` lengkap), `Button/ConfirmDialog/EmptyState/toast/ContextFab`, RBAC `news:edit`. **`NewsDetailSheet` belum ada** → harus dibuat.

### 3.2 Item kerja (urutan lapisan: core/lib → server → route → UI)

**P3-1 · Migrasi skema (DB prod + Drizzle)**
- `packages/db/src/schema/news.ts`: tambah `title: varchar("title",{length:255}).notNull().default("")` (posisi setelah `kategori`, meniru .my).
- Migrasi prod: `ALTER TABLE news ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER kategori, ALGORITHM=INSTANT;`
  - Tabel `news` kecil (±2866 baris). ADD COLUMN di posisi akhir dengan default = **INSTANT** (metadata-only) di MySQL 8.0.12+; bila INSTANT ditolak, fallback `ALGORITHM=INPLACE, LOCK=NONE` (rebuild 2866 baris = sub-detik). **Bukan** kasus berat seperti enum `orders.status` utf8mb3 (lihat plan gap sebelumnya).
  - Backward-compatible: kode lama yang insert tanpa `title` tetap jalan (default `''`). **Migrasi WAJIB sebelum deploy** kode yang select `news.title`.
  - Backup: `CREATE TABLE news_bak_20261118 AS SELECT * FROM news;` sebelum ALTER.

**P3-2 · `app/src/lib/news-meta.ts` (tambah, jangan rusakkan yang ada)**
- Tambah `NEWS_CATEGORIES = ["info","update","promo","maintenance","urgent"]`, type `NewsCategoryKey`, `isNewsCategoryKey()`.
- Tambah `newsCategory(raw)` → `{key,label,icon,chipBg,chipInk,dot}` dengan **label Indonesia inline** (Info / Update / Promo / Maintenance / Penting), tone warna meniru .my (info=sky, update=violet, promo=rose, maintenance=ink, urgent=red), pemetaan legacy teks bebas Indonesia → preset (mis. "Promo"→promo, "Maintenance"→maintenance, "Terbaru/RECOMMENDED/TRENDING"→update, "Info"→info), fallback `custom` netral (sky/megaphone) untuk teks lama/sync.
- Pertahankan `newsMeta/isOrderableEvent/NEWS_EVENT_FILTERS/newsTimeAgo/cleanNewsText/newsPriceSegments/newsSplit/newsFinalPrice/svcEventBadge` yang sudah ada. (Event `minmax_changed/cancel_changed` ala .my **tidak perlu** — sync .id tidak memproduksinya; menambah filter kosong hanya noise.)

**P3-3 · `app/src/lib/components/NewsDetailSheet.svelte` (BARU)**
- Port dari .my, buang i18n → inline Indonesia. Props `{open bindable, item:{id,title?,kategori?,content,createdAt}}`. Pakai `Sheet` + `newsCategory(item.kategori)`; heading = `title` || label kategori; tanggal `id-ID`; konten `whitespace-pre-line` **tanpa** `cleanNewsText` (manual boleh emoji/baris baru). Label "Diterbitkan" inline.

**P3-4 · `admin/news/+page.server.ts`**
- `load`: select + return `title` & `eventType`; pencarian `q` ikut `LIKE news.title`.
- `save` (baru, id=0): wajib `isNewsCategoryKey(kategori)` + `title` (≤255) + `content`; insert `{kategori,title,content,eventType:"manual",source:"manual",serviceId:0,isHidden:0}`. Label notif = label preset Indonesia.
- `save` (edit manual): patch `{kategori(preset),title,content}`. **Baris sync: hanya `content`** (kategori/title terkunci) — pertahankan perilaku E7 .id.
- Broadcast `read_popup=0` + insert `notifications` (type news) tetap. `action_url` pertahankan `/notif?type=news` milik .id (rute .id = `/notif` & `/berita`, bukan `/news`).

**P3-5 · `admin/news/+page.svelte`**
- Ganti `KATEGORI_PRESET` datalist → `SELECT` berisi `NEWS_CATEGORIES` (label Indonesia dari `newsCategory`).
- Tambah input **Judul** (`name="title"`, required kecuali sync, maxlength 255, disabled saat sync) di atas kategori.
- `catTone()` → `newsCategory()` (satu sumber). Tampilkan badge sumber + sembunyi dalam kolom Kategori.
- Tabel desktop: kolom **Tajuk** (title, line-clamp-2) menggantikan kolom Sumber terpisah; sumber jadi badge di kolom Kategori.
- Kartu mobile: tambah judul (bila ada) + badge sumber + tanggal di footer; toggle **hanya manual**.
- Samakan tata letak/kelas dengan .my; tetap `id-ID` untuk tanggal & inline Indonesia (tanpa `adminCopy`).

**P3-6 · `(app)/berita/+page.server.ts`**
- Tambah filter `?src=manual|sync` (conds array seperti .my) + return `src`; select tambah `title`.

**P3-7 · `(app)/berita/+page.svelte`**
- Tambah baris **filter sumber** (Semua/Manual/Sync) di atas filter event; `srcHref/tHref/pageHref` mempertahankan `src`+`t`.
- Manual: `cat = newsCategory(n.kategori)`, `chip = cat ?? meta`; `title = n.title.trim() || cleanNewsText(content).slice(0,70)`.
- Kartu manual = `button` → `openDetail(n)` membuka `NewsDetailSheet`; sync = `div`; orderable = `a href=/pesan?service=`.
- Tambah `<NewsDetailSheet bind:open item={sheetItem} />`. Gaya neo-brutalist .id sudah sama dengan .my (border-2 + hard shadow) → tidak perlu ubah bahasa visual.

**P3-8 · `(app)/+page.server.ts` (dashboard)**
- Pisah: `newsFeed` = **sync-only** 14 hari (tambah `eq(news.source,"sync")`), fallback sync-only; `announcements` = manual `isHidden=0` limit 4. Return keduanya.
- Port helper `pickDiverseNews` + `WIDGET_NEWS_MAX` dari .my bila .id belum punya (verifikasi dulu; .id sekarang pakai `recentNews` mentah).

**P3-9 · `(app)/+page.svelte` (dashboard)**
- Widget "Update" tetap (kini sync-only). Tambah box **"Pengumuman"** (`data.announcements`): baris button → `openAnnouncement(a)` → `NewsDetailSheet`; chip `newsCategory`; heading = `a.title || preview.slice(0,60)`; "Lihat semua" → `/berita?src=manual`; `newsTimeAgo`.
- Tambah state `announceOpen/announceSheet` + `<NewsDetailSheet>`. Inline Indonesia (tanpa `catalogFor`).

**P3-10 · Adaptasi i18n → Indonesia (menyeluruh)**
- Semua string .my yang lewat `adminCopy()/catalogFor()/fill()` diganti teks Indonesia inline sesuai konvensi .id. Tidak menambah dependency i18n ke .id. Label kategori preset: Info / Update / Promo / Maintenance / Penting (konsisten admin & user via `newsCategory`).

### 3.3 Kompatibilitas data lama
- 186 baris manual lama: `title=''` (default) → feed/dashboard fallback ke potongan konten; `kategori` teks bebas → `newsCategory` petakan ke preset/fallback netral. **Tidak perlu migrasi data** selain tambah kolom.
- 2680 baris sync: `title=''`, kategori = label event ("Harga Turun" dll.) → `newsCategory` fallback custom; feed sync tetap pakai `newsMeta(eventType)` + `newsSplit` seperti sekarang. Tidak berubah.
- Edit baris manual lama lewat modal: SELECT default ke `info` bila kategori lama bukan key preset → menyimpan akan menormalkan kategori ke preset (dapat diterima). Baris sync terkunci.

### 3.4 Gerbang verifikasi per item (wajib, AGENTS.md §7)
`pnpm --filter app lint` · `pnpm --filter app typecheck` · `pnpm --filter app build` · manual dev (mobile 360×640 + 768×1024) · audit `web-design-guidelines` + `looks-expensive` (kontras chip AA, focus, min-w-0 pada truncate) · CJK-scan file tersentuh (`grep -nP '[\x{4E00}-\x{9FFF}]'`) · selftest `newsCategory`/`isNewsCategoryKey` (paket core punya harness node `--experimental-strip-types`).

### 3.5 Hasil verifikasi lokal (18 Nov, sebelum deploy)
- **typecheck** (`pnpm --filter app check`, svelte-check): 0 error (pra & pasca format). Warning hanya file lama tak tersentuh.
- **build** (`pnpm --filter app build`): EXIT 0, adapter-node sukses.
- **eslint** (9 file tersentuh): 0 error; warning = konvensi repo lama (href tanpa resolve(), URLSearchParams, `any` di kode lama).
- **prettier**: 9 file tersentuh bersih. Catatan: `prettier --check .` seluruh app gagal karena ±62 file LAMA drift (bukan akibat perubahan ini); tidak diformat ulang agar diff tetap fokus.
- **CJK-scan**: 9 file bersih (tanpa CJK).
- **selftest newsCategory/isNewsCategoryKey**: 58/58 lulus (preset + legacy datalist .id + fallback custom).
- **Manual mobile/tablet/desktop** (Playwright chromium, dev server + DB LOKAL MariaDB `socio_smm` 191 baris; kolom `title` ditambahkan ke DB lokal agar cocok skema): 360×640 / 768×1024 / 1280×800 → **tanpa overflow horizontal** di `/`, `/berita`, `/berita?src=manual`, `/admin/news`; box Update + Pengumuman render; baris Pengumuman & kartu manual membuka NewsDetailSheet ("Diterbitkan"); filter Manual = 0 sync / 12 manual; modal Buat Berita = Judul + Kategori SELECT (Info/Update/Promo/Maintenance/Penting) + Konten, tanpa overflow; tabel desktop kolom Tajuk; 0 console error user. Satu-satunya `reqfail` = `/api/admin/events` SSE abort saat navigasi (normal). Screenshot: `.tmp-runner/shots/`.
- **Browse-only**: tidak ada form disubmit / tidak ada create-edit-delete selama verifikasi.

---

## §4 Urutan eksekusi aman (setelah GO)

1. **P1 (data, tanpa deploy):** backup snapshot → transaksi hapus SMMfollows → verifikasi §1.6. Bisa dilakukan terpisah dari P3.
2. **P3 migrasi dulu:** backup `news` → `ALTER TABLE news ADD title ... INSTANT` → verifikasi kolom ada. (Kode lama tetap kompatibel.)
3. **P3 kode berlapis:** P3-2 (news-meta) → P3-3 (NewsDetailSheet) → P3-4/5 (admin) → P3-6/7 (berita) → P3-8/9 (dashboard) → P3-10 (i18n). Gerbang lint/typecheck/build per lapisan.
4. **Deploy:** commit granular per item (hanya atas instruksi eksplisit) → L3 qodersec gate sebelum push → push SSH `git@github.com:ReqTimeout/socio.git HEAD:main` → deploy Coolify app `nqsjafrei6k8dkup1pxkcuwf`.
5. **Verifikasi prod:** `/admin/news` (buat berita bertitle + preset, edit, toggle, hapus), `/berita` (filter sumber, popup detail manual), dashboard (box Pengumuman + Update sync-only), `/admin/categories` & `/admin/providers` (SMMfollows lenyap).
6. **Rollback:** P1 → restore dari tabel `*_bak_20261118`. P3 → revert commit + `ALTER TABLE news DROP COLUMN title` (hanya bila kode lama di-deploy ulang; kolom tambahan tidak merusak kode lama, jadi drop opsional).

---

## §5 Keputusan GO — SUDAH DIJAWAB OWNER (18 Nov)

1. **Hapus SMMfollows: HAPUS PENUH** (provider row + 1 service + 7554 mirror + kategori yatim). Backup snapshot dulu. Tradeoff kosmetik 1 order historis Success diterima.
2. **Cakupan port berita: PORT PENUH** (admin create-news + feed `/berita` + box Pengumuman dashboard + NewsDetailSheet). Samakan tampilan .my menyeluruh, inline Indonesia.
3. **Hardening P2: DITOLAK** — layanan baru dari provider harus tetap AKTIF. Perilaku CREATE sekarang dipertahankan, P2 tanpa perubahan kode (lihat §2.2).

---

## §6 Checklist

- [x] GO owner §5 (1,2,3)
- [x] P1: backup snapshot 4 tabel (terverifikasi 1/1/7554/1, kategori id 37678)
- [x] P1: transaksi hapus SMMfollows + verifikasi §1.6 (provider/services/mirror/kategori=0; orders p10=1 Success utuh, service_name denormalized selamat; categories 911→910) — EKSEKUSI 18 Nov
- [ ] P1: cek `/admin/categories` & `/admin/providers` bersih (verifikasi UI saat deploy)
- [x] P3-1: backup news + ALTER ADD title (INSTANT) + schema Drizzle — EKSEKUSI prod 18 Nov (news_bak_20261118, 2866 baris; title posisi 3, semua '')
- [x] P3-2: news-meta NEWS_CATEGORIES/isNewsCategoryKey/newsCategory (Indonesia) + selftest 58/58
- [x] P3-3: NewsDetailSheet.svelte (Indonesia)
- [x] P3-4/5: admin/news server + UI (title, preset SELECT, newsCategory, kolom Tajuk, toggle manual)
- [x] P3-6/7: /berita server + UI (filter src, title, chip kategori, popup detail)
- [x] P3-8/9: dashboard server + UI (Update sync-only, box Pengumuman, NewsDetailSheet)
- [x] P3-10: semua i18n → inline Indonesia; CJK-scan bersih
- [x] Gerbang lint/typecheck/build + manual mobile (360/768/1280 Playwright) + audit design — lihat §3.5
- [ ] Commit granular (instruksi eksplisit) → L3 gate → push → deploy
- [ ] Verifikasi prod end-to-end + rencana rollback siap