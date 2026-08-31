# AUDIT_FIX_PLAN.md — Audit Full App + Admin (23 Aug 2026) & Rencana Perbaikan

> Hasil audit read-only seluruh flow (user app + admin), dilakukan via `/dev-admin-login?as=admin`.
> Tidak ada mutasi/uang disentuh selama audit. Semua route render HTTP 200.
> Status tracking pakai checkbox. Update file ini tiap selesai item.
>
> **Update 24 Aug 2026** — Batch 1 (P0 money safety) sebagian besar selesai;
> affiliate commission + aktivasi reseller ter-wire penuh; sync SMMturk punya bahan.

---

## 0. Ringkasan eksekutif

| Area | Status |
|---|---|
| Login `?as=admin` → `/admin` | ✅ 303 → 200 |
| Semua route user (`/`, `/layanan`, `/pesan`, `/pesanan`, `/saldo*`, `/tiket`, `/affiliate`, `/akun`, `/notif`) | ✅ render |
| Semua route admin (15 modul) | ✅ render |
| **Pricing markup per level** | 🟡 fix partial — order+katalog sudah baca `pricing_rules` dari DB (cache 60s, fallback markup 0); save upsert + auto-seed tabel kosong belum |
| **Provider SMMturk** | 🟡 fix partial — row auto-seed `seedSmmturkProvider()` (key env, encrypted) + order routing per-provider key ✅; guard/migrasi mapping legacy (0/JAP/IRVAN/SMC) belum |
| **Balance mutations** | 🟡 fix partial — `/pesan` deduct atomic+refund ✅, Midtrans webhook atomic ✅; sisa `pesanan` cancel/massCancel + admin `users` adjust masih read-then-write |
| **Affiliate & aktivasi reseller** | ✅ **24 Agt** — komisi 2% wired (admin confirm + webhook Midtrans), daftar reseller + aktivasi via deposit + bonus Rp30rb berjalan |
| Deposit/admin safety | 🟡 confirm+bukti ✅, reject guard ✅; adjust tanpa limit ❌, refund approval manual ❌ (auto-refund ✅) |
| ADMIN_GAP G1–G30 | ✅ 7 · 🟡 9 · ❌ 11 (detail §4) |

---

## 🔴 1. Root cause pertanyaan utama

### 1.1 Kenapa markup harga tidak persentase per level? — 🟡 SESUDAH FIX PATCH

3 lapisan penyebab:

1. **Tabel `pricing_rules` KOSONG** (verifikasi `COUNT(*) = 0`).
   - `/admin/pricing` save action hanya `UPDATE ... WHERE level=X` tanpa upsert →
     silent no-op, tapi tetap toast "disimpan". [`pricing/+page.server.ts`] — **save upsert masih belum**
   - Tombol **"Seed default"** dan **"Terapkan default"** ada di `/admin/settings` → sudah ada (`applyDefaults`), tetapi belum auto-seed saat load `/admin/pricing` kosong.
2. **Order flow tidak pernah baca `pricing_rules`.** → ✅ **FIXED**: `pesan` + `layanan` kini pakai `getPricingRules()` (cache 60s) + `baseForLevel()` (`lib/server/pricing.ts`).
3. **Semantik base price salah vs data legacy.** → ✅ **FIXED**: `baseForLevel()` port `lib/pricing.php` (base = `price`/`price_reseller`/`price_api` per level + markup overlay).

**Efek user-facing:**
- ~~Katalog `/layanan` tampil harga base → total di `/pesan` ditagih 3× lipat~~ → ✅ harga katalog & checkout kini konsisten per level.
- API publik v1 (`api/v1/+server.ts:131-132`) masih menagih TANPA markup & tanpa rules DB → **masih terbuka**.

### 1.2 Kenapa SMMturk tidak ada di Provider? — 🟡 SESUDAH FIX PATCH

- ✅ Row SMMturk kini di-auto-seed `seedSmmturkProvider()` di `runAllProviderSync()` + tombol "Tambah SMMturk" di `/admin/providers` (key env, AES-256-GCM).
- Env key berfungsi — dites: `POST smmturk.org/api/v2 action=balance` → `$4.23 USD`.
- ✅ Order flow kirim ke provider sesuai row (key+URL milik provider itu), bukan lookup global.
- ❌ Sisa: guard `provider_id IN (0, non-SMMturk)` + migrasi mapping legacy belum — layanan warisan (provider_id 0/5/6/7) tetap terkirim ke row legacy dengan `provider_service_id` stale.
- ⏳ `provider_services` = 0 row → terisi otomatis begitu sync pertama (hourly/manual trigger) jalan.

---

## 🔴 2. Bug kritis — P0 (uang/data)

| ID | Bug | Status |
|---|---|---|
| P0-1 | Saldo ditulis read-then-write absolut | 🟡 `/pesan` ✅ (`deductBalance` guard `balance >= x` + refund atomik saat provider gagal), Midtrans ✅ — **sisa**: `pesanan` cancel/massCancel `:131-195`, admin `users` adjust `:99-100` |
| P0-2 | `pricing_rules` kosong + order flow tidak baca rule | 🟡 Order+katalog baca rules DB ✅ — **sisa**: save upsert + auto-seed tabel kosong + seed bakal mati kalau admin delete semua rule |
| P0-3 | Provider SMMturk belum ada; mapping legacy stale | 🟡 Auto-seed ✅ + per-provider routing ✅ — **sisa**: guard tolak order mapping stale + migrate `provider_id` legacy |
| P0-4 | Deposit confirm tanpa lihat bukti | ✅ Confirm dialog tampilkan ringkasan + link bukti (`img`) + "Pastikan bukti transfer cocok dengan nominal"; reject hanya Pending |
| P0-5 | Midtrans double-credit | ✅ Claim atomik `Pending→Success` (settlement+capture concurrent = 1 kredit), `gross_amount` ≠ `post_amount` ditolak, settle setelah cancel → reconcile manual |
| P0-6 | BCA placeholder + suffix beda rumus | ✅ Suffix dihitung server (`(id*7)%900`), client pakai `postAmount` dari response; nomor BCA dari env `SOCIO_BCA_NUMBER` (buku legacy terpenuhi 1392680815) |
| P0-7 | Upload bukti deposit tanpa cek kepemilikan | ❌ `uploadProof` masih `WHERE id = depositId` tanpa `userId` — **belum fix** |
| P0-8 | Custom Comments dibuang | 🟡 `/pesan` ✅ (`smmturkAddFor` param `comments`) — **sisa**: `api/v1` masih `smmturkAdd(psid,link,0)` tanpa komen & tanpa key per-provider |
| P0-9 | Close tiket tanpa cek `user_id` | ❌ `tiket close` masih tanpa ownership check — **belum fix** |
| P0-10 | assignRole self-escalate + RBAC | ❌ action `assignRole` belum diguard SuperAdmin — **belum fix** (→ G6) |

---

## 🟡 3. Gap fitur — P1 (feature set)

| ID | Fitur | Status | Plan |
|---|---|---|---|
| P1-1 | **Refund workflow** (G2) | 🟡 Auto-refund Error/Partial/Canceled ✅ (`cron/refund.ts` tiap 15m, CAS idempotent, port `refund.php`) — sisa: request+approval manual admin (dual-control) | Approval UI + audit |
| P1-2 | **Coupon: admin CRUD + apply di checkout** (G18) | ❌ | `/admin/coupons` CRUD; field code di `/pesan`; `applyCoupon`; counter `used`++ |
| P1-3 | **Harga katalog vs checkout konsisten** | ✅ Katalog `layanan` pakai `baseForLevel`; `pesan` pakai rules DB + preview real-time di client | — |
| P1-4 | **Order detail route** `/pesanan/[id]` | ❌ | Bottom-sheet + timeline |
| P1-5 | **Pesanan: pagination + search + filter tanggal** | ❌ hard-limit 30 | Offset/page param, cari oid/link/layanan, date range |
| P1-6 | **Deposit manual: expiry job + auto-match mutasi** | 🟡 Expiry ✅ (`cron/light.ts` tiap 15m: Pending + `expire < now` → Canceled) — auto-match Jasamutasi (opsional) ❌ | Opsional |
| P1-7 | **Tripay** payment | ❌ | Wire Tripay checkout + callback parity (+ affiliate commission di callback) |
| P1-8 | **Web Push end-to-end** (G13) | ❌ | `/api/push/subscribe`; `service-worker.ts` handler; admin broadcast |
| P1-9 | **Service mapping multi-provider** (G16, G11) | ❌ | Mapping internal ↔ provider_service_id per provider; fallback |
| P1-10 | **Verifikasi email gate** | ❌ | Gate order/topup jika `signup_verify_required=1` |
| P1-11 | Reporting orders: exclude order admin | ❌ | `WHERE level <> 'Admin'` |
| P1-12 | `/layanan` sort "terlaris" | ❌ masih `desc(id)` | Sort by order count |
| P1-13 | `/layanan` loadMore double-fetch | ❌ masih `goto()` | Append hasil fetch |

---

## 🟢 4. ADMIN_GAP G1–G30 — status checklist

### Done ✅
- [x] **G1** Audit log — `lib/server/admin.ts:5-22`, semua aksi mutasi sudah log
- [x] **G4** Deposit verify bukti (→ P0-4) — confirm dialog + bukti + reject guard ✅ 24 Agt
- [x] **G5** Encrypt provider key at rest — `crypto.ts` AES-256-GCM + tombol Encrypt All + key SMMturk auto-encrypted saat seed
- [x] **G8** Maintenance mode toggle + enforce di `hooks.server.ts`
- [x] **G25** Server-side search/filter — users/orders/deposits/services/audit/tickets
- [x] **G28** Recent admin action di dashboard
- [x] **G30** Confirm dialog — 9+ halaman deposits/reseller

### Partial 🟡
- [ ] **G2** Refund — auto-refund ✅, approval manual + dual-control ❌ (→ P1-1)
- [ ] **G3** Balance adjust — alasan wajib ✅, limit/dual-control ❌
- [ ] **G6** RBAC — roles disimpan tapi tidak dibaca guard; self-escalation mungkin (→ P0-10)
- [ ] **G10** Queue/cron monitoring — `provider_sync_log` tercatat ✅; error-rate & last-run per cron ❌
- [ ] **G13** Broadcast — email campaign ✅ (queue), web push ❌ (→ P1-8)
- [ ] **G15** Kategori — CRUD ada, tanpa featured/urutan
- [ ] **G17** Email analytics — sent/opened/clicked, tanpa unsubscribe tracking
- [ ] **G24** Card-list mobile — ✅ 10 halaman, ❌ audit, tickets, pricing, reporting masih table-only
- [ ] **G27** Dark mode — toggle user ada, admin layout belum
- [ ] **G29** Bulk actions — hanya bulk delete services

### Missing ❌
- [ ] **G7** 2FA admin (TOTP)
- [ ] **G9** Backup management UI
- [ ] **G11** Provider fallback (→ P1-9)
- [ ] **G12** Order manual admin
- [ ] **G14** Export PDF
- [ ] **G16** Service mapping (→ P1-9)
- [ ] **G18** Coupon admin + checkout (→ P1-2)
- [ ] **G19** Loyalty point/tier
- [ ] **G20** API usage monitoring
- [ ] **G26** SSE realtime feed admin

---

## 📱 5. UI/UX checklist

### Mobile (target 360×640, satu tangan)
- [ ] Order detail bottom-sheet route (P1-4) — push notif link kini dead-end
- [ ] Pesanan: pagination/search (P1-5) — 26k order tak bisa dicari
- [x] Harga katalog = harga checkout per level (P0-2 / P1-3) ✅ 24 Agt
- [ ] Admin card-list untuk **audit, tickets, pricing, reporting** (G24)
- [ ] Checkbox bulk target ≥44px (`pesanan` bulk `h-6 w-6`)
- [ ] `/layanan`: hilangkan double-fetch loadMore + sort "terlaris" beneran (P1-12/13)
- [ ] Notif: pagination >50 item
- [x] Top-up: nominal tampil benar (P0-6) ✅ 24 Agt
- [ ] Affiliate: `reffKode` fallback `userId` — rapikan typing + riwayat komisi

### Desktop
- [ ] Toggle dark mode di admin layout (G27)
- [ ] Admin feed realtime SSE (G26)
- [ ] Kalkulator profit reseller (REBUILD_PLAN §859, belum ada)
- [ ] Bulk actions users (suspend/export)
- [ ] Reporting: exclude order admin + export PDF (G14, P1-11)

---

## ✅ 7. Selesai sesi 24 Aug 2026 (di luar audit asli)

- [x] Affiliate commission wired: admin confirm deposit + webhook Midtrans → upline Reseller 2% Pending (`lib/server/affiliate.ts`)
- [x] Aktivasi reseller end-to-end: daftar reseller → deposit `untuk_apa=reseller` + email instruksi → admin confirm → `verify=Yes` + bonus saldo Rp30rb + email selamat datang (`lib/server/signup.ts`)
- [x] `seedSmmturkProvider()` — row SMMturk auto-seed saat sync hourly (key env, encrypted)
- [x] Midtrans webhook: reseller activation + affiliate commission di payment path
- [x] `createNotification()` generik (`lib/server/notification.ts`)

---

## 🗂 6. Urutan eksekusi yang disarankan

**Batch 1 — P0 money safety** 🟡 hampir selesai
1. ~~Seed `pricing_rules`~~ → sisa: upsert save + auto-seed load (`/admin/pricing`)
2. ~~Order flow + katalog baca rule dari DB~~ ✅
3. ~~Insert provider SMMturk~~ ✅ → sisa: guard/migrate mapping legacy
4. ~~Balance mutations atomik~~ → sisa: `pesanan` cancel/massCancel + admin adjust
5. P0-4 ✅, P0-5 ✅, P0-6 ✅ — **sisa: P0-7, P0-9, P0-10**

**Batch 2 — P1 fitur inti (2–3 sesi)**
P1-2 coupons, P1-4/5 pesanan, P1-8 web push, P1-7 Tripay, P1-1 refund approval

**Batch 3 — Polish**
G24 sisa, G26, G27, G14, mobile items §5, lalu `pnpm lint && typecheck && test` + manual pass
sesuai AGENTS.md §7 sebelum klaim selesai.

---

*Cara track: centang `[x]` per item selesai, commit format `fix(M3): P0-x — {deskripsi}`.*
*Dibuat: audit 23 Aug 2026 · Update: 24 Aug 2026 (sesi affiliate/reseller wiring).*
