# Plan Port Gap socio.my → socio.id — 17 Nov 2026

> **Status dokumen: P1 + F1 + batch email P2.5–P2.8 + P3 kosmetik SELESAI DIEKSEKUSI —
> 18 Nov 2026, live image `54c8615`** (jurnal: `docs/2026-11-18-p1-confirm-before-refund.md`,
> `docs/2026-11-18-f1-refund-ledger-fold-news-notif.md`,
> `docs/2026-11-18-p2-email-p3-kosmetik-batch.md`). **P2.1–P2.4 + P4 masih RENCANA.**
> Audit 17 Nov = read-only, nol perubahan kode/DB; semua temuan diverifikasi langsung
> dari kode `.id`, kode `.my`, git log, jurnal `updatememory`, dan **3 probe produksi
> READ-ONLY**. Eksekusi item berikutnya tetap **menunggu GO owner** + gate wajib.
>
> **Kenapa hati-hati: user MASIH LIVE di `app.socio.id`.** Salah port jalur uang =
> saldo customer bocor / modal owner hilang / tabel terkunci. Dokumen ini mengunci
> urutan aman, invariant, dan jebakan yang sudah terbukti di produksi.

---

## 0. Cara pakai dokumen ini

1. Baca §1 (baseline) + §2 (constraint) dulu — itu pagar keselamatan.
2. Kerjakan **berurutan P1 → P2 → P3 → P4**, jangan lompat. P1 = jalur uang (wajib).
3. Tiap item ada: bukti `.id` (file:baris), sumber `.my` (commit + jurnal), klasifikasi
   **PORT / ADAPT / CONFIRM / SKIP**, dan catatan adaptasi.
4. Item **CONFIRM** = butuh keputusan bisnis owner sebelum disentuh (lihat §7).
5. Sebelum bilang "selesai" per item: jalankan **4 gate** (§2.6) + update tracker.
6. **Jangan merge/cherry-pick massal** — `.my` itu orphan fork (lihat §2.1).

Klasifikasi:
- **PORT** = salin semantik 1:1 (hanya ganti identifier uang/route/bahasa).
- **ADAPT** = salin logika, sesuaikan IDR/manual-BCA/Indonesia/route/tanpa-i18n.
- **CONFIRM** = tunggu GO owner (bisnis / subsistem dormant / kosmetik).
- **SKIP** = sudah ada di `.id`, atau khusus `.my`, atau terbukti aman (jangan dikerjakan).

---

## 1. Baseline terverifikasi (bukti, bukan asumsi)

### 1.1 Git & deploy
| Repo | HEAD | Branch | Catatan |
|---|---|---|---|
| `.id` | `594d7eb` | `deploy/refill-only` → `main` | docs P10; live container image `dd507e4` (runtime identik) |
| `.my` | `55b4eac7` | `main` | clean tracked; untracked WIP (landing/smm-panel, 2 jurnal) — di luar scope |

`.id` live app UUID Coolify: `nqsjafrei6k8dkup1pxkcuwf`. MySQL container: `rebicrj57r3afbg9knieq9ks`, db `socio_smm` (VPS 130.254.47.93). **Bukan** TiDB, **bukan** `socio_my`.

### 1.2 Provider `.id` (probe prod — penomoran BEDA dari `.my`)
| id | name | status | Peran |
|---|---|---|---|
| **2** | **Provider Utama** | **1 (aktif)** | **SMMturk — SATU provider aktif** |
| 1 | MANUAL | 0 | dorman (order manual legacy) |
| 10 | SMMfollows | 0 | dorman (dipertahankan, sudah di-off P9) |

> `.my`: id1 = SMMturk, id2 = SMMfollows. **JANGAN salin angka provider id dari `.my`.**
> Di `.id` semua order hidup = provider **2**. Kode `.id` yang menyebut `providerId === 1`
> (mis. status-polling auto-error manual) itu **manual dorman**, bukan SMMturk — biarkan.

### 1.3 Probe produksi READ-ONLY (17 Nov)
| Metrik | Nilai | Implikasi |
|---|---|---|
| `orders` total baris | **26.507** | tabel besar → ALTER harus metadata-only (lihat §1.4) |
| `category_provider_routing` | **0 baris** | guard kind-claim (899a5b2b) **MOOT** di `.id` → defensif, bukan urgen |
| `news` orphan-service | 30, **semua `is_hidden=1`** | **F7 leak ABSENT** di `.id` → SKIP |
| `news` teks "smmfollow" | **0** | konfirmasi F7 absent |
| `refund_requests` pending | 1 → order 37727 **Canceled + is_refund=1 + price=0** | **stale**, sudah diblok guard existing → bukan bleed aktif |
| akun `level=Admin` | **2**: `aramadhi92@gmail.com` (2393) + `info@beriklan.co.id` (2395) | **situasi SAMA** seperti `.my` pra-fix operator-only |
| `deposits` Pending | 6 | cohort WP6 nyata |
| `users` Reseller unpaid (`reseller_activated=0`) | **241** | cohort WP7 `reseller_unpaid` nyata |
| order hidup provider 2 | 4 × `In progress` (#38020/38023/38116/38117) + 1 Pending | normal, provider aktif |
| kolom `users.reg_source_page/reg_keyword` | **ABSENT** | content_activation butuh DDL |
| tabel `user_coupons` | **ABSENT** | H3 Coupon Loop belum ada di `.id` |

### 1.4 ⚠️ TEMUAN KRITIS — atribut kolom `orders.status` LIVE (probe 3)

```
COLUMN_TYPE : enum('Pending','Processing','Error','Partial','Success','In progress','Canceled','Refilling')
IS_NULLABLE : NO
COLUMN_DEFAULT : NULL          ← TIDAK ada default (bukan 'Pending'!)
CHARACTER_SET_NAME : utf8mb3   ← BUKAN utf8mb4!
COLLATION_NAME : utf8mb3_swedish_ci  ← BUKAN utf8mb4_unicode_ci!
```

**Ini berbeda dari DUA sumber sekaligus:**
1. **Migration `.my`** (`scripts/db/migration-2026-11-14-order-canceling.sql`) mem-pin
   `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending'`.
2. **Drizzle schema `.id`** (`packages/db/src/schema/orders.ts:35-46`) deklarasi
   `.notNull().default("Pending")` → **drift schema-vs-live** (live tak punya default).

**Bahaya bila salin migration `.my` mentah-mentah ke `.id`:**
- Ganti charset `utf8mb3 → utf8mb4` = **ALTER rebuild tabel** (copy semua 26.507 baris),
  **bukan** metadata-only → lock + **MDL convoy** = persis insiden yang P10 (`dd507e4`)
  perbaiki. Produksi bisa hang saat deploy.
- Tambah `DEFAULT 'Pending'` yang live-nya tak ada = perubahan perilaku tak perlu.

**Aturan migration `.id` (WAJIB):** pin atribut LIVE persis, hanya **append `'Canceling'`
di UJUNG** enum (urutan 8 nilai asal tetap). Charset/collation **TIDAK diubah**:

```sql
ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'Pending','Processing','Error','Partial','Success','In progress','Canceled','Refilling','Canceling'
  ) CHARACTER SET utf8mb3 COLLATE utf8mb3_swedish_ci NOT NULL;
```

- 8 → 9 nilai masih muat 1 byte → **INPLACE / metadata-only**, tak rebuild baris.
- **Jangan** pakai `utf8mb4`, **jangan** tambah `DEFAULT 'Pending'` (live tak punya).
- Tambah assertion `ALGORITHM=INPLACE, LOCK=NONE` supaya MySQL **ERROR** (bukan diam-diam
  rebuild) bila ada yang tak cocok. Verifikasi `SELECT VERSION()` saat eksekusi.
- Modernisasi charset ke utf8mb4 = **DI LUAR SCOPE** (risiko rebuild tabel live).
- Drift `default("Pending")` di schema Drizzle = **biarkan** (jangan "fix" di port ini;
  Drizzle selalu supply status eksplisit saat insert, jadi tak ada efek praktis).
- Guard idempotent `information_schema` + `PREPARE/EXECUTE` tetap dipakai (pola `.my`),
  tapi **isi ALTER-nya pin utf8mb3**, bukan utf8mb4.

> Catatan terkait: `balance_logs.note` juga **utf8mb3** (komentar `.my` refund.ts:129,
> diterjemahkan: "ASCII saja: note = utf8mb3"). Marker override `[provider-live override]` = ASCII → aman.

---

## 2. Constraint porting (orphan fork — pagar keselamatan)

### 2.1 `.my` = orphan fork, BUKAN upstream
`.my` = snapshot `.id` @ `1cc73c9` (8 Okt), **zero shared hash**. → **patch per-fitur**,
jangan `git merge` / `cherry-pick` massal (akan bawa i18n/sen/TnG/route English yang salah).

### 2.2 Uang: sen MYR → IDR
- `.my`: `sen × 100`, `formatSen`, `rmToSen`, `@socio/core/money`. **JANGAN port modul ini.**
- `.id`: IDR integer/double, `formatRupiah` / `Intl.NumberFormat("id-ID")`, `pricing.ts`.
- Semua `priceSen` / `balanceSen` / `formatSen(...)` di kode `.my` → `Number(price)` /
  `formatRupiah(...)` di `.id`. `orders.price` `.id` = `int` (IDR penuh), bukan sen.

### 2.3 Payment: manual-confirm (TnG DuitNow → Transfer BCA) — BUKAN Midtrans
- **`.id` TIDAK pakai Midtrans.** Deposit = **manual-confirm Transfer BCA + kode unik 3 digit**:
  `top-up/+page.server.ts:113-117` menolak method ≠ manual ("Gunakan transfer BCA"),
  `:139` `postAmount = amount + suffix` (suffix 111..999 + HMAC anti-tamper), admin
  `deposits/+page.server.ts:107-213` **confirm sekali klik** → kredit saldo + `verified_by/At`.
  `payment.ts` (Midtrans Snap) + `api/webhook/midtrans` = **DORMANT** (tak dipakai jalur live).
- **Struktur SAMA dengan `.my`** (TnG DuitNow manual-verify + kode unik sen): `deposits.postAmount`
  double, `amount` double, `type` manual/auto/VA, `img` bukti, `verifiedBy/At`, `expire`,
  `reminderSent/reminderStage`, `untukApa` smm/reseller → **WP6 manual-confirm logic CLOSE match**.
- **Kode unik + UI exact-amount SUDAH ada di `.id`** (`top-up/+page.svelte:48,284,461` "Termasuk
  kode unik untuk pencocokan otomatis"). → **SKIP komponen `ExactAmount.svelte`** (padanan sudah
  ada), bukan skip konsep. Adaptasi WP6: sen→IDR, copy TnG→BCA. **JANGAN ubah metode deposit** —
  manual-confirm BCA tetap seperti sekarang (arahan owner 18 Nov).

### 2.4 Bahasa: i18n → inline Indonesia
- `.my`: katalog `copy.ts` id/ms/en, kunci `app.home.couponTicket` dll.
- `.id`: **TANPA i18n**, string Indonesia inline. Semua kunci katalog → teks Indonesia inline.
- **Jangan** sentuh `copy.ts` `.id` (frozen keys).

### 2.5 Route: English → Indonesia
| `.my` | `.id` |
|---|---|
| `/orders` | `/pesanan` |
| `/order` | `/pesan` |
| `/balance` `/balance/top-up` | `/saldo` `/saldo/top-up` |
| `/services` | `/layanan` |
| `/register` | `/daftar` |
| — | `/berita` `/notif` `/akun` `/affiliate` `/reseller` |

CTA email `.id` sudah benar (`emailAbsoluteUrl("/saldo/top-up")`) — jangan ganti ke route English.

### 2.6 Layer order + test harness + gate
- **Urutan layer**: `packages/core` (pure) → `app/src/lib/server` → routes/cron. Jangan balik.
- **Pure module yang diimport client** → taruh di `$lib/` **BUKAN** `$lib/server/`
  (vite-plugin-sveltekit-guard menolak import server dari client). Contoh: `catalog-counts.ts` → `$lib/`.
- **Test**: `.id` `app` **TAK punya** test script. Pure logic + test → `packages/core/test/`
  (harness `node --experimental-strip-types --import ./test/register.mjs`). Port test `.my`
  (`app/test/*.test.ts`) ke `core/test/` dengan adaptasi path/import. Test yang baca source
  statik (`readFileSync`) → sesuaikan `APP_ROOT` ke struktur `.id`.
- **Readonly array helper**: pakai `isLiveAtProvider()` / `isCancelableStatus()` (bukan
  `.includes` langsung — array `readonly OrderStatus[]` menolak argumen `string`).
  Untuk `notInArray` → **spread** `[...FINAL_STATUSES]`.
- **4 gate per item** (wajib lulus sebelum "selesai"):
  1. `pnpm --filter app exec svelte-check` → **0 errors** (baseline 54 warnings).
  2. `packages/core/test` terkait → **lulus**.
  3. `pnpm --filter app build` → **sukses** (adapter-node).
  4. **L3 deep security review** → **0 findings** (settings script → AskUserQuestion →
     review → push hanya setelah clean).
- Setelah gate: **GO owner** → commit granular (message Indonesia) → push SSH
  `git push git@github.com:ReqTimeout/socio.git HEAD:main` → deploy Coolify → **verify image-tag = SHA commit**.
- **CJK-scan** tiap file yang disentuh (jangan ada karakter CJK nyasar).

### 2.7 Kill switch email `.id` = ON (vs `.my` OFF)
`.id` `EMAIL_MARKETING_ENABLED=ON` (commit `31d2170`). `.my` OFF. → **lane email baru yang
di-port akan LANGSUNG LIVE di `.id`** kecuali di-gate eksplisit. Item WP7/quota/operator
**wajib** punya gate sendiri (env per-lane atau `ACTIVE_TRIGGERS`) sebelum diaktifkan.

### 2.8 Produksi-safety (pelajaran P10)
- **Backup-before-write** untuk setiap perubahan DB prod (snapshot tabel terdampak).
- **Guarded DDL only** — `information_schema` guard + `PREPARE/EXECUTE`, idempotent.
- **NO boot ALTER** — jangan taruh ALTER di `ensure.ts` yang jalan tiap boot (MDL convoy).
  Migration dijalankan **manual sekali** sebelum deploy, bukan saat app start.
- SQL multi-baris = **file** (scp → docker cp → `mysql < file`), **bukan** heredoc inline.
- **Jangan print/persist** token Coolify plaintext.Jangan test order di prod.

---

## 3. Inventaris gap terverifikasi (ranked)

### P1 — JALUR UANG (wajib, paling urgen)

> **Kontrak tunggal F12: uang customer bergerak HANYA setelah provider konfirmasi cancel.**
> **[SELESAI — 18 Nov 2026, P1.1–P1.6 live, image `23ef2b3`.]** Sebelumnya `.id` refund
> lokal saat provider unreachable / saat respons "OK" diterima (bukan saat order benar-benar
> batal) = bocor modal owner. Kini cancel → `Canceling`, uang terkunci sampai provider lapor.

| ID | Gap | Bukti `.id` (file:baris) | Sumber `.my` | Klasifikasi |
|---|---|---|---|---|
| **P1.1** | F12 confirm-before-refund: status `Canceling` + helper `order-cancel.ts` + poller/refund/UI | `pesanan/+page.server.ts:351-353` (network→refund lokal), `:321-322` (hanya Pending), `order-status.ts` (8 nilai, tanpa Canceling/CANCELABLE/LIVE_AT_PROVIDER) | `083d0271`; jurnal hardening §11.5/§12; `order-cancel.ts` (194), migration SQL | **ADAPT** ✅ SELESAI 18 Nov (`23ef2b3`) |
| **P1.2** | H5 guard provider-live di **chokepoint** `executeRefund` + `approveRefund` (sebelum flip) + override `ackProvider`→audit | `refund.ts:54-126` (executeRefund **tanpa** guard live), `:128-165` (approveRefund flip dulu tanpa guard), `admin/orders/+page.server.ts:19,285` (REFUNDABLE_STATUS boleh live) | `083d0271`; §12.7 H5; `refund.ts:100-183` | **ADAPT** ✅ SELESAI 18 Nov (`23ef2b3`) |
| **P1.3** | H6 `mapProviderStatus`: varian cancel in-progress/denied → **null** (bukan `Canceled`) | `order-status.ts:53` `if (v.includes("cancel")) return "Canceled";` ← BUG | `083d0271`; §12.7 H6; `order-status.ts:105-127` | **PORT** ✅ SELESAI 18 Nov (`23ef2b3`) |
| **P1.4** | H4 `massCancel`: cek `affectedRows` per CAS; jangan tulis `balance_logs` bila `refunded===0` | `pesanan/+page.server.ts:451-455` (CAS tapi `refunded += price` **unconditional**), `:471-477` (ledger insert unconditional) | `083d0271`; §12.2 H4 | **ADAPT** ✅ SELESAI 18 Nov (`23ef2b3`) |
| **P1.5** | Provider-safe cancel (`smmturkCancelFor`) + api/v1 refill (`smmturkRefillFor` + simpan `refill_id`) | `smmturk.ts:140-200` (`smmturkCancel` env-hardcoded, **tanpa** CancelFor), `api/v1/+server.ts:428-435` (`smmturkRefill` hardcoded + INSERT **tanpa refill_id**) | `de84bd8c`; jurnal 2026-11-08-fix-cancel-refill-provider-safe | **ADAPT** ✅ SELESAI 18 Nov (`23ef2b3`) |
| **P1.6** | W4 `deleteProvider`: tambah guard **order hidup** (selain guard services-count) | `admin/providers/+page.server.ts:168-197` (guard services-count **saja**) | `82b52f11`; hardening §9.3 W4 | **PORT** ✅ SELESAI 18 Nov (`31fd0da`) |

**Invariant P1 yang wajib dikunci test (port `order-cancel-money.test.ts`):**
1. `LIVE_AT_PROVIDER` = `[Pending, Processing, In progress, Canceling, Refilling]`.
2. `CANCELABLE_STATUS` = `[Pending, Processing, In progress]` (F11: In progress boleh cancel).
3. **SET DISJOINT**: status yang di-refund cron (`Partial/Error/Canceled`) **TIDAK tumpang tindih**
   dengan `LIVE_AT_PROVIDER`. Ini invariant uang paling utama.
4. `Canceling` **bukan** final → terus di-poll 1 menit; uang **tidak bergerak**.
5. `mapProviderStatus`: `"Canceling"/"Cancelling"/"Cancellation requested"/"cancel failed"`
   → **null** (poller pertahankan status, re-poll). `"Canceled"/"Cancelled"` → tetap valid.
6. Provider lapor `Success` meski cancel diminta → **TIDAK ADA refund** + alert `[Cancel Ignored]`.
7. `"Canceled"` **SENGAJA TIDAK** ditambah ke `UPDATABLE_TO` (override mentah lewati provider).
   Admin dapat action `cancel` backed-provider, bukan raw status flip.
8. `executeRefund` guard **semua** pintu; `approveRefund` guard **sebelum** flip ke approved;
   override sadar **hanya** via checkbox `ackProvider` di `/admin/orders` → `audit_log`
   (`liveAtProvider`, `providerLiveOverride`) + note ledger `[provider-live override]`.
9. `massCancel`: `refunded===0` → **jangan** tulis `balance_logs`.

**Catatan adaptasi P1 (`.id` spesifik):**
- `order-cancel.ts` `.my` pakai `formatSen` → ganti `formatRupiah`; `priceSen` → `Number(price)`.
- Notif `.my` `notifyOrderUpdate(userId, orderId, target)` + `STATUS_LABEL.Canceling`.
  `.id` `notification.ts:14` `STATUS_LABEL` **belum punya** entri `Canceling` → tambah
  label Indonesia jujur (mis. "Cancel diminta (menunggu konfirmasi provider)").
  **Jangan** pakai `notifyOrderCancel` (teksnya "saldo dikembalikan") untuk state menunggu.
- `StatusBadge.svelte` `.id` (map lowercase) **belum punya** entri `canceling` → tambah
  badge "Menunggu Batal" (bukan "Batal", karena belum final).
- Poller `.id` `status-polling.ts:21` claim set `IN ('Pending','In progress','Processing')`
  → tambah `'Canceling'`. Cabang untracked (`:30-45`) → `Canceling` untracked jadi `Canceled`.
  Cabang stale-error per-order (`:88-107`, age≥2h→Error→auto-refund, fix `4a798e9`) →
  **exclude `Canceling`** dari auto-error (uang jangan bergerak lewat pintu stale).
  Tambah `keepCanceling` (non-final tak boleh timpa intent cancel) + alert `[Cancel Ignored]`.
- `cron/refund.ts` `.id` `runAutoRefund` claim `IN ('Partial','Error','Canceled')` —
  **sudah benar** (disjoint dari live). CAS+credit+ledger **sudah 1 transaksi**. Biarkan;
  `Canceling` tak akan di-claim sampai poller naikkan ke final.
- `cron/light.ts` `.id` tak menyentuh status order → tak perlu diubah untuk F12.

---

### P2 — DEFENSIF ADMIN + EMAIL

> **[SELESAI SEBAGIAN — 18 Nov 2026: P2.5–P2.8 (email) live, image `54c8615`, commit
> `4259482`. P2.1–P2.4 (defensif admin) masih RENCANA.]**

| ID | Gap | Bukti `.id` | Sumber `.my` | Klasifikasi |
|---|---|---|---|---|
| **P2.1** | W1 `planCategoryToggle` provider-gated enable (pure, 3 surface) | `category-admin.ts:215-248` (ON enable **semua** manual-off tanpa filter provider) | `82b52f11`; hardening §9.2 W1; `category-toggle-policy.ts` (77) + test (263) | **PORT** |
| **P2.2** | F13 catalog-counts pure + `CategoryHealthBadge` + `/admin/services?scope=serving` + URL-builder | `admin/services` (tanpa scope/health badge); `$lib/` belum ada `catalog-counts.ts` | `083d0271`; §12.3 F13; `catalog-counts.ts` (172) + test (354) | **ADAPT** |
| **P2.3** | F10 message key toggle terbalik + `deleteCategory` nama/404 | `category-admin.ts` (pesan error placeholder) | `083d0271`; §11.4 F10 | **ADAPT** |
| **P2.4** | Routing leak guard kind-claim (`kindSignature`/`coveredByOtherProviderRouting`) di service-sync CREATE | `service-sync.ts:261-278` (CREATE born inert, **tanpa** kind-claim); `routing-policy.ts` `.id` belum ada `coveredByOtherProviderRouting` | `899a5b2b`; `kind-signature.ts` (47) + routing-policy (+32) | **CONFIRM** (MOOT: routing=0) |
| **P2.5** | Email `quota.ts` lanes + provider cap (Resend protection) | `email-lifecycle.ts:25-60` (`ACTIVE_TRIGGERS=["activation"]`, **tanpa** quota); `$lib/server/email/` belum ada `quota.ts` | `9e000248`; `email/quota.ts` (116) + test (122) | **ADAPT** ✅ SELESAI 18 Nov (`4259482`) |
| **P2.6** | Operator-only `notifyAdmins` (stop email semua akun Admin) | `email-templates.ts:94-141` (`eq(users.level,"Admin")` → email **semua** admin) | `95d9d78f`; jurnal 2026-11-10-admin-email-operator-only | **CONFIRM** ✅ SELESAI 18 Nov (`4259482`, operator-only) |
| **P2.7** | WP7 deposit-aware activation + lane `deposit_canceled`/`reseller_unpaid` | `segments.ts:40-100` (activation = createdAt≤-3d AND NOT ORDERED, **tanpa** deposit-aware; **tanpa** 2 lane baru) | `d8e531ef`; WP7; segments (+68) + templates (+163) + test (199) | **CONFIRM** (gate ON) ✅ SELESAI 18 Nov (`4259482`, lane baru OFF per-lane) |
| **P2.8** | WP6 partial: first-deposit nudge + welcome rewrite + mid-life reminder + bonus-rate single source | `light.ts` (tanpa blok mid-life (2h,12h]); `format.ts` (tanpa `getDepositBonusRate`); `top-up/+page.server.ts:12` parse env lokal | `a1e013df`; WP6; `first-deposit.ts` (78) + `FirstDepositNudge` (238) | **ADAPT** (kode unik/ExactAmount SUDAH ada di `.id`; SKIP copy TnG/sen) ✅ SELESAI 18 Nov (`4259482`) |

**Catatan P2:**
- **P2.1 W1** kontrak: OFF → semua provider + tag, **JANGAN refuse** (provider broken tak
  boleh jebak admin). ON → `allowedProvider = routed ?? active` (routing menang); UPDATE
  `WHERE category_id AND provider_id`; refuse `no_active_provider`/`no_serving_services`
  (return tanpa DB write); invariant `refuse≠null ⇒ affected===0`. Pure module → test 192
  kombinasi. `.id` routing=0 → `routed` selalu null → `allowedProvider` = provider aktif (2).
- **P2.2 F13** kurang urgen pasca-P9 (kategori `.id` sudah bersih). `catalog-counts.ts`
  **pure di `$lib/`** (bukan server). `listCategoryRows` GROUP BY (category_id,provider_id)
  on services **saja** + fold in-memory (jangan LEFT JOIN/GROUP_CONCAT filesort).
- **P2.4** MOOT selama routing=0 (probe). tetap port defensif bila owner mau hidupkan
  multi-provider nanti; **CONFIRM** karena tak ada efek nyata sekarang.
- **P2.5 quota** `.id` switch ON → lane baru langsung live. Port `quota.ts` pure + integrasi
  lifecycle/queue/admin-email, tapi **gate** lane marketing (lihat §2.7). Cap default
  `.my`: providerDaily 95 / Monthly 3000, marketingTotal 35 / Guard 10, WINBACK_MIN_HEADROOM 15,
  ADMIN_ALERT_RESERVE 5. Sesuaikan dengan volume `.id` (CONFIRM angka cap).
- **P2.6 operator-only** `.id` punya **2 akun admin SAMA** seperti `.my` pra-fix
  (`aramadhi92` + `info@beriklan`). Keputusan `.my`: email alert **hanya** ke operator
  (`SOCIO_ADMIN_ALERT_EMAILS`, default `aramadhi92@gmail.com`); bell `admin_notifications`
  **tetap** ke akun Admin; **jangan demote** akun admin. **CONFIRM**: owner `.id` mau
  perilaku sama? (lihat §7).
- **P2.7 WP7** cohort `reseller_unpaid` **241 user nyata** di `.id`. Lane baru + activation
  deposit-aware. **CONFIRM + gate**: karena switch ON, port harus default **OFF per-lane**
  sampai owner GO. Template `bonusCard`/`topupSteps`/`buildActivation needsDeposit`/
  `buildDepositCanceled`/`buildResellerUnpaid` → Indonesia inline, IDR. `enqueue balanceSen`
  → `balance` IDR. Lifecycle order: coupon_expiring→reseller_unpaid→activation→balance_low→
  deposit_canceled→winback_30/60/90. `laneOf`: reseller_unpaid→activation, deposit_canceled→winback.
- **P2.8 WP6** `getFirstDepositNudge` (stage new|pending, Pending expire>NOW() ORDER BY id
  DESC LIMIT 1, amount=postAmount??amount, query-fail→stage new). `FirstDepositNudge.svelte`
  (sticker, dismiss, fd-pop one-shot/fd-bob infinite, reduced-motion). `getDepositBonusRate()`
  single source (env `SOCIO_DEPOSIT_BONUS` default 0.10, clamp 0..1) → ganti parse lokal
  `top-up:12`. `light.ts` mid-life reminder (2h,12h] LIMIT 100 tone mid, `reminder_stage=1`
  meski tanpa email; `leftLabel(expire)`. **SKIP** komponen `ExactAmount.svelte` (`.id` sudah
  punya kode unik 3-digit + UI exact-amount) + copy TnG/sen; **pertahankan manual-confirm BCA**.

---

### P3 — KOSMETIK (CONFIRM — nilai bisnis rendah, risiko rendah)

> **[SELESAI — 18 Nov 2026: P3.1–P3.4 live, image `54c8615`, commit `e322797`.]**

| ID | Gap | Bukti `.id` | Sumber `.my` | Klasifikasi |
|---|---|---|---|---|
| **P3.1** | `CouponTicket` strip kupon **publik** di bawah SaldoHero | `(app)/+page.server.ts` (tanpa coupon strip); `coupons` schema **ada + compatible** | `ebb164dd`; `CouponTicket.svelte` (133) + loader (+53) | **ADAPT** ✅ SELESAI 18 Nov (`e322797`, strip publik saja) |
| **P3.2** | SaldoHero sparkline gold + pulse/radar CTA + dots | `SaldoHero.svelte:21,82` (sparkline dekoratif ada; **tanpa** pulse/ping/radar) | `7f1080cf` `68173d06` `e0bfaf11` | **CONFIRM** ✅ SELESAI 18 Nov (`e322797`) |
| **P3.3** | WP5 `ResellerArt` + reseller page enrichment | `/reseller` (H1 ada, tanpa art) | `111deaa5`; `ResellerArt.svelte` (112, packages/ui) | **CONFIRM** ✅ SELESAI 18 Nov (`e322797`) |
| **P3.4** | WP1 `?mode` → `initialMode` di register | `daftar/+page.server.ts` load (baca `?r` referral **saja**, tanpa `?mode`) | `1f44abc9` (register +10/+3) | **ADAPT** (kecil) ✅ SELESAI 18 Nov (`e322797`) |

**Catatan P3:**
- **P3.1 CouponTicket**: strip pakai tabel **`coupons` PUBLIK** (`.id` ada, schema cocok:
  `active` enum '0'/'1', `maxUsage`, `used`, `value`, `minOrder`, `expiresAt`). Query
  `.my` (aktif + belum tamat + kuota ada, order value desc, limit 1) **portable**.
  **TAPI** dashboard `.my` juga panggil `getCouponCard(userId)` (kupon **personal** H3,
  tabel `user_coupons` **ABSENT** di `.id`) + `daysLeft` dari `@socio/core/coupon-loop`
  (modul **ABSENT** di `.id`). → **STRIP bagian personal/H3**; port **hanya** strip publik.
  `daysLeft` → helper lokal kecil / inline. Kunci i18n `app.home.couponTicket` → Indonesia inline.
  Komponen `.my` di `app/src/lib/components/` → `.id` punya dir itu (CommandPalette). **CONFIRM** kosmetik.
- **P3.4 WP1** kecil: load `daftar` baca `?mode=member|reseller` → set `initialMode`.
  Action `.id` **sudah** baca FORM mode (reseller signup ada: whatsapp regex, createResellerSignup).
  Hanya initial tab dari query yang kurang. Risiko rendah, tapi tetap CONFIRM (UX change).

---

### P4 — SUBSISTEM (CONFIRM — dormant, butuh infrastruktur eksternal)

| ID | Gap | Bukti `.id` | Sumber `.my` | Klasifikasi |
|---|---|---|---|---|
| **P4.1** | GA4 attribution + ga4.ts + hooks + layout events + landing listener | `app/src/lib/` (tanpa `attribution.ts`/`ga4.ts`) | `9754911a`; attribution (273) + ga4 (141) + test (270) | **CONFIRM** (butuh properti GA4 `.id`) |
| **P4.2** | content_activation: `users.reg_source_page/reg_keyword` + content-map + resolver + cron | kolom **ABSENT** (probe); `segments.ts` tanpa content_activation | `bc76114b` `91cf9ad3`; content-map (57) + test (220) | **CONFIRM** (butuh DDL + landing cookie) |
| **P4.3** | H2/H3 + E8 (Coupon Loop personal, pending handover) | `user_coupons` **ABSENT**; `coupons.ts` global ada | handover §H3; `2026-10-31-fase-c-coupon-loop.md` | **CONFIRM** (kill switch OFF di `.my`) |
| **P4.4** | SEO J-remainder (factory/ledger/OG/pillar/freshness/CWV/Bing-suggest/geo) | `.id` P4 port **measurement loop saja** | handover §J; jurnal SEO `.my` | **CONFIRM** (di luar scope app) |

**Catatan P4:** semua **dormant** di `.my` (kill switch OFF / butuh setup eksternal).
- **P4.1 GA4**: revenue = deposit **verified** (bukan order), anti-backfill, env-gated
  no-rebuild activation, rides Meta Pixel existing. Butuh properti GA4 `.id` + listener
  `Layout.astro` landing. **Jangan aktifkan tanpa GO + setup.**
- **P4.2 content_activation**: register capture cookie src/kw sanitized (hanya source
  `/blog/%`), `content-map.ts` detectPlatform/kind→money slug, resolver BASE_FILTER +
  LIKE '/blog/%' + no-deposit + ≥3hari, cron BEFORE activation. Cohort mulai kosong.
  Butuh DDL `users` (guarded) + landing cookie capture. **CONFIRM.**
- **P4.3 H3 Coupon Loop**: engine pure `core/coupon-loop` (kill switch, jendela 90h, cap 6,
  budget), `user_coupons` dompet per-user, cron 00:45, `COUPON_LOOP_ENABLED` **OFF**.
  Butuh DDL tabel baru + keputusan bisnis owner. **CONFIRM** (terpisah dari P3.1 strip publik).

---

## 4. SKIP / sudah aman (JANGAN dikerjakan)

| Item | Alasan |
|---|---|
| category-visibility (`.my` `aba38d63`) | **= `.id` P6 ✅ LIVE** |
| IDE TS2614 + ui types.ts (`.my` `c67c112b`) | `.id` svelte-check **0 errors**; `packages/ui/src/types.ts` tak ada tapi tak dibutuhkan |
| F7 news leak (`.my` W6) | **probe: ABSENT di `.id`** (30 orphan semua hidden, 0 teks smmfollow) |
| A1/A2/A3/A6/C6 cores | sudah ada di `.id` (handover §2 already-fixed) |
| W6/W7 data cleanup (`.my`) | **= `.id` P8/P9 ✅ LIVE** |
| `.my` MS/EN/lang-gate/sweep/deploy-script/UUIDs | khusus `.my` (i18n/deploy infra beda) |
| TikTok routing revert (`.my`) | **= `.id` P8 ✅** |
| `ExactAmount.svelte`/kode-unik (WP6) | `.id` **SUDAH punya** kode unik 3-digit + UI exact-amount (manual BCA); hanya copy TnG/sen yang SKIP |
| `money.ts`/`formatSen`/`rmToSen` | `.id` IDR, bukan sen MYR |
| Routing kind-claim **sebagai fitur aktif** (P2.4) | MOOT routing=0; hanya defensif bila owner hidupkan multi-provider |

---

## 5. Urutan eksekusi P1 (produksi-safety) — DETAIL

> **Prinsip: backup → migration (additive, pin utf8mb3!) → deploy kode.** Kode baru menulis
> `Canceling`; tanpa nilai ENUM itu MySQL tolak/potong status → jalur uang rusak. Migration
> additive + backward-compatible (kode lama tak pernah menulis `Canceling`) → aman dijalankan
> **sebelum** deploy. **JANGAN** deploy kode sebelum migration sukses.

### Fase P1-A — Pure core (tanpa DB, tanpa deploy)
1. `packages/core/src/order-status.ts`:
   - Tambah `"Canceling"` ke type `OrderStatus` (di ujung).
   - Tambah `CANCELABLE_STATUS`, `isCancelableStatus`, `isCancelPending`,
     `LIVE_AT_PROVIDER`, `isLiveAtProvider` (PORT dari `.my`, komentar Indonesia).
   - **H6**: ganti baris 53 → blok varian cancel (canceling/cancelling/cancel pending/
     cancel in progress/requested/fail → **null**; else `Canceled`).
   - `nextPollIntervalMs`: tambah `if (isCancelPending(status)) return 1*MIN;`.
2. `packages/core/src/smmturk.ts`:
   - Tambah `smmturkCancelFor(endpoint, key, ids)` (mirror `smmturkRefillFor`).
   - Update doc `isProviderRejection`: **hapus** ajaran lama "network error → refund lokal";
     ganti "unreachable → JANGAN refund, order tetap di provider".
3. Port test `order-cancel-money.test.ts` + `order-status.test.ts` (existing) → `core/test/`,
   adaptasi path `APP_ROOT`/import. **Gate 1-3** (check/core-test/build). Belum deploy.
   - **[SELESAI — 18 Nov 2026, commit `33ffcf0` (core) + `23ef2b3` (test+chain), live image
     `23ef2b3`].** Money selftest 29/29 + order-status 23/23; assertion charset adaptasi
     utf8mb3 LIVE (bukan utf8mb4 + default `.my`).

### Fase P1-B — Migration DB (backup dulu, manual, SEBELUM deploy kode server)
4. **Backup** tabel `orders` prod (snapshot, mis. `CREATE TABLE orders_bak_20261117 AS SELECT * FROM orders`
   — atau dump terarah; ikuti pola backup-existing). Verifikasi baris = 26.507.
5. Jalankan migration **file** (scp → docker cp → `mysql < file`):
   - Guard `information_schema` cek `'Canceling'` sudah ada? → skip idempotent.
   - `ALTER ... MODIFY status ENUM(...9 nilai...) CHARACTER SET utf8mb3 COLLATE utf8mb3_swedish_ci NOT NULL`
     **+ `ALGORITHM=INPLACE, LOCK=NONE`** (lihat §1.4 — **JANGAN utf8mb4**).
   - Verifikasi: `COLUMN_TYPE` berisi 9 nilai, urutan asal tetap; charset/collation **tetap utf8mb3**;
     `SELECT status, COUNT(*) GROUP BY status` **tak berubah** (invariant: nol baris berubah).
6. Update Drizzle schema `orders.ts:35-44`: tambah `"Canceling"` di ujung array enum
   (code-only; **biarkan** drift `default("Pending")` — jangan sentuh).
   - **[SELESAI — migration prod 18 Nov ~04:55 UTC SEBELUM deploy, commit `5171d62`].**
     Backup `orders_bak_20261118` 26.534 = orders 26.534; distribusi identik; utf8mb3 tetap;
     INPLACE LOCK=NONE diterima. Adaptasi: `SET SESSION sql_mode` longgar khusus backup —
     `orders.date` legacy memuat '0000-00-00' (ERROR 1292 percobaan 1; atomic DDL rollback,
     nol efek samping). Lapis kedua: mysqldump `/tmp/orders_bak_20261118.sql` di VPS.

### Fase P1-C — Server helper + chokepoint (deploy SETELAH migration sukses)
7. `app/src/lib/server/order-cancel.ts` (**baru**, ADAPT dari `.my` 194 baris):
   `requestOrderCancel(orderId, {userId?, adminId?, ip?})` → `callProviderCancel` resolve
   provider row dari `order.providerId` → `decryptSecret(apiKey)` + `apiUrlOrder` →
   `smmturkCancelFor`. rejected/unreachable → **fail, nol DB write, nol refund**.
   accepted → CAS `Canceling` + `nextPollAt=now`. untracked → `Canceled` langsung.
   `formatSen`→`formatRupiah`, `priceSen`→`Number(price)`. Audit `cancel_order_at_provider`.
   Notif jujur (`notifyOrderUpdate` + label Canceling), alert admin `[Cancel ...]`.
8. `app/src/lib/server/refund.ts` (**H5**):
   - `executeRefund`: tambah param `ackProvider?`; setelah validasi amount, compute
     `liveAtProvider`/`override`; **throw** bila live && !override. Note ledger +
     `[provider-live override]` (ASCII). Audit detail `liveAtProvider`/`providerLiveOverride`.
   - `approveRefund`: fetch order status, **throw bila live SEBELUM flip ke approved**
     (tanpa override di jalur ini).
   - `requestRefund`: teruskan `ackProvider` bila dipanggil dari admin/orders.
9. `notification.ts:14` `STATUS_LABEL`: tambah `Canceling` (Indonesia jujur).
   - **[SELESAI — 18 Nov 2026, commit `f7af4f1`, live image `23ef2b3`].** Guard H5 di DUA
     pintu (executeRefund + approveRefund sebelum flip); helper nol tulisan uang.

### Fase P1-D — Cron poller (adaptasi `.id` spesifik)
10. `app/src/cron/status-polling.ts`:
    - Claim set `:21` → tambah `'Canceling'`.
    - Untracked `:30-45` → `Canceling` untracked jadi `Canceled` (notif).
    - **Exclude `Canceling`** dari cabang stale-error per-order `:88-107` (age≥2h→Error).
      `Canceling` tetap di-poll, **jangan** auto-error→auto-refund.
    - Tambah `keepCanceling = isCancelPending(o.status) && !isFinal`; non-final tak timpa intent.
    - `nextPollAt` pakai `nextPollIntervalMs(keepCanceling ? o.status : newStatus, ...)`.
    - Provider `Success` meski cancel → alert `[Cancel Ignored]`, **nol refund**.
    - **Biarkan** `providerId===1` manual-reschedule (itu MANUAL dorman `.id`, bukan SMMturk).
    - **Jangan** port hook `maybeIssueNextCoupon` (H3 absent di `.id`).
    - **[SELESAI — 18 Nov 2026, commit `33d16c5`, live image `23ef2b3`].** Merge .id-specific:
      `providerId===1` + stale-error `4a798e9` dipertahankan; Canceling kebal stale-error.

### Fase P1-E — Routes (user + admin)
11. `pesanan/+page.server.ts`:
    - Cancel action `:310-395` → panggil `requestOrderCancel(orderId, {userId})`.
      **HAPUS** refund lokal langsung (balance+ledger) — cron yang bayar setelah konfirmasi.
      Guard `:321-322` "hanya Pending" → `isCancelableStatus` (Pending/Processing/In progress).
    - `massCancel` `:397-478` → loop `requestOrderCancel` per order (prefilter `isCancelableStatus`);
      **H4**: cek hasil per order, `refunded===0` → jangan tulis ledger. Hapus refund lokal langsung.
    - UI: badge `Canceling` = "Menunggu Batal"; tombol cancel untuk status cancelable.
12. `admin/orders/+page.server.ts`:
    - Tambah action `cancel` backed-provider (`requestOrderCancel` dengan `adminId`).
    - **JANGAN** tambah `Canceled` ke `UPDATABLE_TO` (invariant F11).
    - Refund action `:285`: tambah checkbox `ackProvider` → teruskan ke `executeRefund`.
      Guard chokepoint (P1.2) otomatis tutup refund live tanpa override.
    - Tambah KPI `cancelPending` (count/total `Canceling`) + band `cancelWatch`.
13. `admin/refunds/+page.server.ts`: approve → `approveRefund` (guard sebelum flip, P1.2).
14. `StatusBadge.svelte`: tambah entri `canceling` (label "Menunggu Batal", cls progress).
    - **[SELESAI — 18 Nov 2026, commit `4d41638`, live image `23ef2b3`].** admin/refunds tanpa
      perubahan (approve sudah try/catch → error guard H5 tersurface). UI: band cancelWatch,
      checkbox ackProvider, dialog jujur, reset state antar order.

### Fase P1-F — Provider-safe refill + deleteProvider guard
15. `api/v1/+server.ts:428-435` `handleRefill`: `smmturkRefill([...])` → `smmturkRefillFor(endpoint, key, [...])`
    (resolve provider row). INSERT refill **simpan `refill_id`** dari respons + `api_log='api'`
    supaya `runRefillPolling` bisa track.
    - **[SELESAI — 18 Nov 2026, commit `20d7488`, live image `23ef2b3`].** Plus `api_log_status`
      + set order `Refilling` (parity `refill-request.ts`) supaya poller benar-benar track;
      guard `providerOrderId` tak terlacak → tolak jujur.
16. `admin/providers/+page.server.ts:168-197` `deleteProvider`: **tambah** guard order hidup
    `notInArray(orders.status, [...FINAL_STATUSES])` (spread!) besides services-count guard.
    Tolak hapus bila ada order non-final di provider itu.
    - **[SELESAI — 18 Nov 2026, commit `31fd0da`, deploy live image `31fd0da`].** Aksi
      `delete` kini tolak hapus bila `provider_id = id AND status NOT IN FINAL_STATUSES`
      (Pending/Processing/In progress/Refilling), besides services-count guard. Gate hijau:
      svelte-check 0 error, eslint 0 error, build sukses, L3 0 findings; marker guard di
      build chunk + route 303 ke /login terverifikasi di prod.

### Fase P1-G — Gate + deploy
17. **4 gate** (§2.6): svelte-check 0 error → core test (money invariant) lulus → build → L3 0 findings.
18. **GO owner** → commit granular per fase (message Indonesia, mis.
    `fix(M-money): F12 confirm-before-refund — core Canceling + H6 mapProviderStatus`).
19. Push SSH → deploy Coolify UUID `nqsjafrei6k8dkup1pxkcuwf` → **verify image-tag = SHA**.
20. Verifikasi runtime pasif: order cancel baru → status `Canceling`, **saldo tak bergerak**;
    poller naikkan ke final → cron refund bayar. Cek `processlist` bersih (tak ada MDL convoy).
    - **[SELESAI — 18 Nov 2026.]** Gate: svelte-check 0 error/54 warning baseline, core chain
      lulus (money 29/29), build sukses, L3 **0 findings** (pre-GO + pre-push), CJK/Malay bersih.
      Push FF `b00b7ec..23ef2b3` → main. Deploy Coolify `b3xbr6htgwurphwbczutobwh` finished;
      image tag = `23ef2b393b2f25c2b632183ba995bb1078bf0cbf` = SHA push. Marker terverifikasi:
      "Menunggu Batal" (client), "Cancel Ignored" + "cancel_order_at_provider" + "provider-live
      override" (server), "ackProvider" (client admin). Boot: 12 cron job, 0 ALTER. Route
      unauth 303 → /login. Processlist bersih; distribusi bergerak alami (poller aktif).
      Cancel pertama user pasca-deploy: observasi pasif (0 baris Canceling saat jurnal ditulis).

> **Urutan commit granular** (jangan satu commit raksasa): P1-A core+test → P1-B schema+migration
> script → P1-C order-cancel+refund+notif → P1-D poller → P1-E routes+badge → P1-F refill+provider.
> Migration DB (langkah 5) dijalankan **setelah commit P1-B, sebelum deploy P1-C+**.

---

## 6. Runbook deploy + rollback

### Deploy (`.id`)
- Push: `git push git@github.com:ReqTimeout/socio.git HEAD:main` (branch lokal `deploy/refill-only`).
- Coolify app UUID `nqsjafrei6k8dkup1pxkcuwf`; deploy via recipe token-mint Sanctum (token
  **jangan** di-print/persist plaintext).
- **Verify**: image container tag = SHA commit yang di-push. Boot bersih **0 ALTER/MDL**
  (migration sudah manual di P1-B, bukan boot). `processlist` bersih.

### Rollback
- **Kode**: revert commit → redeploy. Perilaku lama kembali.
- **Migration Canceling**: additive + backward-compatible → **tak perlu rollback DB**
  (kode lama tak menulis `Canceling`; nilai enum ekstra tak mengganggu). Bila terpaksa:
  `ALTER ... MODIFY ENUM(8 nilai) ... utf8mb3 ...` **hanya bila tak ada baris `Canceling`**
  (cek dulu `SELECT COUNT(*) WHERE status='Canceling'` = 0). **Jangan** drop nilai bila ada baris.
- **Backup** `orders_bak_20261117` disimpan sampai P1 terverifikasi stabil.
- Item email/cosmetic: nol DB write → rollback = revert + redeploy.

---

## 7. Daftar pertanyaan GO owner (CONFIRM)

Sebelum eksekusi item CONFIRM, tanya owner (AskUserQuestion), jangan asumsi:

1. **P1 (uang)**: GO port F12 confirm-before-refund + H5/H6/H4 + provider-safe cancel/refill +
   W4 guard? (Ini mengubah perilaku cancel user: refund **menunggu konfirmasi provider**,
   tidak lagi instan. User perlu tahu.)
   - **[GO DIBERIKAN + SELESAI 18 Nov 2026 — live `23ef2b3`.]** Perilaku baru aktif: refund
     menunggu konfirmasi provider. Sisa: sosialisasi ke user bila perlu (di luar scope kode).
2. **P2.6 operator-only**: `.id` punya 2 akun admin (`aramadhi92` + `info@beriklan`).
   Mau email alert **hanya** ke `aramadhi92@gmail.com` (seperti `.my`), bell tetap ke semua?
   Atau biarkan email ke kedua admin?
   - **[GO DIBERIKAN + SELESAI 18 Nov 2026 — live `54c8615`.]** Perilaku `.my` dipakai:
     email alert hanya operator (env `SOCIO_ADMIN_ALERT_EMAILS`, default
     `aramadhi92@gmail.com`), bell `admin_notifications` tetap ke semua akun Admin,
     tanpa demote akun admin.
3. **P2.5/P2.7 email lanes**: switch `.id` ON. GO port quota + WP7 (deposit_canceled/
   reseller_unpaid, cohort 241 nyata) + WP6 nudge? **Default OFF per-lane** sampai GO aktif?
   Angka cap Resend `.id` berapa?
   - **[GO DIBERIKAN + SELESAI 18 Nov 2026 — live `54c8615`.]** Cap quota default `.my`
     (provider 95/hari, 3000/bulan; marketing 35/hari, guard 10 — semua env-overridable).
     Lane baru `reseller_unpaid`/`deposit_canceled` **OFF per-lane** (env
     `EMAIL_LANE_RESELLER_UNPAID`/`EMAIL_LANE_DEPOSIT_CANCELED` belum di-set di prod);
     lane bawaan `activation` tetap ON (kini deposit-aware). Aktivasi lane baru =
     keputusan GO owner terpisah. WP6 nudge + welcome + mid-life live.
4. **P2.4 routing kind-claim**: routing=0 (MOOT). Port defensif sekarang, atau tunggu
   sampai owner hidupkan multi-provider?
5. **P3 kosmetik**: GO CouponTicket strip publik / SaldoHero gold+pulse / ResellerArt / WP1 ?mode?
   - **[GO DIBERIKAN + SELESAI 18 Nov 2026 — live `54c8615`.]** Keempat item live
     (commit `e322797`); strip kupon hanya bagian publik (personal/H3 tetap SKIP,
     `user_coupons` absent).
6. **P4.1 GA4**: ada properti GA4 `.id`? GO port attribution (dormant, env-gated)?
7. **P4.2 content_activation**: GO DDL `users.reg_source_page/reg_keyword` + landing cookie capture?
8. **P4.3 H3 Coupon Loop**: GO engine personal + tabel `user_coupons` (kill switch OFF)?
9. **F1 audit lama** (per-row REGEXP ~7s di pesanan/admin/orders): fix sekarang? P1.2/P1-C
   menyentuh area `refund.ts` yang sama → **gabungkan sadar** bila GO (hindari konflik).
   - **[GO DIBERIKAN + SELESAI 18 Nov 2026 — live `37bb77a`.]** P1 sudah selesai duluan →
     tidak ada konflik. REGEXP per-baris diganti `ledgerRefundProofs` (satu query ber-index
     `user_id` + fold pure `@socio/core/refund-ledger`, selftest 15/15). Semantik identik &
     ledger-first tetap: probe prod `mismatch_user=0` (semua penulis ref = pemilik order),
     batas non-digit + collation ci ditiru persis. Timing prod 25 baris: ~2,4s → ~0,09s.
     Commit `0cc7746`; jalur tulis uang (`executeRefund`/`ledgerRefundSum`/cron) tak disentuh;
     aggregate stats tetap flag `is_refund` (4bda2e1). Jurnal:
     `docs/2026-11-18-f1-refund-ledger-fold-news-notif.md`.

---

## 8. Checklist verifikasi per item (wajib sebelum "selesai")

- [ ] Bukti `.id` (file:baris) cocok dengan gap yang diklaim.
- [ ] Sumber `.my` (commit + jurnal) dibaca, semantik dipahami 1:1.
- [ ] Adaptasi IDR/manual-BCA/Indonesia/route/tanpa-i18n diterapkan (bukan salin mentah).
- [ ] Pure logic + test di `packages/core/test/` (bukan `app/test`).
- [ ] Pure module client-facing di `$lib/` (bukan `$lib/server/`).
- [ ] Migration (bila ada): pin atribut LIVE (§1.4), additive, guarded, backup dulu, manual.
- [ ] Gate 1: svelte-check **0 errors**.
- [ ] Gate 2: core test terkait **lulus** (money invariant untuk P1).
- [ ] Gate 3: build **sukses**.
- [ ] Gate 4: **L3 deep review 0 findings**.
- [ ] CJK-scan file tersentuh bersih.
- [ ] **GO owner** (untuk CONFIRM).
- [ ] Commit granular message Indonesia; push SSH; deploy; **image-tag = SHA**.
- [ ] Verifikasi runtime pasif (uang tak bocor, boot bersih, processlist bersih).
- [ ] Update tracker `docs/2026-11-06-port-p2-ux-batch.md` + jurnal baru bila perlu.

---

## 9. Ringkasan prioritas

| Prioritas | Item | Urgensi | Risiko | Butuh GO |
|---|---|---|---|---|
| **P1** | F12/H5/H6/H4/provider-safe/W4 | **Tinggi** (bocor modal) | Tinggi (jalur uang + migration) | Ya |
| **P2** | W1/F13/F10/quota/operator/WP7/WP6 | Sedang (defensif + email) | Sedang (email live ON) | Sebagian CONFIRM |
| **P3** | CouponTicket/SaldoHero/ResellerArt/WP1 | Rendah (kosmetik) | Rendah | Ya (CONFIRM) |
| **P4** | GA4/content_activation/H3/SEO-J | Rendah (dormant) | Sedang (DDL + eksternal) | Ya (CONFIRM) |

**Inti: P1 (uang) SELESAI 18 Nov 2026 — migration utf8mb3 BENAR (§1.4), backup → migration →
deploy, 4 gate lulus, live `23ef2b3`. F1 perf + notif news ala .my SELESAI 18 Nov (live
`37bb77a`). Batch email P2.5–P2.8 + P3 kosmetik SELESAI 18 Nov (live `54c8615`; lane baru
OFF per-lane menunggu GO aktivasi owner). Jangan salin migration `.my` mentah (utf8mb4 = rebuild
tabel live = MDL convoy). Berikutnya P2.1–P2.4 (defensif admin) → P4; item CONFIRM tunggu owner.**