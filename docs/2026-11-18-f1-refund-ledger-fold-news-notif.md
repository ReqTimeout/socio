# Jurnal — F1 fold bukti refund ledger + notif news ala .my (18 Nov 2026)

> Status: **SELESAI — LIVE** image `37bb77aeefb75e0031f344f99944b76e5936f557`.
> GO owner: AskUserQuestion "F1 perf + notif news" → "GO penuh: commit → L3 → push → deploy".
> Tracker: `docs/2026-11-17-my-to-id-gap-plan.md` §7.9 ditandai selesai.

## 1. Latar belakang

- Keluhan owner: news manual di `app.socio.id/admin/news` "tidak tampil seperti app.socio.my".
  Diagnosis sesi ini: alur .my (buat berita → box Pengumuman di bawah Update + bell semua
  user) **sudah ter-port dan live** sejak `7828a5a`; berita manual owner **belum pernah
  tersimpan** di DB prod (0 baris baru, 0 audit `create_news`, 0 notif type `news` per probe
  18 Nov). Dugaan: tab admin cache lama (form pre-port tanpa Judul/kategori preset → validasi
  server menolak). Owner akan test ulang setelah deploy ini.
- Satu-satunya delta perilaku .id vs .my yang nyata: `action_url` notif berita
  (`/notif?type=news` vs `/news?src=manual`) → disamakan sesi ini.
- F1 (tracker §7.9): subquery REGEXP terkait per baris di list `/pesanan` & `/admin/orders`
  (~7 detik per load) — dikerjakan setelah P1 selesai supaya tidak konflik di `refund.ts`.

## 2. F1 — desain dan bukti semantik

**Masalah**: `ledgerRefundAmount`/`ledgerRefundAt` (SQL REGEXP `CONCAT('order #', orders.id,
'([^0-9]|$)')` terhadap `balance_logs.note`) dieksekusi sebagai subquery terkait per baris
order → tiap baris men-scan ~29k baris `balance_logs`. Aggregate stats sudah pakai flag
`is_refund` sejak `4bda2e1`; per-row paginated masih REGEXP.

**Fix** (pola aggregate-first, ledger-first TETAP):
- Modul pure baru `packages/core/src/refund-ledger.ts` → `foldRefundLedger(orderKeys,
  ledgerRows)`: grup ledger per user, cocokkan note `order #<id>(?![0-9])` flag `i`
  (meniru collation ci REGEXP MySQL), SUM amount + MAX created_at per order; setiap order
  selalu punya entri default `{refundedLedger: 0, refundedAt: null}`.
- `app/src/lib/server/refund.ts`: 3 konstanta REGEXP dihapus → `ledgerRefundProofs(rows)`
  = SATU query `balance_logs WHERE type='ref' AND user_id IN (user halaman)` (index
  `user_id` live) + fold. Jalur tulis uang (`executeRefund`, `ledgerRefundSum`, cron
  `refund.ts` ×2) **tidak disentuh**.
- Konsumen: `pesanan/+page.server.ts` (select utama 30 baris + select deep-link `?oid=`;
  key fold pakai `userId` load karena semua rows scoped user yang sama) dan
  `admin/orders/+page.server.ts` (25 baris paginated). Bentuk payload client tetap:
  `refundedLedger`, `refundedAt`, `refundState`, `charged` — UI (`fmtDate(o.refundedAt)`)
  tidak berubah.

**Bukti filter per-user identik dengan REGEXP lama (tanpa filter user)**:
- Probe prod read-only: `mismatch_user = 0` — dari 148 baris `type='ref'` (semua ber-note
  `order #`, 32 user), tidak ada yang `user_id`-nya beda dengan pemilik order.
- Kode: semua penulis ledger ref memakai `userId: o.userId` (cron/refund.ts L69 & L155,
  executeRefund refund.ts L126).
- Selftest `packages/core/test/refund-ledger.test.ts` **15/15** memakai format note prod
  asli (goodwill admin panjang ber-URL, cron Partial, legacy user-cancel) + kasus batas
  `#7` vs `#70`/`#700`/`#7abc`, multi-ref SUM/MAX, isolasi user, ci, null/str coercion.

**Timing prod (read-only, 25 order terbaru, overhead runner 0,55s dikurangi)**:
pola lama ≈ **2,4s** → pola baru ≈ **0,09s** (~27×). Angka ~7s tracker = full route
dengan join + cold cache.

## 3. Notif news ala .my

- `admin/news/+page.server.ts`: `action_url` insert notif `'news'` → **`/berita?src=manual`**
  (sebelumnya `/notif?type=news`). Tap bell = feed berita manual + popup detail, persis
  .my (`/news?src=manual`). Bell terbukti navigasi via `actionUrl` langsung
  (`packages/ui/src/components/NotifBell.svelte` L114 `window.location.href`); halaman
  `/notif` juga `goto(item.actionUrl)`.
- Subhead + tip di `admin/news/+page.svelte` disesuaikan (teks lama menyebut `/notif`).
- Notif lama di DB: 0 baris type `news` → tidak ada legacy yang perlu dimigrasi.

## 4. Gates (semua lulus sebelum commit)

| Gate | Hasil |
|---|---|
| `pnpm --filter @socio/core test` full chain | EXIT=0 (money **29/29**, refund-ledger **15/15** baru, semua suite) |
| `pnpm --filter app check` (svelte-check) | **0 errors** (54 warnings baseline) |
| prettier 8 file tersentuh | clean |
| eslint file tersentuh | 0 errors (39 warnings `any` baseline) |
| `pnpm --filter app build` | EXIT=0 |
| Scan CJK + Malay file tersentuh | clean |
| L3 deep review (gate terpisah, AskUserQuestion) | **0 findings** |

Catatan drift bawaan: `prettier --check` whole-app gagal di **60 file committed yang tidak
disentuh sesi ini** (sudah ada di HEAD `96b456b`). Tidak diperbaiki diam-diam; kandidat
commit `style:` terpisah bila owner GO.

## 5. Commit, push, deploy, verifikasi

- Commit granular (branch lokal `deploy/refill-only` → push `HEAD:main` FF-guard):
  1. `0cc7746` — `perf(M3): F1 bukti refund ledger — fold pure ganti REGEXP per-baris di pesanan/admin-orders` (6 file).
  2. `37bb77a` — `fix(M3): tap notif berita → /berita?src=manual (samakan alur .my)` (2 file).
- Push: `96b456b..37bb77a → main` (FF, `merge-base --is-ancestor` lulus).
- Deploy: token-mint Sanctum sementara (recipe `xd.php`, chr(92)-safe, port 8080, uuid
  query param) → `HTTP:200 DEPLOY:osmjmj4m4enhjst4luhja57f LEFTOVER:0` (token langsung
  di-revoke, nol sisa). Queue `in_progress` ~3,5 menit → `finished`.
- Verifikasi prod (container `nqsjafrei6k8dkup1pxkcuwf-20261118T073338`, started 07:36:47Z):
  - Image tag = `37bb77aeefb75e0031f344f99944b76e5936f557` = HEAD ✓
  - Marker baru `/berita?src=manual` ada di chunk server admin/news (+svelte) ✓
  - Marker fold `(?![0-9])` ada di `chunks/chunks/refund.js` ✓
  - **`REGEXP CONCAT` = 0 file** di seluruh server build (hit "REGEXP" tersisa hanya teks
    komentar — server build mempertahankan komentar) ✓
  - Boot: `[cron] 12 job terdaftar (1 chained)` ✓, `ALTER_COUNT=0` ✓
  - Routes unauth: `/pesanan` `/admin/orders` `/berita` `/admin/news` → **303 /login** ✓
  - Processlist: 1 aktif, **0 query >5s** ✓

## 6. Sisa / terbuka

1. **Test news manual owner** belum mendarat di DB (probe terakhir 18 Nov: masih 186 baris
   legacy, max id 337 tahun 2025). Setelah deploy ini owner retry: hard-refresh
   `/admin/news` → form harus ada Judul + Kategori preset → Simpan → probe ulang
   (`/tmp/newsprobe.sql` via `/tmp/p1-run.sh`) → harapannya baris baru + notif semua user
   dengan `action_url=/berita?src=manual` + box Pengumuman di dashboard.
2. Observasi pasif P1: 0 order `Canceling` saat deploy (84 `Canceled` historis) — belum ada
   cancel user nyata sejak P1 live; pantau bila ada.
3. Backlog berikutnya (tracker §7): P2.6 operator-only (CONFIRM), P2.5/P2.7/P2.8 email
   batch (CONFIRM cap + per-lane), P2.1/P2.2/P2.3 defensif admin, P3 kosmetik, P4 dormant.
4. Drift prettier 60 file (bawaan HEAD) — commit `style:` terpisah bila owner mau.