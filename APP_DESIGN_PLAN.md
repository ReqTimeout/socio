# APP DESIGN PLAN — app.socio.id

> **Untuk: coding agent frontend.** Redesign `app/` (SvelteKit + Svelte 5 + Tailwind v4). **Dashboard beautiful, out of the box, mobile-first 100%.** Bukan admin panel generic. Terasa seperti app fintech modern (GoPay/DANA/Linear) untuk reseller SMM.
>
> **BACA WAJIB**: `AGENTS.md`, `DESIGN.md`, `APP_DESIGN_PLAN.md` (file ini). Infra sudah live (`app.socio.id`, deploy via git push). API contract + route map lengkap di sini.

---

## 0. Vision — "Beautiful Dashboard, Out of the Box"

**Bukan panel SMM biasa** ( tabel abu-abu + sidebar biru + menu berlapis). Socio.id app = **app mobile-first yang terasa premium**, seperti GoPay/DANA tapi untuk beli followers.

**User persona**: Reseller SMM 25-35 thn, mobile-only (Android low-end + iPhone), buka HP sambil kerja. Mau: lihat saldo cepat, pesan order cepat, cek status cepat, top-up cepat. **5 detik buka app → order jalan.**

**3 prinsip desain**:
1. **Thumb-first** — aksi utama di bawah 2/3 layar, jangkauan jempol.
2. **Glanceable** — info penting (saldo, status order) kelihatan tanpa scroll.
3. **Tactile** — motion feedback di setiap tap (haptic + visual).

**Brand temperature**: Bold + High-Contrast. Tinted paper (bukan putih), accent indigo/cyan OKLCH. Real avatar/photo, bukan illustration.

---

## 1. Tech Stack (JANGAN ubah)

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | **SvelteKit** + adapter-node | SSR + endpoints |
| UI | **Svelte 5** runes | `$state`, `$derived`, `$props`, `$effect` |
| Styling | **Tailwind CSS v4** | `@theme` tokens dari `packages/ui/src/tokens.css` |
| Components | **@socio/ui** (workspace) | Button, Card, Sheet, BottomNav, FAB, dll |
| DB | **Drizzle ORM** (MySQL) | `import { db } from "@socio/db"` |
| Auth | **better-auth** | session cookie |
| Real-time | **SSE** (`/api/sse`) | EventSource, no WebSocket |
| Icons | **Lucide Svelte** | thin 1.5px |
| Fonts | **Plus Jakarta Sans** + **Sora** | Display=Sora, Body=Jakarta |
| Charts | **LayerChart** atau **svelte-chartjs** | dashboard stats |

**Tech modern WAJIB dipakai**:
- **Svelte 5 runes** — reaktif tanpa store boilerplate.
- **Tailwind v4 `@theme`** — design tokens native CSS.
- **View Transitions API** — page nav mulus (`<ViewTransitions />` root layout).
- **Scroll-driven animations** — `animation-timeline: view()` untuk list reveal.
- **`:has()` selector** — parent state (card `:has(input:focus)` highlight).
- **Container queries** — `@container` untuk komponen adaptif (card di grid vs list).
- **`@property`** — animated gradient (saldo hero), counter (count-up).
- **`color-mix()`** — tint status badge dari token.
- **CSS nesting** — native di v4.
- **`backdrop-filter`** — sticky header blur.
- **`env(safe-area-inset-*)`** — iPhone notch.

**DILARANG**: React/Vue/jQuery/Bootstrap, WebSocket (pakai SSE), Redis, illustration flat generic, sidebar desktop untuk user app.

---

## 2. Design Tokens (ringkas, full di `DESIGN.md`)

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#4f46e5` | CTA, active nav, link |
| `--color-accent` | `#06b6d4` | Highlight, status energy |
| `--color-ink-900` | `#0f172a` | Heading dark |
| `--color-ink-50` | `#f8fafc` | Surface |
| Status: pending/progress/complete/canceled/partial | | Badge order |
| Feedback: success/warning/danger | | Toast, banner |

**Typography**: Sora (display, heading), Jakarta Sans (body 15px), JetBrains Mono (data atom: order ID, timestamp, harga).

**Radius**: `rounded-xs`(4) input → `rounded-2xl`(32) hero card → `rounded-full` pill.

**Motion**: `cubic-bezier(0.25,1,0.5,1)`. Hover 150-200ms, sheet open 300ms, reveal 400ms. Transform+opacity only.

---

## 3. App Shell — Mobile-First Architecture

### Layout utama (`(app)/+layout.svelte`)
```
┌─────────────────────────┐
│  Header (sticky, blur)  │  ← saldo mini + notif + avatar
├─────────────────────────┤
│                         │
│   Page content          │  ← scrollable, padding-bottom 80px (nav) + 64px (FAB)
│                         │
│                         │
├─────────────────────────┤
│  BottomNav (5 item)     │  ← safe-area-inset-bottom
└─────────────────────────┘
              ┌───┐
              │ + │  ← FAB: /pesan (fixed, above nav)
              └───┘
```

### BottomNav (5 item, fixed bottom)
| Icon | Label | Route | Active state |
|---|---|---|---|
| Home | Beranda | `/` | accent fill + label bold |
| Layers | Layanan | `/layanan` | |
| Receipt | Pesanan | `/pesanan` | + badge count pending |
| Wallet | Saldo | `/saldo/top-up` | |
| User | Akun | `/akun` | |

- Background `bg-white/95 backdrop-blur` + shadow top.
- `safe-area-inset-bottom` padding.
- Active: icon accent + fill, label accent bold.
- Haptic `navigator.vibrate(8)` on tap (gated reduced-motion).

### FAB (+)
- Fixed bottom-right, 56px circle, `bg-primary` + `text-white`.
- Shadow-xl primary-900/40.
- Position: `bottom: calc(80px + safe-area + 16px)`, `right: 16px`.
- Press: `active:scale-95`, rotate 45deg (→ close X kalau sheet terbuka).
- Tap → `/pesan`.

### Header (sticky per-page, optional)
- Beberapa page punya header sendiri (Layanan search, Pesanan filter).
- Global header di Dashboard: greeting + saldo mini + notif bell.

---

## 4. Route Map + Screen Spec

### 4.1 Dashboard `/` (CENTERPIECE — wajib beautiful)

```
┌─────────────────────────┐
│  Hai, Dimas 👋          │  ← greeting + avatar (right)
│  Selamat pagi           │
├─────────────────────────┤
│  ╔═══════════════════╗  │
│  ║   Saldo Hero      ║  │  ← gradient card, tilt subtle
│  ║   Rp 125.000      ║  │     mono font, count-up on load
│  ║   [Top Up] [Riwayat]║ │     tap → /saldo
│  ╚═══════════════════╝  │
├─────────────────────────┤
│  Quick Grid (2x2)       │  ← 4 shortcut card
│  ┌─────┐ ┌─────┐       │
│  │ 📦  │ │ 📋  │       │     Pesan (primary tint)
│  │Pesan│ │Ly │       │     Layanan
│  └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐       │
│  │ 🎫  │ │ 👥  │       │     Tiket (badge if open)
│  │Tiket│ │Aff │       │     Affiliate
│  └─────┘ └─────┘       │
├─────────────────────────┤
│  Order Terbaru    [Lihat Semua]│
│  ┌─────────────────────┐ │
│  │ #1234 IG Followers  │ │  ← card, status badge, time
│  │ ● Pending  500 qty  │ │     SSE live update (pulse)
│  │ Rp 9.000             │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ #1235 TT Likes      │ │
│  │ ● Success  1k qty   │ │
│  │ Rp 12.000            │ │
│  └─────────────────────┘ │
├─────────────────────────┤
│  Notif Terbaru          │
│  ● Order #1234 Berhasil  │
│  ● Saldo +Rp 50k         │
├─────────────────────────┤
│  [BottomNav]            │
└─────────────────────────┘
```

**Saldo Hero** (card utama, wajib out of the box):
- Gradient background: `from-primary-600 to-accent-500` (atau dark mode `from-ink-800 to-ink-900`).
- Tilt 3D subtle: `rotateX(5deg)`, hover → rotate-0.
- Saldo: Sora 800 36px white, **count-up animation** on load (0 → balance, 800ms).
- 2 tombol glass: "Top Up" (white/20 bg) + "Riwayat" (white/10 bg).
- Background pattern: subtle dot grid SVG, opacity 10%.
- Card height 140px, full-width minus padding.
- Shadow-2xl primary-900/30.

**Quick Grid**:
- 2x2 grid, gap 12px, card `rounded-2xl bg-white border border-ink-100`.
- Icon Lucide 28px, label 13px ink-700.
- Press: `active:scale-95` + bg tint.
- Tiket card: badge merah count kalau ada ticket open.

**Order Terbaru** (5 latest):
- Card `rounded-xl bg-white border-ink-100 p-4`, tap → bottom-sheet detail.
- Status badge pill: Pending (amber), In progress (blue), Success (green), Partial (purple), Canceled (red).
- **SSE live**: status update real-time, badge pulse green saat berubah.
- "Lihat Semua" → `/pesanan`.
- Empty state: illustration + "Belum ada order. Mulai pesan followers pertama!" + CTA.

**Notif Terbaru** (3 latest):
- List, icon per type (order/deposit/ticket), title, time relative.
- Tap → actionUrl.

### 4.2 Layanan `/layanan` (8.153 services, search + filter)

```
┌─────────────────────────┐
│  🔍 Cari layanan...     │  ← sticky search, autofocus
├─────────────────────────┤
│  [Semua] [IG] [TT] [YT] │  ← horizontal scroll chips
├─────────────────────────┤
│  ┌─────────────────────┐ │
│  │ IG Followers 🔥     │ │  ← ServiceCard
│  │ Rp 18.000 /1k       │ │     price mono, min-max
│  │ Min 50 • Max 50k    │ │     refill badge if isRefill
│  │           [Pesan]   │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ IG Likes ❤️         │ │
│  │ Rp 12.000 /1k       │ │
│  └─────────────────────┘ │
│  ... (infinite scroll)   │
└─────────────────────────┘
```

- **Search**: debounce 300ms, filter by name/category.
- **Filter chips**: horizontal scroll, active chip accent fill.
- **ServiceCard**: name + emoji, price (mono, formatIDR), min-max, refill badge.
- **Tap card** → bottom-sheet detail (description, note, price per level, "Pesan Sekarang" → `/pesan?service=<id>`).
- **Infinite scroll**: 20 per page, skeleton loading.
- **Empty state**: "Layanan gak ditemukan. Coba kata kunci lain."

### 4.3 Pesan `/pesan` (form, FAB target)

```
┌─────────────────────────┐
│  ← Buat Pesanan         │  ← header back
├─────────────────────────┤
│  Layanan                │
│  ┌─────────────────────┐ │
│  │ IG Followers 🔥  ▼ │ │  ← searchable sheet trigger
│  └─────────────────────┘ │
│  Link / Username        │
│  ┌─────────────────────┐ │
│  │ https://instagram...│ │  ← URL validate
│  └─────────────────────┘ │
│  Quantity              │
│  ┌───┐ ┌───────────┐ ┌───┐│ ← qty stepper
│  │ − │ │   1000    │ │ + ││
│  └───┘ └───────────┘ └───┘│
│  Min 50 • Max 50000     │
├─────────────────────────┤
│  ╔═══════════════════╗  │
│  ║ Total: Rp 18.000  ║  │  ← sticky bottom price card
│  ║ Saldo setelah:    ║  │     count-up animation
│  ║ Rp 107.000         ║  │
│  ║      [Pesan]       ║  │
│  ╚═══════════════════╝  │
└─────────────────────────┘
```

- **Layanan selector**: tap → full-screen sheet with search + list.
- **Link input**: validate URL pattern, show check icon if valid.
- **Qty stepper**: − / + button, manual input, clamp min-max. Haptic on tap.
- **Live price**: count-up, formatIDR mono. "Saldo setelah" = balance - total (red if insufficient).
- **Custom comments** (if type=Custom Comments): textarea, one per line, count = line count.
- **Confirm dialog** (bottom-sheet): "Pesan X qty [service] untuk [link]? Total Rp Y. Saldo setelah Rp Z." → "Konfirmasi" / "Batal".
- **Optimistic**: on submit → navigate to `/pesanan` immediately, show card with "Pending" badge. If error → toast + rollback.
- **Insufficient balance**: disable "Pesan" button, show "Saldo kurang. Top Up →".

### 4.4 Pesanan `/pesanan` (order history, SSE live)

```
┌─────────────────────────┐
│  Pesanan                │
│  [Semua][Pending][Proses][Selesai][Gagal] │  ← filter chips, scroll
├─────────────────────────┤
│  ┌─────────────────────┐ │
│  │ #1234  IG Followers  │ │  ← card, swipeable
│  │ ● Pending  500 qty   │ │     status badge pulse on update
│  │ 2 jam lalu  Rp 9.000 │ │
│  └─────────────────────┘ │
│  ← swipe → [Pesan Ulang]│
├─────────────────────────┤
│  (pull to refresh)       │
└─────────────────────────┘
```

- **Filter chips**: Semua / Pending / Proses / Selesai / Gagal. Count badge per filter.
- **Card**: order ID (mono), service name, status badge, qty, time relative ("2 jam lalu"), price.
- **Tap** → bottom-sheet detail:
  - All info (link, qty, price, profit hidden for user).
  - Status timeline (Pending → Proses → Berhasil, with timestamp).
  - Action: "Pesan Ulang" (→ /pesan?service=&link=) + "Refill" (if isRefill) + "Salin Link".
- **Swipe right** → "Pesan Ulang" quick action.
- **SSE**: status update real-time, badge pulse green (2s) when changed.
- **Pull-to-refresh**: spinner → refetch.
- **Empty state**: "Belum ada pesanan." + CTA "Cari Layanan".

### 4.5 Saldo `/saldo/top-up` (top-up flow)

```
┌─────────────────────────┐
│  ← Top Up Saldo         │
├─────────────────────────┤
│  Saldo saat ini         │
│  Rp 125.000             │  ← big, mono
├─────────────────────────┤
│  Nominal Top Up         │
│  ┌────┐ ┌────┐ ┌────┐  │  ← preset chips
│  │50k │ │100k│ │200k│  │
│  └────┘ └────┘ └────┘  │
│  ┌─────────────────────┐ │
│  │ Rp 0           │ │  ← custom input
│  └─────────────────────┘ │
├─────────────────────────┤
│  Metode Pembayaran      │
│  ○ Manual BCA (gratis)   │  ← radio card
│  ○ Midtrans VA (instan)  │
│    BCA/BNI/BRI/Mandiri   │
│  ○ QRIS (instan, +2%)   │
├─────────────────────────┤
│  ╔═══════════════════╗  │
│  ║ [Buat Invoice]    ║  │  ← sticky bottom
│  ╚═══════════════════╝  │
└─────────────────────────┘
```

- **Saldo saat ini**: big mono, count-up.
- **Nominal**: 4 preset chip (50k, 100k, 200k, 500k) + custom input (numeric keyboard).
- **Metode**:
  - **Manual BCA**: gratis, transfer manual, upload bukti, admin confirm (1-30 menit).
  - **Midtrans VA**: instan, BCA/BNI/BRI/Mandiri, fee Rp 4.000.
  - **QRIS**: instan, fee 2%.
- **Submit** → create deposit (pending) → page instruksi:
  - Manual: nomor BCA + jumlah + countdown 24 jam + upload bukti.
  - Midtrans: buka Snap payment page.
  - QRIS: tampilkan QR code (generate via `qrcode` lib).
- **Status check**: auto-poll tiap 10 detik, atau SSE `/api/sse` event `deposit_update`.
- **Success**: confetti micro + redirect dashboard, toast "Saldo bertambah Rp X".

### 4.6 Saldo Riwayat `/saldo/riwayat`

```
┌─────────────────────────┐
│  ← Riwayat Saldo        │
│  [Semua][Masuk][Keluar] │
├─────────────────────────┤
│  Hari Ini               │  ← group by date
│  ┌─────────────────────┐ │
│  │ ↓ Top Up            │ │  ← green arrow down
│  │ +Rp 50.000   14:30  │ │
│  │ Midtrans VA         │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ ↑ Order #1234       │ │  ← red arrow up
│  │ -Rp 9.000    14:15  │ │
│  │ IG Followers        │ │
│  └─────────────────────┘ │
│  Kemarin                 │
│  ...                     │
└─────────────────────────┘
```

- **Filter**: Semua / Masuk / Keluar.
- **Group by date**: Hari Ini / Kemarin / 7 Hari Lalu / Bulan Ini.
- **Card**: icon (in green / out red), amount (+/-), time, note.
- **Pull-to-refresh**.

### 4.7 Affiliate `/affiliate`

```
┌─────────────────────────┐
│  ← Affiliate            │
├─────────────────────────┤
│  ╔═══════════════════╗  │
│  ║ Link Referral     ║  │
│  ║ ┌──────────────┐  ║  │
│  ║ │socio.id/r/ABC│📋│  ║  ← copy button
│  ║ └──────────────┘  ║  │
│  ║    [QR Code]       ║  │  ← QR generate
│  ╚═══════════════════╝  │
├─────────────────────────┤
│  Statistik              │
│  ┌────┐ ┌────┐ ┌────┐ │  ← 3 stat inline
│  │ 42 │ │ 8  │ │Rp  │ │
│  │klik│ │daftar││25k │ │
│  └────┘ └────┘ └────┘ │
├─────────────────────────┤
│  Komisi                 │
│  Pending: Rp 12.000     │
│  Dibayar: Rp 50.000     │
│  [Withdraw] (min 50k)   │
├─────────────────────────┤
│  Riwayat Komisi          │
│  ┌─────────────────────┐ │
│  │ +Rp 3.000  User @x   │ │
│  │ 3 hari lalu  Pending │ │
│  └─────────────────────┘ │
└─────────────────────────┘
```

- **Link referral**: copy button (haptic), share button (Web Share API).
- **QR code**: generate via `qrcode` lib, tap → full-screen.
- **Stat**: klik, daftar, komisi (inline-stat, bukan 4-col grid).
- **Withdraw**: button, disabled if pending < 50k. → form withdraw.

### 4.8 Tiket `/tiket` (support)

```
┌─────────────────────────┐
│  Tiket Bantuan    [+ Buat]│
├─────────────────────────┤
│  ┌─────────────────────┐ │
│  │ Order #1234 gagal    │ │  ← ticket card
│  │ ● Open  2 jam lalu   │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ Saldo gak masuk      │ │
│  │ ✓ Answered  1 hari   │ │
│  └─────────────────────┘ │
└─────────────────────────┘
```

- **List tiket**: status badge (Open amber / Answered blue / Closed gray).
- **Tap** → chat-style thread:
  - User message: right bubble, accent bg, white text.
  - Admin message: left bubble, ink-50 bg, ink-900 text.
  - Input + send (sticky bottom, safe-area).
- **Buat tiket**: button di header → form (kategori: Order/Pembayaran/Lainnya + pesan).

### 4.9 Akun `/akun`

```
┌─────────────────────────┐
│  ╔═══════════════════╗  │
│  ║   [Avatar 64px]   ║  │  ← avatar upload (R2)
│  ║   Dimas Pratama    ║  │
│  ║   @dimas • Reseller ║  │  ← level badge
│  ║   Rp 125.000        ║  │  ← saldo mini
│  ╚═══════════════════╝  │
├─────────────────────────┤
│  ✏️  Edit Profile       │
│  🔒  Ganti Password     │
│  🔑  API Key   [W2KZ...] │  ← copy/regenerate
│  🎨  Tampilan    [Light]│  ← theme toggle
│  📊  Statistik Saya     │
│  ❓  Bantuan            │
│  🚪  Logout             │
├─────────────────────────┤
│  Hapus Akun             │  ← danger zone
└─────────────────────────┘
```

- **Header card**: gradient subtle, avatar (upload ke R2), nama, username, level badge, saldo.
- **Menu list**: icon + label + chevron/inline value.
- **Edit Profile**: nama, username (validate unique).
- **Ganti Password**: old + new + confirm, zxcvbn meter.
- **API Key**: show/hide, copy (haptic), regenerate (confirm dialog).
- **Theme**: Light / Dark / System (toggle switch, persist cookie).
- **Logout**: confirm dialog.
- **Hapus Akun**: danger, confirm 2x (type username to confirm).

---

## 5. Real-time Spec (SSE `/api/sse`)

```javascript
// EventSource connection (auto-reconnect)
const es = new EventSource('/api/sse');
es.addEventListener('order_update', (e) => {
  const { id, status, remains } = JSON.parse(e.data);
  // update order card in place, badge pulse green
});
es.addEventListener('notification', (e) => {
  const { title, message, actionUrl } = JSON.parse(e.data);
  // toast + increment notif badge
});
es.addEventListener('balance', (e) => {
  const { balance } = JSON.parse(e.data);
  // update saldo hero with count-up
});
```

- **Auto-reconnect** on disconnect (EventSource native).
- **Visible feedback**: badge pulse green 2s on order status change.
- **Toast**: fly-in bottom, 300ms, auto-dismiss 4s.
- **Web Push** (VAPID): for background notification (opt-in prompt after 1st order).

---

## 6. Optimistic UI Pattern

```javascript
// Example: order submit
async function submitOrder() {
  const tempId = 'temp-' + Date.now();
  // 1. Add to list immediately with Pending badge
  orders.update(o => [{ id: tempId, status: 'Pending', ...newOrder }, ...o]);
  // 2. Navigate to /pesanan
  goto('/pesanan');
  try {
    const result = await api.createOrder(...);
    // 3. Replace temp with real
    orders.update(o => o.map(x => x.id === tempId ? { ...result, status: 'Pending' } : x));
    toast('Order dibuat', 'success');
  } catch (e) {
    // 4. Rollback
    orders.update(o => o.filter(x => x.id !== tempId));
    toast('Gagal: ' + e.message, 'danger');
  }
}
```

---

## 7. Admin App (separate, but same design language)

Admin `/admin/*` — **bukan prioritas**, fokus user app dulu. Tapi design language sama:
- **Card-list mobile**, bukan table desktop.
- **Search sticky** top.
- **Action inline** di card (Approve/Reject, Suspend/Activate).
- **Dashboard admin**: stat cards 2x2 + activity feed.

Lihat `FRONTEND_DESIGN_PLAN.md` (old, akan di-merge ke sini) untuk detail admin route.

---

## 8. Motion Spec (detail)

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Page nav | Click link | View Transition (fade+slide) | 200ms | ease-out |
| Saldo count-up | Page load | 0 → balance | 800ms | ease-out |
| Card reveal | Scroll into view | opacity 0→1, translateY 20→0 | 400ms | ease-out |
| Sheet open | Tap card | translateY 100%→0 | 300ms | ease-out |
| Sheet close | Tap backdrop/X | translateY 0→100% | 250ms | ease-in |
| Badge pulse | SSE update | scale 1→1.1→1, bg tint | 2s | ease |
| Button press | Tap | scale 1→0.95 | 100ms | ease |
| FAB | Scroll | scale 1→0.9 (hide) / show | 200ms | ease |
| Toast | Show | translateY 100→0 (bottom) | 300ms | ease-out |
| Skeleton | Loading | shimmer gradient sweep | 1.5s infinite | linear |

**All gated by `prefers-reduced-motion: reduce`** → disable, instant.

---

## 9. Anti-Pattern Audit (8 rules)

1. ✅ Bullet budget ≤5 (Quick Grid = 4).
2. ✅ Eyebrow pill ≤1 (Dashboard greeting).
3. ✅ Card chrome ≤2 (border OR shadow, not both heavy).
4. ✅ Pricing = table (Landing), admin pricing = table.
5. ✅ Stat = inline (affiliate stats, trust badges).
6. ✅ Imagery = real avatar (Unsplash), bukan illustration.
7. ✅ Container variance ≥3 (saldo hero card, quick grid, list, sheet, dark saldo).
8. ✅ Font = Plus Jakarta Sans + Sora, bukan Inter.

---

## 10. Accessibility (a11y)

- **AA contrast** 4.5:1 untuk text, accent-filled surfaces (button, badge, recommended).
- **Focus ring** visible: 2px accent outline + 2px offset.
- **Keyboard nav**: Tab, Enter, Escape (sheet close), Arrow (list).
- **Screen reader**: `aria-label` on icon buttons, `role="status"` on live updates, `aria-live="polite"` for toast.
- **Touch target** ≥44×44px.
- `prefers-reduced-motion` — disable animation.
- `prefers-color-scheme: dark` — dark mode (Phase 2, optional).

---

## 11. Mobile-First Checklist (WAJIB per route)

- [ ] Viewport 360×640 minimum (Galaxy A51).
- [ ] Touch target ≥44×44px.
- [ ] Text body ≥14px (base 15px).
- [ ] No horizontal scroll.
- [ ] BottomNav + safe-area-inset-bottom.
- [ ] FAB position above nav.
- [ ] Sheet (bottom-sheet) untuk detail, bukan modal center.
- [ ] Skeleton loading, bukan spinner.
- [ ] Pull-to-refresh on list pages.
- [ ] Optimistic update on submit.
- [ ] Empty state + retry on error.
- [ ] Offline toast + retry.
- [ ] Haptic on CTA tap (gated).
- [ ] Lighthouse mobile ≥90.

---

## 12. Verification (sebelum bilang "done")

1. `pnpm --filter app lint` — no error.
2. `pnpm --filter app check` (`svelte-check`) — 0 errors.
3. `pnpm --filter app build` — sukses.
4. `pnpm --filter app dev` — manual test 360×640 + 768×1024.
5. AA contrast accent-filled surfaces ≥4.5:1.
6. `prefers-reduced-motion` disable animation.
7. Keyboard nav semua interactive.
8. SSE connection + auto-reconnect.
9. Lighthouse mobile ≥90.
10. Commit: `feat(M2): {route} — {item}` atau `fix(M2): {masalah}`.
11. Deploy: git push → Coolify auto-deploy.

---

## 13. API Contract (frontend ↔ backend)

### Auth (better-auth, `/api/auth/*`)
```
POST /api/auth/sign-in/email   { email, password }          → 200 + cookie
POST /api/auth/sign-up/email    { email, password, name, username } → 200 + cookie
POST /api/auth/sign-out         {}                           → 200
GET  /api/auth/get-session      (cookie)                     → { session, user }
```

### SSE (`/api/sse` — GET, EventSource)
```
event: order_update  data: { id, status, remains }
event: notification   data: { id, title, message, actionUrl }
event: balance        data: { balance }
```

### Reseller API (`/api/v1` — POST, JSON or form)
```
{ api_key, action: "services" }                              → { data: [...] }
{ api_key, action: "order", service, data, quantity }        → { data: { order_id, price } }
{ api_key, action: "status", id }                            → { data: { id, status, remains } }
{ api_key, action: "refill", id }                             → { data: { id } }
{ api_key, action: "profile" }                               → { data: { username, balance, level } }
```

### Webhooks (backend, jangan sentuh frontend)
- `/api/webhook/midtrans` — Midtrans payment (signature verified, auto-confirm).
- `/api/cron/trigger` — admin manual trigger cron.

### Data Schema (kolom penting)
- **users**: id, username, email, fullName, balance (number), level (Member/Agen/Reseller/Admin), apiKey, status ("1"=active), verify
- **orders**: id, oid, serviceName, data (=link), quantity, remains, startCount, price, status, createdAt, nextPollAt
- **deposits**: id, methodName, postAmount, amount, status, validasi, expire, idPm (Midtrans order_id)
- **services**: id, serviceName, price, priceReseller, priceApi, min, max, type, note, isRefill, status, categoryId

---

## 14. Test Credentials

- **Admin**: `info@beriklan.co.id` / `Admin123!` (level=Admin)
- **User biasa**: daftar via `/daftar` (level=Member)
- **Reseller API key**: login → `/akun` → copy API key

---

## 15. Env Status (infra ready)

| Key | Status | Fungsi |
|---|---|---|
| `SOCIO_DB_*` | ✅ Set | MySQL VPS |
| `SOCIO_SMMTURK_KEY` | ✅ Set | Provider sync |
| `SOCIO_USD_TO_IDR` | ✅ Set | Rate conversion |
| `SOCIO_AUTH_SECRET` | ✅ Set | Session |
| `SOCIO_TURNSTILE_*` | ✅ Set | Anti-bot |
| `VAPID_*` | ✅ Set | Web Push |
| `R2_*` | ✅ Set | Storage avatar |
| `MIDTRANS_*` | ✅ Set | Payment (VA/QRIS) |
| `RESEND_API_KEY` | ❌ Butuh | Email verifikasi/reset |

Manual BCA payment juga ready (admin confirm via `/admin/deposits`).

---

## 16. Don'ts (DILARANG)

1. **Jangan ubah route path** — semua sudah live + indexed.
2. **Jangan ubah DB schema** — 37 tabel + data legacy.
3. **Jangan ubah API contract** — reseller script bergantung format.
4. **Jangan invent komponen** — pakai `@socio/ui`.
5. **Jangan ubah tech stack** — SvelteKit + Tailwind v4 + Drizzle.
6. **Jangan sidebar desktop** untuk user app (mobile-first, bottom nav).
7. **Jangan WebSocket** — SSE.
8. **Jangan spinner** — skeleton.
9. **Jangan modal center** — bottom-sheet.
10. **Jangan commit tanpa `pnpm lint && pnpm check && pnpm build`**.

---

## 17. Gap Analysis & Improvements (audit PHP lama → rebuild)

> Audit fungsi `app.socio.id/` (PHP lama) vs rebuild SvelteKit. Setiap gap wajib di-fix di M2; setiap improvement adalah value-add opsional tapi dianjurkan.

### 17.1 Gap KRITIS (user-facing, blocker fungsi) — WAJIB fix

| # | Gap | Fungsi PHP lama | Status rebuild | Prioritas |
|---|---|---|---|---|
| G-U1 | **Saldo top-up action 404** | `balance/add-action.php` (create deposit pending + invoice + upload bukti) | ❌ Action `/create` gak terdaftar, user gak bisa top up | 🔴 P0 |
| G-U2 | **Refill order** | `order/refill-action.php` (trigger refill ke SMMturk, log ke `refill` table) | ❌ Belum ada action di `/pesanan` | 🔴 P0 |
| G-U3 | **Cancel order** | SMMturk `action=cancel` dipanggil dari history | ❌ Belum ada action | 🔴 P0 |
| G-U4 | **Custom comments (multi-line)** | `order/new-action.php` handle `komen` field, kirim `comments`/`custom_comments` ke provider | ⚠️ Ada input tapi `komen: ""` hardcoded kosong di server | 🔴 P0 |
| G-U5 | **Copy link order / repeat order** | `history-sosmed.php` ada tombol "Pesan Lagi" → prefilled form | ❌ Belum ada | 🟡 P1 |
| G-U6 | **Avatar upload** | Profile ganti foto (legacy: gak ada, tapi user expect) | ❌ Belum ada, R2 storage siap | 🟡 P1 |
| G-U7 | **Affiliate withdraw** | `affiliasi/wd.php` (request withdraw, min Rp50k) | ❌ Belum ada action | 🟡 P1 |
| G-U8 | **Saved links (repeat order)** | Tabel `saved_links` ada di schema tapi gak dipakai | ❌ Belum ada UI + action | 🟢 P2 |

### 17.2 Gap SECONDARY (UX/operasional) — fix untuk parity

| # | Gap | Detail | Fix |
|---|---|---|---|
| G-U9 | **Order detail sheet minim** | PHP lama tampilkan: status timeline, refill status, provider_order_id, link (copy), qty, remains, start_count, profit hidden. Rebuild cuma list dasar. | Sheet detail lengkap + timeline status + tombol aksi (refill/cancel/copy/repeat). |
| G-U10 | **Saldo top-up method selection** | PHP lama: BCA (manual + unique amount), Tripay (QRIS/VA), Midtrans. Rebuild: Manual BCA + Midtrans. Unique amount (3 digit anti-wrong-transfer) belum. | Generate unique amount (+Rp1-999) per deposit, match saat confirm. |
| G-U11 | **Bukti transfer upload** | PHP lama: user upload bukti transfer image. Admin lihat bukti sebelum confirm. | Upload ke R2 (`cdn.socio.id`), attach ke deposit, preview di admin. |
| G-U12 | **Deposit expire auto-cancel** | PHP lama: cron cancel deposit expire >24h. Rebuild: `light.ts` cron ada, tapi verify jalan. | Test + log audit saat auto-cancel. |
| G-U13 | **Notification center** | PHP lama: `NotificationManager.php` (order/deposit/ticket/news/promo + broadcast). Rebuild: SSE + in-app notif ada, tapi gak ada halaman notif list. | Halaman `/notif` (list, mark as read, filter type). |
| G-U14 | **Ticket attachment** | PHP lama: ticket bisa attach image. Rebuild: text only. | Upload image ke R2 + attach ke message. |
| G-U15 | **Search layanan advanced** | PHP lama: search by name + category + min price + max price. Rebuild: search name + filter kategori aja. | Filter chip: price range, refill only, popular. |
| G-U16 | **Order filter advanced** | PHP lama: filter by date range, status, provider. Rebuild: status chips only. | Date range picker + filter provider + search by order ID/link. |
| G-U17 | **Profile: ganti username** | PHP lama: bisa ganti username (unique check). Rebuild: belum. | Edit username + validate unique. |
| G-U18 | **Profile: 2FA/Passkey** | PHP lama: gak ada. Rebuild: passkey ditunda M6. | Passkey register di `/akun` (opsional). |
| G-U19 | **Email preferences** | PHP lama: gak ada. | Toggle: email order update / deposit / marketing (opt-in). |
| G-U20 | **Dark mode** | PHP lama: gak ada. Rebuild: theme toggle di `/akun`, tapi gak implement full. | Dark mode via `class="dark"` + tokens, persist cookie. |

### 17.3 Improvement BARU (value-add, gak ada di PHP lama)

| # | Improvement | Detail | Fungsi |
|---|---|---|---|
| I-U1 | **Coupon/voucher** | Tabel `coupons` (code, discount, min order, expiry, max usage). User apply di checkout `/pesan`. | Diskon promo, retensi. |
| I-U2 | **Loyalty point + tier** | Tabel `loyalty_points` (user_id, points, tier). Poin per order (1pt per Rp1k). Tier: Bronze/Silver/Gold/Platinum. Diskon tier otomatis. | Retensi, gamification. |
| I-U3 | **Order ETA estimation** | Hitung avg waktu selesai per service (dari historical `created_at` → `updatedAt` status Success). Tampilkan "Estimasi selesai ~2 jam". | Expectation management. |
| I-U4 | **Saved payment method** | Midtrans saved token (1-click pay). User save kartu/VA. | Frictionless repeat top-up. |
| I-U5 | **Order simulator (landing)** | Interactive phone mockup di hero landing. | Konversi (sudah di LANDING_DESIGN_PLAN). |
| I-U6 | **Web Push notification** | VAPID already set. Opt-in prompt setelah 1st order. Background notif saat order selesai. | Engagement, retention. |
| I-U7 | **Onboarding tour (1st login)** | 4-step tour: saldo → pesan → layanan → pesanan. Tooltip overlay. | Aktivasi user baru. |
| I-U8 | **Smart service recommendation** | "Layanan populer", "Pernah kamu pesan", "Murah meriah". | Discovery, cross-sell. |
| I-U9 | **Repeat order 1-tap** | Tombol "Pesan Ulang" di history → prefilled form, tinggal submit. | Frictionless repeat. |
| I-U10 | **Deposit quick amount** | Preset chip: 50k/100k/200k/500k + custom. | Frictionless top-up. |
| I-U11 | **Service favorite/bookmark** | User bookmark layanan sering dipakai. Tab "Favorit" di `/layanan`. | Quick access. |
| I-U12 | **Order batch (multi-link)** | 1 order, multiple link (csv paste). Untuk reseller bulk. | Pro user feature. |
| I-U13 | **Realtime balance update** | SSE push balance update saat deposit confirmed / order deduct. Dashboard saldo auto-update tanpa refresh. | Instant feedback. |
| I-U14 | **Invoice generator** | Download invoice PDF per order (untuk reseller jual ke client). | B2B feature. |
| I-U15 | **API documentation page** | `/api-docs` page (interactive, contoh curl/PHP/Node). | Reseller onboarding. |
| I-U16 | **Service rating/review** | User rate service 1-5 bintang setelah order selesai. Tampilkan avg rating di `/layanan`. | Social proof, quality signal. |
| I-U17 | **Refund to balance** | Kalau order gagal → auto-refund ke saldo + notif. | Trust, retention. |
| I-U18 | **Chat WhatsApp floating** | FAB WA di dashboard (bukan landing aja). | Support access. |
| I-U19 | **Maintenance banner** | Kalau maintenance_mode ON → banner di top "Sistem maintenance, order sementara dijeda". | Clear communication. |
| I-U20 | **Empty state illustration** | Setiap empty state (no order, no layanan, no tiket) pakai ilustrasi kontekstual + CTA. | Onboarding, retention. |

### 17.4 Detail Fungsi & Design per Gap (implementasi)

#### G-U1: Saldo Top-Up Action (P0 — blocker)

**Fungsi server (`/saldo/top-up/+page.server.ts` action `create`):**
```typescript
export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData();
    const amount = Number(form.get("amount"));
    const method = String(form.get("method") ?? "manual"); // manual | midtrans

    if (amount < 20000) return fail(400, { error: "Minimal top up Rp20.000" });

    // Generate unique amount (3 digit suffix anti-wrong-transfer)
    const unique = Math.floor(Math.random() * 900) + 100; // 100-999
    const postAmount = method === "manual" ? amount + unique : amount;

    // Generate invoice ID
    const invoiceId = `DEP-${Date.now()}`;

    const [dep] = await db.insert(deposits).values({
      userId: locals.user!.id,
      payment: "bank",
      type: method === "midtrans" ? "VA" : "manual",
      methodName: method === "manual" ? "BCA Manual" : "Midtrans VA",
      validasi: "BCA",
      target: "",
      postAmount,
      amount,
      note: `Top up ${method}`,
      status: "Pending",
      createdAt: new Date(),
      expire: new Date(Date.now() + 24 * 60 * 60 * 1000),
      idPm: invoiceId,
      invoiceVirtual: "",
      img: "",
      untukApa: "smm",
    }).$returningId();

    // Kalau midtrans → call Snap API untuk dapat redirect URL
    if (method === "midtrans") {
      const snapUrl = await createMidtransSnap(invoiceId, postAmount, locals.user!);
      return { success: true, snapUrl, depositId: dep.id };
    }

    // Manual → return instruksi BCA
    return { success: true, depositId: dep.id, postAmount, invoiceId };
  },
};
```

**Design UI (`/saldo/top-up/+page.svelte`):**
- Saldo saat ini (big, mono, count-up).
- Nominal: 4 preset chip (50k/100k/200k/500k) + custom input (numeric).
- Metode: radio card 2 opsi:
  - **Manual BCA** (gratis, +unique amount, upload bukti, confirm 1-30 menit).
  - **Midtrans VA** (instan, fee Rp4.000, BCA/BNI/BRI/Mandiri).
- Submit → create deposit → page instruksi:
  - Manual: nomor BCA + jumlah unik + countdown 24 jam + upload bukti button.
  - Midtrans: redirect ke Snap payment page.
- Status check: poll `/api/sse` event `deposit_update` setiap 10 detik.
- Success: confetti micro + redirect dashboard + toast "Saldo bertambah Rp X".

#### G-U2: Refill Order (P0)

**Fungsi server (`/pesanan/[id]/+page.server.ts` action `refill`):**
```typescript
refill: async ({ params, locals }) => {
  const orderId = Number(params.id);
  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, locals.user!.id))).limit(1);
  if (!order) return fail(404, { error: "Order tidak ditemukan" });

  const [svc] = await db.select({ isRefill: services.isRefill })
    .from(services).where(eq(services.id, Number(order.serviceId))).limit(1);
  if (!svc?.isRefill) return fail(400, { error: "Layanan ini tidak mendukung refill" });

  // Cek sudah refill belum (anti spam)
  const [existing] = await db.select().from(refill)
    .where(eq(refill.orderId, orderId)).limit(1);
  if (existing?.status === "Pending") return fail(400, { error: "Refill sedang diproses" });

  // Call SMMturk refill
  await smmturkRefill([order.providerOrderId]);

  // Log ke refill table
  await db.insert(refill).values({
    orderId, userId: locals.user!.id, status: "Pending", createdAt: new Date(),
  });

  return { success: "Refill diajukan. Cek status dalam 5 menit." };
},
```

**Design:** Tombol "Refill" di detail sheet order (hanya tampil kalau `isRefill=true` + status=Success). Confirm dialog: "Ajukan refill untuk order #X?" → submit → toast.

#### G-U3: Cancel Order (P0)

**Fungsi server (action `cancel`):**
```typescript
cancel: async ({ params, locals }) => {
  const orderId = Number(params.id);
  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, locals.user!.id))).limit(1);
  if (!order) return fail(404, { error: "Order tidak ditemukan" });
  if (order.status !== "Pending") return fail(400, { error: "Order sudah diproses, tidak bisa dibatalkan" });

  // Try cancel di SMMturk (kalau support)
  try { await smmturkCancel([order.providerOrderId]); } catch {}

  // Update status + refund saldo
  await db.update(orders).set({ status: "Canceled", updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  const newBal = Number(locals.user!.balance) + Number(order.price);
  await db.update(users).set({ balance: newBal }).where(eq(users.id, locals.user!.id));
  await db.insert(balanceLogs).values({
    userId: locals.user!.id, type: "ref", amount: Number(order.price),
    note: `Refund cancel order #${orderId}`, createdAt: new Date(),
  });

  return { success: "Order dibatalkan. Saldo dikembalikan Rp " + order.price };
},
```

**Design:** Tombol "Batalkan" di detail sheet (hanya kalau status=Pending). Confirm dialog 2x.

#### G-U4: Custom Comments (P0)

**Fungsi server (`/pesan/+page.server.ts` action `default`):**
- Kalau service `type === "Custom Comments"`: `quantity` = line count dari `komen` field, kirim `comments` ke SMMturk (bukan `quantity`).
- Kalau `type === "Default"`: pakai `quantity` numeric, `komen` kosong.

```typescript
const komen = String(form.get("komen") ?? "").trim();
const isCustomComments = s.type === "Custom Comments";
const quantity = isCustomComments ? komen.split("\n").filter(Boolean).length : Number(form.get("quantity"));

if (isCustomComments && !komen) return fail(400, { error: "Komen wajib diisi untuk layanan Custom Comments" });
if (!isCustomComments && (!quantity || quantity < s.min)) return fail(400, { error: `Min ${s.min}` });

// Kirim ke SMMturk
const result = isCustomComments
  ? await smmturkAdd(String(s.providerServiceId), link, 0, komen)  // comments field
  : await smmturkAdd(String(s.providerServiceId), link, quantity); // quantity field
```

**Design UI (`/pesan/+page.svelte`):**
- Kalau service `type === "Custom Comments"`: tampilkan textarea (bukan qty stepper). Label "Komentar (1 per baris)". Counter line count. Hint: "100 komentar = 100 qty, harga dihitung per 1000".
- Kalau `type === "Default"`: qty stepper seperti biasa.

#### G-U5: Repeat Order / Copy Link (P1)

**Design:** Di detail sheet order → tombol "Pesan Ulang" (icon refresh) → navigasi ke `/pesan?service=<serviceId>&link=<encodedLink>&qty=<qty>`. Form `/pesan` baca query param, prefilled.

**Fungsi `/pesan/+page.server.ts` load:**
```typescript
const urlParams = new URL(request.url).searchParams;
return {
  prefill: {
    serviceId: urlParams.get("service"),
    link: urlParams.get("link"),
    quantity: urlParams.get("qty"),
  },
};
```

#### G-U6: Avatar Upload (P1)

**Fungsi (`/akun/+page.server.ts` action `avatar`):**
```typescript
avatar: async ({ request, locals }) => {
  const form = await request.formData();
  const file = form.get("avatar") as File;
  if (!file || file.size > 2_000_000) return fail(400, { error: "Max 2MB" });

  // Upload ke R2
  const buf = await file.arrayBuffer();
  const key = `avatars/${locals.user!.id}-${Date.now()}.${file.type.split("/")[1]}`;
  await r2.putObject({ Bucket: "socio", Key: key, Body: buf, ContentType: file.type });

  const url = `https://cdn.socio.id/${key}`;
  await db.update(users).set({ has: url }).where(eq(users.id, locals.user!.id));
  return { success: "Avatar diperbarui", avatar: url };
},
```

**Design:** Avatar di `/akun` → tap → bottom-sheet: "Ambil Foto" / "Pilih Galeri" / "Hapus". Crop circular (client-side canvas). Preview langsung.

#### G-U7: Affiliate Withdraw (P1)

**Fungsi (`/affiliate/+page.server.ts` action `withdraw`):**
```typescript
withdraw: async ({ request, locals }) => {
  const form = await request.formData();
  const amount = Number(form.get("amount"));
  const method = String(form.get("method")); // BCA / DANA / OVO / GoPay

  if (amount < 50000) return fail(400, { error: "Min withdraw Rp50.000" });

  // Cek saldo komisi pending
  const [row] = await db.select({ total: sql`SUM(balance)` })
    .from(affiliate).where(and(eq(affiliate.userId, locals.user!.id), eq(affiliate.status, "Pending")));
  const pending = Number(row?.total ?? 0);
  if (amount > pending) return fail(400, { error: "Saldo komisi tidak cukup" });

  // Create withdraw request
  await db.insert(affiliate).values({
    userId: locals.user!.id, userAffi: locals.user!.id,
    balance: -amount, status: "Withdraw", createdAt: new Date(),
    note: `Withdraw via ${method}`,
  });

  return { success: "Withdraw diajukan. Diproses 1×24 jam." };
},
```

**Design:** Tombol "Withdraw" di `/affiliate` → bottom-sheet: input amount (preset 50k/100k/all), pilih metode (BCA/DANA/OVO/GoPay), input nomor tujuan. Confirm → toast.

### 17.5 Detail Improvement per Item (design singkat)

#### I-U1: Coupon/voucher
- Admin CRUD coupon (di `/admin/coupons`).
- User input kode di `/pesan` checkout → apply → discount.
- Display: chip "Hemat Rp X" di price preview.

#### I-U2: Loyalty point + tier
- Poin otomatis per order (1pt per Rp1.000).
- Tier badge di `/akun` (Bronze/Silver/Gold/Platinum).
- Diskon tier otomatis di pricing (member tier discount).
- Progress bar ke tier berikutnya.

#### I-U3: Order ETA
- Hitung avg `created_at` → `updatedAt` (status Success) per service.
- Display di `/layanan` card: "⏱ Rata-rata 2 jam".
- Display di order detail: "Estimasi selesai ~2 jam lagi".

#### I-U7: Onboarding tour (1st login)
- 4 tooltip overlay: saldo → pesan → layanan → pesanan.
- "Lewati" / "Lanjut" button.
- Persist via cookie `onboarded=1`.

#### I-U11: Service favorite/bookmark
- Icon star di `/layanan` card → toggle bookmark.
- Tab "Favorit" di `/layanan`.
- Simpan ke `saved_links` table (atau table baru `favorites`).

#### I-U13: Realtime balance update
- SSE event `balance` push ke dashboard.
- SaldoHero count-up animation saat update.

#### I-U17: Refund to balance (auto)
- Cron `light.ts` cek order status berubah ke "Error" / "Canceled" dari provider → auto-refund saldo + notif.
- Audit log "auto_refund".

---

## 18. Urutan Kerja (revised — priority fix dulu)

### Phase 1: Fix Gap Kritis (P0 — blocker)
1. **G-U1: Saldo top-up action** — create deposit + instruksi BCA + Midtrans snap.
2. **G-U4: Custom comments** — textarea untuk Custom Comments, kirim `comments` ke provider.
3. **G-U2: Refill order** — action + tombol di detail sheet.
4. **G-U3: Cancel order** — action + refund saldo.

### Phase 2: Fix Gap Secondary (P1)
5. **G-U5: Repeat order** — tombol "Pesan Ulang" + prefilled form.
6. **G-U6: Avatar upload** — R2 upload + crop.
7. **G-U7: Affiliate withdraw** — action + form.
8. **G-U9: Order detail sheet lengkap** — timeline + aksi.
9. **G-U10: Unique amount** — anti-wrong-transfer.
10. **G-U11: Bukti transfer upload** — R2 + preview admin.
12. **G-U13: Halaman notif** — `/notif` list + mark as read.

### Phase 3: Polish existing routes
13. **App Shell** — `(app)/+layout.svelte` (BottomNav, FAB, header). ✅ done
14. **Dashboard** `/` — saldo hero, quick grid, order terbaru, notif. ✅ done
15. **Layanan** `/layanan` — search + filter + infinite scroll + favorite (I-U11). ✅ done
16. **Pesan** `/pesan` — form + price preview + confirm + optimistic + custom comments + coupon (I-U1). ✅ done
17. **Pesanan** `/pesanan` — list + filter + detail sheet + SSE + refill + cancel + repeat + mass refund. ✅ done
18. **Saldo** `/saldo` hub + `/saldo/top-up` + `/saldo/riwayat` + unique amount + bukti upload + QR. ✅ done
19. **Akun** `/akun` — profile + API key + theme (G-U20 dark mode fixed) + avatar. (2FA I-U18: deferred)
20. **Tiket** `/tiket` — list + create + chat detail + reply + close. (attachment G-U14: deferred)
21. **Affiliate** `/affiliate` + withdraw (G-U7) + QR code. ✅ done
22. **Notif** `/notif` — baru (G-U13).
23. **Auth polish** (login, daftar, lupa-password).

### Phase 4: Improvements (value-add)
24. **I-U7: Onboarding tour** (1st login).
25. **I-U3: Order ETA**.
26. **I-U2: Loyalty point + tier**.
27. **I-U1: Coupon** (butuh admin CRUD dulu).
28. **I-U6: Web Push** prompt.
29. **I-U13: Realtime balance** SSE.
30. **I-U17: Auto-refund** cron.
31. **I-U20: Empty state** illustration.

---

*Dokumen ini kontrak untuk frontend agent. Kalau kontradiksi dengan `REBUILD_PLAN.md`, REBUILD_PLAN menang. Kalau ragu, tanya user.*
