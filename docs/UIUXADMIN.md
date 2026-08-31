# UIUXADMIN.md — Admin UI/UX Upgrade Plan (Desktop + Mobile)

> **Untuk: coding agent frontend.** Upgrade tampilan + experience SEMUA 16 halaman admin
> `(admin)/admin/*` (SvelteKit + Svelte 5 + Tailwind v4 + @socio/ui).
> Fungsi sudah 100% E2E lulus (audit v2). Dokumen ini murni **presentation layer upgrade** —
> TIDAK mengubah action/server logic, TIDAK menambah fitur fungsional baru di luar daftar ini.
>
> **Baca dulu**: `AGENTS.md`, `ADMIN_DESIGN_PLAN.md`, `docs/MOBILE_UX_GUIDE.md`, `DESIGN.md`.
> Kalau ada kontradiksi → tanya user, jangan asumsi.

---

## 0. Vision — "Panel yang dipercaya uang berlimpah"

Admin socio.id bukan panel PHP abu-abu. Ini **mission control** tempat admin mengoperasikan
bisnis SMM dengan jutaan rupiah berputar — tampilannya harus terasa seperti alat finansial
modern: **Linear** (kecepatan & density), **Stripe Dashboard** (kejelasan data uang),
**Vercel** (status & realtime). Setiap piksel harus mengkomunikasikan: *sistem ini akurat,
lengkap, dan aman*.

**3 pillar upgrade:**

1. **Calm density** — banyak data, tapi lega. Table row 44px, section gap 24px, hierarchy
   lewat tipografi (bukan border warna-warni). Angka pakai `tabular-nums` + Sora — angka
   adalah warga kelas satu di panel uang.
2. **Responsive motion** — animasi harus *menjawab* interaksi (hover, tap, update data),
   bukan dekorasi. Semua motion `transform/opacity` only, 120–400ms, dan langsung mati saat
   `prefers-reduced-motion`.
3. **Art & empty states yang authored** — setiap modul punya SVG scene sendiri (bukan
   placeholder abu). Empty state = momen onboarding admin baru, bukan dead end.

---

## 1. Tech Stack Motion & Art (baru, tetap ringan)

Stack final TIDAK berubah (SvelteKit/Tailwind/Drizzle). Yang ditambah HANYA untuk
presentation layer:

| Tech | Ukuran | Fungsi | Kapan dipakai |
|---|---|---|---|
| **`motion` (motion.dev, `motion/svelte`)** | ~5–18KB tree-shaken | spring physics value, `animate()`, stagger, in-view, press scale | Stat counter tween, chart draw-in, list stagger, press feedback |
| **`svelte/transition` + `svelte/easing`** | 0 (built-in) | `crossfade` list rows, `fly` drawer/sheet, `scale` dialog, `flip` reorder | Row add/remove, drawer, dialog, filter chip reorder |
| **View Transitions API** | 0 (native) | sudah aktif global; per-route name halus | Navigasi antar halaman admin (slide halus 160ms) |
| **CSS scroll-driven animations** | 0 (native) | `animation-timeline: scroll()/view()` — sticky header elevation, progress bar, row reveal saat masuk viewport | Long list (services/users/orders), audit page |
| **Custom SVG art system** (`AdminArt.svelte`) | 0 (inline SVG) | empty states, heatmap, success draw-in, grid-dot/mesh dekorasi | Empty state, reporting, confirm dialog sukses |

**DILARANG**: GSAP (~70KB), Lottie/`lottie-web` (~60KB — pakai SVG animated inline),
anime.js, framer-motion (React-only). Admin panel = productivity tool; setiap KB JS harus
membayar dirinya dengan kecepatan.

Install:

```bash
pnpm --filter app add motion
```

---

## 2. Design Contract Admin (design tokens — tambahan di `packages/ui/src/tokens.css`)

Admin pakai token yang SAMA dengan user app (konsistensi sistem), tapi punya
**density & elevation layer** sendiri. Tambahan token:

```css
@theme {
  /* Density admin */
  --spacing-row: 44px;        /* table row height desktop */
  --spacing-row-tight: 36px;  /* table row mobile */
  --text-table: 13px;         /* table body */

  /* Motion — satu sumber kebenaran */
  --ease-out-soft: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-spring: linear(0, 0.0089 0.79%, 0.3316 3.77%, ...); /* spring approx */
  --dur-micro: 140ms;   /* hover, focus, press */
  --dur-macro: 260ms;   /* drawer, sheet, dialog */
  --dur-page: 380ms;    /* view transition, chart draw */
  --dur-stagger: 45ms;  /* antar item list */
}

/* Dark mode admin — elevation bukan abu flat */
html.dark {
  --color-surface: var(--color-ink-900);
  --color-ink-50: var(--color-ink-950);  /* page bg */
  --color-ink-100: var(--color-ink-800); /* border */
}
```

Aturan warna admin (light first, AA 4.5:1):
- **Ink** untuk 95% UI. Warna brand hanya untuk: state status (success/warning/danger),
  active nav indicator, dan 1 aksen hero per halaman (dashboard revenue).
- **Accent-filled surface** (button danger, badge "Aktif", recommended stripe) wajib
  `--accent-ink` (L 0.42–0.48) untuk teks di atasnya — cek AA di rest + hover.
- Status color PENTING untuk uang: success = uang masuk, warning = menunggu konfirmasi,
  danger = refund/tolak. Konsisten di SEMUA tabel (kolom selalu sama warna untuk state sama).

Tipografi:
- Angka uang & qty: `font-display` (Sora) + `tabular-nums` + `tracking-tight`.
- Page title: `text-xl font-display font-extrabold lg:text-2xl`.
- Subtitle halaman: `text-sm text-ink-500` — 1 kalimat, selalu ada.
- Label tabel: `text-[11px] font-bold uppercase tracking-wide text-ink-400`.

---

## 3. Global Shell — Desktop & Mobile

### 3.1 Desktop (≥1024px)

```
┌─────────┬──────────────────────────────────────────┐
│ Sidebar │ Topbar 24px: breadcrumb · Cmd+K · notif · admin chip
│ 256px   ├──────────────────────────────────────────┤
│ sticky  │ Content max-w-7xl, py-8 px-8              │
│         │ (page header → stats → filter rail → data) │
└─────────┴──────────────────────────────────────────┘
```

Upgrade sidebar:
- **Active indicator pill** — bukan full bg ink-900: `::before` 3px rounded bar accent di
  kiri + bg `ink-100/60`, transisi `slide` 140ms saat pindah (motion yang menjawab
  navigasi). Icon active `stroke=2.4`.
- Hover: bg `ink-50`, icon translate-x `0.5px` — halus, bukan loncatan.
- Section "Kelola" & "Konten & Sistem" diberi micro-label `text-[10px] uppercase tracking-widest text-ink-300`
  (primary vs moreNav sekarang cuma garis — label lebih scannable).
- Admin chip bawah sidebar: avatar + `@username` + role badge, bukan cuma link "Kembali ke App".

### 3.2 Mobile (<1024px)

Keep: floating glass dock 7-slot (sudah premium). Upgrade:
- **Command palette tetap tersedia** — FAB tidak perlu; akses via topbar search icon.
- **Pull-to-refresh** di halaman data (orders, deposits, dashboard) — SVG spinner draw-in,
  haptic saat trigger. Implement: overscroll `touch-action` + `translateY` spring.
- **Bottom sheet snap points** — detail row (order/user) buka sheet di 60vh, drag handle
  bisa ditarik ke 90vh (full). `svelte/transition fly` + drag gesture via `motion`.
- **Filter chips rail sticky** di bawah topbar — horizontal scroll, `scrollbar-none`,
  active chip bg ink-900 text-white.

### 3.3 Command Palette (⌘K / Ctrl+K) — micro-fitur global

Bukan fitur bisnis baru, tapi navigasi cepat standar panel pro (Linear/Stripe punya):
- Trigger: `Ctrl/⌘+K` atau klik search field di topbar.
- Isi: navigasi (16 menu), quick search user/username, quick search order id, aksi cepat
  ("approve deposit pending terakhir", "toggle maintenance").
- UI: dialog center, `input` autofocus, hasil group "Halaman / Aksi / Pencarian",
  keyboard `↑↓ Enter Esc`, fuzzy match sederhana.
- Mobile: trigger lewat icon search di topbar (k adbypass keyboard shortcut).

---

## 4. Motion System (aturan pakai — semua halaman)

Tier & budget:

| Tier | Durasi | Properti | Contoh |
|---|---|---|---|
| Micro | 120–160ms | transform, opacity | hover, press, focus ring, chip toggle |
| Macro | 240–300ms | transform | drawer, sheet, dialog open/close |
| Page | 300–380ms | opacity, clip | view transition, chart draw-in, stagger list |
| Ambient | 2–3s loop | opacity, scale kecil | "Live" badge pulse, skeleton shimmer |

Pola wajib:
1. **Enter stagger** — list/table body: item masuk `[0,45,90,...]ms` delay, `fly:fade-105`
   140ms. Max 8 item distagger (sisanya langsung) — jangan bikin halaman terasa lambat.
2. **Press feedback** — semua button: `active:scale-[0.97]` + haptic 10ms (mobile).
   Pakai `<Button>` dari @socio/ui (sudah ada).
3. **Data change = animasi** — angka stat berubah → tween counter (motion spring,
   500ms, format id-ID tetap). Tanpa ini, update data terasa "mati".
4. **Skeleton → content** — crossfade 200ms, JANGAN content pop-in. Skeleton shape HARUS
   match layout asli (table skeleton = row bars, stat = number bar).
5. **Row exit** — order/deposit/user dihapus/di-approve → `fly:fade-105 x=-24` + row
   bawah slide naik (flip), 200ms. Data leaving harus terasa.
6. **Dialog success** — confirm aksi berhasil → icon check draw-in (stroke-dashoffset
   600ms) + toast 2.5s.
7. **Reduced motion** — semua di atas mati (`transition-duration: 0.001ms`), TETAP
   tampilkan state final. Sudah ada global rule di theme.css — jangan override.

Contoh motion/svelte untuk stat tween (menggantikan tweenNumber custom):

```svelte
<script>
  import { spring } from "motion/svelte";
  const value = spring(0, { stiffness: 80, damping: 18 });
  $effect(() => { value.set(revenue); });
  // render: $derived(rupiah(value.get())) — format Rp saat get
</script>
```

---

## 5. SVG Art System (`packages/ui/src/components/AdminArt.svelte`)

Satu komponen, prop `scene` + `tone`. Semua inline SVG, stroke 1.75 match icon system,
viewBox konsisten 120×120. Scene per modul (empty state + success):

| Scene | Visual | Dipakai di |
|---|---|---|
| `users` | Dua siluet avatar + kartu profil melayang, grid-dot bg | Users empty |
| `orders` | Receipt zigzag + status badge check | Orders empty |
| `deposits` | Dompet + koin jatuh (3 frame float loop) + jalur arrow | Deposits empty |
| `services` | Katalog stack (3 kartu offset) + tag harga | Services empty |
| `pricing` | Tag harga + tangga persen (steps naik) | Pricing helper |
| `coupons` | Tiket sobek + label persen | Coupons empty |
| `tickets` | Chat bubble + tanda seru resolve | Tickets empty |
| `providers` | Plug + dua kabel terhubung + sinyal bar | Providers empty |
| `reporting` | Area chart naik + crosshair | Reporting empty |
| `affiliate` | Node tree 3 level + komisi koin | Affiliate empty |
| `banners` | Frame landscape + megaphone | Banners empty |
| `news` | Newspaper + headline bar | News empty |
| `email` | Amplop terbuka + spark send | Email empty |
| `audit` | Perisak + jejak log (garis dotted) | Audit empty |
| `search-none` | Kaca pembesar + tanda tanya | Hasil pencarian 0 (SEMUA modul) |
| `success` | Check besar draw-in + ring | Confirm dialog sukses |

Struktur file:
```
packages/ui/src/components/AdminArt.svelte   (switch scene, 120×120)
```
Gaya: outline icon-style (match Icon.svelte), 1 aksen warna per scene dari token status
(safe tone), grid-dot pattern bg `fill="currentColor" opacity="0.08"`. Animasi CSS
saja (float 3s, dashoffset draw) — reduced-motion safe otomatis via global rule.

EmptyState component di-upgrade: `art` prop (default `search-none`), title, desc, action
button. Copywriting lihat §7.

---

## 6. Komponen Upgrade (packages/ui + admin shared)

### 6.1 Table (desktop) — "Stripe grade"
- Sticky `<thead>` + elevation shadow saat scroll (scroll-driven CSS).
- Row hover `bg-ink-50/60` + actions (edit/hapus) fade-in `opacity-0→1` 120ms — aksi
  selalu ada di DOM untuk keyboard/a11y, hanya visual hide.
- Sort header (users/orders/reporting): icon arrow, sort state di URL param (`?sort=-created`).
- Angka uang rata kanan, status badge dengan dot warna + label.
- Row click → drawer (desktop) / sheet (mobile). Stop-propagate di tombol aksi.

### 6.2 Card-list (mobile) — bukan table dipipihkan
- Card: `rounded-2xl border border-ink-100 bg-surface p-3.5`, hierarchy: baris 1 (judul
  + status badge), baris 2 (data kunci grid 2 kolom), baris 3 (aksi pill ghost).
- **Swipe-left** reveal aksi (deposits: approve/tolak; orders: detail/refill) — bg action
  di belakang card, spring return.
- Long-press → haptic + context sheet (salin ID, detail, tiket).

### 6.3 Bulk selection (users, orders, services)
- Checkbox kolom kiri (muncul saat ≥1 tercentang: header checkbox state all/partial).
- Floating bulk bar bottom-center desktop / full-width atas dock mobile:
  "3 dipilih · [Approve] [Tolak] [Hapus] [Batal]" — spring masuk dari bawah.
- Semua bulk action tetap lewat existing action endpoint (bisa loop / tambah action bulk
  di server jika sudah ada bulk update harga pattern).

### 6.4 Drawer (desktop) & Sheet (mobile) — konsisten
- Width 420px desktop, snap 60/90vh mobile. Backdrop `bg-ink-900/40 backdrop-blur-[2px]`.
- Header: judul + badge status + close. Body: definition list `dt` ink-400 / `dd` ink-900
  font-medium. Footer sticky action row.
- Open: `fly x=32` 260ms + backdrop fade. Close: reverse 200ms.
- Deep-link `?id=` dipertahankan (orders pattern) — back button menutup, bukan pindah halaman.

### 6.5 ConfirmDialog — konsekuensi jelas
- Struktur: title pertanyaan · body 1–2 kal consequence APA YANG TERJADI · danger/normal.
- Label button konfirmasi = verb spesifik (sudah bagus — keep "Ya, Update Harga" pattern).
- Success: swap body → `AdminArt success` draw-in 600ms, auto-close 900ms, toast tetap keluar.

### 6.6 Toast — result + data
Format copy: `<Aksi> <objek>. <Dampak data>.` Contoh: "Deposit #1974 di-approve. Saldo
@rismayadi +Rp150.000." Destructive toast (hapus) → tombol **Undo** 5 detik jika
operasi reversible (news/banner/coupon) — progress bar tipis di bawah toast.

### 6.7 Filter & Search bar (semua halaman data)
- Sticky rail: search (icon + input, `s` shortcut sudah ada) + chips status + sort dropdown.
- Active filter → chip bg-ink-900 + tombol "Reset" muncul `fade` 140ms.
- Search result count live: "42 hasil · 'rismayadi'" — feedback bahwa query bekerja.

### 6.8 Stat header per halaman (replace generic card strip)
- BUKAN 4-col stat strip generik (anti-pattern `looks-expensive` §6.0.2). Pattern:
  **inline-stat row** — 3–4 angka dalam satu baris flex dengan divider hairline, angka
  Sora bold + label kecil + delta % (naik hijau/turun merah, icon arrow 12px).
- Dashboard tetap boleh hero revenue besar (Pattern 6 single hero stat) + sparkline.

---

## 7. Copywriting — Bahasa Admin (ID/EN mix, asal tepat)

Prinsip (keputusan bahasa user: campur ID/EN, teknis/istilah industri EN, kata umum ID):

1. **Judul halaman = nama modul + konteks angka**. "Orders — 12 pending, 3 perlu refund".
   Subtitle = 1 kalimat value: "Approve, refund, dan trace setiap pesanan end-to-end."
2. **CTA = verb + objek, spesifik.** "Approve Deposit" > "OK". "Tambah Kupon" > "Submit".
   Danger CTA selalu eksplisit: "Ya, Hapus Kupon", "Tolak Deposit".
3. **Angka adalah pesan utama.** Rp format `id-ID` (Rp150.000), USD $3.95, qty 1.000.
   Uang selalu dengan currency. Delta: "+12,4% minggu ini".
4. **Empty state = judul nyata + 1 kalimat aksi + CTA.** Bukan "No data".
   Contoh: "Belum ada kupon / Buat kupon pertama untuk dorong repeat order. / [Buat Kupon]".
5. **Toast/feedback = apa yang berubah di dunia.** "Saldo @user +Rp250.000. Log audit
   tercatat." bukan "Sukses!".
6. **Tone: tenang, operasional, tanpa hype.** Admin = alat kerja. Tanpa emoji di UI
   (emoji hanya jika data legacy user-generated, mis. konten berita lama).
7. **Label konfigurasi pakai istilah industri**: markup, refill, start count, partial,
   webhook, queue, cron. Tidak diterjemahkan paksa.
8. **Waktu relative untuk feed** ("2 jam lalu"), **absolut untuk audit/uang**
   ("30 Agu 2026, 14.02 WIB") — uang butuh timestamp yang bisa dibandingkan.

### Microcopy per interaksi
- Loading: "Memuat orders…" (bukan spinner tanpa konteks di full page).
- Saving: button berubah "Menyimpan…" 300ms+ → selesai.
- Error form: per-field, kalimat solusi: "Min. 1.000 (min layanan). Naikkan jumlah."
- Live feed: badge "Live" dot pulse + "baru" tag 60 detik pertama.
- Rate limited: "Terlalu cepat. Tunggu 30 detik lalu coba lagi."

---

## 8. Per-Halaman Spec (16 halaman)

> Format tiap halaman: **Header hero** (title/sub/stat) · **struktur** · **motion** ·
> **mobile** · **copy kunci**. Warna aksen halaman = token yang ada, jangan warna baru.

### 8.1 Dashboard `/admin` — "Command Center"
- **Hero**: revenue hari ini Sora `text-3xl` tween spring + delta % vs kemarin + sparkline
  area gradient (draw-in path 700ms). Inline-stat row: orders hari ini · pending deposit ·
  tiket open · user baru (divider hairline, no card).
- **Live feed** (kanan desktop / bawah mobile): filter chips, item enter `fly y=8`,
  "baru" badge pulse. SSE real update → item prepend crossfade + haptic ringan.
- **Queue health strip**: 3 tile (sync/polling/queue) dgn status dot warna + `ago`
  hover-tooltip detail — bukan card besar.
- **Quick actions row** (baru, navigasi bukan fitur): "Approve deposit (3)" ·
  "Balas tiket (2)" · "Audit terbaru" — pill link ke modul, count badge live.
- Mobile: hero → quick actions → feed (collapsible per tipe).

### 8.2 Users `/admin/users`
- Hero: inline-stat (total · aktif 7d · suspended · baru minggu ini) + search fokus `s`.
- Table: avatar+username+level badge · saldo (tabular) · last order · status · aksi
  (hover reveal: detail, edit saldo, suspend).
- Row click → drawer: profil lengkap, balance_logs mini timeline (5 terakhir), aksi
  utama footer (Adjust Saldo — form + alasan wajib, Suspend/Unsuspend, Lihat Orders).
- Adjust Saldo = form di drawer (bukan dialog kecil): amount +/- toggle, reason textarea,
  preview saldo hasil, konfirmasi eksplisit nominal.
- Empty/search-none art `users`/`search-none`.
- Mobile: card-list + swipe → suspend; bulk selection untuk broadcast-target nanti.

### 8.3 Orders `/admin/orders`
- Hero: inline-stat (hari ini · pending · processing · success rate) + filter status chips.
- Table: id+service+user · qty · start/now counts (progress bar tipis 2px di bawah angka) ·
  status badge · waktu · aksi hover (detail, update status, edit provider).
- Progress count = **mini bar** (width % = now/start→qty, accent gradient) — glance
  progress tanpa baca angka. Ini domain-specific visual SMM.
- Drawer detail (deep-link `?id=`): timeline status (dot + line, item terakhir pulse),
  provider info, refund action, link order.
- Update status → row badge crossfade warna + tween jika angka berubah.
- Mobile: card dgn progress bar, chips filter sticky, sheet detail + timeline.

### 8.4 Deposits `/admin/deposits`
- Hero: pending count besar (jika >0, warning tone + "perlu review") + inline-stat
  (hari ini, total minggu, tolak minggu ini).
- Table: user+method · amount (bold Sora) · time · status · aksi hover (Approve, Tolak,
  Detail). Pending row: bg `warning-soft/30` tint halus + border kiri 2px warning —
  urutan pending DULU (sort default).
- Approve/Tolak → confirm dialog (copy konsekuensi saldo) → row exit animation +
  toast impact ("Saldo @x +Rp150.000").
- Mobile: card + **swipe kanan approve / kiri tolak** (paling sering dipakai admin mobile),
  bulk approve bar.
- Copy tolak: alasan wajib (select: bukti tidak jelas / nominal beda / sudah kadaluarsa /
  lainnya) → masuk audit log.

### 8.5 Services (Layanan) `/admin/services`
- Sticky search + kategori chips + sort (termurah/terbaru). Virtual list (6k+ item) —
  `content-visibility: auto` + `contain-intrinsic-size` per row, scroll-driven reveal
  fade tiap 8 row.
- Row: nama (truncate 1 line) · kategori badge · price internal · min–max · status toggle
  inline (pill, bukan di drawer) — toggle langsung tanpa dialog (bisa undo toast).
- Bulk: checkbox → floating bar "Hapus / Nonaktifkan / Update Harga" (existing bulk
  pricing action dipertahankan, tambah visible feedback count).
- Empty `services` art + "Impor dari provider" link ke Providers.

### 8.6 Pricing (Harga) `/admin/pricing`
- Kalkulator hero (sudah bagus — upgrade): hasil markup angka tween, badge level
  terpilih, contoh layanan nyata dropdown (bukan hardcoded).
- Rules table: level · markup % · flat/1k · min profit · status · aksi.
- Edit inline (row → form inline expand) + draw-in; save → row flash success 400ms.
- "Terapkan default" & "Copy markup Member" → confirm dengan preview diff count.
- Mobile: kalkulator collapsible atas, rules card-list, edit via sheet.

### 8.7 Coupons (Kupon) `/admin/coupons`
- Hero: aktif count · terpakai minggu ini · inline-stat hemat/pendapatan.
- Table: kode (mono, copy icon click→toast "Kode disalin") · tipe/nilai · periode ·
  terpakai/kuota progress mini bar · status · aksi.
- Form create (dialog desktop/sheet mobile): live preview kartu kupon (brand moment kecil)
  — kode, nilai besar, periode; submit → kartu masuk list fly.
- Empty art `coupons`: "Belum ada kupon. / Buat kupon pertama untuk dorong repeat order. / [Buat Kupon]".

### 8.8 Tickets `/admin/tickets`
- Hero: open count (pulse jika ada baru <5m) · avg response · resolved minggu ini.
- List: dua kolom desktop (thread list kiri 360px + conversation kanan) — seperti email
  client, bukan table. Mobile: list → tap → full sheet conversation.
- Thread list row: user · subject · snippet terakhir · time relative · status badge ·
  unread dot admin-belum-balas.
- Conversation: bubble chat (admin kanan accent-ink fill putih text, user kiri surface),
  enter timeline system event (closed/reopened) sebagai divider kecil. Textarea sticky
  bawah + "Kirim" (existing). Typing indicator tidak perlu (tanpa realtime peer).
- Reply → bubble masuk `fly y=8` + haptic; status auto "answered" pill di list.
- Empty `tickets`.

### 8.9 Providers `/admin/providers`
- Card grid 2-col (bukan table — data provider sedikit, card lebih tepat):
  nama+badge aktif · api url mono truncate · saldo USD (Sora) + terakhir sync status pill.
- Tombol: Sync (primary pill) · Tes (ghost, hasil → toast balance live + audit) · Edit
  (ghost icon). Test running → spinner di tombol + dot pulse di card.
- Sync log timeline kecil di bawah card (expand): 5 entri terakhir ok/error.
- Mobile: card stack, aksi icon row.

### 8.10 Reporting `/admin/reporting`
- Range selector pill (7d/30d/90d/custom) — URL param, view transition saat ganti.
- **Area chart** revenue (custom SVG atau LayerChart sesuai plan): gradient fill accent,
  draw-in path 700ms, hover crosshair + tooltip value/price, touch drag mobile.
- **Bar chart** orders/day, stacked status color (pending/proses/success) — legend chips.
- **Heatmap kontribusi-style**: user aktif per hari (7×15 minggu) — empty = ink-50, density
  = accent; hover tooltip "Sel, 24 Agu — 128 user aktif".
- Insight strip (auto, teks kecil): "Pemasukan naik 12,4% vs minggu lalu. Layanan IG
  Followers turun 3% — cek katalog provider." — dihitung server, render max 3 bullet.
- Export CSV tetap (tambah feedback progress toast). Empty art `reporting`.

### 8.11 Affiliate `/admin/affiliate`
- Hero: komisi dibayar bulan ini · pending payout · top affiliate minggu ini (@username).
- Table: user · klik referral 30d · konversi % (mini bar) · komisi akumulasi · aksi
  (detail, payout manual).
- Drawer detail: referral link (copy), timeline komisi, grafik mini sparkline klik.
- Empty `affiliate`.

### 8.12 Banners `/admin/banners`
- Grid preview card: **tampilkan banner sebagai thumbnail nyata** (rasio sesuai posisi,
  overlay schedule + status pill + sort handle). Bukan table teks.
- Create/edit dialog: form + **preview live** di kanan (paket data sama seperti yang
  dilihat user) — tambilkan promo banner component asli. Toggle aktif inline.
- Sort: drag handle desktop (flip animasi reorder), arrow up/down di mobile.
- Empty `banners` + tips: "Banner aktif maksimal 2 di dashboard — sisanya jadwal."

### 8.13 News (Berita) `/admin/news`
- List card: kategori pill · konten snippet 2 baris · tanggal · aksi. Pinned/recommended
  ikut existing kategori.
- Create form: editor teks polos (textarea) + **counter karakter 160** (notif broadcast
  cut-off) + preview NotifBell (angle user). Peringatan copy: "Broadcast otomatis ke
  NotifBell semua user aktif saat simpan."
- Empty `news`.

### 8.14 Email `/admin/email`
- Hero: queue health (pending/failed count, failed >0 → warning tone + link filter
  failed) · sent 30d · open rate kecil.
- Campaign list: judul · segment · stats inline (sent·open·click dengan icon 12px) ·
  status pill · aksi (Kirim, Batalkan, Hapus — existing).
- Create dialog (existing): tambah **preview template** (render subject+body, dark/light
  toggle kecil) + send-time estimate "±{n} menit via queue".
- Kirim → status pill "Scheduled" + progress bar kecil kirim di card (poll data) + toast.
- Empty `email`.

### 8.15 Audit Log `/admin/audit`
- Filter rail: action select (existing labels) · admin select · range date · entity search.
- Timeline list (bukan table): kolom kiri timestamp mono `13px`, kanan: action badge
  warna kategori (user/deposit/system/provider) + deskripsi + admin chip + detail
  expandable (chevron → JSON key-value pretty, mono 12px).
- Row enter reveal scroll-driven. Sticky date separator ("Hari ini" / "Kemarin" /
  tanggal) — glance kapan.
- Empty `audit` + copy "Semua aksi admin tercatat di sini. Belum ada aktivitas pada
  filter ini."

### 8.16 Settings `/admin/settings`
- Section card stack dengan anchor nav kiri (desktop): Sistem · Pricing · Roles · Toggles
  (scroll-spy highlight active — scroll-driven).
- Maintenance toggle: **peringatan visual saat ON** — banner top merah semi di semua
  halaman admin "Maintenance aktif — user diblokir. [Matikan]" (admin kadang lupa
  mematikan; ini pain point nyata).
- Setiap toggle → row flash + toast; pricing rules section = link ke /admin/pricing
  (jangan duplikat form).
- RBAC roles: table role · permission matrix checklist — read-only dulu (RBAC enforcement
  dropped by user, tampilan tetap informatif).

---

## 9. A11y & Perf Budget (hard requirements)

- **AA contrast 4.5:1** semua teks, terutama accent-filled (button danger, badge aktif).
- **Focus visible** semua interaktif: `focus-visible:ring-2 ring-primary/40` — jangan
  hilangkan default browser tanpa pengganti.
- Keyboard: `s`/`/` search, `?` help, `j/k` paging, `g h/u/o/a` quick nav (sudah ada —
  dokumentasikan di help overlay), `⌘K` palette, `Esc` tutup semua layer.
- `aria-current="page"` nav aktif; dialog `role=dialog aria-modal` + focus-trap (pattern
  existing ConfirmDialog); swipe action punya tombol duplikat (jangan swipe-only).
- Reduced-motion: semua animasi mati, state final tetap (global rule theme.css).
- **Lighthouse** (auth-gated — pakai login flow dev): Performance ≥90, A11y ≥95.
- Bundle admin: JS route +common ≤180KB gzip; `motion` harus tree-shake (import per-fitur).
- Virtual list 6k services: first paint ≤30 rows; `content-visibility: auto` table lain.
- Image: banner preview `loading="lazy"`, `srcset` tidak perlu (admin CDN tunggal).

---

## 10. Urutan Implementasi (phase, komit per phase)

| Phase | Scope | Deliverable |
|---|---|---|
| **P0** | Fondasi: install `motion`, motion tokens (dur/easing), `AdminArt.svelte` 16 scene, EmptyState upgrade (art prop), Button press feedback | tokens + komponen, lint/test lulus |
| **P1** | Global shell: sidebar indicator + section label + admin chip, topbar (search icon → ⌘K), command palette, mobile pull-to-refresh + snap sheet, maintenance warning banner | layout commit |
| **P2** | Data pages: dashboard (hero tween + live feed + queue strip), orders (progress bar + drawer timeline), deposits (pending priority + swipe + alasan tolak), users (drawer + adjust form) | 4 halaman |
| **P3** | Katalog & operasi: services (virtual + toggle inline + bulk bar), pricing (kalkulator + inline edit), coupons (preview card), tickets (2-pane conversation), providers (card grid + log) | 5 halaman |
| **P4** | Analitik & konten: reporting (chart + heatmap + insight), affiliate, banners (grid preview + drag sort), news (counter + preview), email (preview template + progress), audit (timeline + expand), settings (anchor nav) | 6 halaman |
| **P5** | Polish pass: dark mode audit semua halaman, keyboard full-flow, reduced-motion verify, Lighthouse, audit 8 anti-pattern `looks-expensive`, review-animations skill pass | final commit |

Aturan per phase (dari AGENTS §7, yang relevan): `pnpm --filter app lint && typecheck`,
build sukses, manual mobile 360×640 + 768×1024, dark+light cek, commit message
`feat(M3-uiux): {phase} — {scope}`.

---

## 11. Definition of Done — per halaman

- [ ] Layout sesuai spec §8 (desktop + mobile + dark mode)
- [ ] Empty state pakai AdminArt + copywriting §7 (judul/aksi/CTA)
- [ ] Motion sesuai tier §4 (stagger, press, data-change, exit) + reduced-motion off
- [ ] Copy: verb-first CTA, konsekuensi di confirm, toast impact data
- [ ] Stat = inline-stat row (bukan 4-col card strip generik)
- [ ] A11y: focus, aria, keyboard path, AA contrast
- [ ] Perf: Lighthouse ≥90, no layout-shift saat animasi, virtual list untuk 6k+
- [ ] Tidak ada fitur server baru (kecuali data stat/insight §8 yang read-only query)
- [ ] `pnpm --filter app lint && typecheck` lulus, build lulus
- [ ] Screenshot sebelum/sesudah disimpan ke `docs/screenshots/` (audit trail visual)

---

*Dokumen ini = source of truth UI/UX admin. Implementasi tanpa mengubah spec harusnya
tidak perlu tanya; kalau butuh keputusan visual di luar spec → ikuti prinsip §0
(Linear/Stripe/Vercel, calm density, motion yang menjawab interaksi).*
