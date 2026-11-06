# Jurnal Port P2 UX Batch — socio.my → socio.id (Nov 2026)

> Port items dari `updatememory/2026-11-05-handover-master-my-to-id.md` Fase 2 (P2 UX)
> ke `.id` SvelteKit. Konvensi: `.id` = IDR, inline Indonesian (no i18n), Midtrans nonaktif
> (BCA manual + kode unik sen), tanpa Redis/WebSocket.

---

## A4 — Refill Center (`/refill`)

**Sumber .my:** `2026-11-05-refill-center-page.md`

**Adaptasi .id:**
- `packages/core/src/refill-window.ts` — pure functions `smmturkRefillFor(order)` (provider-safe), `isWithinRefillWindow(order)` (72h default, 168h reseller).
- `app/src/lib/server/refill-request.ts` — `requestOrderRefill()` idempotent, set status "Refilling", log ke `refill_requests`.
- `app/src/lib/refill-copy.ts` — pesan server error Indonesia (inline string, bukan i18n).
- Route `(app)/refill/+page.{svelte,server.ts}` — daftar refill per user + form ajukan + timeline.
- `/pesanan` refill action diganti → `requestOrderRefill()` (provider-safe + set "Refilling").
- Nav entry desktop Sidebar + mobile BottomNav pill (Pusat Refill).

**Gerbang:** core test 21/21, svelte-check 0 err, eslint 0 err, build ✓.

---

## A5 — Email Hardening

**Sumber .my:** `2026-10-31-email-blank-investigation.md`

**Adaptasi .id:**
- `packages/core/src/email-guard.ts`: blank-guard (reject jika subject/html kosong), `escapeHtml()` util untuk interpolasi user content.
- `List-Unsubscribe` header HTTPS (Cloudflare R2 unsubscribe endpoint pattern, bukan http).
- Dipakai oleh semua email-templates.

---

## P2 Batch — Detail per Item

### D1: Notif badge anchor + pulse dot + keyframes
- `packages/ui/src/primitives.css`: keyframes `notif-dot-pulse` + `notif-halo` + `.dot-pulse` component layer + reduced-motion kill.
- Sidebar/BottomNav: unread red dot pada anchor icon, badge menang atas unread.

### B2: Kind tint dari token .id
- `packages/core/src/kinds.ts`: `KindDef.tint` mapping ke CSS custom properties.
- `pesan/+page.svelte`: chip jenis pakai `style="--kind-bg: ...; --kind-fg: ..."`.

### E2: decodeHtmlEntities (DB read-only verified)
- `app/src/lib/format.ts`: `decodeHtmlEntities()` untuk konten legacy (named + numeric entities).
- Dipakai di `berita`, `pesan` (nama layanan), dan detail.

### B1: linkExample(platform, kind) placeholder pintar
- `packages/core/src/link-example.ts`: pure function return contoh URL per kombinasi.
- `pesan/+page.svelte`: placeholder link dynamically updated saat platform/kategori ganti.

### B3: Sort kategori GREATEST(created_at, updated_at)
- Server `pesan/+page.server.ts` kategori ORDER BY `MAX(GREATEST(COALESCE(created_at, NOW()), COALESCE(updated_at, created_at))) DESC`.
- Urutan final: Platform → Jenis → Kategori → Layanan (mengikuti keputusan .my Susulan 3).

### B4: Service Popularity (Terlaris)
- `packages/core/src/service-popularity.ts`: engine pure (bucketPopularStats, rankPopular, tiered windows).
- `app/src/lib/server/service-popularity.ts`: load snapshot 30d, 60s cache, per-level pricing (4-arg effectivePer1k, no catRules unlike .my).
- `pesan/+page.svelte`: popularBand snippet (mango-50 Select), pick canonical selectCategory + scrollIntoView.

### C1: Banner pending + dot menu Saldo
- `.dot-pulse` di primitives.css (reuse keyframes D1).
- Sidebar/BottomNav: `item.pending` → amber dot pada Saldo.
- `+layout.server.ts`: count deposits Pending & expire > NOW → `hasPendingDeposit`.
- `saldo/+page.svelte`: banner amber sticker (pop-in, crown/clock, exact amount, countdown, CTA→top-up), cara-kerja 3 langkah, Member→Reseller teaser (→/tiket).
- **Catatan semantik:** Midtrans nonaktif di .id; pending = transfer BCA awaiting admin confirm (24h/72h). CTA ke instruksi+upload bukti (bukan QR sheet .my).

### B6: Search `?q=` orders
- `pesanan/+page.server.ts`: `q` param trim/slice(64) + OR(eq(id), like(oid/serviceName/data)) scoped userId.
- `pesanan/+page.svelte`: search form + state + doSearch/clearSearch + shareable URL.
- `LiveDot` .id: inline Indonesian strings (konvensi final, tidak perlu delegasi `formatAgo`).

### E7: Admin News Separation + Popup + Preset
- `admin/news/+page.server.ts`: `?src=` tab filter, toggle `is_hidden` action + audit, save sync-row lock (only content editable), new post force source="manual".
- `admin/news/+page.svelte`: source tabs (Semua/Manual/Sync + counts), badge per row, toggle button, modal kategori readonly for sync.

---

## Batch Verifikasi Uang + UX (C2–C5, E5) — 6 Nov 2026 (sesi ini)

### E5 — Refund state ledger-first (verifikasi, sudah beres Fase 1)
- `admin/orders/+page.server.ts` sudah pakai `refundStateOf`, `ledgerRefundAmount/At/Exists` (subquery `balance_logs type='ref'`), `isRefund` hanya CAS guard. Tidak ada perubahan baru.

### C2 — Riwayat saldo → link ke detail order (`?oid=` deep-link)
- `saldo/riwayat/+page.svelte`: `orderOidOf` regex `\((oid)\)` → fallback `#oid`, `orderLogHref` (type order/ord/minus), `cleanNote` buang oid dari display, baris order jadi `<a>` + chevron.
- `pesanan/+page.server.ts`: handler `?oid=` — query by userId+oid, sisipkan ke rows kalau tidak ada, return `deepLinkId`.
- `pesanan/+page.svelte`: `onMount` kedua → auto-buka sheet detail saat `deepLinkId != null`.

### C3 — Payment modal UX (bug Tutup)
- `saldo/top-up/+page.svelte` L481: `goto("/saldo/top-up")` (full reload) → `instructionOpen = false` (Sheet sudah `bind:open`). QR 180px + kontras nominal sudah OK, copy BCA manual sudah adaptif.

### C4 — Notifikasi deposit 3 kanal konsisten (bell + email)
- Helper baru `notifyDepositSuccess(userId, amount, isReseller)` di `lib/server/deposit-emails.ts`: `createNotification` bell + lookup email user + `depositSuccessMail` + `enqueueEmail` (best-effort try/catch, tidak pernah gagalkan credit path).
- Dipanggil di 3 situs: webhook Midtrans (sebelumnya cuma bell), admin confirm (sebelumnya cuma email, blok inline ±28 baris dihapus), admin verify approve (sebelumnya tidak ada keduanya).

### C5 — Badge/filter virtual "Kedaluwarsa"
- `cron/light.ts`: auto-expire kini stamp `verification_notes = "Expired: melewati batas waktu pembayaran"` (sebelumnya cuma status Canceled → admin tidak bisa bedakan expired vs manual reject).
- `api/webhook/midtrans/+server.ts`: jalur `failed` stamp `"Expired: midtrans status_code=..."` — konsisten prefix `Expired:`.
- `admin/deposits/+page.server.ts`: projection + `verificationNotes`; filter virtual `status=Expired` = `Canceled AND verification_notes LIKE 'Expired%' OR 'Kedaluwarsa%'`.
- `admin/deposits/+page.svelte`: chip filter baru "Kedaluwarsa" (amber), badge amber per baris (desktop+mobile) saat `isExpiredDeposit`, title tooltip isi note.
- Catatan: override admin manual pakai prefix `OVERRIDE tanpa bukti:` (tidak tabrakan dengan prefix Expired).

### F2 — Kontrak `[manual-off]` (feed hysteresis sudah ada di .id)
- Verifikasi `cron/service-sync.ts` .id: guard `isManualOff` (L309/L399) + ambang harga IDR `PRICE_NEWS_MIN_PCT=2` + min abs Rp100/1k + `NEWS_CAP_PER_SYNC=20` + dedupe 24h — hysteresis SUDAH ada, tidak port ulang.
- **GAP ditemukan**: aksi `toggleStatus` dan form `edit` admin/services menulis status tanpa tag → disable manual bisa di-reaktivasi sync tiap jam (bug kelas sama yg diperbaiki .my db6e240).
- Fix: kedua jalur kini append tag `[manual-off]` saat status→0 dan lepas tag saat status→1 (idempoten, tidak duplikat). Sync tidak pernah menulis `note` → tag aman.
- Data 78 TikTok Live .my TIDAK di-port (keputusan katalog .my).

### B5 — Field order dinamis SMMturk per `services.type` (12 tipe)
- Probe DB produksi (read-only, via container Coolify): distribusi type — Default 7264, Package 1042, Custom Comments 287, Custom Comments Pkg 136, Subscriptions 92, Invites from Groups 15, Comment Likes 14, Poll 4, SEO 3, Mentions Hashtag 2, Mentions User Followers 1, Mentions Custom List 1, Mentions with Hashtags 1, kosong 4. Sebelum fix, 9 tipe non-Default (~133 layanan) salah payload (selalu link+quantity).
- **core/catalog.ts**: `OrderParam`, `TYPE_PARAMS` (13 entri + varian "Mentions with Hashtags" = param Mentions Hashtag per docs), `orderFieldParams()`, `orderFieldSpec(type, serviceName)` → `{needsLink, hasQuantity, isComments, needsUsername, params, extra}`. Fallback Default; deteksi Custom Comments dari nama saat type Default/kosong.
- **core/smmturk.ts**: `smmturkAddFor` menerima `link?`, `username?`, `extra?: Record<string,string>` — param only-sent-when-present.
- **pesan/+page.server.ts**: `sendToProvider` build payload spec-driven; validasi wajib per spec (username/extra); qty Subscriptions dari `extra.max`; insert order pakai `@username` sbg link fallback utk tipe tanpa link.
- **pesan/+page.svelte**: `fieldSpec` derived — blok Link disembunyikan utk Subscriptions, input Username khusus (label per tipe), blok extras generik (keywords/usernames/hashtag/groups/answer_number/min/max/delay) via `EXTRA_META`; live total pakai effectiveQty server-parity.
- **api/v1**: parse `username` + 8 param extras, validasi + payload spec-driven (parity dgn form).
- Test offline baru `order-field-spec.test.ts` (10 grupo) disambungkan ke chain `@socio/core test` — semua hijau.

### E1 — Admin services perf (verifikasi ADAPT, pola .my tidak port mentah)
- Panduan handover: profil read-only DB produksi dulu (container `rebicrj…`, 8866 services / 1228 kategori) — BUKAN `vbknf…` (MySQL socio_my, off-limits).
- `EXPLAIN categories ORDER BY name`: ALL 1175 rows + filesort — murah (1228 baris kecil). Durasi query loader (wrapper docker+mysql handshake ~180ms dasar): categories 253ms, baris tabel 25 (LEFT JOIN cat+prov ORDER BY id DESC) 316ms, stats 184ms, pricing_rules 190ms — **tidak ada anomaly 1 detik** seperti .my karena loader .id memang tidak pernah join+group 1225 kategori (pola A sudah asli beda/lebih murah; pola lama .my bahkan terukur cepat di HW ini).
- **Bagian B (toggle optimistik) TIDAK berlaku di sini**: aksi `toggleStatus` server .id TIDAK dipakai UI manapun (status diubah lewat modal `editService`) → tidak ada `invalidateAll()` per klik toggle.
- **Fix diterapkan (1 selisih nyata)**: `pricing_rules` dipindah ke batch `Promise.all` loader — buang 1 trip DB sekuensial di ujung load (pola sama .my §3.A).
- Gate pasca-edit: svelte-check 0 errors, eslint touched file 0 errors, `vite build` ✓.

### Gerbang batch ini
- `svelte-check`: 0 errors, 50 warnings (baseline)
- `eslint` (file touched): 0 errors (fix pre-existing `catch {}` di light.ts + `void currentType` di riwayat)
- `vite build`: ✓ 19s, adapter-node done

---

## Ringkasan File yang Disentuh

| Layer | File | Item |
|---|---|---|
| core | refill-window.ts, service-popularity.ts, link-example.ts, email-guard.ts, kinds.ts | A4,B4,B1,A5,B2 |
| db/schema | (unchanged — kolom sudah ada) | — |
| lib/server | service-popularity.ts, refill-request.ts | A4,B4 |
| lib | refill-copy.ts, format.ts (decodeHtmlEntities) | A4,E2 |
| routes/(app) | pesan/+page.{svelte,server.ts}, pesanan/+page.{svelte,server.ts}, saldo/+page.{svelte,server.ts}, +layout.{svelte,server.ts}, refill/* | B4,B3,B6,C1,A4 |
| routes/(admin) | admin/news/+page.{svelte,server.ts} | E7 |
| packages/ui | primitives.css, Sidebar, BottomNav, LiveDot (read-only) | D1,C1 |

## Verifikasi Akhir (per 6 Nov 2026, upd. B5)
- `svelte-check`: 0 errors, 50 warnings (baseline)
- `eslint` (touched): 0 errors, 57+21 warnings (pre-existing navigation/a18y)
- `@socio/core test`: 10 suite hijau — +order-field-spec (B5, selftest print) di atas 69 assertion lama
- `vite build`: ✓ adapter-node done (diulang setelah B5 — lulus)

---

## F1 — News feed recalibration (CONFIRM owner, 6 Nov 2026) — KEPUTUSAN: tidak ada perubahan kode
- Handover .my memakai ambang `PRICE_NEWS_MIN_ABS` RM0.10/1k — **TIDAK diport mentah** (skala IDR berbeda jauh).
- **Keputusan 1 (ambang harga):** .id SUDAH di 2% DAN ≥ Rp100/1k (`service-sync.ts` L64-65) sejak keputusan owner sebelumnya → **dipertahankan**. Changelog tetap mencatat SEMUA perubahan untuk admin.
- **Keputusan 2 (jenis berita baru):** `minmax_changed` + `cancel_changed` tetap **changelog-only (admin)**, TIDAK dinaikkan ke feed publik `/berita`.
- Dasar data (probe read-only DB prod): 30 hari terakhir `cancel_changed` 1.796 event/732 layanan, `minmax_changed` 881/453 → total ~2.700/bulan; feed publik saat ini ~2.200 item sepanjang masa (price_up 957, price_down 710, new_service 391, discontinued 159). Menaikkan keduanya akan menenggelamkan berita harga/layanan baru; keduanya sinyal ops admin, bukan keputusan beli user.
- Konsekuensi: TIDAK ada edit kode → tidak perlu gate/commit/deploy. Konfigurasi .id sudah benar; dokumentasi ini mencegah re-litigasi / salah port angka RM oleh sesi berikutnya.

---

## E3/E4 — Admin categories (CONFIRM owner, 6 Nov 2026) — Opsi A: bulk disable band per kategori
- Handover .my: redesign dua-pane `/admin/categories` (rail + switch + chip New + disable band). Owner pilih **Opsi A** — ambil pola berguna saja, BUKAN rombak struktur .id (tangan .my dilarang dipaksakan, kata handover).
- **Keputusan:** tambah aksi **bulk nonaktif/aktif SEMUA layanan dalam satu kategori** di list "Kelola Kategori" yang sudah ada (/admin/services) — TIDAK bikin halaman /admin/categories baru.
- **Server** (`+page.server.ts`): aksi baru `toggleCategoryServices(categoryId, mode)` — guard triad (admin/can/rate `category-toggle` 10/60s). OFF: `UPDATE ... SET status=0, note=CASE... CONCAT(' [manual-off]') WHERE categoryId=? AND status=1` (1 bulk stmt, CASE cegah dobel tag). ON: hanya `status=0 AND note LIKE '%[manual-off]%'` → status=1 + REPLACE buang tag. Audit `bulk_disable_category`/`bulk_enable_category`. TIDAK batalkan order (konsisten toggleStatus).
- **Kontrak [manual-off] (F2):** tag ditulis saat OFF supaya service-sync TIDAK reaktivasi tiap jam; ON hanya membangunkan yang dimatikan MANUAL (yang hilang dari provider / dimatikan sync tetap off). Ini integrasi kunci E3/E4↔F2.
- **UI** (`+page.svelte`): helper `runCategoryToggle(catId,name,mode)` + 2 tombol ghost per baris kategori ("Matikan semua" danger / "Nyalakan semua") lewat ConfirmDialog. Parameter SQL ter-bound (`${likeTag}`/`${TAG}`), categoryId via `eq()` → no SQLi.
- Gate: svelte-check 0 errors (50 warning baseline), eslint 0 errors (47 warning baseline), build ✓ adapter-node.
- **COMMIT 4988b5a · DEPLOYED 0010967 · LIVE** (Coolify `qejbjdmjmotmwurez31v3lbn` finished; container tag 0010967fbab1; L3 0 findings).

---

## E6 — Admin revenue verified-deposits (CONFIRM owner, 6 Nov 2026) — Opsi A: ganti KPI ke kas-masuk deposit
- Handover .my menduga .id "Midtrans settlement otomatis" → **KOREKSI owner**: Midtrans .id NONAKTIF, kas masuk = deposit yang admin verify manual (BCA + kode unik sen). Jadi model .my Justru portabel penuh ke .id.
- Temuan: dashboard .id SEBELUMNYA menghitung "Revenue hari ini" = `SUM(orders.price)` (GMV order) — bukan Midtrans, bukan deposit. Ada di **2 sumber**: load `(admin)/admin/+page.server.ts` + SSE `api/admin/events/+server.ts`.
- **Keputusan Opsi A:** ganti KPI "Revenue hari ini" + chart 7d + delta-vs-kemarin jadi **kas-masuk deposit terverifikasi**: `SUM(deposits.amount)` WHERE `status='Success' AND verified_by IS NOT NULL`, bucket `DATE(verified_at)`. Sumber kebenaran sama dgn aksi verify admin (`UPDATE deposits SET status='Success', verified_by, verified_at=NOW()`).
- **Semantik:** deposit = uang riil masuk (liabilitas saldo sampai dipakai); GMV order = nilai layanan terjual. Owner pilih kas-masuk sbg KPI utama. GMV order TETAP tersedia di `/admin/reporting` (analitik order) — tidak diutak-atik.
- **Label UI:** "Revenue hari ini" → "Kas masuk hari ini"; chart series "Revenue" → "Kas masuk". Nama properti payload internal (`revenue.today/spark/delta`) TIDAK diubah → kontrak SSE ke client tidak pecah, hanya nilainya bersumber deposit.
- Query `depPendingRow` (pending deposit) & `ordersTodayRow` (jumlah order) tetap — hanya 3 query revenue (today/yest/byDay) × 2 file yang diarahkan ke deposits + `isNotNull(deposits.verifiedBy)`.
- Gate: svelte-check 0 errors (50 warning baseline), eslint 0 error BARU (6 `no-empty` pre-existing catch{}), build ✓ adapter-node.
- **COMMIT a3a3a09 · DEPLOYED 0010967 · LIVE** (bersama E3/E4, L3 0 findings).

## G1 — Email lifecycle/winback (CONFIRM owner, diputuskan 6 Nov 2026) — email perilaku, BUKAN blast

Keputusan owner: **hanya segmen `activation`** yang dijadwalkan dulu · ambang `balance_low` **< Rp10.000** · irama **Konservatif** (cap 25/hari, 1 per 7 hari per user, quiet hours 08:00–20:00 WIB). WAJIB Design DNA Socio (`render.ts`) + maskot Sparko + bahasa Indonesia.

- **Fase A (compliance)**: token unsubscribe HMAC-SHA256 (`SOCIO_AUTH_SECRET`, fail-fast ≥16), one-click RFC8058 (`/api/u/[token]` 200 silent) + halaman konfirmasi `/u/[token]` (CSRF + Sparko), tabel `email_suppressions` (worker filter marketing-only), kill switch `EMAIL_MARKETING_ENABLED` **default OFF**.
- **Fase B (lifecycle engine)**: `email_triggers_sent` UNIQUE(user,trigger,periodKey) idempoten (7-hari cooldown via `weekPeriodKey`), `segments.ts` BASE_FILTER **tanpa gerbang verify='Yes'** (verify .id = penanda aktivasi reseller; gating salah exclusi 1489 user — diverifikasi read-only prod: 3463 eligible marketing), `templates.ts` buildLifecycleEmail (emailShell+emailHero+emailServiceGrid+emailStatStrip+emailFooterMarketing, pose Sparko idle|wave|sad|celebrate), `enqueue.ts` claim→render→insert `email_queue` (`marketing-${trigger}`).
- **Fase cron**: `email-lifecycle.ts` + registrasi `jobs.ts` (expr `0 9 * * *`, **`tz: Asia/Jakarta`** — field baru, `index.ts` teruskan timezone ke `cron.schedule`); gerbang suppression + kill-switch di `email-queue.ts` (marketing-only, transaksional tak terpengaruh).
- **Adaptasi .id**: balance = int Rupiah (sen .my dibuang); **coupon_expiring dropped** (tak ada `user_coupons`).
- **Verifikasi**: svelte-check 0 error, eslint bersih (1 no-empty pre-existing), build ✓, selftest esbuild (HMAC roundtrip + tamper-reject + fail-fast secret + WIB math 02:00Z=09:00WIB + periodKey) → OK.
- **COMMIT 178a3eb→32735db (4 granular: schema/lib/routes/cron) · L3 0 findings · DEPLOYED 32735db · LIVE** (Coolify `k5kwd00lbedn7hzgu2n0miwj` finished; container tag `32735db2e905`; `/u/*`=400 & `/api/u/*` POST=200; cron registry 11 job incl `email-lifecycle`; `ensureAdminSchema` di hooks → 2 tabel terbentuk). **Kill switch OFF** → belum ada email terkirim sampai owner mengaktifkan.
- **UPDATE 6 Nov 2026 — kill switch ON**: sampel 1 email aktivasi dikirim ke inbox owner (Resend 200, HTML 9.209 byte, grid nyata, unsubscribe valid) → **konfirmasi OK** → `EMAIL_MARKETING_ENABLED=1` via API Coolify (env uuid `1uvrulnhjr0wwvvpsppsbxys`) + deploy `apyauzua8zo7jykeh9xk7f2n` finished; container image `1f0d019`, env terverifikasi `=1`, cron 11 job incl email-lifecycle, tanpa error marketing. **Activation live**: cron 09:00 WIB enqueue ≤25/hari (cap + cooldown 7 hari + quiet 08:00–20:00 WIB); calon 3.247 user. Opsional menyusul: rapikan nama kategori grid email pakai helper `whitelabel()` (konvensi repo sudah ada).

## Belum / Perlu Konfirmasi Owner
- C1 banner copy: Midtrans nonaktif → BCA flow. Kalau Midtrans diaktifkan, query tetap valid, tapi CTA perlu berubah ke QR sheet.
- E7 `title` column tidak ada di .id schema (tidak di-invent; .my punya, .id tidak butuh).

---

## 📊 Tracker Handover socio.my → socio.id (A→K) — per 6 Nov 2026

Legenda: ✅ selesai+live · 🔍 verify-only (sudah sesuai, tanpa kode) · ⏸️ CONFIRM (menunggu keputusan) · ❌ skip (keputusan .my, tidak diport)

| Kode | Item | Status | Catatan |
|---|---|---|---|
| P0 ×4 | Financial bug fixes Fase 1 | ✅ LIVE | commit sesi sblm (refund/price/markup) |
| A4 | Refill Center `/refill` | ✅ LIVE | |
| A5 | Email hardening | ✅ LIVE | |
| B1 | Smart link placeholder | ✅ LIVE | da0a106 |
| B2 | Kind tint chips | ✅ LIVE | da0a106 |
| B3 | Kategori sort GREATEST | ✅ LIVE | da0a106 |
| B4 | Popularitas "Terlaris" | ✅ LIVE | da0a106 |
| B5 | Field order dinamis SMMturk (12 tipe) | ✅ LIVE | a779a74 |
| B6 | Search pesanan `?q=` | ✅ LIVE | da0a106 |
| C1 | Banner pending + nav dot | ✅ LIVE | da0a106 |
| C2 | Riwayat saldo → link order `?oid=` | ✅ LIVE | 53b8127 |
| C3 | Modal top-up Tutup (no reload) | ✅ LIVE | 53b8127 |
| C4 | Notif sukses deposit (bell+email) | ✅ LIVE | 53b8127 |
| C5 | Badge virtual "Kedaluwarsa" | ✅ LIVE | 53b8127 |
| C7 | Banner promo (preset .my) | ⏸️ CONFIRM | belum diputuskan |
| D1 | Notif badge halo | ✅ LIVE | da0a106 |
| E1 | Admin services perf | 🔍 verify-only | 791363a (pricing_rules paralel) |
| E2 | decodeHtmlEntities | ✅ LIVE | da0a106 |
| E3/E4 | Admin categories bulk toggle | ✅ LIVE | **4988b5a (sesi ini)** — Opsi A |
| E5 | Refund label ledger-first | 🔍 verify-only | sudah beres Fase 1 |
| E6 | Revenue = kas-masuk deposit | ✅ LIVE | **a3a3a09 (sesi ini)** — Opsi A |
| E7 | Admin news separation | ✅ LIVE | da0a106 |
| E8 | Coupons personal view | ⏸️ CONFIRM | tergantung H3 |
| F1 | News threshold IDR | 🔍 decide (no-code) | 2%/Rp100 dipertahankan; minmax/cancel changelog-only |
| F2 | Kontrak [manual-off] | ✅ LIVE | 791363a |
| G1 | Email lifecycle/winback | ✅ LIVE | **32735db (sesi ini)** — activation only, kill-switch OFF, ID+Sparko+DNA |
| G2 | Retire-verify flow | ⏸️ CONFIRM | belum disentuh |
| H1/H2/H3 | Reseller / coupon loop | ⏸️ CONFIRM | belum disentuh |
| I | Multi-provider | ⏸️ CONFIRM | proyek besar + migrasi `provider.status` |
| P4 | SEO subsystem port | ⏸️ CONFIRM | proyek terpisah |

**Deploy batch sesi ini:** 3 commit (4988b5a E3/E4 · a3a3a09 E6 · 0010967 docs) → push `da0a106..0010967 → main` → L3 0 findings → Coolify finished → container tag 0010967fbab1 (Up).
