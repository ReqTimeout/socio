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

## 17. Urutan Kerja (saran)

1. **App Shell** — `(app)/+layout.svelte` (BottomNav, FAB, header).
2. **Dashboard** `/` — saldo hero, quick grid, order terbaru, notif.
3. **Layanan** `/layanan` — search + filter + infinite scroll.
4. **Pesan** `/pesan` — form + price preview + confirm + optimistic.
5. **Pesanan** `/pesanan` — list + filter + detail sheet + SSE.
6. **Saldo** `/saldo/top-up` + `/saldo/riwayat`.
7. **Akun** `/akun` — profile + API key + theme.
8. **Tiket** `/tiket`.
9. **Affiliate** `/affiliate`.
10. **Auth polish** (login, daftar, lupa-password).

---

*Dokumen ini kontrak untuk frontend agent. Kalau kontradiksi dengan `REBUILD_PLAN.md`, REBUILD_PLAN menang. Kalau ragu, tanya user.*
