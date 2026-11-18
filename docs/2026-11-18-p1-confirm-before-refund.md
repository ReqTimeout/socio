# Jurnal P1 — Confirm-Before-Refund (F12) — 18 Nov 2026

> **Status: LIVE.** Image `23ef2b393b2f25c2b632183ba995bb1078bf0cbf` (container
> `nqsjafrei6k8dkup1pxkcuwf-20261118T050901`). Commit `33ffcf0..23ef2b3` di `main`.
> Migration DB dijalankan **SEBELUM** deploy (~04:55 UTC); deploy selesai ~05:09 UTC.
> Tracker: `docs/2026-11-17-my-to-id-gap-plan.md` (P1.1–P1.6 SELESAI).

## 1. Kontrak owner & perubahan perilaku

Kontrak tunggal F12: **uang customer bergerak HANYA setelah provider konfirmasi cancel.**
Sebelumnya `.id` refund lokal saat respons "OK" diterima (baru permintaan, belum konfirmasi)
atau saat provider unreachable = customer dapat uang sementara modal owner masih di
provider → bocor modal owner.

Perilaku baru (owner GO 18 Nov):
- Cancel user **tidak lagi refund instan**. Order → `Canceling` (badge "Menunggu Batal"),
  saldo **tidak bergerak**.
- Provider unreachable / ditolak → **nol refund, nol tulisan DB** (pesan jujur ke user).
- Poller (1 menit) menaikkan `Canceling` → Canceled/Error/Partial **hanya bila provider
  lapor final sah** (H6: varian cancel-in-progress → null, tetap `Canceling`).
- Cron auto-refund (15 menit) = **satu-satunya penulis uang**, lewat ledger beraudit.
- Provider selesai meski cancel diminta → **tidak refund** + alert admin `[Cancel Ignored]`.
- Refund manual admin atas order live@provider **diblokir** kecuali checkbox `ackProvider`
  (override sadar → audit `liveAtProvider`/`providerLiveOverride` + note ledger
  `[provider-live override]`). Guard di DUA pintu: `executeRefund` + `approveRefund`.
- F11: `Processing`/`In progress` kini boleh dimohon cancel (dulu hanya `Pending`).
- Refill API v1 provider-safe (resolve provider row, bukan env-hardcoded) + `refill_id`
  tersimpan sehingga `runRefillPolling` bisa track.
- Alert email cancel LIVE ke 2 admin (operator-only P2.6 di luar scope P1).

## 2. Urutan eksekusi

1. **Gate lokal** (sebelum GO): svelte-check 0 error/54 warning baseline; core chain lulus
   (`order-status.test` 23/23 existing tak terdampak H6, `order-cancel-money.test` 29/29
   baru, suite lain hijau); build sukses; CJK-scan 16 file tersentuh nol hit; scrub Malay
   4 kata di komentar baru diganti padanan Indonesia (status/hasil/HARUS); L3 pre-GO
   **0 findings**.
2. **GO owner** → preflight prod READ-ONLY: MySQL 8.0.46, ENUM 8 nilai urutan asal,
   `NOT NULL` tanpa default, utf8mb3/utf8mb3_swedish_ci, 26.534 baris (naik 27 dari probe
   17 Nov = traffic live), processlist bersih, image live `31fd0da`.
3. **Backup lapis 1**: `mysqldump --single-transaction --no-tablespaces` →
   `/tmp/orders_bak_20261118.sql` di VPS (10,4 MB, "Dump completed"). Flag
   `--no-tablespaces` perlu: user `socio` tak punya privilege PROCESS (error tablespaces
   percobaan pertama; data tetap utuh, diulang bersih).
4. **Migration percobaan 1 GAGAL AMAN** di backup CTAS: `ERROR 1292 Incorrect date value
   '0000-00-00' for column 'date'` — kolom warisan `orders.date` memuat zero-date;
   sql_mode sesi ketat (NO_ZERO_DATE+STRICT) menolak penyalinan. ALTER **belum sempat
   jalan** (CLI berhenti di error pertama). Probe pasca-gagal: atomic DDL rollback penuh —
   tak ada tabel parsial, ENUM/distribusi utuh, nol efek samping.
5. **Adaptasi file migration**: `SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'` khusus
   sesi backup (snapshot harus menyalin sumber apa adanya; ALTER enum metadata-only tak
   terpengaruh). Money test di-run ulang terhadap file edit → 29/29. File dikirim ulang.
6. **Migration percobaan 2 SUKSES**: backup `orders_bak_20261118` 26.534 = orders 26.534;
   ALTER INPLACE LOCK=NONE diterima (8→9 nilai masih 1 byte, metadata-only, tanpa rebuild);
   `COLUMN_TYPE` 9 nilai urutan asal + `Canceling` di ujung; charset/collation tetap
   utf8mb3; `NOT NULL` tanpa default; distribusi status **identik**.
7. **Verifikasi independen**: postcheck + probe order terbaru. `orders` 26.535 (+1 Pending)
   = order live **38145** created 04:56:46 (dalam jendela migration), lalu dipoller promote
   ke `In progress` — bukti +1 baris = traffic, bukan efek DDL. Processlist bersih.
8. **Commit granular 7** (message Indonesia, file `-F`; migration di-`git add -f` mengikuti
   preseden `migration-pre-deploy.sql` karena `.gitignore *.sql` untuk dump). File sisa
   tak terkait (`.c-*.mjs`, `.tmp-*`, `.vision/`, `seo/backup/`) tidak ikut.
9. **L3 pre-push** atas 7 commit: **0 findings** (gate terpisah dari L3 pre-GO).
10. **Push FF-guard**: fetch dulu (remote main = `b00b7ec` = HEAD lokal) →
    `git push git@github.com:ReqTimeout/socio.git HEAD:main` → `b00b7ec..23ef2b3`.
11. **Deploy Coolify** UUID `nqsjafrei6k8dkup1pxkcuwf` via recipe token-mint Sanctum
    (file PHP chr(92)-safe, ship+run+rm satu perintah): HTTP 200, deployment
    `b3xbr6htgwurphwbczutobwh`, token **direvoke langsung** (LEFTOVER:0), file mint
    dihapus dari container. Queue `finished` ~5 menit.

## 3. Commit (granular per fase)

| Commit | Fase | Isi |
|---|---|---|
| `33ffcf0` | P1-A | core `order-status.ts` (Canceling, CANCELABLE/LIVE_AT_PROVIDER, H6, nextPoll 1m) + `smmturk.ts` (smmturkCancelFor, doc isProviderRejection) |
| `5171d62` | P1-B | migration SQL utf8mb3 guarded idempotent + schema `orders.ts` 9 nilai |
| `f7af4f1` | P1-C | `order-cancel.ts` baru (chokepoint, nol tulisan uang) + `refund.ts` guard H5 dua pintu + `notification.ts` label jujur |
| `33d16c5` | P1-D | `status-polling.ts` merge: keepCanceling, Canceling kebal stale-error, `[Cancel Ignored]`, providerId===1 dipertahankan |
| `4d41638` | P1-E | pesanan cancel/massCancel provider-backed (H4), admin/orders action cancel + ackProvider + KPI cancelPending/band cancelWatch, StatusBadge "Menunggu Batal", UI svelte |
| `20d7488` | P1-F | api/v1 handleRefill provider-safe + refill_id + api_log='api' + set Refilling |
| `23ef2b3` | test | `order-cancel-money.test.ts` 29 cek invariant uang + chain `packages/core` |

`admin/refunds/+page.server.ts` tanpa perubahan: approve sudah try/catch → error guard H5
tersurface ke UI. `cron/refund.ts` sengaja tak disentuh (claim Partial/Error/Canceled
sudah disjoint dari live; CAS+credit+ledger 1 tx; `runStaleOrderRefund` tak mengklaim
Canceling).

## 4. Bukti verifikasi prod (pasif, tanpa test order)

- **Image tag = SHA push**: `nqsjafrei6k8dkup1pxkcuwf:23ef2b393b2f25c2b632183ba995bb1078bf0cbf`.
- **Marker build** (grep di container):
  - "Menunggu Batal" → `client/_app/immutable/chunks/CF-KEzNe.js` (StatusBadge).
  - "Cancel Ignored" → `server/chunks/chunks/status-polling.js-DRZ76k3u.js` (poller).
  - "provider-live override" → `server/chunks/chunks/refund.js-ER5b0IPk.js` (H5).
  - "cancel_order_at_provider" → `server/chunks/chunks/order-cancel.js-D9sqpJ-P.js` (helper).
  - "ackProvider" → `client/_app/immutable/nodes/22.4rxqP8Ii.js` (UI admin orders).
- **Boot bersih**: 12 cron job terdaftar (status-poll, refill-poll, auto-refund,
  stale-refund, …), listening :3000, **0 ALTER** (migration manual, bukan boot).
  `[404] GET /cron/status.php` = probe PHP legacy pre-existing, bukan error app.
- **Route sehat**: `/admin/orders` unauth → 303 `/login`; `/pesanan` unauth → 303
  `/login?redirect=%2Fpesanan`.
- **DB**: ENUM 9 nilai utf8mb3/NOT NULL/tanpa default tetap; processlist bersih (tak ada
  MDL convoy); distribusi bergerak alami pasca-deploy (Success +2, In progress +1 =
  poller aktif di image baru; Error/Partial/Canceled tak berubah).
- **Canceling**: 0 baris saat jurnal ditulis (belum ada cancel user pasca-deploy) —
  observasi pasif berlanjut: cancel pertama → `Canceling`, saldo tak bergerak, poller
  naikkan final, cron refund bayar.

## 5. Rollback

- Kode: revert commit `33ffcf0..23ef2b3` + redeploy (image lama `31fd0da` masih ada).
- DB: migration **additive backward-compatible** — kode lama tak pernah menulis
  `Canceling`, jadi tak perlu rollback DB kecuali terpaksa. Sebelum rollback DB: cek
  `SELECT COUNT(*) FROM orders WHERE status='Canceling'` = 0 dulu. Backup tersedia:
  `orders_bak_20261118` (in-DB, 26.534 baris) + `/tmp/orders_bak_20261118.sql` (VPS).

## 6. Sisa / follow-up (di luar scope P1)

- P2.6 operator-only alert email (keputusan owner, §7 tracker butir 2).
- F1 audit lama per-row REGEXP (~7s) — §7 tracker butir 9, belum digabung.
- P2–P4 menunggu GO owner sesuai tracker.
- Observasi cancel pertama user di prod (pasif): pastikan `Canceling` → final → refund
  cron berjalan sesuai kontrak; band `cancelWatch` di /admin/orders untuk owner menagih
  provider bila angka Canceling tak nol-nol.