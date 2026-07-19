# ADMIN DESIGN PLAN — app.socio.id/admin

> **Untuk: coding agent frontend.** Redesign admin panel `(admin)/admin/*` (SvelteKit + Svelte 5). **Mobile-friendly card-list, bukan DataTable desktop-only.** Bukan clone panel lama — rebuild dengan gap fix (G1-G30 dari `docs/ADMIN_GAP.md`) + improvement.
>
> **BACA WAJIB**: `AGENTS.md`, `DESIGN.md`, `docs/ADMIN_GAP.md`, `ADMIN_DESIGN_PLAN.md` (file ini). Infra + audit_log + admin_roles table sudah live.

---

## 0. Vision — "Admin Terasa Pro, Bukan Panel Tua"

**Bukan** admin panel PHP lama (table abu-abu + menu sidebar berlapis + reload page). Socio.id admin = **dashboard pro mobile-friendly**, terasa seperti Linear/Stripe Dashboard/Vercel — clean, dense tapi lega, real-time, accountable.

**Admin persona**: Admin socio.id (mobile-first juga, cek order/deposit sambil mobile). Butuh: glance status bisnis, approve deposit cepat, trace siapa doing what, monitoring cron/queue health.

**3 prinsip admin**:
1. **Accountable** — semua action tercatat audit_log, ada recent action di dashboard.
2. **Mobile-friendly** — card-list mobile, table desktop, server-side search/filter.
3. **Real-time** — SSE feed order/deposit/ticket/error baru, gak refresh manual.

**Brand temperature**: Neutral/Clean (bukan Bold seperti user app). Lebih dense, lebih netral, fokus data. Tapi share design tokens (Plus Jakarta Sans, Sora, OKLCH palette).

---

## 1. Admin Gap Analysis (dari ADMIN_GAP.md, 30 gap → prioritas)

### 🔴 Kritis (data/uang) — Phase 1 WAJIB
| # | Gap | Fix | Status Infra |
|---|---|---|---|
| G1 | Tidak ada audit log | Tabel `audit_log` + hook di setiap admin action | ✅ **Live** (audit_log table + logAudit di confirm/suspend/adjust) |
| G2 | Refund gak ada flow formal | Workflow: request → approve (admin lain) → execute. Auto-refund <Rp50k, di atas dual approval | ❌ Belum |
| G3 | Balance adjustment tanpa limit | Record ke balance_logs + audit_log + reason. Adj >Rp1jt → dual approval | ⚠️ Partial (audit + reason ada, dual approval belum) |
| G4 | Deposit confirm tanpa verify bukti | Upload bukti wajib + auto-match mutasi + confirm kalau match | ⚠️ Partial (manual confirm works, auto-match gak ada karena Tripay/Jasamutasi dihapus) |
| G5 | Provider API key plain text | Encrypt at rest (AES-256 env key) | ❌ Belum |

### 🟡 Penting (operasional) — Phase 1/2
| # | Gap | Fix | Status |
|---|---|---|---|
| G6 | Tidak ada RBAC granular | Role: Super Admin / Admin / Operator / Finance. Permission per modul | ⚠️ Partial (admin_roles table ada, enforcement belum) |
| G7 | Tidak ada 2FA admin | TOTP (Google Auth) + Passkey wajib admin | ❌ Belum |
| G8 | Maintenance mode toggle | Toggle di admin setting → middleware block | ✅ **Live** (maintenance_mode setting + hook) |
| G9 | Backup management UI | On-demand dump ke R2, list, restore, schedule | ❌ Belum |
| G10 | Queue/cron monitoring | Dashboard: queue depth, last run, error rate, provider health | ⚠️ Partial (provider_sync_log ada, UI belum) |
| G11 | Provider fallback | Multi-provider: primary + fallback per service | ❌ Belum (1 provider SMMturk) |
| G12 | Order manual (offline) | Admin create order manual, status manual | ❌ Belum |
| G13 | Broadcast notif | Broadcast in-app + Web Push ke segment | ❌ Belum |
| G14 | Export PDF | svelte-pdf + format invoice | ❌ Belum (CSV aja) |
| G15 | Service category custom | CRUD kategori + featured + urutan | ❌ Belum |
| G16 | Service mapping multi-provider | Tabel service_mapping | ❌ Belum |
| G17 | Newsletter analytics | Open/click/unsubscribe rate | ❌ Belum |
| G18 | Coupon/voucher | CRUD coupon, user apply checkout | ❌ Belum |
| G19 | Loyalty point/tier | Poin per order, tier, diskon | ❌ Belum |
| G20 | API rate-limit monitoring | Dashboard API usage per user | ❌ Belum |

### 🟢 UX/tech — Phase 1
| # | Gap | Fix | Status |
|---|---|---|---|
| G24 | Admin mobile belum card-list | Card-list mobile + table desktop | ❌ Belum (table aja) |
| G25 | Search/filter client-side | Server-side Drizzle | ⚠️ Partial (search ada, filter belum) |
| G26 | Realtime activity feed | SSE feed order/deposit/ticket/error | ❌ Belum |
| G27 | Dark mode admin | Shared design system | ❌ Belum |
| G28 | Recent action widget | Dari audit_log | ❌ Belum |
| G29 | Bulk action | Hapus/suspend/adjust/email massal | ❌ Belum (CSV export aja) |
| G30 | Confirm dialog destruktif | ConfirmDialog component | ✅ Ada (component) |

---

## 2. Improvement BARU (di luar gap, value-add)

### A. Admin Dashboard "Command Center"
- **Stat cards 2x2**: Users aktif hari ini, Orders hari ini, Deposit pending, Revenue hari ini.
- **Realtime activity feed** (SSE): "User @x daftar", "Order #1234 Pending", "Deposit #56 menunggu confirm", "Cron sync gagal".
- **Recent admin action** (G28): widget "Tindakan kamu terakhir: confirm deposit #56 (2 jam lalu)".
- **Queue health** (G10): provider_sync_log last run, status_polling count, job_queue depth.

### B. Smart Deposit Match
- Saat admin buka deposit pending → tampilkan bukti transfer (image preview dari R2).
- Auto-suggest match: cari deposit lain dgn amount sama (anti double-confirm).
- 1-tap confirm + balance_logs otomatis + audit_log.

### C. Order Operations Center
- Filter powerful: by status, date range, provider, user, amount range.
- Bulk action: select multiple → refund / cancel / export CSV.
- Order detail: timeline status (Pending → Proses → Berhasil dgn timestamp).
- **Refund workflow** (G2): request → approve admin lain → execute + audit.

### D. Provider Sync Monitoring
- Dashboard: last sync time, duration, fetched/changed count, error log.
- Trigger sync manual (button → `/api/cron/trigger`).
- Auto-sync toggle per provider.
- Balance provider (USD + IDR equivalent).

### E. RBAC + 2FA
- Role: Super Admin (all), Admin (all except settings), Operator (users/orders/deposits), Finance (deposits/reports).
- Permission per route (middleware check).
- 2FA TOTP wajib untuk admin (login → input OTP).

### F. Content & Marketing
- **Banner CMS** (G15/G18): CRUD banner promo + coupon + schedule.
- **News CRUD**: blog post + category.
- **Email campaign**: segment user (active/inactive/reseller), template, schedule, analytics.

### G. Reports & Export
- Revenue chart (daily/weekly/monthly).
- Order status donut.
- Top service / top user.
- Export CSV + PDF (invoice format).
- Date range filter.

### H. Server Health
- DB size + table count.
- Cron last run + error rate.
- API usage per user (G20).
- Backup status (G9).

---

## 3. Tech Stack (sama dgn app, reuse)

- SvelteKit + Svelte 5 runes + Tailwind v4 + @socio/ui
- **LayerChart** atau **svelte-chartjs** untuk dashboard chart
- **svelte-pdf** untuk export PDF
- **drizzle-orm** untuk server-side query
- **SSE** untuk realtime feed (`/api/admin/sse`)

---

## 4. Admin Layout — Mobile-First

### Layout utama `(admin)/+layout.svelte`
```
Desktop (≥1024px):
┌──────┬─────────────────────────────┐
│      │  Topbar (search + notif)    │
│ Side ├─────────────────────────────┤
│ nav  │  Page content (table/chart) │
│ (fix)│                             │
│      │                             │
└──────┴─────────────────────────────┘

Mobile (<1024px):
┌─────────────────────────┐
│  ☰ Topbar (title + notif)│  ← hamburger → drawer
├─────────────────────────┤
│  Page content           │  ← card-list, bukan table
│  (card-list)            │
└─────────────────────────┘
```

### Sidebar nav (desktop) / Drawer (mobile)
| Icon | Label | Route | Role |
|---|---|---|---|
| LayoutDashboard | Dashboard | `/admin` | all |
| Users | Users | `/admin/users` | Super/Admin/Operator |
| ShoppingBag | Orders | `/admin/orders` | all |
| Wallet | Deposits | `/admin/deposits` | all |
| Boxes | Services | `/admin/services` | Super/Admin |
| Tags | Pricing | `/admin/pricing` | Super/Admin/Finance |
| Plug | Providers | `/admin/providers` | Super/Admin |
| Ticket | Tickets | `/admin/tickets` | Super/Admin/Operator |
| Users | Affiliate | `/admin/affiliate` | Super/Admin/Finance |
| Image | Banner | `/admin/banner` | Super/Admin |
| FileText | News | `/admin/news` | Super/Admin |
| Mail | Marketing | `/admin/marketing` | Super/Admin |
| BarChart | Reports | `/admin/reports` | Super/Admin/Finance |
| Activity | Audit Log | `/admin/audit` | Super/Admin |
| Settings | Settings | `/admin/settings` | Super |

---

## 5. Per-Route Spec (admin)

### 5.1 Dashboard `/admin` (Command Center)
- **Stat cards 2x2** (tap → route detail):
  - Users aktif hari ini (green dot pulse).
  - Orders hari ini (count + revenue mini).
  - Deposit pending (count + total amount, amber).
  - Revenue hari ini (mono, count-up).
- **Realtime activity feed** (SSE, scrollable list, auto-update):
  - "2 menit lalu — User @x daftar"
  - "5 menit lalu — Order #1234 Pending"
  - "10 menit lalu — Deposit #56 menunggu confirm"
  - "1 jam lalu — Cron provider-sync: 8153 fetched, 12 changed"
- **Recent admin action** (G28): "Kamu terakhir: confirm deposit #56 (2 jam lalu)".
- **Queue health** (G10): 3 mini-stat (sync last run, polling count, queue depth).
- **Chart revenue** 7 hari (LayerChart line).

### 5.2 Users `/admin/users`
- **Search** (server-side, debounce 300ms): by username/email/id.
- **Filter chips**: Semua / Aktif / Suspended / Reseller / Agen.
- **Card-list mobile** / table desktop:
  - Avatar + username + email + level badge + balance + status.
  - Action inline: "Adjust Balance" / "Suspend" / "Edit" / "Delete" (confirm).
- **Bulk action**: select → suspend / adjust / export CSV.
- **Adjust balance** (G3): sheet dgn input amount + reason (wajib) → audit_log. >Rp1jt → dual approval badge.
- **Edit user**: nama, username, email, level, status, api_key (regenerate).

### 5.3 Orders `/admin/orders`
- **Filter powerful**: status chips + date range + provider + search (order id/user/service).
- **Card-list mobile** / table desktop:
  - Order ID (mono) + service + user + qty + price + status badge + time.
  - Tap → detail sheet: timeline status + link + provider_order_id + action.
- **Action**: Refill / Cancel / Refund (workflow G2) / Edit provider order.
- **Bulk**: select → refund / cancel / export CSV.
- **Stats bar**: count per status (Pending/Proses/Selesai/Gagal).

### 5.4 Deposits `/admin/deposits`
- **Filter**: status chips (Pending/Success/Canceled) + date + method.
- **Card-list**:
  - User + amount + method + status + time + bukti transfer thumbnail.
  - Tap → detail: bukti image full + match suggestion (anti double-confirm).
- **Action**: Confirm (1-tap, audit + balance log) / Reject (reason wajib).
- **Bulk**: select pending → confirm all (batch).

### 5.5 Services `/admin/services`
- **Search + filter** kategori + provider + status.
- **Card-list** / table: service name + category + price (Member/Agen/Reseller) + min/max + status.
- **CRUD**: tambah/edit/hapus service + kategori (G15).
- **Toggle status** (active/inactive).
- **Service mapping** (G16): map service internal → provider_service_id.

### 5.6 Pricing `/admin/pricing`
- **Table markup** per level (Member/Agen/Reseller/Admin):
  - markup_percent, flat_per_1k, min_profit_per_1k, is_active.
- Edit inline → audit_log.
- Preview: "Harga IG Followers untuk Reseller = Rp X (profit Rp Y)".

### 5.7 Providers `/admin/providers`
- **Card**: provider name + balance (USD + IDR) + last_sync + auto_sync toggle.
- **Sync trigger**: button → `/api/cron/trigger` → loading → result toast.
- **Sync log**: last 10 run (status, duration, fetched, changed, error).
- **API key encrypt** (G5): masked display, edit → re-encrypt.
- **Service mapping** per provider (G16).

### 5.8 Tickets `/admin/tickets`
- **List**: ticket + user + status + last reply + time.
- **Filter**: Open / Answered / Closed.
- **Tap → chat thread** (same UI as user, admin reply).
- **Action**: close ticket / assign.

### 5.9 Affiliate `/admin/affiliate`
- **Summary**: total komisi pending/dibayar, top referrer.
- **List**: user + referral count + komisi + withdraw requests.
- **Withdraw approval**: request → approve/reject + audit.

### 5.10 Banner CMS `/admin/banner`
- **List**: banner + position (hero/home/promo) + schedule + status.
- **CRUD**: upload image (R2) + link + start/end date + toggle.
- **Preview**: tampil di user app.

### 5.11 News `/admin/news`
- **List**: post + category + status + date.
- **CRUD**: title + content (markdown editor) + category + thumbnail.
- **Publish/draft** toggle.

### 5.12 Marketing `/admin/marketing`
- **Campaign list**: name + segment + status + sent/open rate.
- **Create**: template editor + segment (active/inactive/reseller/all) + schedule.
- **Analytics** (G17): open rate, click rate, unsubscribe rate per campaign.
- **Test send**: send ke email sendiri.

### 5.13 Reports `/admin/reports`
- **Date range picker**.
- **Chart**: revenue line, order status donut, top service bar, top user bar.
- **Export**: CSV + PDF (G14).
- **Summary card**: total revenue, total order, avg order value, refund total.

### 5.14 Audit Log `/admin/audit` (G1)
- **Table**: timestamp + admin + action + entity + entity_id + detail (JSON expand) + ip.
- **Filter**: by admin / action / entity / date.
- **Search**: by entity_id.
- **Export CSV**.

### 5.15 Settings `/admin/settings`
- **Maintenance mode toggle** (G8) — ✅ live.
- **Site settings**: name, logo, description, contact.
- **Payment methods**: toggle Manual BCA / Midtrans (config key).
- **Email config**: from address, support email.
- **RBAC** (G6): list admin + role assign.
- **Backup** (G9): on-demand dump, list, restore.
- **2FA enforcement** (G7): toggle wajib TOTP untuk admin.

---

## 6. Realtime Spec (SSE `/api/admin/sse`)

```
event: activity   data: { type: 'order'|'deposit'|'ticket'|'user'|'error', message, url }
event: queue      data: { sync_depth, poll_depth, last_sync }
event: stats      data: { users_today, orders_today, revenue_today }
```

- Auto-reconnect.
- Visible: activity feed prepend new item, fade-in 300ms.
- Notif badge topbar increment.

---

## 7. RBAC Permission Matrix

| Route | Super Admin | Admin | Operator | Finance |
|---|---|---|---|---|
| `/admin` (dashboard) | ✅ | ✅ | ✅ | ✅ |
| `/admin/users` | ✅ | ✅ | ✅ (view+suspend) | ❌ |
| `/admin/orders` | ✅ | ✅ | ✅ | ✅ (view) |
| `/admin/deposits` | ✅ | ✅ | ✅ (confirm) | ✅ |
| `/admin/services` | ✅ | ✅ | ❌ | ❌ |
| `/admin/pricing` | ✅ | ✅ | ❌ | ✅ (view) |
| `/admin/providers` | ✅ | ✅ | ❌ | ❌ |
| `/admin/tickets` | ✅ | ✅ | ✅ | ❌ |
| `/admin/affiliate` | ✅ | ✅ | ❌ | ✅ |
| `/admin/banner` | ✅ | ✅ | ❌ | ❌ |
| `/admin/news` | ✅ | ✅ | ❌ | ❌ |
| `/admin/marketing` | ✅ | ✅ | ❌ | ❌ |
| `/admin/reports` | ✅ | ✅ | ❌ | ✅ |
| `/admin/audit` | ✅ | ✅ | ❌ | ❌ |
| `/admin/settings` | ✅ | ❌ | ❌ | ❌ |

Enforcement: `+layout.server.ts` check `admin_roles.role` + permission map.

---

## 8. Anti-Pattern Admin (jangan)

1. **DataTable client-side** untuk ribuan row — pakai server-side.
2. **Sidebar fixed** di mobile — pakai drawer/hamburger.
3. **Reload page** on action — pakai form action + enhance.
4. **No confirm** untuk delete/refund/suspend — pakai ConfirmDialog.
5. **No audit** untuk action destruktif — wajib logAudit.
6. **Plain text API key** — encrypt (G5).
7. **Admin without 2FA** — wajib TOTP (G7).

---

## 9. Verification (sebelum bilang "done")

1. `pnpm --filter app lint && pnpm --filter app check && pnpm --filter app build` — 0 error.
2. Test mobile 360×640 (card-list) + desktop 1280×800 (table).
3. Audit log entry untuk setiap admin action (confirm/suspend/adjust/delete).
4. Confirm dialog untuk action destruktif.
5. RBAC: user non-admin → 403, admin role → akses sesuai matrix.
6. SSE feed real-time (order/deposit baru muncul <5s).
7. Lighthouse mobile ≥85 (admin bukan public, tapi tetap mobile-friendly).
8. Commit: `feat(M3): {admin-route} — {item}`.

---

## 10. Urutan Kerja Admin

### Phase 1 (wajib, lanjutan M3 core)
1. Dashboard `/admin` — stat cards + activity feed (SSE) + recent action.
2. Users — card-list mobile + bulk + adjust balance w/ reason.
3. Orders — filter powerful + bulk + refund workflow.
4. Deposits — bukti preview + 1-tap confirm + match suggestion.
5. Audit log — table + filter + export.
6. RBAC enforcement (role check di layout).

### Phase 2 (improvement)
7. Services CRUD + kategori custom.
8. Pricing table edit inline.
9. Providers — sync trigger + monitoring + key encrypt.
10. Tickets — chat thread.
11. Reports — chart + export PDF.
12. Settings — RBAC + backup + 2FA.

### Phase 3 (value-add)
13. Banner CMS.
14. News CRUD.
15. Marketing campaign.
16. Coupon/voucher (G18).
17. Loyalty point (G19).

---

*Dokumen ini kontrak admin untuk frontend agent. Kalau kontradiksi dengan `REBUILD_PLAN.md` / `ADMIN_GAP.md`, itu yang menang.*
