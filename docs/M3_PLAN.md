# PLAN — M3: Pricing, SMMturk, Affiliate, API Key Encryption (REVISI)

> Revisi dari M3_PLAN.md v1 (13 Aug 2026). Di-update 13 Aug 2026 menyelarikan dengan
> route admin aktual + memasukkan 4 keputusan user (lihat §8).
> **Status: menunggu approval final sebelum eksekusi.**

---

## 0. Audit Existing (real status — setelah revisi)

### Route admin aktual (di working tree, BUKAN yang disebut v1)
```
/admin            → dashboard "Command Center" (stat, provider sync, polling, queue, aktivitas)
/admin/users      → manajemen user
/admin/orders     → manajemen order
/admin/deposits   → approve/reject deposit
/admin/audit      → audit log
/admin/settings   → pricing rules (inline edit) + maintenance toggle
/admin/services   → katalog layanan (SUDAH ADA, tdk disebut di v1)
/admin/providers  → CRUD provider + testConnection (SUDAH ADA, tdk disebut di v1)
/admin/reporting  → laporan (SUDAH ADA, tdk disebut di v1)
/admin/tickets    → tiket support (SUDAH ADA, tdk disebut di v1)
```
> **Penting**: v1 salah menulis path `/admin/admin/settings` dll. Path sebenarnya
> `/admin/settings`. Semua rujukan di bawah sudah dikoreksi.

### Status 4 task (riil, teraudit 13 Aug 2026)

| # | Task | Status existing | Yang perlu |
|---|---|---|---|
| 1 | Pricing rules UX | ⚠️ Base jalan (`/admin/settings` inline edit + `updatePricing` action + `pricing_rules` 4 row ter-seed). **Improve BELUM**: tidak ada live preview / calculator / bulk-apply / seed button | Tambah preview + calculator + seed + bulk-apply + tooltip |
| 2 | SMMturk auto-sync | ⚠️ Logic `provider-sync.ts` ada, tapi `cron/index.ts` masih **hardcoded `runProviderSync(1)`**. Tabel `provider` **tdk ada SMMturk** (cuma 1,5,6,7). `/admin/providers` ada add/edit/testConnection tapi **tdk ada tombol "Sync Sekarang"** | Insert SMMturk row (id=8) + cron multi-provider + trigger + balance card |
| 3 | Affiliate module | ❌ Route `/admin/affiliate` **BELUM ADA** | Bikin dari scratch |
| 4 | Provider API key encryption | ❌ Tidak ada `crypto.ts`. `/admin/providers` cuma placeholder teks "Encrypt di-rest (AES-256) dijadwalkan M3.5" | `crypto.ts` AES-256-GCM + encrypt/decrypt + migration + mask display |

**Bukti DB (teraudit via tunnel 3307):**
```
provider        → 4 rows: MANUAL(1), JAP(5), IRVAN(6), SMC(7)  — SMMturk BELUM ada
pricing_rules    → 4 rows: Member(0%) / Agen(-10%) / Reseller(-20%) / Admin(0%)
provider_sync_log→ history sync semua providerId=1 (MANUAL)
affiliate        → 1 row sample (socioadmin punya 1 downline, komisi 5000)
SOCIO_SMMTURK_KEY→ env ADA
SOCIO_USD_TO_IDR → 15800
SOCIO_ENCRYPTION_KEY → BELUM ADA di .env (akan dibuat, fixed VPS — lihat §5)
```

---

## 1. Strategi

4 task independen, dikerjakan berurutan (1 → 2 → 3 → 4):
- **#1 Pricing UX** — ringan, polish existing (1-2 jam)
- **#2 SMMturk sync** — insert row + ubah cron + trigger UI (1-2 jam)
- **#3 Affiliate** — full page baru (2-3 jam)
- **#4 Encryption** — hati-hati (migration data + fixed key), 2-3 jam

Total estimasi: **6-10 jam**. Satu-satu, cek tiap modul, baru lanjut.

---

## 2. Task #1 — Pricing Rules UX (IMPROVE)

### Existing
- Inline edit `markupPercent` / `flatPer1k` / `minProfitPer1k` per level
- Action `updatePricing` (validasi markup 0-1000) + audit log `update_pricing`
- `pricing_rules` sudah 4 row (default lama)

### Perubahan dari v1 (keputusan user — §8.4)
**Default pricing baru** (overwrite seed + tampil di UI):
| Level | Markup |
|---|---|
| Member | **+200%** |
| Agen | **+150%** |
| Reseller | **+180%** |
| Admin | 0% |

> Catatan: angka ini mark-up ke user. Pastikan `packages/core/src/pricing.ts`
> `DEFAULT_PRICING_RULES` di-update ke nilai di atas agar seed konsisten.

### Gap (yang akan ditambah)
1. **Live preview harga**: tiap ubah markup → preview "Contoh: 1000 followers → modal Rp X, jual Rp Y, profit Rp Z"
2. **Seed button**: kalau `pricing_rules` kosong → tombol "Generate default" (pakai nilai §8.4)
3. **Help tooltip** `flatPer1k` & `minProfitPer1k`
4. **Bulk apply**: "Terapkan ke semua level" (copy markup Member ke semua, untuk rollback)
5. **Calculator card**: pilih service sample + quantity + level → hitung harga otomatis

### Files
- Modify: `app/src/routes/(admin)/admin/settings/+page.svelte`
- Modify: `app/src/routes/(admin)/admin/settings/+page.server.ts` (tambah `seed` action + `loadSampleServices`)
- Modify: `packages/core/src/pricing.ts` (DEFAULT_PRICING_RULES → nilai §8.4)
- Add: `app/src/lib/server/pricing-preview.ts` (helper preview)

---

## 3. Task #2 — SMMturk Auto-Sync (LENGKAPI)

### Existing
- `runProviderSync(providerId)` sync 1 provider (balance + services + diff hash + upsert + log)
- `smmturkBalance()` / `smmturkServices()` (8185+ services)
- `withConcurrency()` pool 10 + delay 100ms
- `/admin/providers` ada add/edit/delete/testConnection

### Gap (yang akan ditambah)
1. **Insert SMMturk row**: `provider` id=8, name=SMMTURK, api_key dari env (plain dulu, encrypt di Task #4), api_url_order/status
2. **Multi-provider cron**: `cron/index.ts` loop semua provider aktif (bukan cuma id=1)
3. **Manual trigger UI**: tombol "Sync Sekarang" per provider di `/admin/providers` → panggil `triggerProviderSync(providerId)` (cek mutex supaya tdk overlap dengan cron)
4. **Balance display**: card saldo SMMturk (real-time fetch) di provider card
5. **Status badge**: dari `provider_sync_log` terakhir → ok/error/partial + "X lalu"

### Files
- Modify: `app/src/cron/index.ts` — loop semua provider aktif
- Modify: `app/src/cron/provider-sync.ts` — tambah `runAllProviderSync()` + `triggerProviderSync(id)` + return summary + in-memory mutex
- Modify: `app/src/routes/(admin)/admin/providers/+page.svelte` — tombol "Sync Sekarang" + balance + status badge
- Modify: `app/src/routes/(admin)/admin/providers/+page.server.ts` — tambah `sync` action
- Migration: insert SMMturk row (id=8) ke `provider`

### Risk
- SMMturk API lemot (~89 detik untuk 8158 services) → pakai mutex, cron boleh overlap aman
- Rate limit: `withConcurrency` 10 sudah aman

---

## 4. Task #3 — Affiliate Module (BARU)

### Tujuan
Admin lihat performa afiliasi: top referrer, komisi, withdrawal.

### Data existing (real)
- `affiliate`: `user_id` (downline), `user_affi` (upline), `balance` (komisi), `status`, `created_at`
- `users`: `reffKode`, `upLink`, `balanceReff`

### Halaman `/admin/affiliate`

**A. KPI strip (4 stat)**: total downline · total komisi dibayar · pending withdrawal · top referrer
**B. Top referrer (top 10)**: query join `affiliate`↔`users` group by `user_affi`, card grid + tombol "Detail"
**C. Tabel full (paginated 50)**: mobile card / desktop table, filter status+tanggal, search username
**D. Withdrawal queue (status='Withdraw')**: tabel + tombol Approve/Reject

### Keputusan user (§8.3): **Single admin** untuk approve/reject
- `approveWithdrawal` → status='Paid' + `balance_logs` entry + audit log
- `rejectWithdrawal` → status='Rejected' + audit log
- (Double-approval G2 TIDAK dikerjakan di M3)

### Files (baru)
- `app/src/routes/(admin)/admin/affiliate/+page.server.ts`
- `app/src/routes/(admin)/admin/affiliate/+page.svelte`
- `app/src/routes/(admin)/+layout.svelte` — tambah nav link "Affiliate"

### Risk
- Data real cuma 1 row → tampilkan empty state + CTA. Boleh seed dummy untuk demo visual (hapus setelah).

---

## 5. Task #4 — Provider API Key Encryption (G5)

### Existing
- `provider.apiKey` varchar(128) NOT NULL — plain text
- 4 row existing: MANUAL (kosong), JAP, IRVAN, SMC — plain

### Keputusan user (§8.2): **Fixed VPS key**
- Generate 1 key tetap (bukan random per-deploy) → simpan di `.env` (`SOCIO_ENCRYPTION_KEY`)
  dan di Coolify VPS env. Key ini stabil antar restart/rebuild.
- Format ciphertext: `iv:tag:ciphertext` (hex), AES-256-GCM.
- Graceful fallback: kalau env key kosong → warning + return as-is (jgn break flow).

### Files
- New: `packages/core/src/crypto.ts` — `encryptKey(plain)`, `decryptKey(cipher)`
- Modify: `app/src/routes/(admin)/admin/providers/+page.server.ts` — encrypt sebelum INSERT/UPDATE, decrypt + mask (6 char terakhir) untuk display
- Modify: `app/src/cron/provider-sync.ts` — decrypt `p.apiKey` sebelum panggil API SMMturk/JAP
- Migration: `UPDATE provider SET api_key = encryptKey(api_key) WHERE id IN (5,6,7)` (MANUAL kosong, skip)
- `.env` + `.env.example` + Coolify: tambah `SOCIO_ENCRYPTION_KEY=<fixed 64-hex>`

### Risk
- Key hilang = semua key hancur → TULIS key ke `docs/COOLIFY_DEPLOY.md` + warning besar
- Jangan log `p.apiKey` di mana pun
- Decrypt tiap sync call OK (fast); boleh cache per provider di memory

---

## 6. Urutan Eksekusi

| Phase | Task | Estimasi | Validasi |
|---|---|---|---|
| 1 | Pricing UX (default +200/+150/+180) + preview/calculator/seed/bulk | 1-2 jam | Edit markup → preview real-time; seed button jalan |
| 2 | SMMturk row + multi-provider cron + Sync Sekarang + balance | 1-2 jam | Klik Sync → 8185 row masuk `provider_services` + log |
| 3 | Affiliate module (KPI + top + tabel + withdrawal single-admin) | 2-3 jam | `/admin/affiliate` 200 + approve withdrawal jalan |
| 4 | API key encryption (fixed VPS key) | 2-3 jam | 4 row ter-encrypt → decrypt works → cron sync masih jalan |

---

## 7. Test Plan per task
(sama dengan v1 §7, ditambah:)
- #1: seed button → generate 4 row default baru (Member+200/Agen+150/Reseller+180)
- #2: `SELECT COUNT(*) FROM provider_services WHERE provider_id=8` → ~8158
- #4: `SELECT api_key FROM provider WHERE id IN (5,6,7)` → masked/encrypted; sync masih jalan

---

## 8. Keputusan User (dijawab 13 Aug 2026)

| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Lanjut eksekusi atau update plan dulu? | **Update plan dulu** (plan direvisi ini) |
| 2 | Encryption key: random atau fixed VPS? | **Fixed VPS** (key stabil, taruh di .env + Coolify) |
| 3 | Affiliate approve: double atau single admin? | **Single admin** (cukup untuk MVP) |
| 4 | Pricing default? | **Member +200% / Agen +150% / Reseller +180% / Admin 0%** |

---

## 9. Yang TIDAK dikerjakan di M3
- ❌ Refund workflow (G2)
- ❌ Balance adjustment dual-control (G3)
- ❌ Deposit verify bukti transfer (G4)
- ❌ 2FA admin (G7)
- ❌ Backup management (G9)
- ❌ Coupon/voucher (G18)
- ❌ Loyalty point (G19)

---

**Approval**: mohon review revisi ini. Kalau sudah OK, balas "setuju" / "eksekusi" maka
saya jalankan Phase 1 (Task #1) berurutan sampai Phase 4, cek tiap modul.
