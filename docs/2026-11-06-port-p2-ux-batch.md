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

## G2 — Retire-verify + separasi `reseller_activated` (CONFIRM owner, diputuskan 6 Nov 2026)

Keputusan owner: **retire verifikasi email utk Member saja** (pure retire — berhenti kirim) · **tambah `users.reseller_activated`** (kolom baru, pisahkan aktivasi reseller dari `verify` yang overload) · **hapus toggle `signup_verify_required`** dari admin settings. Ancaman uang teridentifikasi: retire naif (mass verify=Yes) akan melepas 234 reseller BELUM bayar ke markup Reseller — karena pricing key-nya `level`, bukan verify.

- **Fase 0 (DB prod, sebelum kode deploy)**: backup `users_bak_g2` (3.468 baris) · `ALTER TABLE users ADD COLUMN reseller_activated TINYINT NOT NULL DEFAULT 0` · backfill `=1 WHERE level='Reseller' AND verify='Yes'` → **tepat 56** (234 pending tetap 0). Resep mysql2-absolute-path dalam container; skrip temp dihapus.
- **Fase 1 (schema)**: `packages/db/src/schema/users.ts` + kolom `resellerActivated`; `ensure.ts` `tryExec ADD COLUMN` idempoten utk env lain.
- **Fase 2 (auth/gates)**: `activateReseller()` tulis `resellerActivated=1` (bukan verify) · gate order `/pesan` Reseller + banner aktivasi dashboard + `resendActivation` baca kolom baru · gate login Member/Agen (U-02) **dihapus** (gate suspended tetap) · `/daftar` tidak lagi kirim email verifikasi (selalu `/login?registered=1`). Route `/verifikasi` legacy + `sendMemberVerificationEmail` dibiarkan hidup (resend user lama); `verify` tetap informasional (hooks emailVerified, display admin, segmen broadcast).
- **Drop-on (konsekuensi retire)**: broadcast `admin/email` tidak lagi hard-filter `verify='Yes'` — pasca retire member baru tak pernah verify=Yes lagi → blast menyusut ke nol; konsisten keputusan BASE_FILTER G1.
- **Fase 3 (admin)**: toggle `signup_verify_required` dihapus (load var, action `toggleSignupVerify`, kartu UI settings); audit log lama tetap histori.
- **Verifikasi**: selftest source-scan 18/18 OK · svelte-check 0 error · eslint 0 error baru (1 no-empty pre-existing) · build ✓ · DB pasca-deploy cross-tab utuh (56/234).
- **COMMIT b92070c→f03c831 (3 granular: schema/retire+gates/settings) · L3 1 medium pada route unsubscribe G1 (desain RFC8058; owner: **terima, lanjut**) · DEPLOYED f03c831 · LIVE** (Coolify `oik1pm313mrpd2ahen5mfstp` finished; container `nqsjafrei6k8dkup1pxkcuwf-20261106T140608` tag `f03c831`; `/`=303, `/u/bogus`=400 [G1 regression OK], `/login?registered=1`=200; cron 11 job sehat).

## C7 — Banner promo dashboard: mode artwork self-contained (CONFIRM owner, diputuskan 6 Nov 2026)

Label tracker "C7" tidak ada di master doc; hasil investigasi: pipeline banner .id SUDAH lengkap dan lebih kaya dari .my (CMS `promotion_banners` position='dashboard' + window jadwal + limit 5 → fallback `dashboard_banners` setting JSON → `DUMMY_BANNERS` · admin CRUD `/admin/banners` + upload R2 · `PromoBanner.svelte` di packages/ui). Gap NYATA hanya satu: renderer .id menumpuk overlay teks (badge/h2/subtitle/CTA putih) di ATAS banner bergambar → copy dobel + tak terbaca. Probe prod: 3 banner CMS aktif semuanya `has_img=1`, artwork terukur **1200×360** → spacer pakai `aspect-[1200/360]` (BUKAN 1200/630 milik .my — port membabi buta akan letterbox/crop).

- **Keputusan owner**: port fix artwork .my (opsi sterilisasi dummy ditolak — pipeline CMS tetap dipakai).
- **Perubahan** (1 file `packages/ui/src/components/PromoBanner.svelte`): branch `b.img` tampil image utuh (`loading="lazy"` + `decoding="async"`) TANPA overlay · overlay badge/h2/subtitle/CTA pindah ke `{:else}` (murni gradient/teks) · spacer kondisional: ada img → `aspect-[1200/360]`, tidak ada → tinggi tetap lama (176/184/190px). Prop `lang` .my tidak diport (.id tanpa i18n).
- **Verifikasi**: svelte-check 0 errors (baseline 50 warnings tetap) · build ✓ · L3 **0 findings**.
- **COMMIT 06ac016 · push aedcb24..06ac016 (SSH HEAD:main) · DEPLOYED 06ac016 · LIVE** (Coolify `7p30w26xtmnet2fdpaes8b3f` finished; container `nqsjafrei6k8dkup1pxkcuwf-20261106T144600` tag sha `06ac016…`; marker `1200/360` ada di chunk client `CJ00Bo3D.js` + CSS `0.Dcm0_gMC.css` + chunk server; `/login`=200; token API revoked, sisa 0).

## H1 — Jalur upgrade mandiri Member→Reseller (CONFIRM owner, diputuskan 6 Nov 2026)

Master doc §534-560 + spec .my `2026-10-31-fase-a-reseller-upgrade.md`. Keputusan owner: **port penuh pola .my** (halaman `/reseller` + action upgrade) · **tetap Rp50.000 termasuk saldo Rp20.000** (BCA manual transfer, bukan QR .my). Investigasi: infra aktivasi .id SUDAH ~90% lengkap (`issueResellerActivationInvoice` deposit Pending `untuk_apa=reseller` + email BCA; `activateReseller` dipanggil admin verify + midtrans webhook). Gap NYATA: (a) `activateReseller` **tidak pernah flip `level`** — bug laten, pricing key-nya `level` sehingga upgrade tanpa flip tidak berdampak uang; (b) tidak ada surface `/reseller`/action/nav utk Member existing.

- **Flip level (uang-kritis)** `signup.ts`: `activateReseller` set `level = CASE WHEN level='Member' THEN 'Reseller' ELSE level END` — no-op utk jalur signup (sudah Reseller), melindungi Admin/Agen dari clobber. Level berubah HANYA setelah bayar dikonfirmasi, bukan dari klik user.
- **Route baru** `(app)/reseller/+page.server.ts`: `load` chart **JUJUR** dari `pricing_rules` LIVE (probe prod: Member 225% / Reseller 200%, BUKAN hardcode .my 275/250) via `effectivePer1k` — anti-leak: client hanya terima total rupiah + `savePct`, tak ada base/markup. `actions.upgradeToReseller`: rate-limit 1/60s → guard `level==='Member'` (DB otoritatif) → idempoten invoice Pending hidup → reuse `issueResellerActivationInvoice`.
- **UI** `(app)/reseller/+page.svelte`: hero StickerCard + manfaat×5 + Chart + 3 langkah + fee NumberFlow + FAQ×4 + CTA **4-state** (sudah aktif / aktivasi-pending→dashboard / invoice-pending→saldo / tombol upgrade). Reseller warisan 234 blm lunas TIDAK diklaim aktif (diarah ke banner resend dashboard). Copy ID hardcoded (no i18n).
- **Nav**: `Sidebar.svelte` prop `hot?` (dot `dot-pulse` accent + glyph crown), `+layout.svelte` splice entri "Upgrade Reseller" khusus Member; teaser `saldo/+page.svelte` `/tiket`→`/reseller`.
- **Verifikasi**: svelte-check 0 error (baseline 50 warnings) · eslint 0 error · build ✓ · guard selftest source-scan 4 invarian (CASE flip ada L288, action tanpa mutation level, guard-chain lengkap, anti-leak totals-only).
- **COMMIT d02a142 · push 58b58e4..d02a142 (SSH HEAD:main) · L3 0 findings · DEPLOYED d02a142 · LIVE** (Coolify `irscvdnftfm0of0sroha9gff` finished; container `nqsjafrei6k8dkup1pxkcuwf-20261106T163018` tag sha `d02a142…`; marker "Beli lebih murah" di chunk client node 40 + server `reseller/_page.svelte.js`; action `upgradeToReseller` di `reseller/_page.server.ts.js`; `/reseller`=303 [guard unauth OK], `/login`=200; token API revoked, sisa 0).

## I — Multi-provider (switcher 1-aktif + routing per-kategori) + TikTok → SMMfollows

Owner instruction 8 Nov 2026: *"pastikan layanan tiktok menggunakan smmfollow, apinya kamu lihat, semua harus berfungsi, jangan test order"*. Keputusan owner: (a) API key **dari .my** (decrypt di container .my, re-encrypt dgn key .id — key tak pernah keluar host); (b) scope routing **"Cerdas ala .my"** = klasifikasi COVERED/KEEP + review CSV sebelum apply (bukan flip semua, bukan kind-clean-only); (c) UI **lengkap**: `/admin/routing` baru + tombol "Jadikan Aktif" di `/admin/providers`.

**Temuan investigasi (beda penting .my vs .id):** `.id` **tidak punya** `category_pricing_rules` (markup hanya per-level di `pricing_rules`) ⇒ blocker terbesar .my (carry-over markup kategori) **tidak berlaku**. Kontrak API SMMfollows **identik** v2 dengan SMMturk (`https://smmfollows.com/api/v2`; action services/add/status/refill/refill_status/cancel/balance; USD) ⇒ **tanpa adapter** — `packages/core/src/smmturk.ts` sudah generic (endpoint+key per call).

**Implementasi (6 layer):**
1. **Core murni** `packages/core/src/routing-policy.ts` — `MANUAL_OFF_TAG`, `deriveServingState`, `planReconcile`, `allowedForRouting` + `kind-signature.ts`; selftest `packages/core/test/routing-policy.test.ts` **15/15 assertion** (port dari .my).
2. **Skema** — `provider.status` (tinyint 1-aktif), tabel `category_provider_routing` (unik per kategori), `services.service_name`/`service_name_raw` → **1024** (nama terpanjang SMMfollows 326 vs varchar lama 255 ⇒ `ER_DATA_TOO_LONG`), `provider_services.category` → 512; DDL idempotent di `packages/db/src/ensure.ts`.
3. **Helper server** — `app/src/lib/server/active-provider.ts` (`getActiveProviderId` cache 30s + self-heal, `getCategoryRoutingMap`, `isProviderAllowedForCategory`, `getRoutedProviderIds`) + `app/src/lib/server/category-routing.ts` (`listRoutingRows`, `setRouting`, `reconcileAllServices` bulk UPDATE JOIN).
4. **Gerbang sync** — `service-sync` pakai `allowedForRouting` (routing **menang** atas provider aktif global); route-off **tanpa** tag `[manual-off]` (kontrak F2 tetap utuh) & tanpa berita "dihentikan"; `provider-sync` mirror hanya ∪ (aktif ∪ routed).
5. **Guard order** — `pesan` + `api/v1` cek `isProviderAllowedForCategory` **sebelum** potong saldo; `pesanan` popular-services de-hardcode `provider_id=2` → key `(providerId, providerServiceId)` (anti tabrakan id antar provider).
6. **UI admin** — `/admin/providers` status + badge AKTIF + action `setActive` + tombol "Bandingkan Aktif"; `/admin/routing` baru (list + filter search/kind/onlyRouted + action `setRouting`, RBAC `providers:read`/`providers:edit`, rate-limit, audit log) + nav.

**Prod (backup dulu — mysqldump 55.474.919 B / 53 tabel, sha256 `66608561…`):** migrasi applied (provider.status + tabel routing + widen kolom) → provider **SMMfollows id=10** dipasang (status=0, key re-encrypt, round-trip encrypt OK) → sync mirror (7.554 services, **0 aktif** = inert ⇒ tidak ada jendela katalog dobel) → routing plan COVERED/KEEP (158 COVERED / 18 KEEP / 77 kategori SMMfollows) → review CSV → **233 baris routing** ter-apply (2 duplikat kategori shared dibuang) → service-sync kedua provider.

**Bug yang ketemu saat verifikasi live (sudah difix):** gerbang enable `service-sync` versi awal pakai OR (`providerId === activeId || routed === providerId`) ⇒ provider aktif global tetap melayani kategori yang sudah di-route ⇒ TikTok **dobel** (SMMturk 175 kategori/1.539 aktif + SMMfollows 77/828). Fix: pakai fungsi murni `allowedForRouting` (routing menang atas aktif). Commit `4572fee` → L3 0 findings → push `4a798e9..4572fee` → Coolify `qt3odbw3eqerthge5li2icyi` finished → container `nqsjafrei6k8dkup1pxkcuwf-20261108T152051` tag sha `4572fee777f55…` → service-sync ulang: provider 2 **routeOff=1.138** dimatikan, provider 10 828 updated.

**Verifikasi live (tanpa order sama sekali — hanya `action=services`/`action=balance`):**
- Katalog: **kategori duplikat = 0**, **route violation = 0** (tiap kategori ter-route dilayani HANYA provider target).
- SMMfollows: **828 layanan aktif / 77 kategori** (TikTok); SMMturk: 6.559 aktif / 712 kategori; sisa TikTok di SMMturk **401 layanan / 16 kategori** = kategori KEEP (emergency server, coins, top-in-market, organic growth) — disengaja.
- Guard order (`isProviderAllowedForCategory` dari chunk build): 3 kategori TikTok ter-route → `allowTarget=true`, `allowOther=false` ⇒ SMMturk DITOLAK di kategori TikTok, SMMfollows DITERIMA. Kategori non-TikTok (YouTube dll) tetap SMMturk saja (routing ter-scope).
- API kedua provider hidup: SMMfollows katalog **7.554** layanan terbaca, saldo **5.8261 USD**; SMMturk saldo **1.5734 USD**. `app.socio.id`=303 (guard login), `socio.id`=200, cron semua `ok`.
- ⚠️ **Perlu perhatian owner**: saldo SMMfollows 5.83 USD & SMMturk 1.57 USD — tipis utk volume TikTok. Perlu top-up dua-duanya (SMMturk sempat 1.92 → 1.57 selama pengerjaan).

**Side-fix order nyangkut (jawaban atas "order konsumen nyangkut di smmturk gmn"):** `status-polling` mengabaikan error per-order (`{"error":"Incorrect order ID"}`) ⇒ order lama nyangkut **Pending** selamanya; auto-refund lama hanya cover Error/Partial/Canceled. Fix: (a) error per-order → status `Error` (guard umur ≥2 jam), (b) cron baru `stale-refund` tiap 30 menit → order Pending/Processing/In progress lebih tua dari `SOCIO_STALE_ORDER_DAYS` (default 7) dana konsumen dikembalikan penuh (ledger-first + CAS `is_refund`). Commit `4a798e9`. Order in-flight SMMturk **tidak** terganggu: polling/refill/cancel semua key `order.provider_id`.

## P4 — SEO subsystem: port loop pengukuran socio.my → socio.id

Owner instruction 8 Nov 2026: *"P4 SEO subsystem"* (porting `.my` → `.id`). Plan disetujui: `docs/plans/P4_SEO_measurement_loop_f8bdf691.md` (2 skrip + 2 siklus host).

**Temuan audit (8 Nov 2026) — premis awal plan dikoreksi:** pipeline SEO socio.id **sudah jalan** (generate ✓, publish-git ✓, llm-ping tiap 15 mnt ✓ — IndexNow 1.055 URL + Bing 1.052 URL). Yang TIDAK ada:
- Siklus index harian: **sudah ada** (`/etc/cron.d/seo-measure` → `seo-measure-cycle` → `runner/daily.mjs` → indexer) — jadi plan tidak perlu membuat ulang.
- `gsc-analytics.mjs` (mining query) + `seo-status.mjs` (status report) — **tidak ada** di repo produksi; `seo-measure-cycle` menjalankan lapisan GSC/status untuk **socio.my** (`/opt/seo-my/repo`).

**Akar masalah yang sebenarnya ditemukan (bukan yang di plan):** `publish-git.mjs` menandai artikel published di `queue.json` tapi **tidak pernah menambah entri ke `state.published[]`**. Akibatnya `state.published` tertinggal **340 entri vs 1.006 artikel live** → `gsc-inspect` (filter `daysAgo(firstSeen)`) tak pernah melihat artikel baru → `gsc-inspect: tidak ada URL baru untuk dicek` → label `indexed` kosong → ramp-gate buta (`discovery gap 100%`, `daily_count` beku di 15). Ditambah 335 entri warisan tanpa field `firstSeen` sama sekali (tidak pernah terlihat oleh filter window).

**Yang dikerjakan:**
1. **`seo/reconcile-published.mjs` (baru)** — rekonsiliasi ADITIF `state.published[]` vs korpus MDX live: menambah entri hilang, backfill field kosong (`firstSeen` dari `pubDate`, `indexed` default `unknown`), TIDAK PERNAH menghapus entri / menimpa nilai yang sudah ada / menyentuh `indexnow.submitted`, `bing.submitted`, `gsc`, `rampGate`. Idempoten. → `state.published` 340 → **1.006**.
2. **`seo/gsc-analytics.mjs` (baru — port dari .my)** — mining query GSC 28 hari + query tanpa halaman (calon page) + halaman CTR rendah (revisi title) + halaman yang impression tapi tak terindex. Pakai helper `searchAnalytics()` `seo/lib/gsc.mjs` (bukan fetch mentah).
3. **`seo/seo-status.mjs` (baru — port dari .my)** — ringkasan pipeline harian + alert (index_rate, kuota Bing, runway, discovery gap, overshoot). `--strict` untuk exit 1; default exit 0 supaya cron tak putus.
4. **`seo/gsc-inspect.mjs` (patch)** — simpan `state.json` **berkala** (tiap 10 URL). Inspeksi 1.006 URL butuh ~1-2 jam (URL Inspection API ~6 detik/URL); tanpa save parsial, proses mati di tengah menghilangkan SEMUA hasil.
5. **Output UNTRACKED** — laporan ditulis ke `SEO_REPORT_DIR` (default `/app/data/reports` di container), BUKAN `docs/`. Di .my laporan `docs/SEO-QUERIES.md` yang tracked ditulis harian → tree dirty → `git pull --rebase` siklus publish gagal (insiden 3-8 Nov 2026).
6. **Siklus host baru** (tanpa menyentuh siklus .my): `/etc/cron.d/seo-index-coid` (05:40 + 11:40 UTC → `seo-index-coid-cycle`: reconcile → `gsc-inspect --days 3`) + `/etc/cron.d/seo-measure-coid` (06:40 UTC → `seo-measure-coid-cycle`: gsc-analytics → seo-status). Load guard + flock, sama seperti siklus existing.

7. **`seo/lib/gsc.mjs` (patch — akar masalah HTTP 401)** — cache token akses GSC **tidak pernah mengecek masa berlaku**. Token Google valid 1 jam, jadi proses yang jalan >1 jam (inspeksi 1.006 URL ≈ 1 jam 3 menit) memakai token expired → **447 URL terakhir gagal `HTTP 401: Request had invalid authentication credential`** (bukan kredensial rusak). Fix: patuhi `expires_in` (skew 60 detik) + **retry satu kali** dengan token baru saat 401. Deploy ke runner repo commit `83a375f`; monorepo = cermin byte-identical.

**Deploy:** 3 skrip + patch `gsc-inspect` + patch `lib/gsc.mjs` di-commit & push ke repo produksi `ReqTimeout/socio-seo-runner` (commit `d611e51` → `6e5ee42` → `479665d` → `83a375f`), lewat `GITHUB_TOKEN` extraHeader (tanpa token di argv). Backup `state.json` sebelum rekonsiliasi: `/app/data/state.json.bak-20261108T161128`.

**Verifikasi akhir (9 Nov 2026, setelah perbaikan token + inspeksi ulang):**
- `state.published` 340 → **1.006** tanpa duplikat URL; `indexnow.submitted` (1.055)/`bing.submitted` (1.052) utuh; repo runner tetap bersih (`git status` kosong).
- Inspeksi GSC **1.006/1.006 URL** (0 `unknown` tersisa; `gsc.inspections` 1.011 entri): **914 indexed / 73 not_indexed / 19 not_discovered**.
- **index_rate 92,6%** (914/987 discovered) — metrik SEJATI, bukan artefak cakupan inspeksi minuscule. `discovery gap 1,9%` (sebelumnya 100%).
- **Ramp-gate BUTA → hidup**: `daily_count` **15 → 17 → 19** (bukan lagi beku; alasan *"naik — index_rate 92,6% >= 85%"*), `alerts: []`. Efektif publish = `min(--count=20, daily_count=19)` = 19 artikel/hari.
- `seo-status` → **0 alert**; `bing` kuota sehat (`quotaAfter=85`, `overQuota=0`); kuota GSC terpakai ~1.000 dari 2.000/hari.
- **Idempoten**: inspeksi ulang otomatis **skip 559 URL** yang sudah dicek <24 jam lalu → hanya 447 sisanya yang ditinjau; `published[].indexed` tidak berubah ganda.
- **Load guard** diuji di 3 cabang: load tinggi → SKIP, RAM <700MB → SKIP, `flock` dipegang instance lain → SKIP; semuanya exit 0 tanpa `docker exec`.
- **`.my` utuh**: `git -C /opt/seo-my/repo status` kosong, siklus `.my` tetap normal.
- `indexer.mjs --dry-run --days 7` → 4 tahap ter-plan (indexnow/bing/gsc/remedy), nol request keluar.

## P5 — Admin dashboard: port halaman & rail kategori socio.my → socio.id

Owner instruction 9 Nov 2026: *"ko admin fitur ga ada di app.socio.id? coba ceck semua commit app.socio.my khusus admin dashboard fiturnya double check harus terimplement di .id ini read only dulu"*. Audit READ-ONLY dulu, lalu implementasi G1+G2 (dipilih owner).

**Audit (read-only, 9 Nov 2026):** `.my` dibuat sebagai duplikat `.id` (commit `a331ff03`, 8 Okt) → **histori terpisah, tanpa merge-base** (merge-base kosong). Parity point terakhir = **24 Okt (`b6ff2a8`)**; setelah itu `.my` mengerjakan **37 commit admin** (26 Okt – 9 Nov) yang tak pernah masuk `.id`. Bukti: file route admin 66 (`.my`) vs 64 (`.id`), menu 26 vs 25, schema 32 vs 31. Konten **semua** 64 file admin bersama berbeda (bukan cuma yang hilang) — `.id` punya adaptasi sendiri (IDR, copy Indonesia, multi-provider item I).

**Yang SUDAH ada di `.id` (bukan gap):** kontrak `[manual-off]`, bulk toggle per kategori, KPI revenue = deposit terverifikasi, pemisahan pengumuman/berita, deposit bell + badge Kedaluwarsa, label Refunded + guard, Reseller Member→Reseller, provider switcher + `/admin/routing`, Refill Center, cron `email-lifecycle`, tabel `email_suppressions`, "Paling laris", RBAC + rate-limit + audit log.

**Implementasi (G1+G2):**
1. **`app/src/lib/server/category-admin.ts` (baru)** — sumber tunggal SQL kategori: `MANUAL_OFF_TAG`, `withManualOff`, `listCategoryRowsLite()` (id+nama+total/aktif, GROUP BY di tabel `services` saja — hindari filesort), `listCategoryRows()` (+ routing + nama provider), `setCategoryStatus(id, mode)`, `toggleCategoryStatus(id)`, `countCategoryServices(id)`. Kontrak: **tidak boleh ada dua jalur SQL** untuk disable kategori — drift = tag `[manual-off]` hilang = service-sync hidupkan lagi tiap jam.
2. **`/admin/categories` (baru)** — halaman khusus: cari, filter status (Semua/Aktif/Mati), filter routing (Dirutekan/Provider Aktif), kolom ID/Nama/Layanan/Status/Aksi, badge "Dilayani {provider}", switch per baris, pagination (100 + "Muat N lagi"), form tambah/edit/hapus. Copy Indonesia hardcoded (tanpa katalog i18n — `.id` memang tidak punya).
3. **Rail kategori di `/admin/services`** — dua panel: rail kiri (cari + chip status + count `aktif/total` + switch matikan-semua per kategori + link "Kelola Kategori"), tabel di kanan. Blok "Kelola Kategori" lama (accordion 1.836 baris tanpa filter) + form tambah/edit dihapus — CRUD pindah ke halaman baru. Tombol header "Kategori" → link "Kelola Kategori".
4. **Refactor `services/+page.server.ts`** — `toggleCategoryServices` sekarang memanggil helper (SQL identik, pesan & audit tak berubah); aksi `addCategory`/`editCategory`/`deleteCategory` **dipindah** ke `/admin/categories`.
5. **Menu admin** — item "Kategori" (`/admin/categories`) di grup Operasional.

**Verifikasi:** `pnpm --filter app check` → 0 error (54 warning, pre-existing pola `state_referenced_locally`); `pnpm --filter app build` ✓; ESLint file yang disentuh → 0 error; SQL helper divalidasi ke DB produksi (read-only): 1.836 kategori, 312 tanpa layanan, 735 semua mati, 233 baris routing. SSR `/admin/categories` & `/admin/services` → HTTP 200, 101 baris tabel, 74 switch, chip + rail + badge provider tampil. **Uji kontrak `[manual-off]` end-to-end di DB dev (6/6 lulus)**: OFF → status=0 + tag, ON → status=1 + tag hilang, kedua jalur (`/admin/categories` deteksi & `/admin/services` mode eksplisit) identik, OFF 2× tidak menumpuk tag, state awal pulih.

**Catatan encoding (bukan bug kode):** DB dev lokal punya 992/1.132 nama kategori **double-encoded** (`"Instagram 🇺🇸 AI"` → `"Instagram ðºð¸ AI"`; byte UTF-8 dibaca Latin-1 lalu di-encode ulang). Terbukti byte DB ada **persis** di HTML → server tidak mengubah apa pun. **Produksi `.id` 0/1.836 dan `.my` 0/1.534 → bersih.** Yang dipulihkan 6.782 baris di DB dev lokal (2 backup di `/tmp/dev-db-encoding-backup*.json`); 4 baris tak terpulihkan (emoji terpotong).

## P6 — Category visibility: kategori mati hilang dari filter user, TIDAK dihapus dari data

Owner instruction 9 Nov 2026: port `updatememory/2026-11-09-category-visibility-dropdown-fix.md` dari socio.my ke socio.id.

**Ekuivalensi repo (nama rute beda):** `.my` `/services` → `.id` `/layanan`; `.my` `/order` → `.id` `/pesan`; dashboard nama sama.

**Perubahan (3 file):**
1. **`app/src/lib/server/category-visibility.ts` (baru)** — satu sumber kebenaran: `orderableServiceSql()` (factory, bukan konstanta module-level), `decorateCategoryRows()` (label `disabled`, tidak ada baris dibuang), `pickBuyableCategories()` (filter dropdown).
2. **`app/src/routes/(app)/layanan/+page.server.ts`** — dropdown kategori: `SELECT id, name FROM categories` (1.836 baris, tanpa filter) → INNER JOIN predikat orderable + hitungan `active` + sort kesegaran (`MAX(GREATEST(created_at, updated_at)) DESC, name ASC`, sama seperti `/pesan`). Predikatnya identik dengan 4 syarat filter daftar di file yang sama → satu sumber kebenaran, tak ada drift.
3. **`app/src/routes/(app)/+page.server.ts` (dashboard)** — `LIMIT 12` tanpa ORDER BY (urutan acak tiap eksekusi) → LEFT JOIN + `active` + `latestAt` + urutan deterministik (yang bisa dibeli dulu, mati di bawah) + label `disabled` + `whitelabel()`. Shape payload jadi `{id, name, active, latestAt, disabled}`.

**Sengaja tidak diubah:** dropdown `/pesan` sudah terfilter (`LEFT JOIN … status=1` + `HAVING COUNT(services.id) > 0`) — padanan `/order` di `.my`, jadi tak perlu disentuh. Permukaan admin tetap harus melihat kategori mati. Tidak ada satu baris DB pun yang ditulis. Tidak ada label UI "nonaktif" di dashboard — payload-nya belum dirender komponen mana pun di `.id` (sama seperti `.my`; butuh kunci katalog id/ms/en baru = keputusan desain, bukan bug).

**Verifikasi:**
- **SQL produksi (read-only):** total kategori 1.836 → dropdown **774** (750 kategori punya layanan tapi semua `status=0` + 312 tanpa layanan = 1.062 entri tercabut dari filter user). Kategori mati 36407 "TikTok Likes": **tidak ada** di dropdown, **tetap ada** di payload dashboard dengan `active=0` → `disabled=true`.
- **Uji kontrak 11 asersi** (fungsi murni + SQL nyata): `decorateCategoryRows` (label benar, tak ada baris dibuang, coercion string→number), `pickBuyableCategories` (filter + urutan asli terjaga), dropdown SQL == hitungan `EXISTS` independen, kategori mati absen dari dropdown tapi hadir di payload. **Catatan: `.id` belum punya infra test (tidak ada vitest di repo), jadi suite `.my` (`app/test/category-visibility.test.ts`) tidak ikut dipindah** — verifikasi dilakukan lewat skrip mandiri, SQL produksi, dan SSR. Penambahan vitest = dependency + lockfile baru, butuh persetujuan owner.
- `pnpm --filter app check` → **0 errors, 54 warnings** (baseline tak berubah) · `pnpm --filter app build` ✓ · ESLint file disentuh → 0 error (5 warning `no-explicit-any` pre-existing) · Prettier bersih.
- **SSR:** `/layanan` payload = **907** kategori (dev DB; 1.132 total), nama terbaca + tanpa brand hulu bocor; dashboard payload = 12 baris shape `{id, name, active, latestAt, disabled}`.

## P7 — Konfirmasi routing TikTok (verifikasi read-only, tanpa perubahan kode)

Owner 9 Nov 2026: *"gini semuanya ke smmturk tapi khusus layanan tiktok ke smmfollow paham ga?"* → verifikasi read-only di produksi, lalu keputusan owner: **biarkan** (tidak ada perubahan kode).

**Aturan yang dikonfirmasi:** default semua layanan → SMMturk (provider id 2, status=1); khusus layanan TikTok → SMMfollows (provider id 10, status=0, aktif lewat routing per kategori).

**Bukti produksi (read-only):**
- `services`: provider 2 = 8.868 · provider 10 = 7.554 · provider 0 = 4 (placeholder legacy: nama kosong, price/min/max=0, tersaring dari katalog).
- `category_provider_routing`: 233 baris aktif → SMMfollows, **233/233 kategorinya bernama TikTok, 0 non-TikTok**.
- Isi 233 kategori itu: 7.554 layanan, **704 bernama TikTok dan 0 non-TikTok** → sesuai aturan, tidak ada produk non-TikTok yang bocor ke SMMfollows.
- SMMfollows punya 636 kategori di mirror, tapi hanya 77 yang TikTok; sisanya (YouTube Ads, Telegram, Spotify) sengaja tidak di-route → tetap SMMturk.
- Tiga gerbang routing = **0 pelanggaran**: kategori AKTIF dilayani >1 provider; kategori ter-route tapi dilayani provider lain; nama layanan dobel dalam 1 kategori lintas provider.

**Temuan yang tidak berubah (keputusan owner: biarkan):** ada **465 layanan bernama TikTok yang tetap dilayani SMMturk** — semuanya lini `"[Organic Growth Package]"` milik SMMturk sendiri, di 13 kategori bernama TikTok ("TikTok 1/3/5 Minute Premium Packages", "TikTok Comment Packages", dll.) + 18 kategori bernama umum ("new", "Server", "Campaign", "TikTok Update [Emergency Server]"). **Tumpang tindih dengan katalog SMMfollows = 0**, jadi memindahkannya ke SMMfollows = produk hilang dari katalog (SMMfollows tidak menjualnya), bukan sekadar pindah provider. Owner memutuskan: biarkan.

**Kontrak manual-disable (terverifikasi):** tag `[manual-off]` ada di 124 baris, **0 yang masih status=1**, 0 tag dobel. Mekanisme: `service-sync.ts` tidak pernah menulis `note` (patch object tidak punya key `note`), cabang hidupkan dijaga `else if (!isManualOff && allowed)`, `provider-sync.ts` juga tidak menulis `note`. Bug yang ditemukan: path ON di `category-admin.ts` cuma membuang `" [manual-off]"` (dengan spasi) padahal path OFF menghasilkan note persis `"[manual-off]"` → tag nyangkut → sudah diperbaiki (REPLACE ganda, sama seperti `.my`) di commit `be12f1c`.

## P8 — Revert penuh ke SMMturk (9 Nov 2026, perubahan DATA produksi, tanpa perubahan kode)

Owner 9 Nov 2026: *"bisa revert semua layanan ke smmturk? tolong clean jangan ada bug smmfollow yang nyangkut, tapi konsumen yang sudah terlanjur tetap dapat status update dari orderannya"* → routing TikTok ke SMMfollows DIMATIKAN total, semua lalu-lintas order kembali ke SMMturk (provider id 2).

**Kenapa tanpa perubahan kode:** seluruh mekanisme sudah ada di app (`category_provider_routing` + `reconcileAllServices` + gerbang `allowedForRouting`). Yang berubah hanya isi tabel routing. Provider id 10 TETAP ADA di `provider` (status=0) dengan api_key-nya — ini syarat order lama tetap ter-tagih statusnya.

**Yang dieksekusi (read-write, produksi):**
1. Snapshot sebelum sentuh: `routing_snapshot_20261109` (233 baris `category_provider_routing` utuh + kolom `snap_at`) dan `smmfollow_active_snapshot_20261109` (704 id `services` yang sedang status=1 di provider 10). KEDUANYA adalah tabel rollback — pasang kembali routing dari snapshot + jalankan rekonsiliasi = keadaan lama balik persis.
2. `UPDATE services SET status=0 WHERE provider_id=10 AND status=1` → 704 layanan SMMfollows non-orderable.
3. `DELETE FROM category_provider_routing` → 233 baris hilang; tidak ada kategori yang diroute lagi.
4. Enable ulang layanan SMMturk di 233 kategori eks-routing: 1.163 baris (0 di antaranya bertag `[manual-off]`, jadi tidak ada kontrak F2 yang dilanggar).

**State sesudah revert:** routing aktif 0 · layanan SMMfollows orderable **0** · orderable total 7.722 (semua provider 2; provider 0 tinggal 4 placeholder legacy) · order live: 4 `In progress` (provider 2) + 1 `Pending` (provider 1 MANUAL) — **0 order menggantung di provider 10**.

**Konsumen yang sudah terlanjur order (kontrak terpenuhi):** `status-polling.ts` mengelompokkan order lewat `orders.provider_id` SIMPANAN order, lalu mengambil endpoint+key dari baris `provider` id 10 — tidak pernah membaca tabel routing. Selama baris provider 10 tidak dihapus, order lama (satu-satunya: #37978, sudah `Success`) terus dapat update, termasuk refill (`refill-request.ts`) dan `refill-polling`. DILARANG hapus provider id 10 / kosongkan api_key-nya.

**Efek samping yang harus diketahui owner:** dari 233 kategori eks-routing, hanya **160** yang punya layanan SMMturk orderable; **73 kategori TikTok tidak punya padanan di SMMturk** (mis. semua "TikTok Live Stream Views - <negara>", "TikTok Likes/Views - Targeted", "- Guaranteed", "- No Refill", "TikTok Saves/Shares", "TikTok Story Services"). Kategori itu hilang dari filter user (kontrak P6 bekerja benar, BUKAN bug) dan memang produknya tidak dijual SMMturk.

**Yang terjadi otomatis berikutnya:** cron `provider-sync` (tiap jam menit 0) hanya sync provider aktif ∪ provider ter-route → provider 10 jadi **dorman** (mirror 7.554 membeku, sengaja; nanti kalau routing dipasang lagi sync menyusul). Provider 2 ter-sync dan menyegarkan harga 1.163 layanan yang barusan di-enable — harga kolom MODAL (belum markup), dan ada 465 layanan TikTok "[Organic Growth Package]" yang sejak awal memang SMMturk.

**Verifikasi:** `category_provider_routing`=0 · `services` provider 10 status=1 = 0 · gerbang order (`isProviderAllowedForCategory`) turun ke jalur default satu-aktif = provider 2 · cache routing/aktif app ber-TTL 30 detik jadi segarnya paling telat 30 detik setelah perubahan tanpa restart. Belum ada order baru pasca-revert sebagai bukti end-to-end (tidak ada test order, sesuai instruksi owner 8 Nov).

**Verifikasi siklus cron berikutnya (provider-sync `139045` + service-catalog `139052`, 11:00 UTC, status ok, 144 detik):**
- SMMfollows TIDAK disentuh lagi — `provider_services.last_seen_at` terbaru provider 10 membeku di 09:02:21 (sinkron terakhir sebelum revert) → dorman sesuai design `runAllProviderSync` (aktif ∪ ter-route).
- Routing tetap 0 dan SMMfollows tetap 0 orderable → cron tidak membangunkan apapun.
- SMMturk active 7.722 → **7.694** (28 layanan di kategori eks-routing ternyata sudah mati di katalog SMMturk dan baru ditandai mati oleh sync) · orderable TikTok di 233 kategori eks-routing = **1.135** · selisih harga `services.price` vs `provider_services.rate` = **0** (semua modal sudah sesuai mirror).
- Order live: 3 `In progress` provider 2 + 1 `Pending` provider 1 MANUAL · **0** di provider 10 · 0 order baru sejak revert (kebetulan window-nya 57 menit sepi, bukan bukti volume).
- Baris `provider` id 10 utuh (`smmfollows.com/api/v2`, key 84 char ter-encrypt, status=0) → order historis provider 10 (1 baris: #37978 `Success`) kalau butuh status/refill tetap bisa ditagih.

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
| C7 | Banner promo artwork mode | ✅ LIVE | **06ac016 (sesi ini)** — suppress overlay utk img, spacer aspect 1200/360 (port .my) |
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
| G2 | Retire-verify flow | ✅ LIVE | **f03c831 (sesi ini)** — Member retire pure, `reseller_activated` separasi (backfill 56), toggle settings hapus |
| H1 | Upgrade mandiri Member→Reseller | ✅ LIVE | **d02a142 (sesi ini)** — flip level CASE + `/reseller` (chart jujur dr pricing_rules, anti-leak) + action invoice + nav dot |
| H2/H3 | Reseller dashboard / coupon loop | ⏸️ CONFIRM | belum disentuh |
| I | Multi-provider (+ TikTok → SMMfollows) | ✅ LIVE | **4572fee (sesi ini)** — switcher 1-aktif + routing per-kategori; TikTok dilayani SMMfollows (828 svc/77 kategori), duplikat=0, route violation=0 |
| P4 | SEO subsystem port | ✅ LIVE | **runner `83a375f`→`4899977` (sesi ini)** — loop pengukuran: `reconcile-published` (state.published 340→1.006), `gsc-analytics`, `seo-status`, `gsc-inspect` save parsial, fix token GSC + self-test (401 setelah 1 jam), siklus `seo-index-coid` + `seo-measure-coid`; index_rate 92,6%, ramp-gate hidup (daily_count 15→19) |
| P5 | Admin dashboard: halaman & rail kategori | ✅ LIVE | **9 Nov 2026** — `lib/server/category-admin.ts` (sumber tunggal SQL kategori) + `/admin/categories` (cari, filter status/routing, badge provider, switch per baris) + rail kategori di `/admin/services`; kontrak `[manual-off]` 6/6 uji lulus |
| P6 | Category visibility (kategori mati tak muncul di filter user) | ✅ LIVE | **9 Nov 2026** — `lib/server/category-visibility.ts` + dropdown `/layanan` 1.836→774 (produksi) + payload dashboard berlabel `disabled`; tak ada baris DB yang dihapus |
| P7 | Konfirmasi routing TikTok | 🔍 verify-only | read-only; deviasi 465 svc TikTok "[Organic Growth Package]" di SMMturk → owner: biarkan |
| P8 | **Revert semua layanan ke SMMturk** | ✅ LIVE | **9 Nov 2026** — data-only, tanpa commit kode: routing 233→0, SMMfollows orderable 704→0, SMMturk 6.559→7.722; snapshot rollback `routing_snapshot_20261109` + `smmfollow_active_snapshot_20261109`; provider id 10 DIPERTAHANKAN supaya order lama tetap ter-poll |

**Deploy batch sesi ini:** 3 commit (4988b5a E3/E4 · a3a3a09 E6 · 0010967 docs) → push `da0a106..0010967 → main` → L3 0 findings → Coolify finished → container tag 0010967fbab1 (Up).

**Deploy batch item I (8 Nov 2026):** 5 commit (d662de6 schema · a47a867 helper+gerbang+guard · 67c6f5a UI admin · 4a798e9 order nyangkut · 4572fee fix gerbang routing) → push `cf946bb..4572fee → main` (SSH) → L3 0 findings → Coolify `qt3odbw3eqerthge5li2icyi` finished → container `nqsjafrei6k8dkup1pxkcuwf-20261108T152051` tag sha `4572fee777f55…`.
