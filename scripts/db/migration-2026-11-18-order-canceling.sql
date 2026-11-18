-- =============================================================================
-- Migration 2026-11-18 — Order status "Canceling" (confirm-before-refund / F12)
-- Idempotent. Aman di-run ulang. Jalankan SEBELUM deploy kode P1-C+.
--
-- Tujuan (F12 — cancel bocor modal owner):
--   Sebelumnya cancel user memanggil provider lalu TERUS refund saldo bila
--   respons API segera "OK", atau bila provider unreachable (network error).
--   Tapi "OK" dari action=cancel cuma berarti "permintaan cancel DITERIMA",
--   bukan "order SUDAH dibatalkan". Provider bisa tetap memproses order itu
--   dan menagih modal owner -> customer sudah refund, modal owner belum kembali.
--
--   Status baru 'Canceling' = intent cancel sudah dikirim ke provider, MENUNGGU
--   konfirmasi. Uang TIDAK bergerak dalam status ini. Cron status-polling
--   menaikkan ke Canceled/Error/Partial hanya bila provider benar-benar
--   melaporkannya, dan cron auto-refund (*/15) yang membayar lewat ledger
--   beraudit. Satu jalur uang saja.
--
-- KESELAMATAN ENUM: nilai baru DITAMBAH DI UJUNG daftar. MySQL menyimpan ENUM
--   sebagai indeks ordinal; menambah di tengah akan mengubah makna baris yang
--   sudah ada dan merusak data. Urutan 8 nilai asal dipertahankan persis.
--
-- ATRIBUT LIVE DIPIN (probe 3, docs/2026-11-17-my-to-id-gap-plan.md §1.4):
--   IS_NULLABLE=NO, COLUMN_DEFAULT=NULL (TIDAK ada default), charset utf8mb3,
--   collation utf8mb3_swedish_ci. JANGAN salin migration .my mentah: .my mem-pin
--   charset utf8mb4 + default 'Pending'. Ganti charset utf8mb3 -> utf8mb4 =
--   ALTER REBUILD tabel (copy semua 26.507 baris) = lock + MDL convoy (persis
--   insiden P10 dd507e4). 8 -> 9 nilai masih muat 1 byte -> INPLACE /
--   metadata-only, tak rebuild baris. ALGORITHM=INPLACE, LOCK=NONE = assertion:
--   MySQL ERROR (bukan diam-diam rebuild) bila ada atribut tak cocok, dan DML
--   concurrent tetap jalan. Modernisasi charset ke utf8mb4 = DI LUAR SCOPE.
--
-- BACKUP DULU (prod write — GO owner): snapshot orders -> orders_bak_20261118
--   di Section 1 (idempotent, dilewati bila tabel sudah ada). CREATE TABLE AS
--   SELECT memakai consistent-read bila binlog_format=ROW (default MySQL 8).
--   Untuk jaminan nol-lock di traffic tinggi, backup lewat mysqldump dulu:
--     docker exec <DB_CT> sh -c 'mysqldump --single-transaction -u<user> -p<pass> \
--       socio_smm orders' > /tmp/orders_bak_20261118.sql
--   Verifikasi jumlah baris backup = orders (harus 26.507, nol baris berubah).
--
-- URUTAN WAJIB: migration ini HARUS dijalankan SEBELUM deploy app. Kode baru
--   menulis 'Canceling'; tanpa nilai ENUM itu MySQL akan menolak/memotong status
--   dan jalur uang rusak. Additive + backward-compatible: kode lama tak pernah
--   menulis 'Canceling', jadi aman dijalankan lebih awal.
-- =============================================================================

-- Section 0 — versi server (pastikan MySQL 8 / mendukung INPLACE ENUM append) --
SELECT VERSION() AS mysql_version;

-- Mode sesi dilonggarkan KHUSUS backup: kolom warisan orders.date memuat
-- '0000-00-00'; sql_mode ketat (NO_ZERO_DATE + STRICT) menolak CTAS baris itu
-- (ERROR 1292, percobaan 18 Nov). Snapshot harus menyalin sumber apa adanya;
-- tabel orders sendiri TIDAK diubah oleh SET ini. ALTER Section 2 metadata-only
-- (INPLACE, tanpa copy baris) sehingga tak terpengaruh mode tanggal.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- Section 1 — backup snapshot orders (idempotent, dilewati bila sudah ada) -----
SET @has_bak := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders_bak_20261118'
);
SET @sql_bak := IF(
  @has_bak = 0,
  'CREATE TABLE orders_bak_20261118 AS SELECT * FROM orders',
  'SELECT ''backup orders_bak_20261118 sudah ada, dilewati'''
);
PREPARE stmt_bak FROM @sql_bak; EXECUTE stmt_bak; DEALLOCATE PREPARE stmt_bak;

-- Verifikasi backup: jumlah baris harus sama dengan orders (nol baris berubah).
SELECT
  (SELECT COUNT(*) FROM orders)              AS orders_rows,
  (SELECT COUNT(*) FROM orders_bak_20261118) AS backup_rows;

-- Section 2 — tambah 'Canceling' di UJUNG enum (idempotent, INPLACE LOCK=NONE) -
SET @has_canceling := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'status'
    AND COLUMN_TYPE LIKE '%''Canceling''%'
);
SET @sql_enum := IF(
  @has_canceling = 0,
  'ALTER TABLE orders MODIFY COLUMN status ENUM(''Pending'',''Processing'',''Error'',''Partial'',''Success'',''In progress'',''Canceled'',''Refilling'',''Canceling'') CHARACTER SET utf8mb3 COLLATE utf8mb3_swedish_ci NOT NULL, ALGORITHM=INPLACE, LOCK=NONE',
  'SELECT ''orders.status sudah ada Canceling, ALTER dilewati'''
);
PREPARE stmt_enum FROM @sql_enum; EXECUTE stmt_enum; DEALLOCATE PREPARE stmt_enum;

-- Section 3 — verifikasi atribut + invariant nol baris berubah ----------------
-- COLUMN_TYPE harus 9 nilai urutan asal tetap; charset/collation TETAP utf8mb3;
-- IS_NULLABLE=NO; COLUMN_DEFAULT=NULL (tak ada default).
SELECT COLUMN_TYPE AS status_enum_after, IS_NULLABLE, COLUMN_DEFAULT,
       CHARACTER_SET_NAME, COLLATION_NAME
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'orders'
   AND COLUMN_NAME = 'status';

-- Invariant: distribusi status TIDAK berubah akibat migration (additive murni).
SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY status;