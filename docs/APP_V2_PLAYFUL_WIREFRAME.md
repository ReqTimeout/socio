# APP V2 "PLAYFUL CALM" — WIREFRAME DETAIL (app.socio.id user)

> Pendamping plan restart di `/Users/maabook/Downloads/APP_V2_PLAYFUL_PLAN.md`
> (baca plan dulu — spec token §2, motion §3, copy §4, shell §5, per-layar §6, matriks §9 ada di sana).
> Status dokumen: DRAFT dari **audit statis** HEAD `18a5109` (2026-09-16).
> TANPA screenshot — DB dev down (snapshot 3307 hilang, MySQL 3306 belum verifikasi data),
> jadi semua "✅ ada" = terkonfirmasi di kode via diff HEAD vs HEAD~1, bukan visual.
> Wajib re-verifikasi visual di staging sebelum F7 (lihat §12).
>
> Notasi: `«M1»` id motion (plan §3) · `«C1..C5»` character carrier (plan §2.1) ·
> `[label]` tombol/CTA · `→ /route` link · status per elemen:
> `✅` sudah ada di kode · `⬜` TODO plan belum dikerjakan · `⚠` ada tapi di luar plan (perlu putusan user).
> Hierarki: `REBUILD_PLAN.md` > `DESIGN.md` (§6 app shell) > `MOBILE_UX_GUIDE.md` > plan restart > dokumen ini.
> Admin `(admin)/*` DI LUAR SCOPE.
>
> Budget global (plan §2.3, mengikat semua layar): infinite animation max 2/layar ·
> sticker chrome ≤2 besar/layar · mango ≤3 elemen/layar · maskot ≤1/layar ·
> 1 momen utama per layar, sisanya tenang · transform/opacity only · reduced-motion gate.

---

## 0. Legenda carrier & status as-built (ringkasan audit 2026-09-16)

| Carrier | Token/komponen | Status |
|---|---|---|
| C1 Mango highlight | `--color-mango-*` + dark remap (AA terverifikasi) + alias kanonis `--pop-*`/`--on-mango`/`--sticker-*` (AD-1, 2026-09-16, additive) | ✅ ada |
| C2 Maskot Si Socio | `packages/ui/.../Mascot.svelte` pose wave/fly/fall | ✅ ada, tersebar di empty states |
| C3 Sticker chrome | `StickerBadge.svelte` (pill kecil) | ✅ sebagian; ⬜ `StickerCard` wrapper + `.sticker` util + `--sticker-shadow` belum ada |
| C4 Spring micro-motion | `--ease-spring` + `popIn()` + keyframes pop/wiggle/float | ✅ ada |
| C5 Selebrasi M6 | `ConfettiBurst.svelte` | ✅ ada; ⚠ gating `socio-celebrated-*` (sekali per kejadian) BELUM — sekarang fire tiap invoice top-up + tiap copy affiliate |
| Marker M11 | — | ⬜ `Marker.svelte` belum ada |
| Copy playful §4.1 | `packages/core/src/copy.ts` | ⬜ masih netral (rewrite diputuskan YA, belum dikerjakan) |

Fungsi: **11/11 route LAYAK** — diff HEAD vs HEAD~1 nihil fungsi hilang, nihil `server.ts`/`copy.ts` tersentuh.

---

## 1. SHELL GLOBAL (§5 plan) — status: ⬜ F2 BELUM dikerjakan (fungsi aman, skin belum masuk)

### 1.1 Mobile header (h-14, struktur tetap)

```
MOBILE 360
┌──────────────────────────┐
│ ✈ socio.id    [🔔•] [ava] │  ← ✅ ada; ⬜ maskot 16px + wiggle 1× load «M7»
└──────────────────────────┘
  ⬜ scrolled: border-b hairline (bg blur sudah ada, tanpa height change)
  ⬜ bell ring 1× «M7» saat unread bertambah (yang ada: pulse badge infinite)
  vt-name `app-header` JANGAN diganti
```

### 1.2 BottomNav (5 tab + FAB, auto-hide + perilaku tetap)

```
MOBILE 360 (bottom dock, safe-area)
┌──────────────────────────────────┐
│ 🏠   🛒   ＋   📦   👤            │  ← ✅ 5 tab + badge tiket + auto-hide
│ ● ← ⬜ pill indicator «M12» spring (transform 1 elemen, + dot mango)
│         [FAB ✦] ← ✅ fab-premium; ⬜ sheen sweep 1× tiap mount (600ms, bukan infinite)
└──────────────────────────────────┘
  FAB Sheet "Mau ngapain?" — ✅ 4 aksi ada; ⬜ icon dalam chip warna + stagger isi 80ms «M5»
  ⬜ ikon aktif scale 1.05 + label 600 (tap haptic existing + «M1»)
```

### 1.3 Desktop sidebar (w-72, 8+1 item + 2 grup tetap)

```
DESKTOP 1280
┌──────────────┬─────────────────────────────────┐
│ ✈ socio.id   │ h-16 sticky: [pageTitle + 🔔]    │ ← ⬜ greeting mikro
│              │ "Halo, {firstName} ✦" HANYA di  │    dashboard, bukan route lain
│ GRUP 1       │                                 │
│ ● Dashboard  │ ← ⬜ pill «M12» + ikon scale    │
│ ○ Pesan      │    (bar kiri existing tetap)    │
│ ○ Pesanan …  │                                 │
│ GRUP 2       │                                 │
│ ○ …          │                                 │
│ ┌ user card┐ │                                 │
│ │Lv badge⬜│ │ ← ⬜ marker mango tipis «M11»   │
│ └──────────┘ │    (VIP ring amber tetap)       │
│  ✈ ···· ← ⬜ maskot fly 24px opacity 60%      │
└──────────────┴─────────────────────────────────┘
```

### 1.4 Sheet / Toast / ConfirmDialog (kulit saja)

```
Sheet:  ✅ choreography «M5» ada
        ⬜ radius atas 28px + grabber pill 36px (visual, non-drag — drag-to-close DILARANG)
Toast:  ⬜ success = check draw «M13»; ⬜ error = shake 1× 340ms (pola auth)
        (posisi & durasi TETAP)
Dialog: ✅ danger merah tetap; ⬜ «M1» pada tombol
```

---

## 2. DASHBOARD `/` (§6.1) — momen utama: ⬜ SaldoHero sticker + greeting marker

```
MOBILE 360
┌──────────────────────────┐
│ ~~ OrbField dawn/day/    │  ← ✅ fase WIB + refresh 60s + label + wave + pill
│ ~~ dusk/night + wave     │    ⬜ kata kunci greeting di-stabilo «M11» (Marker)
│ Siang, Rina ✦ ← ⬜ «M11»  │
│ [Lv Reseller →/akun] ← ⬜ sticker-sm tilt 1° + «M1» press
├──────────────────────────┤
│ ╔ SALDO sticky ════════╗ │  ← ⬜ skin sticker chrome «C3» + breathing «M15»
│ ║ Rp ▓▓▓ «M2»  [TopUp]║ │    ✅ NumberFlow + Sparkline + insight + CTA TETAP
│ ║ ~spark  insight 7h  ║ │
│ ╚══════════════════════╝ │
│ [Pesan][TopUp][Affl][?]  │  ← ✅ 2×2, haptic 8; ⬜ «M1» + micro-pop tap
│ ┌ Pesan Cepat ────────┐  │  ← ✅ carousel snap + badge N×/Baru + empty + CTA
│ │[#1 Favoritmu✦⬜][#2] │  │    ⬜ kartu #1 sticker-sm + badge mango (ganti N× di #1 saja)
│ └─────────────────────┘  │    ⬜ empty → maskot peek + copy §4.1
│ stat│stat│stat + delta%  │  ← ✅; ✅ count-up tween 800ms (reduced=instant)
│ [VIP banner ⬜«M11»]     │  ← ✅ ring+banner+star; ⬜ marker + confetti 1× (flag)
│ chart 7 hari 2 series   │  ← ✅ + 2 empty-state TETAP
│ recent: ●LiveDot + kartu│  ← ✅ 30s + sticky desktop + empty art + ctoa-premium
│  ✅ maskot fall di empty │    ⬜ StatusBadge ikut flip «M4» {#key}
│ trust line              │  ← ✅ tetap
└──────────────────────────┘

DESKTOP 1280: hero OrbField kiri + SaldoHero kanan (layout existing tetap);
quick 1×4 + desc; Pesan Cepat grid; recent sticky. 1 momen = SaldoHero, sisanya tenang.
```

---

## 3. PESAN `/pesan` (§6.2) — momen utama: ⬜ price summary sticker + selebrasi submit

```
MOBILE 360
┌──────────────────────────┐
│ HERO gradient            │  ← ✅; ⬜ doodle panah SVG ≤2KB + rocket «M10» float
│ "Buat Pesanan Baru"      │
├──────────────────────────┤
│ ✅ step indicator (ekstra, aditif — bukan plan, OK) + Skeleton loading «M8»
│ [Kategori select] →fetch│  ← ✅ chain + counter + error toast
│ [Layanan select + Rp]   │  ← ✅ multiline + harga hint
│ detail: min-max + refill│  ← ✅ badge refill TETAP
│ [link input + ✓ tick]   │  ← ✅ detect + error domain + aria-live; ✅ tick pop «M7»
│ [fav chips → prefill]   │  ← ✅; ⬜ «M1» pada chip
│ [QtyStepper | textarea] │  ← ✅ min/max/step + lineCount=qty TETAP
│ [kupon + Hemat RpX 🎉]  │  ← ✅ debounce 400ms + 3 state; ✅ tick-dot mango keyed
│ ╔ SUMMARY dark ═══════╗ │  ← ⬜ sticker-dark «C3»; ✅ NumberFlow «M2» + saldo
│ ║ subtotal coret      ║ │    kurang chip TopUp + saveLink checkbox TETAP
│ ║ TOTAL ▓▓▓ [Pesan]  ║ │
│ ╚═════════════════════╝ │
│ estimasi + note kond.   │  ← ✅ tetap
│ [bottom-CTA pinned]     │  ← ✅ bottom-88px + 4 label dinamis TETAP
└──────────────────────────┘
  ⬜ submit sukses: confetti PERTAMA saja (flag socio-celebrated-firstOrder) + SuccessOrderArt
DESKTOP 1280: kolom kanan ringkasan live + ketentuan 4 bullet ✅ tetap (bullet ≤5 aman).
```

---

## 4. PESANAN `/pesanan` (§6.3) — momen utama: ✅ SSE live (paling sesuai plan)

```
MOBILE 360
┌──────────────────────────┐
│ inline-stat + ● Live/    │  ← ✅ LiveDot SSE TETAP (Reconnect label)
│   Reconnect              │
│ [Semua][Pending][Proses] │  ← ✅ 6 chips + count + goto ?f; ✅ indicator «M12»
│ [Sukses][Gagal][Pilih×]  │    (pill geser, transform only, +aria-current)
│ ┌ kartu ────────────┐   │  ← ✅ SwipeRow 80px/Esc/tap-cancel; skin TENANG
│ │ nama + StatusBadge│   │    (bukan sticker — sesuai spec layar padat)
│ │ qty·harga·timeAgo │   │    ✅ «M4» flip + sweep «M3» 1600ms + haptic TETAP
│ │ ⚠ progress bar    │   │    ⚠ order-progress infinite = animasi ke-3/layar,
│ └───────────────────┘   │      langgar budget §2.3 → PUTUSAN: hapus/kurangi
│ [mass bar: n + refund]  │  ← ✅ Pending-only + POST massCancel TETAP
│ empty all: art + 3 pop. │  ← ✅ + maskot fall; empty filter: maskot wave
│ detail Sheet «M5»       │  ← ✅ gradient + Salin/Ulang/Refill(kond)/Batal(kond)
└──────────────────────────┘
DESKTOP: 2 col + hover lift + footer aksi ✅ tetap.
```

---

## 5. SALDO `/saldo` + TOP-UP + RIWAYAT (§6.4)

### 5.1 `/saldo` — momen utama: ⬜ kartu sticker + breathing

```
MOBILE 360
┌──────────────────────────┐
│ ╔ BALANCE dark ════════╗ │  ← ⬜ sticker-dark + «M15» (sekarang gradient + hover-lift)
│ ║ Rp ▓▓▓ «M2»        ║ │    ✅ NumberFlow TETAP; ⚠ blob float + amt-in + progress
│ ╚═════════════════════╝ │      amber = ekstra aditif (bukan plan, OK — jaga budget)
│ [Top Up] [Riwayat]      │  ← ✅ layout mobile/desktop beda TETAP
│ mutasi ×5 + empty art   │  ← ✅ icon+tone legacy + truncate + timeAgo
│ top-up terakhir + ⏳    │  ← ✅ countdown live + pending-pulse + format TETAP
└──────────────────────────┘
```

### 5.2 `/saldo/top-up` — momen utama: ⬜ sheet instruksi + selebrasi gating

```
MOBILE 360 (+ DESKTOP: sidebar sticky kanan ✅)
┌──────────────────────────┐
│ ‹ back + stepper 1-2-3   │  ← ✅ sm-only; ⬜ kulit sticker-sm + aktif «M12»
│ [chip][chip★Populer]…   │  ← ✅ fallback + tick + haptic 8; ⬜ Populer = mango-soft
│ [Rp input lain, min 20k]│  ← ✅ prefix + oninput TETAP
│ kartu BCA + [Salin] «M7»│  ← ✅ rekening + toast + note e-wallet TETAP
│ ringkasan: kode unik +  │  ← ✅ suffixSig + bonus% + total + saldo masuk
│  bonus ★ ⬜marker mango │    ✅ count-up 350ms (nilai sama, reduced=instant)
│ [Bayar → sheet]         │  ← ✅ POST ?/topup + busy + failure toast
│ SHEET «M5»: art + rek + │  ← ✅ auto-open + SuccessTopupArt + QR + warning
│  QR + nominal + warning │    ⬜ QR lazy fade (sekarang scale-pop) + «M13»
│                         │    ⚠ confetti TIAP invoice → ⬜ gate deposit pertama
│                         │    ⬜ maskot peek di sheet
│ sheet Upload Bukti      │  ← ✅ multipart 2MB jpeg/png/webp + disabled + goto
└──────────────────────────┘
```

### 5.3 `/saldo/riwayat` — momen utama: ⬜ summary sticker tilt

```
┌──────────────────────────┐
│ h1 + count + back        │  ← ✅ pill ≥sm / link mobile
│ [Masuk ▓▓][Keluar ▓▓]   │  ← ✅ emerald/ink; ⬜ sticker-sm tilt ±1° berhadapan
│ chips ×5 «M12»⬜         │  ← ✅ legacy mapping + goto ?type; ⬜ indicator spring
│ tabel scroll-x min-560  │  ← ✅ waktu + badge jenis + note 260 + ± TETAP
│ hint geser (mobile)     │  ← ✅; ✅ empty 2 varian + maskot fall (plus, OK)
└──────────────────────────┘
```

---

## 6. LAYANAN `/layanan` (§6.5) — momen utama: ✅ star burst (pertahankan persis)

```
MOBILE 360 (search sticky top-14 blur ✅)
┌──────────────────────────┐
│ [🔍 search + ✕ clear]    │  ← ✅ goto ?q; ✅ clear-X morph (ekstra, OK)
│ [Kategori select] [Sort] │  ← ✅ searchable + paksa-0-saat-fav + ?cat/?sort
│ [★ Favorit (n)]          │  ← ✅ aria-pressed + ?fav=1; ✅ count-bump (ekstra)
│ {n} layanan              │  ← ✅ result count; ✅ shake-once saat 0 (ekstra)
│ ┌ kartu ★ ────────────┐ │  ← ✅ grid 1/2/3 + optimistic + revert
│ │ nama + refill pill  │ │    ✅ star-burst 420ms «M7» JANGAN disentuh
│ └─────────────────────┘ │    ⬜ refill pill = mango-soft (cek ServiceCard, AA)
│ [Muat lebih banyak]     │  ← ✅ page+1 + pending; ✅ skeleton (ekstra, OK)
│ empty: art + ⬜maskot   │  ← ⬜ tambah maskot peek (sekarang shake saja)
└──────────────────────────┘
  ⚠ spotlight-hover + extras lain aditif & di-guard — pertahankan, bukan prioritas.
```

---

## 7. AFFILIATE `/affiliate` (§6.6) — momen utama: ⬜ profit marker + share

```
┌──────────────────────────┐
│ ╔ KOMISI dark ═════════╗ │  ← ⬜ sticker-dark; ✅ NumberFlow + downline + kode
│ ║ Rp ▓▓▓ ⬜«M11»      ║ │    + withdrawn + 3 state (requested/canWithdraw/min)
│ ║ [Tarik] / ring / info║ │    ✅ progress-ring (ekstra, OK)
│ ╚═════════════════════╝ │
│ [link readonly + Salin] │  ← ✅ morph «M7» + Share fallback + toast
│  ⚠ confetti saat copy   │    ⚠ plan: withdraw = «M13» SAJA (uang pending approval,
│                         │      jangan lebay) → PUTUSKAN: cabut confetti-copy
│ [QR img]                │  ← ✅ key re-reveal + hover tilt (ekstra, OK)
│ empty downline + share  │  ← ✅ art TETAP; ⬜ withdraw sukses + «M13»
│ notice amber + footer   │  ← ✅ trust notice TETAP
│ modal withdraw custom   │  ← ✅ backdrop/busy/POST ?/withdraw/aria TETAP
└──────────────────────────┘
```

---

## 8. TIKET `/tiket` (§6.7) — momen utama: ✅ thread chat (paling sesuai plan)

```
LIST + DETAIL (back noScroll ✅)
┌──────────────────────────┐
│ kartu: avatar violet +  │  ← ✅ subject + msgs + last + badge 3 status
│  subject + badge        │    ✅ goto ?ticket keepFocus/noScroll + empty + error
│ [+ form buat tiket]     │  ← ✅ subject + rows4 + reset + toast
├──────────────────────────┤
│ ⬅ admin: bubble kiri   │  ← ✅ amber "Tim Socio.id" + stagger 45ms «M9»
│ ➡ Anda: bubble kanan   │  ← ✅ + pre-wrap + timestamp
│  ⚠ slide 450ms L/R      │    plan minta scale-in 200ms «M5» — varian sejiwa;
│  ⚠ Answered pulse ∞     │    PUTUSAN: selaraskan 200ms + cabut/lembutkan pulse
│ [balas rows3] [Tutup]   │  ← ✅ POST reply + ghost close + Closed info
│ ✅ typing-dots kirim    │  ← ✅ di state kirim (jujur, bukan fake) — pertahankan
└──────────────────────────┘
```

---

## 9. NOTIF `/notif` & AKUN `/akun` (§6.8)

### 9.1 `/notif`

```
┌──────────────────────────┐
│ h1 + [Tandai dibaca]    │  ← ✅ markAll optimistic + toast
│ chips ×6 «M12»⬜         │  ← ✅ goto ?type; ⬜ indicator spring (masih bg-switch)
│ ● item unread + dot «M7»│  ← ✅ border/bg primary + dot-settle + line-clamp-2
│   ✅ count-pill mango    │    + klik optimistic → POST read → goto actionUrl
│ ⚠ SwipeRow mobile       │  ← ⚠ FITUR BARU di luar plan (Hukum #1) → PUTUSAN:
│                         │    revert ATAU minta approval + catat matriks
│ ⚠ haptic ganda tap      │  ← ⚠ 10 (open) + 8 (markRead) → rapikan jadi 1
│ empty: art + ⬜maskot   │  ← ⬜ tambah maskot peek
└──────────────────────────┘  lg:grid-cols-2 ✅ + $effect SSR anti-CLS ✅
```

### 9.2 `/akun`

```
┌──────────────────────────┐
│ (ava pop «M1»⬜) + nama  │  ← ✅ upload POST ?/avatar + cache-bust + fallback
│ Lv badge shine + @user  │    + pencil + overlay; ✅ avatar-pop (ekstra, OK)
│                         │    ⬜ level + marker «M11» (shine 900ms tetap)
│ kartu saldo gradient    │  ← ✅ TETAP (bukan momen utama di sini)
│ ledger editMode ×4:     │  ← ✅ profile/password+strength/apikey+ConfirmDialog
│  profil · password ·    │    + tema segmented Light/Dark instan ✅
│  apikey · tema «M12»⬜  │    ⬜ segmented pakai indicator spring (masih bg-switch)
│                         │    ✅ theme-morph ikon (ekstra, OK)
│ nav 6 chip + Keluar     │  ← ✅ + logout ConfirmDialog → POST /logout → /login
│  ⬜ sticker-sm ikon      │    ⬜ «M1» + ikon dalam lingkaran sticker-sm
└──────────────────────────┘  ✅ row-slide stagger (dead code → dipakai) + mobile scroll-x
```

---

## 10. ERROR/404 + AUTH (§6.9–6.10, ringan)

```
404/`+error.svelte` (app): ⬜ maskot fall «M10» + copy human
  ("Waduh, halaman ini terbang entah ke mana.") + [Kembali] [Dashboard].
  ⚠ BELUM diverifikasi di audit — cek keberadaan file saat eksekusi.
Auth 5 halaman (F6 ✅ SELESAI, fungsi nol sentuh):
  ✅ maskot wave (login/daftar/lupa/reset) + fly (verifikasi-ok)
  ✅ toggle Member/Reseller spring + mode pop + strength pop + morph + error pop
  ✅ lupa confetti saat link terkirim; Turnstile/zxcvbn/caps/rate-limit untouched
  ⬜ SAMAKAN easing segmented ke «M12» + marker mango benefit reseller (§6.10 tipis)
```

---

## 11. Daftar putusan user (akumulasi — jawab sebelum/dengan eksekusi)

| # | Item | Sumber | Status |
|---|---|---|---|
| P-1 | `order-progress` infinite di pesanan | §4 audit | ✅ SELESAI F4 — jadi determinate dari remains/qty (live via SSE) |
| P-2 | `Answered` pulse infinite di tiket | §8 audit | ✅ SELESAI F6 — dibatasi 3× lalu diam; bubble slide dipertahankan |
| P-3 | SwipeRow + haptic ganda di notif | §9.1 audit | ✅ SELESAI F6 — SwipeRow DI-APPROVE (berguna, aditif) + haptic jadi 1× |
| P-4 | Confetti tiap invoice top-up + tiap copy affiliate | §5.2/§7 audit | ✅ SELESAI F5/F6 — gate `socio-celebrated-*`, confetti-copy dicabut |
| P-5 | Token `mango-*` → `pop-*` + alias | AD-1 (sudah YA) | ✅ SELESAI F0 |
| P-6 | Copy rewrite playful (key identik) | AD-4 (sudah YA) | ✅ SELESAI F1 (53/53 key identik) |
| P-7 | Step indicator pesan, skeleton-skeleton, spotlight, count-bump, dsb (ekstra aditif) | audit | ✅ PERTAHANKAN (tidak merusak) |
| P-8 | Baseline screenshot 11 route × 2 vp × 2 tema | F0 (hilang) | ⬜ Buat ulang di staging (DB dev down) |

---

## 12. Catatan eksekusi untuk agent berikutnya

1. Mulai dari §11 P-5 + P-6 (foundation, additive, nihil visual change) → verifikasi
   `pnpm --filter app lint && typecheck && build` + key-count `copy.ts` identik.
2. Lalu F2 shell (§1): M12 BottomNav/Sidebar/chips + bell ring + grabber + toast M13 + maskot sidebar.
3. Lalu per layar §2–§9, SATU layar = satu verifikasi (screenshot before/after + matriks §9 plan).
4. Budget check tiap layar: `grep` infinite animations ≤2, sticker besar ≤2, maskot ≤1.
5. `git diff --name-only` tiap fase: tidak boleh ada `*.server.ts` / `packages/core/*` kecuali `copy.ts`.
6. Uncommitted saat dokumen ini ditulis: `landing/.../TestiLedgerMotion.svelte` ( polaroid dihapus —
   kerjaan landing terpisah, JANGAN campur ke commit app).
