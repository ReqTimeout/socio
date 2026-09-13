# APP Playful Polish Plan — app.socio.id (halaman user + auth)

> **Untuk coding agent.** Polish visual + motion 16 halaman app (`(app)` 11 + `(auth)` 5)
> ke arah **playful premium** — TANPA merubah fungsi/logika/validasi/server-action apa pun.
> Status: APPROVED-scope 2026-09-13 (user pilih 11 halaman user + auth ikut). Eksekusi BELUM mulai.
> F0 SELESAI 2026-09-13 (tokens mango AA + Mascot wave/fly/fall + ConfettiBurst + StickerBadge
> + pop-in/wiggle/float-slow + popIn(); ui lint + app check 0 error + app build OK, nihil visual change).
> F1 SELESAI 2026-09-13 (dashboard: reveal items + stat count-up + Mascot empty + skeleton navigating;
> saldo: orb float-slow + amount slide-in + countdown bar + expireFrac; check 0 error + build OK +
> styles terkonfirmasi di CSS build. CAVEAT visual: dev lokal auth rusak pre-existing [drizzle join
> sessions×users gagal di env ini, bukan akibat F1] + prod masih kode lama → screenshot manual
> ditunda ke F7/staging. Catatan: magnetic-CTA diganti hover-lift+shimmer existing (tanpa JS baru).
> F2-PESAN SELESAI 2026-09-13 (halaman /pesan saja; /pesanan ikut F2 penuh berikutnya):
> step indicator hidup (CSS-only, ikut state), stamp link-OK pop keyed, tick-dot mango keyed di
> 3 titik total, skeleton saat layanan loading; QtyStepper ternyata sudah haptic internal (skip);
> check 0 error (baseline 56 warns) + build OK + keyframes terkonfirmasi di CSS build.
> F2-PESANAN SELESAI 2026-09-13: progress bar indeterminate di kartu In progress/Processing
> (mobile+desktop, role=progressbar) + sliding indicator mango di chip aktif (ukur DOM, ikut filter/
> resize, +aria-current) + empty all (art+maskot fall) vs filter (maskot wave); check 0 error + build OK.
> CATCH: status order itu enum Inggris ("In progress"/"Processing", bukan "Proses") — check menolak
> perbandingan awal, sudah dibetulkan. Visual caveat sama seperti F1 (auth dev lokal).
> F4 SELESAI 2026-09-13: top-up (chip check spring keyed + total/saldo-masuk count-up +
> confetti saat invoice + QR scale-pop) + riwayat (empty art+maskot fall, stagger 18→40ms,
> amount hover lift); check 0 error (baseline 56) + build OK + CSS terkonfirmasi.
> F5 SELESAI 2026-09-13: affiliate (confetti copy + QR tilt desktop + withdraw ring mango) +
> notif (swipe-read mobile via SwipeRow + icon pop + counter mango + aria-current) +
> tiket (bubble slide L/R + typing dots saat kirim + Answered pulse) +
> akun (row-slide diaktifkan + avatar pop + theme icon morph);
> check 0 error (warn 56→50) + build OK + semua CSS terkonfirmasi.
> Penyesuaian jujur: magnetic-CTA & slider morph tema batal (pakai hover/shine + morph ikon,
> tanpa JS/view baru); typing dots tiket di state kirim (bukan fake pre-render admin).
> F6 SELESAI 2026-09-13: maskot wave di login/daftar/lupa/reset + fly di verifikasi-ok; daftar
> toggle spring + mode pop + strength pop + morph + error pop; login/reset morph + error pop;
> lupa confetti saat link terkirim; Turnstile/zxcvbn/caps/rate-limit nol sentuh;
> check 0 error (warn 50) + build OK + CSS terkonfirmasi.
> F7 SELESAI-SEBAGIAN 2026-09-13: AA lolos semua pasangan baru (5.4–15.1 light, 10+ dark;
> CATCH: step-dot putih di atas success gagal dark 1.92 → ganti konvensi badge 4.99/10.1);
> countdown bar width→scaleX (strict transform-only); 15 screenshot auth 360/768/1440
> (overflow 0, console 0 error, target <24px hanya text-link inline pre-existing);
> reduced-motion emulate = nihil animasi + konten tampil; no-layout-anim grep bersih;
> lint (3 warn pre-existing di file tak tersentuh) + check 0 error + build OK.
> TANGGUH: screenshot 11 halaman (app) butuh sesi login — dev lokal auth rusak pre-existing,
> lakukan di staging pasca-deploy (butuh commit+push = instruksi user).
> F3 SELESAI 2026-09-13: search clear-X morph (+aria-label, klik = reset + cari ulang),
> stagger 30→40ms, spotlight hover kartu (desktop, filter-only — aman dari fill reveal),
> fav-count bump keyed, shake-once saat 0 hasil, skeleton grid saat load-more;
> check 0 error (baseline 56) + build OK + CSS terkonfirmasi.

---

## 0. Cara pakai dokumen ini

### 0.1 Scope (final, decision user 2026-09-13)

| Grup | Halaman (16) |
|---|---|
| `(app)` 11 | `/` dashboard, `/saldo`, `/saldo/riwayat`, `/saldo/top-up`, `/pesan`, `/pesanan`, `/layanan`, `/affiliate`, `/notif`, `/tiket`, `/akun` |
| `(auth)` 5 | `/login`, `/daftar`, `/lupa-password`, `/reset`, `/verifikasi` |

**TIDAK termasuk**: `(admin)/*`, `/api-docs`, cron, server actions, schema DB, env.

### 0.2 Prinsip (urut prioritas — mengikat)

1. **Fungsi NOL berubah.** Hanya presentasi + animasi. Server action, validasi Zod, rate-limit,
   Turnstile, auth flow, SSE endpoint, harga/kuota — JANGAN disentuh. Kalau ragu: tanya user.
2. **Kontrak `docs/DESIGN.md` tetap.** App = cool technical-precise (indigo/cyan, AA ketat).
   Playful = **lapisan aksen**: empty/success moments, entrance, micro-delight. DILARANG: ganti font,
   ganti primary, dark-mode jadi default, sticker di setiap kartu (max 1–2 aksen sticker per halaman).
3. **Ditolak eksplisit**: saran database skill (dark-OLED-only, Fredoka/Nunito, gold/purple) —
   menabrak kontrak app. Diambil hanya prinsipnya: micro 150–300ms, spring sesekali, reduced-motion.
4. **Desktop + mobile nyaman.** Semua perubahan diverifikasi 360×640 DAN 1440×900.
   Touch target ≥44px, safe-area, tidak ada horizontal overflow (grid child `min-w-0`).
5. **Motion disiplin (warisan landing V2):** transform + opacity saja (GPU). Infinite max 3 per viewport.
   Tiap animasi baru WAJIB punya fallback `prefers-reduced-motion` (final state langsung).
   Haptic tetap gated reduced-motion (pola `haptic.ts` existing).
6. **AA contrast dua tema.** Token baru wajib lolos 4.5:1 di light DAN dark (`.dark` remap).
7. **Additive only di `packages/ui`.** Tambah token/komponen/util — JANGAN ubah signature
   `revealDelay/staggerIn/tweenNumber/hoverLift`, JANGAN override token existing.

### 0.3 Decision points (sudah dijawab)

| # | Keputusan | Status |
|---|---|---|
| D-1 | Scope 11 halaman user | ✅ user 2026-09-13 |
| D-2 | Auth ikut (animasi + playful) | ✅ user 2026-09-13 ("simpan plan dulu termasuk auth") |
| D-3 | Eksekusi | ⏳ MENUNGGU instruksi user (plan dulu) |

---

## 1. Hasil audit (ringkasan, 2026-09-13)

Audit penuh via subagent (read-only). Temuan global:

- **Motion sudah ada tapi tipis**: `reveal` + `revealDelay` stagger 30–60ms di semua list,
  `card-lift` hover, `active:scale`, `NumberFlow` count-up, SSE sweep di pesanan,
  `star-burst` favorit, `error-shake` auth, `authIn` entrance. Pola konsisten — tinggal diekstensi.
- **Reduced-motion sudah disiplin 3 lapis** (global kill, primitives, per-file) + `motion-safe:` —
  pola ini WAJIB diikuti animasi baru.
- **Gap playful**: tidak ada maskot SVG, tidak ada token mango/spring, tidak ada confetti,
  empty-art line-art statis (tidak float), banyak halaman tanpa skeleton
  (dashboard, affiliate, akun, notif, saldo, riwayat), error hanya toast di bbrp halaman.
- **Dead code**: `row-slide` di akun didefinisikan tapi tak dipakai (`akun/+page.svelte:598`).
- **Design system** (`packages/ui`, 40 komponen + 9 art): extension point aman =
  var baru di `tokens.css`, util baru di `primitives.css`, file art baru + ekspor `index.ts`.

---

## 2. Fase eksekusi (kerjakan berurutan, satu fase = satu verifikasi)

> Format commit (JANGAN commit tanpa instruksi user):
> `feat(app-polish): F{X} — {halaman/item}`.

### F0 — Foundation `packages/ui` (syarat semua fase)

| # | Item | File |
|---|---|---|
| F0-1 | Token `--color-mango-*` (50–900, light + `.dark` remap, AA 4.5:1 dua tema) + `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)` + `--dur-pop` | `tokens.css` (append only) |
| F0-2 | `Mascot.svelte` — Si Socio paper-plane, pose `wave/fly/fall` (sama dgn landing: wave=sapa, fly=sukses/ujung alur, fall=empty/error), stroke currentColor adaptif tema | `components/` baru + `index.ts` |
| F0-3 | `ConfettiBurst` — canvas confetti 1× per trigger, `<3KB`, `motion-safe` + reduced-motion = no-op, haptic opsional | `components/` atau `lib/` baru |
| F0-4 | `StickerBadge` — pill sticker (border tinta 2px + hard shadow sm) untuk label promo/hemat/baru | `components/` baru |
| F0-5 | Util `.pop-in` (spring 400ms), `.wiggle-once` (450ms 1×), `.float-slow` (6s) + kill reduced-motion | `primitives.css` (append only) |
| F0-6 | `lib/motion.ts`: `popIn()` helper — JANGAN ubah signature existing | append only |

DoD F0: `pnpm --filter @socio/ui typecheck` + tidak ada perubahan visual di halaman existing
+ cek AA mango/ink dua tema + reduced-motion emulate = semua util diam.

### F1 — Dashboard `/` + Saldo `/saldo` (trafik tertinggi)

- Dashboard: stagger QuickGrid 4 + Pesan Cepat (`revealDelay` ada → naikkan step terasa);
  inline-stat 3 kol count-up (`tweenNumber`); `EmptyOrdersArt` + Mascot float (`motion-safe`);
  CTA magnetic-hover (desktop pointer:fine); skeleton saat list pesanan loading (belum ada).
- Saldo: orb glow drift di balance card (pakai `OrbField` existing, bukan blob baru);
  nominal mutasi slide-in berwarna (+/-); countdown pending jadi bar menyusut (bukan teks saja).
- DoD: light+dark OK, 360 + 1440 OK, SSE/live untouched.

### F2 — Pesan `/pesan` + Pesanan `/pesanan` (order loop)

- Pesan: stepper 1-2-3 hidup mengikuti state; stamp "link OK" bounce; `QtyStepper` haptic tick;
  total `NumberFlow` tick; skeleton untuk placeholder kategori/layanan.
- Pesanan: progress bar tipis di kartu `Proses`; filter pill sliding indicator;
  empty-art maskot beda per tab (all vs filter); pertahankan SSE sweep + `StatusBadge` flip.
- DoD: semua validasi/error existing tetap (jangan sentuh logika); swipe mobile tetap.

### F3 — Layanan `/layanan` (katalog)

- Fav count bump + `star-burst` existing dipertahankan; kartu hover spotlight border (desktop only);
  search clear-X morph; shake saat 0 hasil; stagger 30→40ms; skeleton grid saat load-more.
- DoD: sticky search mobile tetap; sort/filter/fav logic untouched.

### F4 — Top-up `/saldo/top-up` + Riwayat `/saldo/riwayat` (uang)

- Top-up: chip check spring; total transfer count-up; success Sheet confetti (F0-3);
  QR scale-in (bukan fade); nominal человеческого honesty label tetap.
- Riwayat: `EmptyState` generik → `EmptyBalanceArt` + Mascot; row stagger 18→40ms;
  amount hover lift; hint geser mobile dipertahankan.
- DoD: nominal/metode/instruksi/bukti flow untouched; Sheet trap + scroll-lock tetap.

### F5 — Affiliate + Notif + Tiket + Akun (engagement)

- Affiliate: confetti 1× saat link tercopy; QR tilt-on-hover (desktop); withdraw progress ring
  ke `minWithdraw` (ganti teks mati).
- Notif: swipe-to-read mobile (simetri `SwipeRow` pesanan); ikon kategori pop saat filter;
  unread stack counter di header; skeleton list.
- Tiket: bubble chat slide-in kiri/kanan per `type`; typing dots 800ms sebelum balasan admin render;
  pill `Answered` pulse; skeleton saat kirim tetap teks + disabled.
- Akun: terapkan `row-slide` yang sudah ada (dead code → dipakai); avatar success pop;
  theme toggle morph sun→moon (ganti 2 tombol); skeleton secukupnya.
- DoD: semua action (withdraw, balas, tutup, ganti password, regenerate key) untouched.

### F6 — Auth 5 halaman (login/daftar/lupa/reset/verifikasi)

- Maskot greeting di atas logo (1 pose per halaman, `AuthBackdrop.playful` tetap);
  mode member/reseller toggle spring; password-strength bar pop per level;
  show-password morph; error-shake dipertahankan + ikon pop; success state
  (verifikasi/reset) confetti + Mascot success; loading button spinner existing tetap.
- DoD: Turnstile, zxcvbn, caps-lock, rate-limit, double opt-in untouched. WAJIB test
  submit gagal + sukses per halaman.

### F7 — Audit & polish global (SELESAI-SEBAGIAN 2026-09-13, sisa screenshot app → staging)

- [x] AA 4.5:1 semua teks baru (light + dark, termasuk di atas mango/sticker)
- [x] reduced-motion emulate: tidak ada infinite yang jalan, semua ke final state
- [x] Screenshot 360 + 768 + 1440 untuk 5 halaman auth → `docs/screenshots/app-polish/`
- [ ] Screenshot 11 halaman (app) → TANGGUH ke staging pasca-deploy (auth dev lokal rusak)
- [x] Touch target ≥44px semua kontrol baru; safe-area; overflow-x = 0 semua viewport
- [x] Tidak ada layout-anim (hanya transform/opacity; countdown pakai scaleX)
- [x] `pnpm --filter app lint && typecheck && build` bersih (3 lint-warn pre-existing)
- [x] Tidak ada string/copy baru yang mengubah makna/aturan (hanya pemanis)

---

## 3. Acceptance global (DoD total)

- [ ] 16 halaman lolos F7 per halaman; tidak ada fungsi berubah (diff review per fase)
- [ ] D-1..D-3 tercatat; tidak ada token/komponen existing yang diubah signature-nya
- [ ] Sticker chrome ≤2 per halaman app (lebih ketat dari landing karena density produk)
- [ ] Emoji NOL sebagai ikon (SVG `Icon`/Mascot saja — aturan ui-ux-pro-max)
- [ ] Docs: checklist ini dicentang per fase selesai

## 4. Guardrails (anti-halu)

1. DILARANG menyentuh: `+page.server.ts`, validasi, Turnstile, rate-limit, auth adapter,
   SSE endpoint, cron, pricing math, webhook. Animasi yang butuh data → pakai data existing.
2. DILARANG ganti font/primary/dark-default. Mango hanya aksen (badge, maskot, confetti, indicator).
3. DILARANG tambah dependency animasi (framer-motion dsb) — CSS + Svelte bawaan + canvas mini.
4. Angka/copy aturan (harga, kuota, bunga, syarat) JANGAN diubah atau diparafrase maknanya.
5. Satu fase selesai = verifikasi §F7-ringkas (lint+typecheck+dev 360/1440+reduced) SEBELUM lanjut.
6. Bertentangan dengan `docs/DESIGN.md` → DESIGN.md menang, kecuali amendemen ini yang
   disetujui user. Kontradiksi dengan `REBUILD_PLAN.md` → REBUILD_PLAN menang, tanya user.
