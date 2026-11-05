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

## Belum / Perlu Konfirmasi Owner
- C1 banner copy: Midtrans nonaktif → BCA flow. Kalau Midtrans diaktifkan, query tetap valid, tapi CTA perlu berubah ke QR sheet.
- E7 `title` column tidak ada di .id schema (tidak di-invent; .my punya, .id tidak butuh).
- Semua perubahan **belum commit** — menunggu instruksi eksplisit user.
