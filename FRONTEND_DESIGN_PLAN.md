# FRONTEND DESIGN PLAN — Socio.id App

> **Untuk: coding agent frontend.** Dokumen ini adalah kontrak antara infrastruktur backend (sudah live) dan UI yang harus dibangun. **100% mobile-first** — semua user socio.id adalah mobile users Indonesia.
>
> **BACA WAJIB SEBELUM NGODE**: `AGENTS.md`, `DESIGN.md`, `docs/MOBILE_UX_GUIDE.md`, `docs/ADMIN_GAP.md`. Infrastruktur sudah jalan, jangan ubah route path atau API contract.

---

## 0. Status Infrastruktur (sudah live, jangan diubah)

| Komponen | Status | Catatan |
|---|---|---|
| VPS (Tencent Jakarta) | ✅ Live | `43.157.204.17`, Coolify panel `coolify.socio.id` |
| DB MySQL (`socio-db`) | ✅ Live | 37 tabel, `127.0.0.1:3306` di VPS, **BUKAN TiDB** |
| app.socio.id | ✅ Live | SvelteKit + adapter-node, deploy via Coolify (git push → auto deploy) |
| socio.id (landing) | ✅ Live | Cloudflare Pages, Astro |
| Cloudflare | ✅ Live | DNS + proxy, SSL Full (strict), security headers |
| R2 Storage (`cdn.socio.id`) | ✅ Live | Bucket `socio`, public read |
| Cron (node-cron) | ✅ Live | provider-sync hourly, status-polling per menit, light cron 15 menit |
| Auth (better-auth) | ✅ Live | bcryptjs, session cookie, Turnstile |
| SMMturk sync | ✅ Live | 8153 layanan tersinkron |
| Reseller API `/api/v1` | ✅ Live | services/order/status/refill/profile |
| Webhook (Tripay/Midtrans/Jasamutasi) | ✅ Code ready | **Butuh env keys** dari user (lihat §9) |

**Deploy workflow**: `git push` ke `main` → Coolify auto-build → container restart. Build: `pnpm install && pnpm --filter app build`. Start: `node app/build`.

---

## 1. Prinsip Mobile-First (WAJIB)

**100% user adalah mobile (Android low-end + iPhone).** Aturan mutlak:

1. **Target viewport 360×640 minimum.** Test di Chrome DevTools mobile emulation: Galaxy A51 (360×800), iPhone SE (375×667), tablet (768×1024).
2. **Touch target minimum 44×44px** (WCAG). Button, link, icon — semua bisa ditekan dengan jari.
3. **Bottom navigation** untuk 5 halaman utama (Dashboard, Layanan, Pesanan, Saldo, Akun). FloatingActionButton untuk aksi utama (Pesan).
4. **Thumb-friendly zone**: aksi utama di bawah, navigasi di bottom. Gak ada menu hamburger untuk primary nav.
5. **Safe-area inset**: `env(safe-area-inset-bottom)` untuk bottom nav + iPhone notch.
6. **No hover-dependent interactions** — mobile gak ada hover. Semua state harus accessible via tap.
7. **Skeleton loading** (bukan spinner) untuk semua data fetch. User mobile benci blank screen.
8. **Pull-to-refresh** pada list pages (pesanan, riwayat saldo, layanan).
9. **Optimistic update** untuk aksi (order, top-up, balas tiket) — update UI langsung, rollback kalau error.
10. **Offline-aware**: tampilkan toast "Koneksi terputus" + retry button. PWA service worker sudah ada.
11. **No horizontal scroll** — semua content fit dalam viewport mobile.
12. **Font size minimum 14px** untuk body text. Base 15px (design contract).

---

## 2. Design System (sudah ada — PAKAI, jangan invent)

### Tokens (di `packages/ui/src/tokens.css`)
- **Palette**: OKLCH tinted paper/ink. Accent untuk CTA/link/icon. `--accent-ink` (L=0.42-0.48) untuk button fill (AA contrast 4.5:1).
- **Typography**: Plus Jakarta Sans (sans), Sora (display). Base 15px, ratio 1.2. Weight 400/500/600/700. Mono ≤14px untuk data atoms (order ID, timestamp).
- **Spacing**: 4px base. Compact rhythm (max 64px between sections).
- **Radius**: 4-32 (xs input → 2xl hero). Pill untuk chip/tag.
- **Motion**: `cubic-bezier(0.25,1,0.5,1)`. Hover 150-200ms, reveal 400-600ms, entrance 600-800ms. Transform+opacity only. `prefers-reduced-motion` respected.
- **Shadow**: soft, layered (bukan hard box-shadow).

### Komponen tersedia (`packages/ui/src/components/`)
Button, Card, StatusBadge, BalancePill, MobileShell, Input, Skeleton, Tabs, Avatar, Toast (+ `toast.ts`), Sheet (bottom-sheet), ConfirmDialog, SaldoHero, QuickGrid, ServiceCard, BottomNav, FAB, QtyStepper, EmptyState.

**Pakai komponen yang ada.** Jangan bikin duplikat. Kalau butuh komponen baru, cek `DESIGN.md` dulu.

### 8 Anti-pattern (DILARANG, dari `looks-expensive`)
1. **Bullet budget ≤5** per section — jangan list 10 fitur.
2. **Eyebrow pill ≤1** per section — jangan berlebihan.
3. **Card chrome ≤2** default — jangan border+shadow+radius berlebihan.
4. **3-tier pricing card generik** → ganti dengan HTML table.
5. **4-col stat strip** → ganti dengan inline-stat.
6. **No imagery** → pakai `<img>` real (Unsplash/Picsum) atau ilustrasi.
7. **Container identik** ≥3 patterns per page (jangan semua card grid).
8. **Inter default** → Plus Jakarta Sans/Sora (sudah set).

---

## 3. Route Map (semua route yang ADA — jangan ubah path)

### Auth routes (`/(auth)/` — no auth required)
| Path | Fungsi | Status |
|---|---|---|
| `/login` | Login email+password, Turnstile | ✅ Live |
| `/daftar` | Register (username, email, password, Turnstile, zxcvbn meter) | ✅ Live |
| `/lupa-password` | Request reset link (email) | ✅ Live |
| `/reset` | Set password baru (token dari email) | ✅ Live |
| `/verifikasi` | Verify email (token dari email) | ✅ Live |

### App routes (`/(app)/` — auth required, redirect ke /login kalau no session)
| Path | Fungsi | Mobile Spec |
|---|---|---|
| `/` | Dashboard: saldo hero, quick grid (pesan/layanan/saldo/tiket), order terbaru (5), notif terbaru | BottomNav active=Dashboard, FAB=Pesan |
| `/layanan` | List layanan (8153 services dari SMMturk). Search + filter kategori + search bar sticky. Tap → sheet detail + tombol Pesan. | BottomNav active=Layanan. Infinite scroll. |
| `/pesan` | Form pesan: pilih layanan (searchable), input link, qty stepper, preview harga, submit. | FAB atau dari /layanan. Confirm dialog sebelum submit. |
| `/pesanan` | Riwayat order: filter chips (Semua/Pending/Proses/Selesai/Gagal), list card, tap → bottom-sheet detail + swipe-to-reorder. SSE live status. | BottomNav active=Pesanan. Pull-to-refresh. |
| `/saldo` | Redirect → `/saldo/top-up` | — |
| `/saldo/top-up` | Top-up saldo: pilih metode (QRIS/VA/Manual), input nominal, submit. | BottomNav active=Saldo. |
| `/saldo/riwayat` | Riwayat transaksi: filter (Semua/Masuk/Keluar), list, pull-to-refresh. | — |
| `/affiliate` | Dashboard affiliate: link referral + QR code, stats (klik, daftar, komisi), riwayat komisi, tombol withdraw. | — |
| `/tiket` | Support ticket: list tiket, buat tiket baru, balas (chat-style). | — |
| `/akun` | Profile: avatar, saldo, level badge, edit nama, ganti password, regenerate API key, theme toggle, logout, hapus akun. | BottomNav active=Akun. |
| `/api/sse` | Server-Sent Events: live order status + notif. EventSource. | Auto-reconnect. |

### Admin routes (`/(admin)/admin/` — level=Admin required)
| Path | Fungsi | Mobile Spec |
|---|---|---|
| `/admin` | Dashboard: stat cards (users/orders/deposits/revenue), activity feed | Dense table mobile → card-list |
| `/admin/users` | User mgmt: search, adjust balance, suspend/unsuspend | Card-list mobile, search sticky |
| `/admin/orders` | Order mgmt: filter, table view | Table → card mobile |
| `/admin/deposits` | Deposit mgmt: confirm/reject manual deposit | Card-list, approve/reject buttons |
| `/admin/audit` | Audit log: list admin actions | Read-only table |
| `/admin/settings` | Settings: maintenance toggle | Toggle switch |

**Belum dibangun (M3 phase 2 — frontend agent TIDAK kerjakan ini dulu, fokus user app dulu):**
`/admin/services`, `/admin/pricing`, `/admin/providers`, `/admin/tickets`, `/admin/affiliate`, `/admin/banner`, `/admin/reporting`, `/admin/news`, `/admin/marketing`.

### API routes (`/api/` — backend, jangan ubah)
| Path | Method | Fungsi |
|---|---|---|
| `/api/auth/[...all]` | ALL | better-auth handler (signin/signup/signout/session) |
| `/api/v1` | POST | Reseller API (services/order/status/refill/profile) — api_key auth |
| `/api/v1` | GET | API info + docs |
| `/api/sse` | GET | Server-Sent Events (live order status + notif) |
| `/api/cron/trigger` | POST | Manual trigger cron (admin only) — `{task:"sync"|"poll"}` |
| `/api/webhook/tripay` | POST | Tripay payment callback (signature verified) |
| `/api/webhook/midtrans` | POST | Midtrans payment notification (signature verified) |
| `/api/webhook/jasamutasi` | POST | Bank mutation callback (IP allowlist + signature) |

---

## 4. API Contract untuk Frontend

### Reseller API (`/api/v1` — POST, form-encoded)
**Auth**: `api_key` field (per user, ada di `users.api_key`).
**Format response**: `{ status: boolean, message: string, data?: any }`

```
POST /api/v1
  api_key=<key>&action=services        → { status, message, data: [{id,name,price,min,max,...}] }
  api_key=<key>&action=order&service=<id>&data=<link>&quantity=<qty>  → { status, message, data: {order_id, price} }
  api_key=<key>&action=status&id=<order_id>  → { status, message, data: {id,status,start_count,remains,price} }
  api_key=<key>&action=refill&id=<order_id>  → { status, message, data: {id} }
  api_key=<key>&action=profile        → { status, message, data: {username,full_name,balance,level} }
```

### Auth API (better-auth, `/api/auth/*`)
```
POST /api/auth/sign-in/email   { email, password }          → 200 + cookie, atau 401
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

### Data Schema (kolom penting)
- **users**: id, username, email, fullName, balance (number), level (Member/Agen/Reseller/Admin), apiKey, status ("1"=active, "0"=suspended), verify
- **orders**: id, oid, serviceName, data (=link), quantity, remains, startCount, price, status (Pending/Processing/In progress/Success/Partial/Canceled/Error/Refilling), createdAt, nextPollAt
- **deposits**: id, methodName, postAmount (jumlah yang harus dibayar), amount (saldo yang masuk), status (Pending/Success/Canceled), validasi (bank), expire, invoiceVirtual
- **services**: id, serviceName, price, priceReseller, priceApi, min, max, type, note, isRefill, status, categoryId, providerServiceId

---

## 5. Per-Route Mobile Spec (detail implementasi)

### Dashboard `/`
```
┌─────────────────────────┐
│  Saldo Hero (gradient)  │  ← BalancePill component, tap → /saldo
│  Rp 125.000             │
│  [Top Up]  [Riwayat]    │
├─────────────────────────┤
│  Quick Grid (2x2)       │  ← QuickGrid: Pesan, Layanan, Tiket, Affiliate
│  ┌───┐ ┌───┐            │
│  │ 📦│ │ 📋│            │
│  │Psn│ │Ly │            │
│  └───┘ └───┘            │
│  ┌───┐ ┌───┐            │
│  │ 🎫│ │ 👥│            │
│  │Tkt│ │Aff│            │
│  └───┘ └───┘            │
├─────────────────────────┤
│  Order Terbaru          │  ← 5 order, tap → /pesanan/[id] sheet
│  #1234 IG Followers...  │
│  ● Pending  500 qty    │
│  #1235 TT Likes...      │
│  ● Success  1000 qty   │
├─────────────────────────┤
│  Notif Terbaru          │  ← 3 notif, tap → actionUrl
├─────────────────────────┤
│  [BottomNav: 5 items]   │  ← safe-area-inset-bottom
└─────────────────────────┘
                            ┌───┐
                            │ + │ ← FAB: /pesan
                            └───┘
```

### Layanan `/layanan`
- Search bar sticky di top (auto-focus on mount, debounce 300ms).
- Filter chips horizontal scroll (Semua, Instagram, TikTok, YouTube, Telegram, ...).
- List: ServiceCard (nama, harga mulai Rp X, min-max qty, badge refill).
- Infinite scroll 20 per page.
- Tap card → Sheet (bottom-sheet) dengan detail + tombol "Pesan Sekarang" → `/pesan?service=<id>`.

### Pesan `/pesan`
- Step 1: cari layanan (searchable dropdown/sheet).
- Step 2: input link (validate URL), qty stepper (min-max dari service).
- Live price preview (compute per level, debounced).
- Custom comments (textarea, one per line) kalau type=Custom Comments.
- Confirm dialog: "Pesan X qty [service] untuk [link]? Total: Rp Y. Saldo setelah: Rp Z."
- Optimistic: langsung navigasi ke /pesanan, rollback + toast kalau error.

### Pesanan `/pesanan`
- Filter chips: Semua, Pending, Proses, Selesai, Gagal.
- Card list: order ID (mono), service name, status badge, qty, price, time relative ("2 jam lalu").
- Tap → bottom-sheet detail: semua info + tombol "Pesan Ulang" (→ /pesan?service=&link=) + "Refill" (kalau isRefill).
- Swipe-right on card → "Pesan Ulang" quick action.
- SSE: auto-update status badge real-time (green pulse animation).
- Pull-to-refresh.

### Saldo `/saldo/top-up`
- Nominal input (preset: 50k, 100k, 200k, 500k, custom).
- Metode: QRIS (instan), VA (BCA/BNI/BRI/Mandiri), Manual transfer.
- Submit → create deposit (pending) → tampilkan instruksi pembayaran + countdown expire (24 jam).
- Cek status otomatis tiap 10 detik (atau SSE).

### Saldo Riwayat `/saldo/riwayat`
- Filter: Semua, Masuk, Keluar.
- List: icon (in/out), amount (green/red), note, time relative.
- Group by date (Hari ini, Kemarin, 7 hari lalu, ...).
- Pull-to-refresh.

### Affiliate `/affiliate`
- Hero: link referral (copy button) + QR code (generate via `qrcode` lib).
- Stats: total klik, total daftar, komisi pending, komisi dibayar.
- Riwayat komisi: list.
- Withdraw button (min Rp 50.000).

### Tiket `/tiket`
- List tiket (status badge: Open/Answered/Closed).
- Tap → chat-style thread (user message right, admin left).
- Input + send button di bottom (sticky, safe-area).
- Buat tiket: button di header, pilih kategori (Order/Pembayaran/Lainnya) + pesan.

### Akun `/akun`
- Header: avatar (upload ke R2), username, level badge.
- Saldo card (tap → /saldo).
- Menu list (icon + label + chevron):
  - Edit Profile (nama, username)
  - Ganti Password (old, new, confirm + zxcvbn meter)
  - API Key (show/copy/regenerate)
  - Theme (Light/Dark/System)
  - Bantuan (→ /tiket)
  - Logout (confirm dialog)
  - Hapus Akun (danger, confirm dialog 2x)

---

## 6. Admin Mobile Spec (card-list, bukan table desktop)

Admin diakses via mobile juga (admin cek sambil mobile). Tapi admin **bukan prioritas** — fokus user app dulu.

- **Table → card-list mobile**: setiap row jadi card dengan info compact.
- **Search sticky** di top.
- **Action buttons**: inline di card (Approve/Reject, Suspend/Activate).
- **No hover menus** — semua action visible.
- Dashboard admin: stat cards (2x2 grid), activity feed (list).

---

## 7. Verification Checklist (sebelum bilang "done")

Setiap route selesai, WAJIB:
1. `pnpm --filter app lint` — no error (warning OK kalau a11y).
2. `pnpm --filter app check` (`svelte-check`) — 0 errors.
3. `pnpm --filter app build` — sukses.
4. Manual test `pnpm --filter app dev` di Chrome DevTools mobile (360×640 + 768×1024).
5. Cek AA contrast untuk accent-filled surfaces (button, badge, recommended plan) — min 4.5:1.
6. `prefers-reduced-motion` — animasi disable/reduce.
7. Keyboard navigation (Tab, Enter, Escape) — semua interactive accessible.
8. Lighthouse mobile score ≥ 90 (route public).
9. Tidak ada horizontal scroll di 360px width.
10. Touch target ≥ 44×44px.
11. Loading state: skeleton (bukan spinner) untuk data fetch.
12. Error state: empty state + retry button (bukan blank/error page).
13. Commit format: `feat(M2): {route} — {item}` atau `fix(M2): {masalah}`.

---

## 8. Tech Stack (JANGAN ubah)

- **Framework**: SvelteKit + adapter-node
- **UI**: Svelte 5 (runes: `$state`, `$props`, `$derived`)
- **Styling**: Tailwind v4 + design tokens dari `packages/ui/src/tokens.css`
- **DB**: Drizzle ORM (MySQL) — `import { db } from "@socio/db"`
- **Auth**: better-auth — `import { auth } from "$lib/server/auth"`
- **Components**: `import { Button, Card, ... } from "@socio/ui"`
- **Icons**: Lucide (sudah ada di `@socio/ui`)

**Dilarang**: React, Vue, jQuery, Bootstrap, CSS framework lain, raw CSS (pakai Tailwind classes).

---

## 9. Env Keys yang BELUM diset (butuh user)

Infra webhook handler sudah jalan, tapi **belum aktif** karena key belum diset di Coolify. Frontend agent TIDAK perlu ini untuk develop (mock/test aja). User perlu kasih:

| Key | Fungsi | Status |
|---|---|---|
| `RESEND_API_KEY` | Email (verification, reset, notif) | ❌ Belum — email fallback ke console.log |
| `TRIPAY_API_KEY` + `TRIPAY_PRIVATE_KEY` + `TRIPAY_MERCHANT_CODE` | Tripay payment (QRIS/VA) | ❌ Belum |
| `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` | Midtrans payment (VA/card) | ❌ Belum |
| `JASAMUTASI_API_KEY` | Bank mutation (BCA/Mandiri auto-confirm) | ❌ Belum |

**Cara set**: Coolify dashboard → app socio-app → Environment Variables → add. Atau via API. Setelah set, redeploy.

---

## 10. Test Credentials

- **Admin**: `info@beriklan.co.id` / `Admin123!` (level=Admin, untuk test admin routes)
- **User biasa**: daftar via `/daftar` (akan jadi level=Member)
- **Reseller API key**: login → `/akun` → copy API key

---

## 11. Don'ts (DILARANG)

1. **Jangan ubah route path** — semua path di §3 sudah live + indexed.
2. **Jangan ubah DB schema** — 37 tabel sudah ada + terisi data legacy.
3. **Jangan ubah API contract** — reseller script existing bergantung format `{status,message,data}`.
4. **Jangan invent komponen** — pakai yang ada di `@socio/ui`.
5. **Jangan ubah tech stack** — SvelteKit + Tailwind v4 + Drizzle.
6. **Jangan edit folder lama** (`app.socio.id/`, `socio.id/`) — reference only.
7. **Jangan commit tanpa `pnpm lint && pnpm check && pnpm build`** lulus.
8. **Jangan deploy tanpa instruksi user** — infra sudah live, deploy = git push.
9. **Jangan pakai Redis/MongoDB/PostgreSQL** — DB-backed queue (MySQL).
10. **Jangan pakai WebSocket** — SSE untuk real-time.

---

## 12. Urutan Kerja yang Disarankan

1. **Auth pages** (login, daftar, lupa-password, reset, verifikasi) — polish + a11y.
2. **Dashboard** `/` — saldo hero, quick grid, order terbaru, notif.
3. **Layanan** `/layanan` — search + filter + infinite scroll.
4. **Pesan** `/pesan` — form + price preview + confirm.
5. **Pesanan** `/pesanan` — list + filter + detail sheet + SSE.
6. **Saldo** `/saldo/top-up` + `/saldo/riwayat`.
7. **Akun** `/akun` — profile + API key + theme.
8. **Tiket** `/tiket`.
9. **Affiliate** `/affiliate`.
10. **Admin** (phase 2) — setelah user app solid.

---

*Dokumen ini adalah kontrak. Kalau ada kontradiksi dengan `REBUILD_PLAN.md`, `REBUILD_PLAN.md` menang. Kalau ragu, tanya user.*
