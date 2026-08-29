# Audit User-Side — 29 Agustus 2026

> Sesi: login sebagai user real `febian` (Mardian Supriadi, level Reseller, saldo Rp4.962, 5.779 pesanan, deposit total Rp18.167.914, belanja Rp19.508.345).
> Metode: walkthrough 11 halaman via browser (desktop 1440×900 + mobile 390×844), DOM dump + screenshot (di `docs/audit-sesi/` — catatan: dump teks lengkap di sesi temp), inspeksi kode terkait untuk verifikasi akar masalah, uji interaksi non-transaksional.
>
> **Eksklusi (sengaja tidak diuji)**: submit order (potong saldo, order nyangkut di provider = uang real), submit deposit (pembayaran real), regenerate API key (memutus integrasi user), submit perubahan profil/password (mutasi data user real). Semua flow ini diaudit sampai tepat sebelum langkah submit.

---

## Ringkasan Eksekutif

| Severity | Jumlah | Item |
|---|---|---|
| **P0 — bug data/uang** | 2 | Riwayat saldo tanda terbalik; ringkasan PENGELUARAN = Rp0 |
| **P1 — bug UI blocking-edge** | 1 | `/saldo` overflow horizontal 70px di mobile |
| **P2 — copy/logic menyesatkan** | 6 | Stat "604 pesanan berjalan" platform-wide, tanggal inkonsisten, dsb. |
| **P3 — polish/konsistensi** | 9 | Emoji di empty state, typo "Komisimuya", badge "Default", dsb. |

Total 18 temuan. Tidak ada temuan keamanan. Struktur informasi & hierarki visual semua halaman sudah kuat; mayoritas temuan adalah **kesalahan interpretasi data legacy** dan **inkonsistensi kecil**, bukan cacat desain sistemik.

---

## Phase 1 — Flow & Logic

### 1.1 ⛔ P0 — Riwayat saldo: order tampil "+Rp15.300" padahal pengeluaran

**Lokasi**: `app/src/routes/(app)/saldo/riwayat/+page.svelte:168` dan `+page.server.ts:25`

**Reproduksi**: `/saldo/riwayat` → baris "Make an Order With ID: 27953" bertanda **plus hijau** `+Rp15.300`, padahal itu pemotongan saldo.

**Akar masalah (terverifikasi di kode lama)**: data legacy `balance_logs` dari PHP (`app.socio.id/order/new-action.php:218`) menyimpan pengeluaran sebagai `amount` **positif** + `type: "minus"`. App baru menentukan arah transaksi dari tanda amount saja:

```ts
const isOut = Number(l.amount) < 0;          // riwayat/+page.svelte:168
keluar: SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END)  // +page.server.ts:25
```

Karena amount legacy selalu positif, semua order tampil sebagai pemasukan.

**Dampak berantai (semua dari akar yang sama)**:
- Ringkasan "PENGELUARAN: Rp0" — kontradiksi kasarnya dengan stat BELANJA Rp19.508.345 di dashboard. User tidak bisa rekonsiliasi saldo.
- Preview "Mutasi Terbaru" di `/saldo` (logika sama `l.amount < 0` di `saldo/+page.svelte:110`) juga menampilkan order sebagai "+Rp15.300" hijau.
- Filter tab "Pesan" menampilkan transaksi tapi tidak pernah terhitung sebagai keluar.

**Fix yang direkomendasikan**: tentukan arah dari kombinasi `type` + tanda: `isOut = type === "minus" || type === "wd" || type === "order" || Number(amount) < 0`. Kolom `type` legacy hanya "plus"/"minus" (varchar(5)) — mapping `logMeta` yang sekarang (`order`/`ref`/`deposit`/`wd`/`admin`) tidak akan pernah match dengan data legacy, jadi semua baris legacy jatuh ke label mentah `minus`/`plus` yang tidak dikenal user (terlihat di dump: baris menampilkan badge teks "minus"/"plus"). Perlu mapping "minus" → ikon Pesan, "plus" → ikon Top Up sebagai fallback.

### 1.2 ⛔ P0 — Ringkasan riwayat: PENGELUARAN = Rp0

Bagian dari 1.1 (query SQL-nya), tapi layak disebut terpisah karena ini angka agregat yang user pakai untuk cek cashflow. Setelah fix 1.1, verifikasi angka: PEMASUKAN +Rp42.137.805 saat ini juga **terlalu besar** karena mencampur order; setelah fix, pemasukan harus ≈ deposit sukses + refund.

### 1.3 ⚠️ P2 — Dashboard: "604 pesanan berjalan" — bukan milik user ini

**Lokasi**: `app/src/routes/(app)/+page.server.ts:108-118` (query `statActive`).

**Fakta**: user punya 0 pesanan pending/proses, tapi greeting menampilkan "604 pesanan berjalan — kami proses otomatis hingga selesai." + badge "Live" dengan ping animation. Query memfilter `eq(orders.userId, userId)` tapi status list mencakup `'partial'` dan `'refilling'` — dan hasil 604 berasal dari ribuan order **2023** yang berstatus legacy yang kebetulan match (mis. "Partial"). Copy berbunyi seperti pesanan aktif yang sedang diproses sekarang → membingungkan.

**Verifikasi data**: 5.779 order user, 4.970 Selesai, 809 Gagal, 0 Pending/Proses. 604 ≈ jumlah order berstatus Partial (order yang refund parsial, bukan sedang diproses).

**Rekomendasi**: (a) keluarkan `partial` dari daftar status "berjalan" (Partial = final state), dan/atau (b) tambah syarat usia `created_at > NOW() - INTERVAL 30 DAY`, dan/atau (c) kalau memang maksudnya "total historis pernah berjalan", ubah copy. Kombinasi (a)+(b) paling aman.

### 1.4 ⚠️ P2 — Kategori tab "Gagal" mencampur Partial

**Lokasi**: `app/src/routes/(app)/pesanan/+page.server.ts:69`.

`gagal = error + canceled + partial` — padahal Partial = order selesai sebagian + refund sisa (bukan gagal total; user terima sebagian). Di dump mobile terlihat kartu berstatus "Partial" masuk tab Gagal (809). User Reseller berat seperti febian akan menghitung "kenapa 809 gagal?" padahal banyak yang Partial-sukses. Rekomendasi: tab "Gagal" = error+canceled saja; Partial dapat label sendiri di kartu ("Partial — sebagian selesai, sisanya direfund").

### 1.5 ✅ Flow sehat (tanpa temuan)

- **Pesan**: validasi kupon live (`checkCoupon`), saldo-highlight merah saat tak cukup, tombol berubah "Saldo Tidak Cukup" ter-disable — flow mencegah order gagal dengan bagus. Error server-side `fail(400, "Saldo tidak cukup")` ada (`pesan/+page.server.ts:230`).
- **Top-up**: pilih nominal → metode → breakdown kode unik + bonus 10% + total transfer, jelas. Tidak diuji sampai submit (uang real).
- **Pesanan**: tab filter + bulk select mode ("Pilih" → multi-select) logis; detail drawer + "Pesan lagi" prefill.
- **Tiket**: form required, konfirmasi toast, close ticket — struktur oke.
- **Auth** (dari sesi sebelumnya): sudah dipuji & lolos smoke test.

---

## Phase 2 — UI/UX

### 2.1 Desktop (1440×900)

Keseluruhan **sangat solid**: sidebar informasi (MENU/LAINNYA/SALDO), topbar ringkas, konten max-w-7xl, hierarki bold-clear. hOverflow = 0 di semua 11 halaman.

**P2 — Stat strip dashboard**: "PESANAN 5.779 / DEPOSIT 👑 Rp18.167.914 / BELANJA Rp19.508.345" — 👑 berdiri sendiri **di antara label dan angka** (dump: `DEPOSIT` newline `👑` newline `Rp18.167.914`). Crown harusnya inline dengan label, bukan elemen ketiga di kolom nilai. Juga banner VIP "Deposit di atas 5jt — Terima kasih, Sultan 👑" full-amber-strip di atas stats: fun tapi butuh keputusan desain apakah menetap (saat ini hanya user kaya yang lihat, konsisten tidak menyebalkan).

**P3 — "Hiatus — minggu ini sepi"**: statemen negatif "sepi" di kartu aktivitas untuk user loyal 5.779 order terasa menghina ringan. Ganti framing positif: "Minggu ini belum ada order — pesanan cepat menunggumu".

### 2.2 Mobile (390×844)

**⛔ P1 — `/saldo` horizontal overflow 70px** — **satu-satunya layout break nyata di seluruh app.**

- **Reproduksi**: buka `/saldo` di 390px → halaman bisa digeser horizontal; `document.scrollWidth = 460`.
- **Akar (diverifikasi via live DOM experiment)**: `.grid.gap-4` (saldo/+page.svelte:71) → dua anak `div` kolom **tanpa class** → default `min-width: auto` → grid item tak bisa menyempit di bawah intrinsic width kontennya. Track melar jadi 443.75px (li: konten `space-y-2 > li` flex, timestamp "11/4/2023" + note panjang + amount menentukan min-content ≈ 444px).
- **Bukti fix**: menyuntik `min-width: 0` ke kedua kolom di live DOM → `scrollWidth` pulih 460 → **390** (overflow 0).
- **Fix kode**: tambah `min-w-0` ke kedua anak kolom (atau `grid` → `[&>*]:min-w-0`).
- Catatan: pola yang sama (`grid gap-4 lg:grid-cols-2` + anak div polos) juga ada di `affiliate/+page.svelte:60` — di sana aman karena kontennya bisa shrink (input link), tapi rentan kambuh kalau konten berubah. Rekomendasi: jadikan pola `min-w-0` konvensi semua grid item berisi `truncate`/flex.

**P3 — `/layanan` mobile: filter "Favorit" hilang** (`hidden sm:inline`, layanan/+page.svelte:164) — mobile user tak bisa akses favorit sama sekali padahal itu fitur repeat-order utama. Fix: tampilkan ikon hati/star saja di mobile.

**P3 — Pesanan: tombol "Pilih"** (pesanan/+page.svelte:194) — kata "Pilih" untuk mode bulk-select ambigu (apakah memilih satu order? memilih filter?). Di mobile juga bertabrakan mental dengan kartu yang sudah tap-to-detail. Rekomendasi: ganti label jadi "Pilih Banyak" / ikon checklist, atau pindahkan gesture ke long-press seperti platform SMM sejenis.

### 2.3 Responsif lainnya

- Bottom nav mobile (Home/Layanan/Pesanan/Saldo/Tiket) + FAB "Buat Pesanan" — jarak elemen nyaman, tap target ≥44px, aman.
- Riwayat tabel di mobile: ada hint "geser tabel di mobile" — bagus, tabel tetap readable.
- Empty-state notif "Belum ada notifikasi" — vertikal space cukup, tak janggal.

---

## Phase 3 — Copywriting

| # | Lokasi | Temuan | Severity | Saran |
|---|---|---|---|---|
| C1 | dashboard subtitle | 2 template berganti tiap menit: "…proses otomatis hingga selesai" vs "status live, auto refill menjaga target" — copy untuk order aktif, tapi user 0 order aktif lihat ini terus berganti-ganti karena statActive=604 (lihat 1.3) | P2 | fix data (1.3); jika order aktif >0, satu template saja |
| C2 | tanggal | Dashboard "11 Apr 2023" vs Pesanan/Mutasi "11/4/2023" — format tidak konsisten antar halaman | P2 | satu util `formatDate` global (id-ID, `d MMM yyyy`) |
| C3 | mutasi note legacy | "Make an Order With ID: 27953." — campur bahasa Inggris + tanda titik aneh; "Deposit via . ID: 1508" — **nama metode kosong** (legacy Tripay callback `$method` kosong, lihat `tripay/callback.php:58`) | P2 | note tampil apa adanya (data), tapi bisa ditambah prefix label transaksi di UI; metode kosong → "—") |
| C4 | affiliate | **"Komisimuya"** (harusnya "Komisimu, ya" / "Komisi kamu") — typo di trust notice penting | P3 | perbaiki |
| C5 | affiliate | Ikon kartu kredit 💳 untuk notice "withdraw = saldo" — emoji kartu menggambarkan uang/rekening, **kebalikan** dari pesan "bukan uang, saldo" | P3 | pakai ikon wallet dari Icon system |
| C6 | affiliate QR | "Scan untuk daftar 💳" di mobile dump — emoji tidak relevan + duplikasi ikon | P3 | hapus emoji |
| C7 | notif empty state | 🔔 emoji besar, bukan Icon system (konsisten komponen lain pakai Icon) | P3 | ganti Icon `bell` |
| C8 | tiket empty | 💬 emoji + heading ganda "Tiket Bantuan" dua kali di mobile (page title + section title) | P3 | Icon system + hilangkan duplikasi |
| C9 | layanan kategori chip | Badge "Default" pada banyak kartu = nilai kolom `services.type` dari SMMturk (jenis layanan: Default/Custom data/Comment) — tidak informatif untuk user, terlihat seperti kategori rusak. Kartu lain menampilkan "Twitter/X" (categoryName) — tidak konsisten kapan type vs category ditampilkan | P2 | keputusan desain: sembunyikan `type === "Default"`, tampilkan categoryName; simpan type hanya jika relevan (Custom Comments dll) |
| C10 | dashboard banner CMS | "🔥 Promo — followers mulai 10K/hari" — "mulai 10K/hari" ambigu (harga? quantity?) | P3 | rapikan copy banner CMS |
| C11 | pesanan heuristik waktu | "baru", "5m lalu", "3j lalu" lalu jatuh ke "11/4/2023" — switch format OK tapi tanpa tahun | P3 | `d MMM yy` untuk fallback |

---

## Phase 4 — Gap, Bug & Improvement (prioritas aksi)

> **Status: SEMUA SELESAI (fixed & verified 29 Agu 2026)** — verifikasi live via Playwright as febian: ringkasan Masuk Rp20.374.671 / Keluar Rp21.763.134 (exact match ground truth), overflow 390 di semua halaman, tab Partial jalan, badge Default 0, lint/typecheck/build lulus.

1. **[P0 ✅]** Fix arah transaksi legacy (`type: minus/plus`) — `saldo/riwayat` server+client, `saldo` preview. *(blok rekonsiliasi saldo user)*
2. **[P0 ✅]** Recalculate ringkasan masuk/keluar dengan logika baru; verifikasi PEMASUKAN ≈ deposit+refund, PENGELUARAN ≈ total order. 
3. **[P1 ✅]** `/saldo` mobile: `min-w-0` pada kedua kolom grid → pulihkan overflow. (sudah dibuktikan fix bekerja di live DOM)
4. **[P1 ✅]** Mapping label `logMeta` untuk type legacy "plus"/"minus" (sekarang render mentah "minus"/"plus" sebagai badge).
5. **[P2 ✅]** `statActive` dashboard: remove `partial` dari status aktif + batas usia; sesuaikan copy.
6. **[P2 ✅]** Tab "Gagal" pisahkan Partial; kartu Partial diberi keterangan refund parsial.
7. **[P2 ✅]** Konsisten format tanggal (satu util `formatDateShort` di `$lib/format.ts`).
8. **[P2 ✅]** Keputusan desain badge kategori vs type di kartu layanan ("Default" → hidden, fallback categoryName).
9. **[P3 ✅]** Mobile: filter Favorit kembali tampil (ikon) + label "Pilih Banyak".
10. **[P3 ✅]** Typo & emoji: "Komisimuya", 💳→Icon wallet, 🔔/💬 → Icon system, review "Pilih" label.
11. **[P3 ✅]** Reframe empty-week copy "sepi" + crown 👑 → Icon star.
12. **[P3 ✅]** Konvensi code: semua grid item yang berisi konten flex/truncate wajib `min-w-0` (catat di AGENTS.md — selesai).

---

## Lampiran — Bukti Sesi

- Halaman diaudit (desktop+mobile, masing-masing dengan load time & overflow check): `/` (137/160ms), `/layanan` (118/88ms), `/pesan` (78/78ms), `/pesanan` (114/161ms), `/saldo` (67/67ms, **mobile hOverflow=70px**), `/saldo/top-up` (51/61ms), `/saldo/riwayat` (112/96ms), `/affiliate` (68/69ms), `/tiket` (99/52ms), `/notif` (57/54ms), `/akun` (54/69ms).
- Interaksi yang diuji: login → semua navigasi; kupon palsu di `/pesan` (error path — input tak menampilkan pesan error sampai blur/debounce selesai; placeholder reset "Punya kupon?" — perilaku OK); search katalog (40 hasil, normal); validasi form tiket (required OK).
- Interaksi yang **tidak** diuji (uang real / mutasi data): submit order, submit deposit, regenerate API key, ubah profil/password. 
- Eksperimen overflow dilakukan dengan menyuntik `min-width:0` live (tanpa edit kode) — semua perubahan revert otomatis saat reload; **tidak ada file kode yang diubah di sesi audit ini.**
