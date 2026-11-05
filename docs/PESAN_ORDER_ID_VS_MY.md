# Kenapa Urutan Kategori `/pesan` app.socio.id ≠ app.socio.my

> Analisis **read-only** (14 Okt 2026). Tidak ada kode/data yang diubah.
> Ditulis untuk agent yang merawat `app.socio.my`.
> Pertanyaan user: dropdown kategori di `/pesan` (mis.
> `TikTok Followers [ Cheapest ] NEW`) urutannya beda antara `.id` dan `.my`.

## TL;DR (kesimpulan)

**Ini BUKAN bug.** Urutan dropdown kategori ditentukan oleh query yang bergantung
pada kolom **`services.created_at`**, dan `created_at` = **waktu (wall-clock) saat
cron provider-sync tiap app menyisipkan baris layanan ke DB-nya MASING-MASING**.

- `app.socio.id` → DB `socio_smm` (container MySQL `rebicrj57…`)
- `app.socio.my` → DB `socio_my` (container MySQL `vbknf7uw…`)

Dua DB **terpisah** yang **disinkron secara independent** (jam insert beda,
kumpulan kategori/layanan tidak 100% identik). Karena urutannya
`ORDER BY MAX(services.created_at) DESC`, dan nilai itu beda per DB, **hasil urutan
ikut berbeda**. Ini di luar kendali kode — mau disamakan pun tidak akan pernah
identik selama still order by sync-time.

Kalau mau urutan **stabil & sama lintas brand**, **ganti kunci urutnya** (lihat §6).

---

## 1. Aturan urutan yang berlaku (sumber kebenaran)

`app/src/routes/(app)/pesan/+page.server.ts` (±L47–62), komentar owner 8 Okt:

```sql
-- kategori dengan layanan AKTIF terbaru naik ke atas, tiebreak alfabetis
SELECT c.id, c.name, COUNT(s.id) AS svcCount, MAX(s.created_at) AS latestAt
FROM categories c
LEFT JOIN services s ON s.category_id = c.id AND s.status = 1
GROUP BY c.id, c.name
HAVING COUNT(s.id) > 0
ORDER BY COALESCE(MAX(s.created_at), '1970-01-01') DESC, c.name ASC;
```

Yang dirender ke dropdown = hasil query ini (di-`whitelabel()` server-side),
dibatasi chip platform/kind kalau user klik ikon:

`app/src/routes/(app)/pesan/+page.svelte` (±L75–87):

```ts
const catsOptions = $derived(
  data.cats
    .filter((c) => {
      if (selectedPlatform && !(c.platforms ?? []).includes(selectedPlatform)) return false;
      if (selectedKind && !(c.kinds ?? []).includes(selectedKind)) return false;
      return true;
    })
    .map((c) => ({ value: c.id, label: trimCatLabel(c.name), hint: c.count > 0 ? `${c.count}` : undefined })),
);
```

**Poin kunci:** urutan = fungsi langsung dari `MAX(services.created_at)` per kategori.
`created_at` bukan atribut stabil provider — ia **cap waktu insert lokal tiap app**.

## 2. Bukti data (query identik di kedua DB, 14 Okt)

`created_at` per kategori **berbeda antar DB**, padahal provider & nama kategorinya sama:

| # | socio.id (`socio_smm`) | MAX(created_at) | socio.my (`socio_my`) | MAX(created_at) |
|---|---|---|---|---|
| 1 | TikTok Followers [ Cheapest ] NEW | 2026-10-14 00:00:14 | TikTok Followers [ Cheapest ] NEW | 2026-10-14 00:00:18 |
| 2 | Instagram Followers | 2026-10-13 21:00:12 | Instagram Followers | 2026-10-13 21:00:16 |
| 3 | KICK NEW SERVICES | 2026-10-13 10:00:15 | KICK NEW SERVICES | 2026-10-13 10:00:19 |
| 4 | YouTube Unique Views | 2026-10-12 12:00:15 | YouTube Unique Views | 2026-10-12 12:00:17 |
| 5 | **TikTok Followers [ Non Drop ]** | 2026-10-11 16:00:07 | **Campaign** | 2026-10-12 11:01:48 |
| 6 | **Twitter Followers & Likes** | 2026-10-11 16:00:07 | **TikTok Followers [ Non Drop ]** | 2026-10-12 11:01:48 |
| 7 | **Campaign** | 2026-10-10 19:00:07 | **Tiktok Like** | 2026-10-12 11:01:48 |
| 8 | **Tiktok Like** | 2026-10-10 19:00:07 | **Twitter Followers & Likes** | 2026-10-12 11:01:48 |
| 9 | TikTok Live Stream Views | 2026-10-07 | Global Press Release Distribution | 2026-10-09 |

Observasi:
- **4 teratas kebetulan sama** karena keduanya dapat layanan freshest di jam yang
  berdekatan. Mulai **#5 langsung geser** — contoh `Campaign`: `.id` catat 10 Okt
  19:00, `.my` catat 12 Okt 11:01. Beda cap sync → beda posisi.
- **Kumpulan kategori juga tidak identik**: `.my` punya `Global Press Release
  Distribution` tinggi, `.id` punya `TikTok Live Stream Views` / `NEWWW`.
- Skala DB mirip tapi tak sama: `.id` 7433 layanan aktif (357 refill),
  `.my` 7429 layanan aktif (357 refill), 852 kategori aktif di `.my`.

## 3. Faktor sekunder (menambah beda, walau kategori terurut sama)

Ini bukan urutan dropdown kategori, tapi bikin **isi dalam kategori** (kartu layanan
+ mana yang "Cheapest") juga beda antara `.id` dan `.my`:

1. **Harga efektif beda skala.** `SOCIO_USD_TO_IDR = 20000` (`.id`) vs
   `SOCIO_USD_TO_IDR = 4.7` (`.my`). Sort kartu pakai `pricePer1k` (harga efektif
   hasil markup). Kalau kurs/markup/`pricing_rules` beda, urutan termurah & badge
   "Cheapest" ikut beda. ⚠️ Nilai `4.7` untuk `.my` **mencurigakan** — cek lagi
   apakah ini memang MYR/USD (~4.7 MYR) atau salah set; pastikan konsisten dgn
   `pricing_rules` brand `.my`.
2. **Flag `is_refill` per baris** bisa beda kalau sync/`service_mapping` `.my` belum
   selaras → sort "refill-duluan" di client beda.
3. **Whitelabel & deteksi platform/kind** (`packages/core/src/catalog.ts`): kalau
   `.my` belum salin utuh regex/`KIND_ORDER` terbaru, pengelompokan chip bisa beda →
   filter kategori beda. (Lihat `docs/PORT_PESAN_REFILL.md`.)

## 4. Keputusan & batasan

- Perilaku **order-by-sync-time itu by design** (owner 8 Okt: "kategori berisi
  layanan baru SMMturk gampang ditemukan di atas"). Konsekuensinya: urutan TIDAK
  bisa dijamin identik lintas dua DB yang sync terpisah. Ini **expected**, bukan
  regresi.
- **Read-only:** tidak ada yang kuubah di `.id` maupun `.my`.

## 5. Kalau user .my cuma ingin "kenapa beda"

Jawaban singkat untuk user: *"Kedua aplikasi pakai database terpisah yang disinkron
ke provider pada jam berbeda. Urutan dropdown disusun dari 'kategori dengan layanan
paling baru', dan 'paling baru' itu dihitung dari waktu sinkron masing-masing DB —
jadi urutannya wajar berbeda. Bukan error."*

## 6. Kalau memang mau urutan SAMA / stabil (opsi untuk agent `.my`)

Pilih salah satu kunci urut yang **tidak bergantung `created_at`**, terapkan **identik
di `.id` dan `.my`** (kode replikasi 1:1) supaya deterministik:

- **Opsi A — alfabetis murni:** `ORDER BY c.name ASC`. Paling simpel & stabil, tapi
  kehilangan "layanan baru di atas".
- **Opsi B — kolom `sort_order` manual (recommended kalau butuh kurasi):** tambah
  kolom `categories.sort_order INT` (atau tabel pin), isi nilai **sama di kedua DB**,
  `ORDER BY c.sort_order ASC, c.name ASC`. Kendali penuh, tidak berubah tiap sync.
- **Opsi C — provider category id stabil:** `ORDER BY c.provider_category_id ASC` kalau
  provider menjamin id kategori konsisten lintas brand. Verifikasi dulu.
- **Opsi D — daftar kategori di-pin (featured):** array id kategori unggulan di config
  per-brand yang sama; sisanya alfabetis.

Catatan implementasi:
- Kalau `.my` disuruh meniru `.id` **persis**, alternatifnya: **salin/seed DB** —
  tapi ini tidak realistis karena harga/mata-uang & kurs berbeda (IDR vs MYR) dan
  sync jalan masing-masing. Jadi **ganti kunci urut (A/B/C/D)** = solusi benar.
- Setelah ganti kunci urut, samakan juga `pricing_rules` + `SOCIO_USD_TO_IDR` yang
  wajar untuk mata uang `.my`, biar urutan kartu & "Cheapest" juga konsisten.

## 7. Reproduksi bukti (perintah yang dipakai)

Di VPS `130.254.47.93`, query yang sama dijalankan ke dua DB:

```bash
# socio.id
docker exec rebicrj57r3afbg9knieq9ks mysql -usocio <pw> socio_smm -N -e \
 "SELECT LEFT(c.name,32),MAX(s.created_at),COUNT(*) FROM categories c \
  JOIN services s ON s.category_id=c.id AND s.status=1 \
  GROUP BY c.id,c.name ORDER BY MAX(s.created_at) DESC, c.name LIMIT 12;"
# socio.my
docker exec vbknf7uwtkym5jloocldnzct mysql -usocio_my <pw> socio_my -N -e "<query sama>"
```

`<pw>` dari `SOCIO_DB_URL` di env masing-masing app container (`socio-my-app`,
`nqsjafrei…`). Tabel/kolom legacy: `categories(id,name)`,
`services(category_id,status,created_at,is_refill,price,price_api,price_reseller)`.
