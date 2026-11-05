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

## Verifikasi Akhir (per 6 Nov 2026)
- `svelte-check`: 0 errors, 50 warnings (baseline)
- `eslint` (touched): 0 errors, 57+21 warnings (pre-existing navigation/a18y)
- `@socio/core test`: 69 assertions (refill-window 11 + popularity 21 + format-entities 9 + email-guard 28) pass, 0 fail
- `vite build`: ✓ 25s, adapter-node done

## Belum / Perlu Konfirmasi Owner
- C1 banner copy: Midtrans nonaktif → BCA flow. Kalau Midtrans diaktifkan, query tetap valid, tapi CTA perlu berubah ke QR sheet.
- E7 `title` column tidak ada di .id schema (tidak di-invent; .my punya, .id tidak butuh).
- Semua perubahan **belum commit** — menunggu instruksi eksplisit user.
