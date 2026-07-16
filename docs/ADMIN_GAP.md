# ADMIN_GAP.md — Analisa Fitur Admin Existing vs Rebuild

> Audit fitur admin `app.socio.id/admin/` (PHP lama) → daftar yang sudah ada, yang berisiko error, dan gap yang wajib di-improve di rebuild SvelteKit.

---

## 1. Inventory Fitur Admin Existing (sudah ada)

| Modul | File | Status | Catatan |
|---|---|---|---|
| **Dashboard** | `admin/index-edit.php` | ✅ | Stats: users, orders, deposits success/pending, total revenue, today orders/deposits. Welcome card. Chart? (perlu cek) |
| **Users** | `admin/users/users-edit.php`, `edit.php`, `delete.php`, `status.php`, `ajax.php` | ✅ | DataTable + bulk CSV export (P2-2). Edit user, delete, status toggle. |
| **Services** | `admin/service/index-edit.php` (40KB), `services/*` | ✅ duplikat | Ada 2 folder (`service/` + `services/`) — duplikasi. CRUD service + kategori, bulk delete, detail, get-service. |
| **Provider** | `admin/provider/index-edit.php`, `libraries.php` | ✅ | List provider + balance + last_sync + tombol Sync + auto_sync toggle (P1-2). |
| **Pricing rules** | `admin/setting/pricing.php` | ✅ | Markup per level (P1-1). |
| **Deposit** | `admin/balance/history-edit.php`, `confirm.php`, `detail.php`, `report-edit.php`, `ajax_table.php` | ✅ | History + confirm + detail + report. |
| **Order** | `admin/order/history-order.php` (619 lines), `detail.php`, `edit.php`, `edit-order.php`, `edit-provider-order.php`, `status.php`, `ajax_table.php`, `report-edit.php` | ✅ | History + stats (success/pending/progress/error) + detail + edit + edit-provider-order + status change. |
| **Tickets** | `admin/ticket/view-ticket.php` (32KB), `tickets/*` | ✅ duplikat | 2 folder (`ticket/` + `tickets/`) — duplikasi. View + reply + close. |
| **Affiliate** | `admin/affiliate/index.php` | ✅ | Summary + top referrer + detail (P1-7). |
| **Banner CMS** | `admin/setting/banners.php`, `promotion-banner.php`, `edit-promotion.php` | ✅ | CRUD + toggle (P2-6). Ada `banners.php` (baru) + `promotion-banner.php`/`edit-promotion.php` (lama) — duplikasi. |
| **Reporting** | `admin/reporting/index.php`, `export.php` | ✅ | Chart revenue + donut status + CSV export (P2-8). |
| **Email marketing** | `admin/marketing/campaigns-edit.php`, `email-templates.php`, `automation-status.php`, `campaign-analytics.php`, `create-template.php`, `preview-template.php`, `send-test-email.php`, `get-campaign.php` | ✅ | Lengkap: campaign CRUD, template, analytics, automation status, test send. |
| **News** | `admin/news/add.php`, `edit.php`, `delete.php`, `ajax.php`, `news-edit.php` | ✅ | CRUD. |
| **Setting website** | `admin/setting/website.php`, `edit.php` | ✅ | Setting umum. |
| **Health check** | `admin/health-check.php` | ✅ | Diagnostic. |
| **Notification** | `lib/NotificationManager.php` | ✅ | User + admin notif (order/deposit/ticket/news/promo). |

---

## 2. Risiko Error / Gap yang Wajib Diperbaiki di Rebuild

### 🔴 Kritis (data/uang)

| # | Gap | Risiko | Fix di rebuild |
|---|---|---|---|
| G1 | **Tidak ada audit log** — admin hapus user/approve deposit/refund/delete service tidak tercatat siapa+kapan | Forensik sulit kalau ada dispute/salah approve. Tidak ada accountability. | Tabel `audit_log` (admin_id, action, target_type, target_id, before JSON, after JSON, ip, created_at). Hook di setiap admin action. |
| G2 | **Refund tidak ada flow formal** — `admin/order/edit.php` edit manual, refund partial gak ada approval/verification | Salah refund → rugi. Tidak ada double-approval untuk refund besar. | Workflow refund: request → approve (admin lain) → execute. Batas auto-refund < Rp50k, di atas itu butuh approval. |
| G3 | **Balance adjustment admin tidak ada limit/dual-control** — admin bisa edit saldo user langsung tanpa audit | Penyalahgunaan admin / salah input. | Balance adjustment → record ke `balance_logs` + `audit_log` + butuh alasan (reason). Adjustment > Rp1jt → dual approval. |
| G4 | **Deposit confirm manual tanpa verify bukti transfer** | Deposit palsu. | Upload bukti transfer wajib + auto-match dgn mutasi bank (Jasamutasi/Tripay) + confirm hanya jika match. |
| G5 | **Provider API key plain text di DB** (`provider.api_key`) | Leak DB = leak semua provider key. | Encrypt at rest (AES-256 dgn env key) + decrypt only saat API call. | 

### 🟡 Penting (operasional)

| # | Gap | Dampak | Fix di rebuild |
|---|---|---|---|
| G6 | **Tidak ada role permission granular** — semua admin akses penuh | Admin junior bisa hapus user/refund besar. | Role: Super Admin / Admin / Operator / Finance. Permission per modul (RBAC). |
| G7 | **Tidak ada 2FA untuk admin** | Akun admin dibajak = disaster. | TOTP (Google Authenticator) + Passkey wajib untuk admin. |
| G8 | **Tidak ada maintenance mode toggle dari admin** | Saat deploy/fix, user masih bisa order → error. | Toggle maintenance di admin setting → middleware block semua route kecuali admin. |
| G9 | **Tidak ada backup management UI** | Backup manual cron, gak ada monitoring. | Admin: backup on-demand (dump ke R2), list backup, restore, schedule. |
| G10 | **Tidak ada server/queue monitoring** — cron sync/status gak visible | Kalau cron stuck, admin gak sadar. | Dashboard: queue depth, last run tiap cron, error rate, provider API health, DB size. |
| G11 | **Provider fallback tidak ada** — kalau SMMturk down, order stuck | Layanan unavailable. | Multi-provider: tiap service map ke provider primary + fallback. Kalau primary error, auto-retry fallback. |
| G12 | **Tidak ada order manual (offline order)** — kalau provider gak ada, admin gak bisa input manual | Limitasi. | Admin: create order manual (status manual, tidak kirim ke provider API). Untuk layanan custom/offline. |
| G13 | **Broadcast/push notification admin ke semua user tidak ada** | Pengumuman maintenance/promo manual. | Admin: broadcast in-app notif + Web Push ke segment user. |
| G14 | **Tidak ada export laporan PDF** (cuma CSV) | Laporan untuk pajak/audit manual. | Export PDF (pake svelte-pdf) + format invoice. |
| G15 | **Service category management terbatas** — kategori dari provider sync, gak bisa custom | Tidak bisa grouping layanan unggulan. | Admin: CRUD kategori + featured category + urutan kategori. |
| G16 | **Tidak ada service mapping antar provider** — service SMMturk vs JAP gak tersinkron | User lihat service duplikat. | Tabel `service_mapping` (service_id, provider_id, provider_service_id). Satu service internal → multi provider source. |
| G17 | **Newsletter/segment email gak ada unsubscribe analytics** | Tidak tahu efektivitas. | Open rate, click rate, unsubscribe rate per campaign. |
| G18 | **Tidak ada coupon/voucher** | Promo manual via banner only. | Admin: CRUD coupon (kode, diskon, min order, expiry, max usage). User apply di checkout. |
| G19 | **Tidak ada loyalty point / tier system** (P3-5 sebagian) | Retensi user lemah. | Poin per order, tier (Bronze/Silver/Gold), diskon tier. |
| G20 | **Tidak ada API rate-limit monitoring untuk API publik** | User abuse API. | Dashboard: API usage per user, top endpoint, rate-limit hit. |

### 🟢 UX/tech

| # | Gap | Dampak | Fix |
|---|---|---|---|
| G21 | **Folder duplikat** `service/`+`services/`, `ticket/`+`tickets/`, `banners.php`+`promotion-banner.php` | Confusion, bug satu satu. | Konsolidasi di rebuild (natural — struktur baru bersih). |
| G22 | **`error_log` file besar di banyak folder** (admin 153KB, order 95KB, users 159KB, ticket 44KB) | Disk bloat, info leak. | Logging terpusat ke Axiom/pino, hapus error_log file. |
| G23 | **Backup file `.backup`/`-backup-*` bertebaran** | Repo bloat. | Hapus di rebuild (sudah di-exclude .gitignore). |
| G24 | **Admin mobile belum card-list** (DataTable server-side) | Mobile admin susah. | Card-list mobile + table desktop, server-side filter. |
| G25 | **Search/filter admin terbatas** — DataTable client-side | Lambat untuk ribuan order. | Server-side search + filter + sort (Drizzle). |
| G26 | **Realtime activity feed admin tidak ada** | Admin refresh manual. | SSE feed: order baru, deposit baru, ticket baru, error. |
| G27 | **Dark mode admin tidak ada** | Admin malam lelah. | Dark mode (shared design system). |
| G28 | **Tidak ada "recent action" admin di dashboard** | Admin gak ingat terakhir apa yang dilakukan. | Widget recent action (dari audit_log). |
| G29 | **Bulk action terbatas** (cuma CSV export users) | Operasi massal manual. | Bulk: hapus, suspend, adjust balance, kirim email ke seleksi. |
| G30 | **Tidak ada confirm dialog untuk action destruktif** | Salah klik = hilang data. | Confirm dialog (bits-ui) untuk delete/refund/suspend. |

---

## 3. Fitur Admin BARU yang Wajib di Rebuild (prioritas)

### Phase 1 (wajib, M3):
1. **Audit log** (G1) — semua admin action tercatat.
2. **RBAC role** (G6) — Super Admin / Admin / Operator / Finance.
3. **2FA admin** (G7) — TOTP wajib.
4. **Provider API key encrypt at rest** (G5).
5. **Confirm dialog destruktif** (G30).
6. **Server-side search/filter** (G25) — Drizzle.
7. **Card-list mobile admin** (G24).
8. **Realtime activity feed** (G26) — SSE.
9. **Maintenance mode toggle** (G8).
10. **Queue/cron monitoring dashboard** (G10).

### Phase 2 (M3 atau setelah):
11. **Refund workflow + dual approval** (G2, G3).
12. **Deposit verify bukti transfer** (G4).
13. **Provider fallback + service mapping** (G11, G16).
14. **Order manual** (G12).
15. **Broadcast notification** (G13).
16. **Backup management UI** (G9).
17. **Export PDF** (G14).
18. **Coupon/voucher** (G18).
19. **Loyalty point/tier** (G19).
20. **API usage monitoring** (G20).

### Phase 3 (nice to have):
21. Newsletter analytics (G17).
22. Service category featured (G15).
23. Bulk action lengkap (G29).

---

## 4. Yang SUDAH Bagus (tidak perlu diubah konsep)

- Pricing rules per level (markup) — design bagus, port langsung.
- Provider auto-sync toggle + balance display — port + tambah fallback.
- Email marketing campaign + template + analytics — port + tambah open/click tracking.
- Reporting chart + CSV — port + tambah PDF.
- NotificationManager (user + admin) — port ke TS, tambah Web Push.
- Banner CMS — port + tambah scheduler/A-B.

---

**Kesimpulan:** Fitur admin existing **cukup lengkap secara modul**, tapi ada **5 gap kritis** (audit log, refund flow, balance control, deposit verify, key encryption) yang berisiko untuk bisnis uang. Plus **5 gap penting operasional** (RBAC, 2FA, maintenance mode, monitoring, provider fallback). Ini semua wajib di-rebuild, bukan optional. UX admin juga perlu upgrade mobile + realtime + dark mode.
