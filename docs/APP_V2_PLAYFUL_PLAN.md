# APP V2 — "PLAYFUL CALM" REDESIGN PLAN (app.socio.id — dashboard USER)

> **Untuk coding agent.** Upgrade UI/UX **user app** `app/src/routes/(app)/*` + shell (+ opsional skin auth)
> ke arah playful & human seperti landing V2 (`docs/LANDING_V2_PLAYFUL_PLAN.md`) — **TANPA mengubah fungsi apapun**.
> Wireframe ASCII: `docs/APP_V2_PLAYFUL_WIREFRAME.md`.
>
> Hierarki: `REBUILD_PLAN.md` > `DESIGN.md` (§6 app shell = kontrak) > `docs/MOBILE_UX_GUIDE.md` > dokumen ini.
> Admin `(admin)/*` **DI LUAR SCOPE** (sudah punya ADMIN_DESIGN_PLAN.md sendiri).
>
> Status: DRAFT — §0.3 decision points wajib dijawab user sebelum F1.

---

## 0. Aturan main (BACA DULU, INI YANG BEDA DARI LANDING)

### 0.1 Hukum #1 — FUNGSI TIDAK BERUBAH, TITIK

Redesign ini **hanya lapisan visual + motion + copy**. Matriks paritas fungsi ada di §9 — setiap item WAJIB
centang sebelum route dinyatakan selesai. Konsekuensi teknis:

1. **DILARANG ubah** `+page.server.ts` / `+layout.server.ts` / `+server.ts` / `packages/core` (logika, query,
   action, pricing, SSE endpoint). Satu-satunya file non-visual yang boleh disentuh: `packages/core/src/copy.ts`
   — **hanya nilai string, semua key tetap identik** (AD-5).
2. **DILARANG ubah perilaku interaksi yang sudah ada**: SwipeRow, SSE sweep+badge-flip, optimistic update
   (favorit layanan, mark-read notif), debounce kupon 400ms, Turnstile + auto-reset, URL searchParams sebagai
   state filter, view transitions, haptic pattern (8/10/12/14/18), theme toggle instan, mass-action refund,
   countdown top-up pending, prefilled deep-link `/pesan?service=&link=&qty=`.
3. Yang boleh berubah: markup class/style, struktur visual section (urutan boleh dirapikan asal semua blok &
   data tetap tampil), komponen `packages/ui` (restyle + primitive baru yang additive), keyframes baru,
   teks copy (via `copy.ts` key yang sama / string inline).
4. Fitur yang belum ada TIDAK ditambah (pull-to-refresh, dark mode otomatis, i18n, dsb) — kecuali diminta user.
5. State wajib tetap ada per layar: loading/skeleton, empty (art existing `packages/ui/src/art/*`), error
   (banner/toast), semua kondisi tombol (disabled/busy/label dinamis).

### 0.2 Hukum #2 — pelan-pelan, route per route, verifikasi tiap langkah

Urutan fase §8 wajib berurutan. Setiap fase: baseline screenshot SEBELUM → edit → screenshot SESUDAH →
bandingkan fungsi per matriks §9 → `pnpm --filter app lint && pnpm --filter app typecheck && pnpm --filter app build`
→ baru lanjut. Kalau ragu sebuah perubahan menghapus fungsi → **revert, tanya user** (AGENTS.md §8).

### 0.3 Decision points — tanya user sebelum F1

| # | Keputusan | Rekomendasi |
|---|---|---|
| AD-1 | Promosi token playful (`--pop-mango`, `--pop-berry`, `--ease-spring`, sticker shadow) ke `packages/ui/src/tokens.css` + remap dark mode → dipakai app & landing | YA |
| AD-2 | Maskot "Si Socio" (D-3 landing) jadi komponen shared `packages/ui/src/components/SocioMascot.svelte`, muncul di empty state + momen sukses + 404 app | YA |
| AD-3 | **Palette app TETAP** primary indigo + accent cyan (jangan re-tune ke teal landing sekarang — risiko besar, beda lagi). Playfulness dibawa mango + maskot + motion, bukan ganti warna dasar | YA (tetap) |
| AD-4 | Rewrite copy `packages/core/src/copy.ts` jadi playful-human (key tetap) — atau biarkan netral? | Rewrite playful |
| AD-5 | Auth pages (`login/daftar/lupa/reset/verifikasi` — sudah playful) ikut di-polish biar satu bahasa visual (sticker/mango/maskot ringan)? | YA, fase terakhir opsional |

---

## 1. Kondisi sekarang (audit — apa yang sudah bagus JANGAN dirusak)

App user sudah punya fondasi motion yang kuat (inventory lengkap: lihat §9 dan hasil audit sesi ini):

**Pertahankan 100% (justru ini benih "playful" yang tinggal di-level-up):**
- `OrbField` hero dashboard (palette per fase waktu WIB: dawn/day/dusk/night) + emoji wave + greeting dinamis.
- `NumberFlow` (tween angka 700ms) di saldo/total/komisi — domain animation terbaik app ini.
- Haptic bertingkat (8/10/12/14/18ms, gated reduced-motion) — konsisten di semua tap.
- SSE pesanan: sweep-highlight 1600ms + badge-flip + haptic 12 saat sheet terbuka.
- SwipeRow "Pesan lagi" mobile (threshold 80px, Escape close).
- Optimistic update + revert (bintang favorit `star-burst` spring 420ms, mark-read notif `dot-settle`).
- View transitions (`vt-fade`, named: app-header/bottom-nav) + `revealDelay` stagger + `.card-lift` press scale.
- Sheet bottom choreography (320ms cubic-bezier(0.32,0.72,0,1)), ConfirmDialog, Toast global.
- Skeleton shimmer, empty-state art per domain (9 art SVG di `packages/ui/src/art/`), VIP state (deposit ≥5jt),
  level badge `level-shine`, countdown live top-up pending + `pending-pulse`, chip-press, kupon "Hemat RpX 🎉".
- Pesan Cepat (repeat order < 10 detik — blueprint `docs/DASHBOARD_UIUX_AUDIT.md` §4), kategori→layanan fetch,
  custom comments textarea→qty, platform auto-detect + tick hijau di input link.

**Gap yang di-close redesign ini:**
1. Identitas playful belum punya "wajah" — belum ada maskot, highlight color, momen selebrasi (order pertama
   sukses terasa sama datarnya dengan order ke-500).
2. Motion belum dikoreografikan antar-elemen dalam satu layar (stagger ada, tapi belum ada hierarki
   "1 momen utama per layar").
3. Copy masih netral-korporat di beberapa tempat (`copy.ts`) — belum "teman yang jago sosmed" seperti landing V2.
4. Chrome kartu belum konsisten: ada yang glow berlebih (P-UX-3 audit), ada yang polos — belum ada bahasa
   sticker yang terukur.
5. Desktop sidebar fungsional tapi "default SaaS" — belum ada karakter (maskot kecil, active state spring, dsb).

---

## 2. Design direction — "Playful Calm" (bukan "Playful Loud")

App = alat kerja harian (repeat order, cek status). Rumus: **landing boleh teriak, app boleh senyum**.
Elemen playful dipakai sebagai *reward & penanda*, bukan dekorasi permanen.

### 2.1 Lima pembawa karakter (character carriers)

| Carrier | Apa | Budget (gate audit) |
|---|---|---|
| **1. Mango highlight** `--pop-mango` (= amber-400 Tailwind v4) | stabilo kata kunci, badge "hemat/populer/VIP", active dot, ikon chip | ≤ 3 elemen per layar; teks di atas mango = `--on-mango` (AA light & dark) |
| **2. Maskot Si Socio** (SVG paper-plane, shared AD-2) | empty state, momen sukses, 404, sidebar footer, onboarding Pesan Cepat kosong | ≤ 1 per layar; idle float «M10» |
| **3. Sticker chrome** (border 2px + hard shadow + tilt ≤2°) | SaldoHero, kartu quick action aktif, chip nominal aktif, kartu level | ≤ 2 elemen besar per layar (ekstensi anti-pattern #3; dark mode: border paper/24 + shadow dalam, bukan tinta) |
| **4. Spring micro-motion** `--ease-spring` | press/hover elemen interaktif kecil, indicator dock/segmented, icon morph, chip aktif | micro ≤ 250ms; max 1 spring besar (confetti/pop) per interaksi |
| **5. Selebrasi «M6»** | confetti + art sukses: order pertama, top-up sukses (sheet instruksi), withdraw terkirim, VIP tercapai, refill diajukan (checkmark saja) | sekali per kejadian, tidak berulang, skip reduced-motion |

### 2.2 Token extension — `packages/ui/src/tokens.css` (AD-1, additive + dark remap)

```css
/* @theme packages/ui/src/tokens.css — SELARAS palette default Tailwind v4 (OKLCH)
   yang sudah dipakai project (amber/red, bukan nilai karangan). Nilai identik
   dengan landing V2 plan §2.3 supaya satu bahasa. */
:root {
  --pop-mango: var(--color-amber-400);       /* oklch(82.8% .189 84.429) */
  --pop-mango-soft: color-mix(in oklab, var(--color-amber-400) 25%, transparent);
  --pop-berry: var(--color-red-500);         /* dekorasi/ikon saja — max 1 elemen/layar */
  --pop-berry-ink: var(--color-red-600);     /* badge fill teks putih (AA 4.5:1) */
  --on-mango: var(--color-ink-800);          /* teks di atas mango, light (#0f172a → AA ~8:1) */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --sticker-border: 2px solid var(--color-ink-900); /* ink-900 auto-flip ke putih di dark (remap existing) */
  --sticker-shadow: 4px 4px 0 var(--color-ink-900);
  --sticker-shadow-sm: 2px 2px 0 var(--color-ink-900);
  --radius-sticker: 20px;
}
.dark {
  --pop-mango: var(--color-amber-700);       /* = #fcd34d — remap dark amber DI tokens.css existing */
  --pop-mango-soft: color-mix(in oklab, var(--color-amber-700) 18%, transparent);
  --pop-berry: var(--color-red-400);         /* dekorasi; badge teks gelap → pakai --color-danger/-soft existing */
  --on-mango: var(--color-ink-50);           /* dark: #0b0f1a — mango gelap-mode terang, teks harus gelap */
  --sticker-shadow: 4px 4px 0 color-mix(in oklab, var(--color-ink-900) 35%, transparent);
  --sticker-shadow-sm: 2px 2px 0 color-mix(in oklab, var(--color-ink-900) 35%, transparent);
}
```

Utility class baru di `primitives.css` (additive, jangan ubah yang ada): `.sticker`, `.sticker-sm`,
`.marker-mango` (swipe «M11»), `.press-spring` (generalisasi `.chip-press`), `.tilt-1`/`.tilt-2` (±1-2°).
**Kontrak tetap**: primary indigo `#4f46e5` / accent cyan (AD-3), Sora + Plus Jakarta Sans, `.card-lift`
satu-satunya utility kartu interaktif (sticker = varian visual card-lift, bukan pengganti).

### 2.3 Aturan density & ketenangan (app-specific)

- Infinite animation per layar **max 2** (existing: LiveDot, pending-pulse, OrbField drift — sudah pas; jangan tambah).
- Tidak ada marquee/ticker di app (itu bahasa landing).
- Tidak ada magnetic button / parallax / scroll-linked drawing di app (latency & fokus tugas).
- Entrance stagger hanya saat **load pertama** layar (existing `revealDelay`) — navigasi filter/pagination
  tidak boleh re-stagger seluruh layar (mengganggu repeat use) — cukup skeleton→fade 200ms.
- Semua aturan DESIGN.md §4 (transform/opacity only, reduced-motion) & §5 (8 anti-pattern) tetap mengikat.

---

## 3. Motion vocabulary app (M-id — dipakai di wireframe)

Yang existing ditandai ♻ (restyle/reuse, jangan re-implement):

| ID | Nama | Spec | Layar |
|---|---|---|---|
| M1 ♻ | Spring press | active scale .96, release 200ms `--ease-spring` | semua chip/tombol kecil (generalisasi chip-press) |
| M2 ♻ | NumberFlow | tween 700ms cubicOut tabular | semua angka uang/qty |
| M3 ♻ | SSE sweep | overlay fade 1600ms sekali + haptic 12 | pesanan |
| M4 ♻ | Badge flip | rotateX 320ms saat status berubah (`{#key}`) | pesanan, dashboard recent |
| M5 ♻ | Sheet choreography | backdrop fade 200ms + sheet 320ms cubic-bezier(.32,.72,0,1) + isi stagger 80ms | semua sheet |
| M6 🆕 | Confetti burst | 24 partikel, 1.2s sekali, shared `Confetti.svelte` (packages/ui, vanilla <3KB, sama dgn landing A9) | §2.1 carrier 5 |
| M7 ♻+ | Icon morph | copy→check (ada); +: star fill burst (ada), bell ring 1× saat notif baru masuk, chevron rotate sheet | akun, affiliate, layanan, bell |
| M8 ♻ | Skeleton shimmer | 1.4s infinite (ada) | loading |
| M9 ♻ | Reveal stagger | 520ms translateY 8px, step 18-45ms (ada) | load pertama |
| M10 🆕 | Mascot idle float | translateY ±4px + rotate ±1°, 6s infinite, hanya saat layar idle/empty | empty state, 404 |
| M11 🆕 | Marker swipe | scaleX 0→1 stabilo mango belakang kata, 450ms, IO/mount sekali | greeting dashboard, VIP, profit affiliate |
| M12 🆕 | Indicator spring | pill aktif dock/segmented/tab geser dgn `--ease-spring` 300ms (transform only) | BottomNav, segmented tema/Member-Reseller, filter chips |
| M13 🆕 | Success checkmark draw | SVG stroke-dashoffset 400ms (SuccessArt existing di-upgrade) | toast sukses, sheet top-up |
| M14 ♻ | View transition | vt-fade root + named header/dock (ada — JANGAN disentuh) | global |
| M15 🆕 | Saldo "breathing" glow | box-shadow pulse sangat halus 4s (opacity layer, bukan shadow animasi — pakai pseudo-element opacity) di SaldoHero | dashboard, /saldo |

**Reduced-motion**: M6/M10/M11/M12/M15 off total; M1-M5,M7-M9 fallback existing (primitives.css sudah handle);
M13 → checkmark muncul instan. Kill-switch global `app.css` (0.01ms !important) dipertahankan — komponen baru
wajib patuh (jangan pakai inline `animation` di style attr tanpa guard `motion-safe:`).

**Perf**: tidak ada keyframe baru yang animasi property non-compositor; confetti partikel max 24, `will-change`
dilepas setelah selesai; SSE handler tidak boleh tambah listener baru.

---

## 4. Human touch — copy & momen

### 4.1 Rewrite `packages/core/src/copy.ts` (AD-4 — key IDENTIK, hanya value)

Contoh arah (final disesuaikan key yang ada — JANGAN tambah/hapus key):

| Key area | Sekarang (netral) | V2 (playful-human) |
|---|---|---|
| dashboard.subtitleIdle | "Saldo siap dipakai…" | "Meja kerjamu siap. Hari ini mau nge-boost apa? ✦" |
| order.cta | "Buat Pesanan" | "Pesan Sekarang" (button tetap jelas; playful cukup di helper) |
| empty.orders | "Belum ada pesanan" | "Masih bersih nih. Order pertamamu cuma 2 tap lagi." |
| empty.services | (netral) | "Gak ketemu? Coba kata lain — 8.270 layanan kadang bikin pusing sendiri." |
| account.avatarOk | "Avatar diperbarui" | "Foto baru terpasang. Ganteng/cantik banget ✦" (toast — boleh jenaka 1×) |
| ticket.replyEstimate | "dibalas <5 menit" | "Tim kami balas < 5 menit — manusia beneran, bukan bot." |

Aturan: tombol & label fungsional TETAP jelas ("Top Up", "Pesan Sekarang", "Batalkan & Refund") — jenaka hanya
di subtitle/empty/toast sukses, max 1 per layar, tanpa emoji berlebihan (budget: 1 emoji per layar, sudah ada 🎉 kupon & 👋 wave — pertahankan, jangan tambah banyak).

### 4.2 Peta momen selebrasi (M6 confetti + M13)

| Momen | Trigger existing (jangan bikin baru) | Efek |
|---|---|---|
| Order PERTAMA sukses dibuat | toast sukses action /pesan (cek totalOrders===0 dari data dashboard berikutnya → sederhana: confetti di toast sukses order jika `saved.length===0 && orders kosong` TIDAK reliable → **pakai: confetti setiap submit /pesan sukses, tapi hanya jika localStorage flag `socio-first-order` belum ada**) | Confetti + SuccessOrderArt + toast "Order masuk! Mulai proses < 1 menit ✦" |
| Top-up invoice dibuat | sheet instruksi terbuka (existing `$effect form.success`) | SuccessTopupArt + M13 checkmark; confetti HANYA saat deposit pertama (flag localStorage sama pola) |
| Withdraw terkirim | toast sukses ?/withdraw | M13 + copy "Komisi ditarik — masuk saldo ya" |
| VIP tercapai (deposit ≥5jt) | render banner VIP existing | M11 marker di "VIP" + banner masuk «M9»; confetti sekali (flag localStorage) |
| Refill diajukan | toast "Refill diajukan" | M13 saja (tenang) |

Flag localStorage: key `socio-celebrated-{firstOrder|firstTopup|vip}`, sekali seumur browser, gate reduced-motion.
**Tidak mengubah server/logic** — murni client decoration di atas toast/sheet existing.

### 4.3 Maskot (AD-2) — `SocioMascot.svelte` di packages/ui

Props: `pose: 'wave'|'fly'|'peek'|'fall'`, `size`. Muncul di: 9 empty-state art (integrasi ke SVG existing —
pose peek/fly kecil, JANGAN replace art), sidebar desktop footer (pose fly, 24px, opacity 60%), 404/error page
(pose fall), sheet sukses top-up (peek). Total ≤ 1 per layar.

---

## 5. Spec shell global (F2)

### 5.1 Mobile header (h-14 existing — pertahankan struktur)

- Restyle: wordmark + maskot 16px di kiri (sekali load «M7» wiggle 450ms), NotifBell kanan (bell ring «M7» saat
  unread bertambah via SSE/poll existing), Avatar (buka Account Sheet — tetap).
- Scrolled state: tambah border-b hairline + bg blur (sudah ada blur) — tanpa height change (named view-transition `app-header` JANGAN diganti namanya).

### 5.2 BottomNav (5 tab + FAB — struktur & perilaku auto-hide TETAP)

- Active indicator: pill bg primary/10 + dot mango di bawah ikon aktif, geser antar-tab «M12» spring (transform
  translateX pada satu elemen indicator, bukan per-item bg).
- Ikon aktif: scale 1.05 + label weight 600; tap = haptic (existing) + «M1».
- FAB: pertahankan `fab-premium` existing; tambah sheen sweep 1× tiap mount layar (600ms, bukan infinite).
- FAB Sheet "Mau ngapain?": 4 aksi existing → tiap baris icon dalam chip warna + «M5» stagger isi 80ms; copy judul tetap.

### 5.3 Desktop Sidebar (w-72 — struktur 8+1 item TETAP)

- Active state: bar kiri primary (existing) + pill indicator «M12» + ikon scale 1.05.
- Grup heading kecil (existing: 2 grup) — pertahankan; tambah maskot fly 24px opacity 60% di footer sidebar (AD-2).
- Kartu user bawah (existing): level badge pakai «M11» marker mango tipis; VIP → ring amber existing dipertahankan.
- Header desktop (h-16 sticky, named vt `app-header-desktop`): pageTitle + NotifBell — tambah greeting mikro
  "Halo, {firstName} ✦" sebelum title HANYA di layar dashboard (bukan route lain; cek pathname existing sudah ada).

### 5.4 Sheet / ConfirmDialog / Toast (kulit saja)

- Sheet: radius atas 28px, grabber pill 36px (visual, non-drag — drag-to-close = fitur baru, JANGAN), «M5».
- Toast: success = ikon check «M13» draw; error = shake 1× (340ms, pola auth existing); posisi & durasi tetap.
- ConfirmDialog: danger tetap merah; tambah «M1» pada tombol.

---

## 6. Spec per layar (F3-F6) — fungsi = §9 matriks; visual di wireframe doc

Prinsip per layar: **1 momen utama** (bold), sisanya tenang.

### 6.1 Dashboard `/` (momen utama: SaldoHero sticker + greeting)

- Hero OrbField + fase waktu: PERTAHANKAN semua (palette dawn/day/dusk/night, label, wave emoji, pill Aktif/Siap).
  Upgrade: kata kunci greeting di-stabilo «M11» (mis. "Siang, Rina ✦"); badge level → sticker-sm (tilt 1°, «M1» press).
- SaldoHero: skin **sticker chrome** (light: border ink 2px + hard shadow 4px; dark: §2.2 remap) + «M15» breathing
  glow halus; NumberFlow + Sparkline + insight spend7/deposit7 + CTA Top Up TETAP.
- Quick actions 2×2 (mobile) / 1×4 (desktop): ikon chip gradient existing → tambah «M1» press + «M12»-style
  micro-pop saat tap (scale 1.06→1 spring); deskripsi desktop-only tetap; haptic 8 tetap.
- Pesan Cepat: kartu → skin sticker-sm untuk kartu #1 (paling sering, badge mango "Favoritmu ✦" menggantikan
  badge `N×` yang TETAP tampil di kartu lain); carousel snap mobile & grid desktop tetap; empty state → maskot peek + copy §4.1.
- Inline-stat strip 3 kolom + delta + VIP state: TETAP semua; VIP banner di-marker «M11» + confetti sekali (§4.2).
- Chart 7 hari + Recent orders (LiveDot, sticky desktop, icon platform auto-detect, empty art + ctoa-premium):
  TETAP; upgrade kecil: StatusBadge recent ikut «M4» flip via `{#key status}` (pola pesanan).
- Trust line footer: tetap.

### 6.2 Pesan `/pesan` (momen utama: price summary + submit celebration)

- Hero gradient "Buat Pesanan Baru": tambah doodle panah kecil (SVG inline 1, ≤2KB) + rocket icon «M10» float halus.
- Form card: kategori→layanan fetch chain, counter "{n} layanan", platform auto-detect tick, favorit chips,
  QtyStepper, custom-comments textarea, kupon debounce, saveLink checkbox — SEMUA tetap; skin: chip favorit
  «M1», tick detect «M7» pop (pola auth tickPop — reuse keyframe).
- Price summary dark card → **sticker chrome dark** (border paper/30 dark + hard shadow); total NumberFlow «M2»;
  "Saldo kurang" chip Top Up tetap; baris diskon kupon = angka mango + 🎉 tetap.
- Submit sukses: «M6» confetti pertama kali (§4.2) + SuccessOrderArt di toast; mobile bottom-CTA pinned tetap
  (bottom-88px, label dinamis 4 state).
- Kolom kanan desktop (ringkasan live + ketentuan 4 bullet): tetap — bullet di sini ≤5 (anti-pattern #1 aman).

### 6.3 Pesanan `/pesanan` (momen utama: SSE live update)

- Filter chips sticky 6 tab + count + toggle Pilih Banyak: indicator geser «M12» (satu pill bg di belakang chip
  aktif, transform only); perilaku goto ?f= tetap.
- Kartu order mobile (SwipeRow) & desktop (2 col, hover lift, footer aksi): skin tenang (bukan sticker — layar
  padat); StatusBadge «M4»; sweep «M3» TETAP PERSIS.
- Mass action bar + refund flow: tetap; button danger «M1».
- Detail Sheet: «M5» + header dark gradient existing; Salin/Pesan Ulang/Refill/Batalkan (kondisional) semua
  tetap; Refill sukses → «M13» di toast.
- Skeleton filter-switch (4 card), empty + "Paling laris minggu ini" (3 kartu popular), LiveDot inline-stat: tetap.

### 6.4 Saldo `/saldo` + Top Up + Riwayat (momen utama: kartu saldo sticker + sheet instruksi)

- /saldo: balance card dark → sticker-dark + «M15»; 2 CTA (Top Up/Riwayat) layout mobile/desktop existing tetap;
  Mutasi 5 + Top-up terakhir (countdown live, pending-pulse, icon status) semua tetap.
- /saldo/top-up: stepper 3 langkah (≥sm) → kulit playful (angka langkah dalam lingkaran sticker-sm, garis
  penghubung, langkah aktif «M12»); chip nominal grid «M1» + aktif = border primary + tick + badge "Populer"
  mango-soft; input nominal lain tetap (min 20k); kartu BCA + Salin Nomor («M7» copy→check) tetap; Ringkasan
  (kode unik, bonus %, total, saldo masuk) tetap — angka bonus di-marker mango; submit → sheet instruksi
  («M5» + SuccessTopupArt «M13» + QR lazy fade + confetti deposit pertama §4.2); Upload Bukti sheet (multipart,
  dropzone, 2MB, jpeg/png/webp) tetap; riwayat + sidebar desktop tetap.
- /saldo/riwayat: 2 kartu summary (Pemasukan emerald / Pengeluaran ink) → sticker-sm tilt ±1° (saling berhadapan,
  playful tapi tetap terbaca); filter chips «M12»; tabel scroll-x + badge jenis + footer hint mobile + empty
  state: semua tetap.

### 6.5 Layanan `/layanan` (momen utama: star burst favorit)

- Search sticky (mobile top-14 blur) + Select kategori/sort + toggle Favorit (aria-pressed, count): skin «M1»,
  toggle fav aktif = star fill + «M7»; URL params q/cat/sort/fav/page TETAP.
- ServiceCard grid 1/2/3 col + bintang optimistic («M7» star-burst 420ms spring — sudah ada, pertahankan persis):
  kartu skin tenang, badge refill → pill mango-soft (kontras ink AA).
- "Muat lebih banyak" (bukan infinite scroll) + pending state + EmptyServicesArt + maskot peek: tetap.

### 6.6 Affiliate `/affiliate` (momen utama: profit & share)

- Kartu komisi dark (NumberFlow, downline, kode, withdrawn, 3 state aksi: requested/canWithdraw/min): sticker-dark;
  angka komisi di-marker «M11» saat pertama mount.
- Link referral (copy morph «M7» + Web Share fallback clipboard) + QR card (`<img>` existing) + empty art +
  trust notice amber + confirm-withdraw modal custom (overlay, backdrop close, POST ?/withdraw, busy states):
  SEMUA tetap; withdraw sukses → «M13» + copy §4.2 (tanpa confetti — uang pending approval, jangan lebay).

### 6.7 Tiket `/tiket` (momen utama: thread chat yang hidup)

- List mode: kartu tiket (avatar inisial gradient violet, subject, msgs, badge status 3 warna), stats hint,
  empty art, form buat tiket (POST ?/create, reset+toast): tetap; skin «M1» + bubble preview.
- Detail mode: back, header card, thread bubble (admin amber "Tim Socio.id" / user "Anda"), reveal stagger 45ms
  «M9» — **upgrade: bubble masuk seperti chat (scale-in 200ms «M5»-style, paling baru terakhir)**; form balas
  (POST ?/reply) + ghost Tutup Tiket (formaction ?/close) + status Closed info: semua tetap.

### 6.8 Notifikasi `/notif` & Akun `/akun`

- /notif: header + "Tandai dibaca" (markAll optimistic + toast), filter chips 6 tipe «M12», item unread styling
  (border primary/30 + dot «M7» dot-settle), klik = optimistic read + goto actionUrl, EmptyNotifArt + maskot peek:
  semua tetap.
- /akun: profil card (avatar upload → POST ?/avatar fetch, cache-bust, fallback inisial, overlay busy, badge
  pencil) + level badge «M11» shine existing «level-shine» tetap + kartu saldo gradient; ledger Akun & Keamanan
  (editMode collapse: profile/password+strength bar/apikey+ConfirmDialog regenerate/tema segmented Light-Dark
  instan localStorage+class) — **segmented tema pakai «M12» indicator spring**; Navigasi Cepat 6 chip warna +
  logout ConfirmDialog: semua tetap. Chip nav → «M1» + ikon dalam lingkaran sticker-sm.

### 6.9 Error/404 app

- `+error.svelte` (app) & route 404: maskot fall «M10» + copy human ("Waduh, halaman ini terbang entah ke mana.")
  + tombol Kembali/Dashboard. Struktur error handling tetap.

### 6.10 Auth (opsional F7, AD-5)

Sudah playful (shake, tickPop, strength meter zxcvbn, segmented sliding pill, CapsLock hint, Turnstile).
Upgrade tipis saja: segmented Member/Reseller indicator «M12» spring (sliding pill sudah ada — samakan easing),
maskot peek di AuthBackdrop variant reseller, marker mango di benefit reseller. FUNGSI & VALIDASI TIDAK DISentuh.

---

## 7. Inventory komponen (packages/ui)

| Aksi | Komponen |
|---|---|
| 🆕 baru | `SocioMascot.svelte` (AD-2), `Confetti.svelte` (M6, share dgn landing), `Marker.svelte` (M11 stabilo), `StickerCard.svelte` (wrapper .sticker) |
| ♻ restyle | SaldoHero, BalancePill, QuickGrid, BottomNav, Sidebar, Fab, Sheet, Toast, NotifBell, StatusBadge (kulit), ServiceCard, Tabs/segmented (M12), EmptyState (+slot maskot), Stat/StatCard |
| ✅ jangan disentuh (perilaku) | SwipeRow, NumberFlow, QtyStepper, Select, Input, ConfirmDialog (logic), Chart, Sparkline, LiveDot, OrbField, Skeleton, DataTable, CsvExportButton, CommandPalette, PromoBanner (logic carousel) |
| 🎨 art | 9 empty/success art di `src/art/` — tambah maskot kecil inline (jangan gambar ulang) |

---

## 8. Eksekusi (fase berurutan — "pelan-pelan")

- **F0 Preflight (0.5 hari)**: jawab AD-1..5; baseline screenshot SEMUA 11 route × {360,1280} × {light,dark}
  (pw-vision → `docs/screenshots/app-v2/baseline/`); salin matriks §9 jadi checklist kerja; catat versi git baseline.
  <!-- F0 SELESAI — 2026-09-13. Baseline: git e3f2a1b (worktree bersih kecuali 4 docs plan V2).
       DB dev: snapshot prod 13 Sep 2026 (mysqldump single-transaction, read-only) di-restore ke MariaDB
       lokal port 3307 (~/socio-mysql-data, user socio_app, proses PID di-launchd manual — start:
       /opt/homebrew/opt/mariadb/bin/mariadbd --no-defaults --datadir=$HOME/socio-mysql-data
       --socket=$HOME/socio-mysql-data/mysql.sock --port=3307 --bind-address=127.0.0.1 --user=maabook &).
       app/.env → SOCIO_DB_URL port 3307. Dev: pnpm --filter app dev (user test: /dev-admin-login?as=febian).
       Hasil: 44 screenshot (11 route × 2 vp × 2 theme) + baseline-metrics.json. Semua 200, 0 console error.
       Temuan baseline (BUKAN blocker, pre-existing):
       1. dashboard DESKTOP overflowX 42px (light+dark) — body sw=1322 vs 1280; suspect hero negative-margin
          (-mx-4 sm:-mx-6 lg:-mx-10) + OrbField. Fix di F3 (dashboard) sekalian.
       2. /pesanan networkidle timeout di Playwright = SSE long-lived (bukan bug; pakai domcontentloaded).
       3. Akun user test febian greeting tampil "Selamat malam, Mardian 🌙" (firstName = Mardian? verify
          nanti — data real snapshot, bukan issue UI).
       Matriks §9 belum dicoret — mulai dicoret per fase F2+ setelah verifikasi manual tiap route. -->
- **F1 Foundation (0.5 hari)**: token §2.2 + utility §2.2 + SocioMascot/Confetti/Marker/StickerCard + copy.ts
  rewrite (key diff = 0, verifikasi `grep -c` key sebelum/sesudah). DoD: **tampilan semua route belum berubah**
  (additive), lint+typecheck+build clean, dark remap terverifikasi.
- **F2 Shell (1 hari)**: §5 (header, BottomNav+M12, Fab sheen, Sidebar, Sheet/Toast/ConfirmDialog skin, bell ring).
  DoD: matriks §9 baris "Shell" ✓ semua; navigasi 5 tab + FAB sheet + account sheet + logout flow manual test;
  screenshot before/after 4 kombinasi.
- **F3 Dashboard (1 hari)**: §6.1. DoD: matriks baris Dashboard ✓ (OrbField fase, VIP, delta, quickOrders
  carousel/grid, LiveDot, chart, recent, banner CMS, trust line); light+dark; reduced-motion.
- **F4 Pesan + Pesanan (1.5 hari)**: §6.2-6.3 (paling berisiko — SSE/SwipeRow/optimistic; kerjakan terpisah,
  test manual: buat order sungguhan di dev, swipe, multi-select refund, filter, sheet detail, refill/cancel
  kondisional). DoD: matriks 2 route ✓ + confetti first-order terverifikasi 1× lalu tidak lagi.
- **F5 Saldo trio (1 hari)**: §6.4 (chip, kode unik, bonus, sheet instruksi+QR, upload bukti multipart, countdown,
  tabel riwayat scroll-x). DoD: matriks ✓ + flow top-up dev end-to-end.
- **F6 Sisa route (1 hari)**: §6.5-6.9 (layanan fav optimistic, affiliate withdraw modal, tiket thread, notif
  mark-read, akun 4 editMode + tema instan, 404). DoD: matriks ✓ penuh — **100% sebelum boleh bilang selesai**.
- **F7 Audit total + auth opsional (0.5-1 hari)**: AGENTS.md §7 (lint/typecheck/test/build), web-design-guidelines
  a11y (focus trap sheet, aria-pressed, aria-live, kontras AA light+dark semua permukaan baru: mango+ink,
  sticker-dark+on-dark, badge), review-animations craft, pw-vision screenshot final semua route, Lighthouse app
  (perf ≥ 90 mobile), cek `git diff --stat` tidak menyentuh `*.server.ts` kecuali nol perubahan.

Commit per fase: `feat(M2): app-v2 F{X} — {item}`. Satu fase = minimal 1 commit (jangan gabung F3+F4).

---

## 9. Matriks paritas fungsi (WAJIB 100% ✓ sebelum "selesai")

> Verifikasi = manual test di `pnpm --filter app dev` + bandingkan baseline screenshot. Coret-contreng per fase.

**Shell**: skip-link · sidebar 8+1 item (admin-only conditional) · header desktop title+bell · header mobile
wordmark+bell+avatar · BottomNav 5 tab + badge tiket + auto-hide · FAB hanya mobile & bukan /pesan · FAB sheet
4 aksi · account sheet (profil/riwayat/tiket/admin?/keluar) · ConfirmDialog logout → POST /logout → /login ·
NotifBell fetch 7 + mark-read + mark-all + Esc · view transitions named · AppFooter.

**Dashboard**: OrbField 4 fase WIB + refresh 60s + label · greeting+firstName+wave · pill Aktif/Siap + subtitle ·
badge level link · PromoBanner carousel (jika ada) · SaldoHero (NumberFlow+Sparkline+insight+CTA) · quick
actions 4 (haptic, desc desktop-only) · Pesan Cepat (carousel mobile/grid desktop, badge N×/Baru, link
?service&link, empty state+CTA sm-only) · stat strip 3 + delta% · VIP ≥5jt (ring+banner+star) · chart 7 hari
2 series + link detail + 2 state kosong · recent orders (icon platform auto, StatusBadge, timeAgo, LiveDot 30s,
sticky desktop, empty art + ctoa-premium, CTA beda mobile/desktop) · trust line.

**Pesan**: kategori Select searchable → fetch /pesan/services (loading/error toast/counter) · layanan Select
multiline + harga hint · detail service (harga/level, min-max, badge refill) · link Input + platform detect
tick + error domain + aria-live · saved-link chips (goto prefill) · QtyStepper min/max/step ATAU textarea
Custom Comments (lineCount=qty) · kupon debounce 400ms + auto-recheck + state 3 · summary (subtotal coret,
diskon, total NumberFlow, saldo cukup/kurang + chip Top Up) · saveLink checkbox · submit 4 label + disabled
states · estimasi waktu + note card kondisional · mobile bottom-CTA pinned form=pesan-form · desktop ringkasan
live + ketentuan 4 bullet · prefill ?service deep-link ($effect).

**Pesanan**: h1 sr-only + intro desktop · inline-stat narrative + LiveDot SSE (label Live/Reconnect) · 6 filter
chips + count + sticky mobile + goto ?f · toggle Pilih Banyak · SwipeRow mobile (threshold 80, Esc, tap-cancel) ·
kartu (nama, link, StatusBadge key+flip, info Partial refund, chip qty+harga, timeAgo, #id desktop) · desktop
footer Detail+Pesan lagi+checkbox · mass bar fixed (n order, refund total Pending-only, POST ?/massCancel
enhance+toast+reset) · Sheet detail (header gradient, Salin clipboard+toast, grid 2×2, Pesan Ulang goto
prefill, Refill POST kondisional isRefill&&Success&&providerOrderId, Batalkan POST kondisional Pending) ·
SSE order_update in-place + sweptIds + sweep 1600ms + haptic-if-sheet · skeleton navigating 4 card · empty all
(+popular 3 kartu) vs empty filtered.

**Saldo**: balance card (NumberFlow) + 2 CTA layout beda · mutasi 5 (icon+tone per type incl legacy plus/minus,
isOutLog arah, truncate+title, timeAgo, warna) + empty art · top-up terakhir (icon status, countdown live 30s
pause-hidden, format Kedaluarsa/Xmnt/XjYm/Xhari, pending-pulse) + empty art.

**Top-up**: back + stepper sm-only · banner error · saldo card · chip nominal (data.chips fallback, chip-press,
tick, badge Populer, haptic 8) + input lain (min 20k, prefix Rp) · kartu BCA (rekening+a.n.+Salin+toast, note
e-wallet segera) · ringkasan (kode unik+suffixSig, bonus rate+preview, total transfer, saldo masuk) · POST
?/topup hidden fields + busy + failure toast · sheet instruksi auto-open (SuccessTopupArt, rekening besar+copy,
QR qrserver lazy fade, nominal exact, credited+bonus, warning amber, Tutup goto) · sheet upload bukti (POST
?/uploadProof multipart, accept jpeg/png/webp 2MB, nama file ✓, disabled tanpa file, success toast+goto) ·
riwayat (badge status, Upload Bukti jika Pending && !img) + empty · sidebar desktop sticky.

**Riwayat**: h1+count+filter label · back pill ≥sm / link mobile · 2 kartu summary masuk/keluar · 5 filter chips
+ mapping legacy (plus+note→ref/deposit/admin, minus→order) + goto ?type noScroll · tabel min-w 560 scroll-x
(waktu dd Mmm yyyy HH:MM, badge jenis+metaOf, note truncate 260+title, badge ± warna abs) · footer hint
mobile · row hover + reveal stagger · EmptyState 2 varian copy.

**Layanan**: intro mobile-only · search sticky mobile/static desktop + goto ?q · Select kategori (searchable,
paksa 0 saat fav) ?cat · Select sort w-40 ?sort · toggle fav aria-pressed+count+title ?fav=1 · result count ·
grid 1/sm2/xl3 ServiceCard (name, type||categoryName, platform, pricePer1k, min-max, refill, href ?service,
haptic) + bintang absolute optimistic POST ?/toggleFav + revert + star-burst 420ms · Muat lebih banyak (page+1
fetch→goto, pending disabled) · EmptyServicesArt.

**Affiliate**: h1 · kartu komisi dark (NumberFlow, downline+kode, withdrawn jika>0, 3 state: requested info /
canWithdraw button / min info) · link referral readonly + copy morph 1.6s reset + Bagikan navigator.share
fallback clipboard+toast · QR img key re-reveal · empty downline art + share · trust notice amber · modal
withdraw custom (place-items-end mobile/sm center, backdrop close kecuali busy, aria, POST ?/withdraw enhance
busy/failure/success+applyAction-if-not-redirect, nominal+penjelasan, Batal/Tarik) · footer text.

**Tiket**: list (h1+replyEstimate, stats pill, kartu avatar-inisial violet+subject+msgs+last+badge 3 status,
goto ?ticket keepFocus noScroll, empty art dashed) + banner error + form create (subject+textarea rows4
required, Mengirim…, success reset+toast) · detail (back noScroll, header judul 48char/#id + n pesan, thread
bubble admin amber Tim Socio.id / user Anda + timestamp + pre-wrap + stagger 45ms, form balas rows3 (kecuali
Closed) + ghost formaction ?/close, Closed info card).

**Notif**: h1 + Tandai dibaca ghost (unread>0, markAllBusy) · 6 filter chips min-h44 goto ?type noScroll · item
(icon 5 tipe, unread border/bg/icon primary, read netral transition 300ms, title truncate + dot-unread
dot-settle 400ms, message line-clamp-2, timeAgo, klik optimistic readIds → POST ?/read fire-forget → haptic →
goto actionUrl) · lg:grid-cols-2 · EmptyNotifArt · markAll optimistic → POST ?/readAll → toast · $effect sync +
SSR penuh anti-CLS.

**Akun**: avatar button (file picker, POST ?/avatar fetch, cache-bust ?v=, fallback inisial onerror, overlay
busy, pencil badge) · nama + level badge level-shine 900ms mount + @username · kartu saldo gradient · ledger
editMode collapse (profile form ?/profile busy+toast · password form ?/password min8 + strength bar client
3 warna+label · apikey: readonly mono + Salin clipboard+toast + Tutup + warning + Regenerate danger keyBusy →
ConfirmDialog → POST ?/apiKey fetch parse action failure/success update+toast; collapsed: eye + Regenerate
langsung) · tema segmented Light/Dark POST ?/theme + localStorage + class .dark instan + icon sun/moon +
aria-pressed · Navigasi Cepat 6 chip (5 warna + Keluar danger → ConfirmDialog copy.logoutConfirm → POST /logout
→ /login) · mobile scroll-x / desktop grid-3.

---

## 10. Guardrails (anti-halu)

1. `git diff --name-only` per fase tidak boleh memuat `+page.server.ts`, `+layout.server.ts`, `+server.ts`,
   `packages/core/src/*` kecuali `copy.ts` (dan itu pun key-count identik).
2. Dilarang dependency baru (confetti/maskot hand-rolled SVG/CSS vanilla).
3. Dilarang ganti nama `view-transition-name`, id form (`pesan-form`), atribut `form=`, searchParams key,
   localStorage key existing (`theme`) — semuanya dipakai logika.
4. Dark mode: setiap kulit baru wajib dicek light+dark (remap §2.2) — screenshot 4 kombinasi per route.
5. Keyframe baru hanya transform/opacity (kecuali M13 stroke-dashoffset, M15 opacity-layer) — no layout anim.
6. Jangan sentuh `(admin)/*`, `api-docs`, cron, queue.
7. Ketemu kebutuhan ubah server untuk visual (mis. data baru) → STOP, tanya user.
8. Bingung fungsi vs visual → matriks §9 menang; kalau matriks meragukan → baca file route-nya langsung, jangan asumsi.
