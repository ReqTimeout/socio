-- Migration SQL: create missing tables from Drizzle schema before production
-- Run via: docker exec -i rebicrj57r3afbg9knieq9ks mysql -usocio -p$PASS socio_smm < migration.sql
-- 
-- Context: packages/db/src/schema/ has tables that production DB doesn't have
-- (rebuild migration story is aspirational, not enforced in CI). Any deploy
-- that uses these tables crashes 500.
--
-- Last verified: 2026-09-06 against commit 02e470c

-- 1) saved_links (NEW — used by /pesan FormChips repeat-order)
CREATE TABLE IF NOT EXISTS saved_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  label VARCHAR(100) NOT NULL DEFAULT '',
  link TEXT NOT NULL,
  service_id INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX user_idx (user_id)
) ENGINE=InnoDB;
-- Backfill from favorites (matching columns we have there)
INSERT IGNORE INTO saved_links (user_id, label, link, service_id, created_at)
SELECT user_id, '', '', service_id, created_at FROM favorites;

-- 2) pricing_rules (NEW — used by /admin/settings/proxy)
-- Schema match packages/db/src/schema/pricingRules.ts:
--   level: ENUM('Member','Agen','Reseller','Admin')
--   markup_percent, flat_per_1k, min_profit_per_1k: DOUBLE
--   is_active: TINYINT(1)
-- Tidak ada created_at/updated_at di Drizzle schema
CREATE TABLE IF NOT EXISTS pricing_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level ENUM('Member','Agen','Reseller','Admin') NOT NULL,
  markup_percent DOUBLE NOT NULL DEFAULT 0,
  flat_per_1k DOUBLE NOT NULL DEFAULT 0,
  min_profit_per_1k DOUBLE NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uniq_level (level)
) ENGINE=InnoDB;
-- Backfill defaults for known levels
INSERT IGNORE INTO pricing_rules (level, markup_percent, is_active) VALUES
  ('Member', 0.05, 1), ('Agen', 0.03, 1), ('Reseller', 0.01, 1), ('Admin', 0.00, 1);

-- 3) deposits verified columns (P3-04 — bukti transfer verify)
-- Idempotent: only add if not exists (MySQL <8.0.23 does not support ADD COLUMN IF NOT EXISTS)
SET @col1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='deposits' AND COLUMN_NAME='verified_by');
SET @sql1 = IF(@col1=0, 'ALTER TABLE deposits ADD COLUMN verified_by INT NULL', 'SELECT 1');
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;
SET @col2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='deposits' AND COLUMN_NAME='verified_at');
SET @sql2 = IF(@col2=0, 'ALTER TABLE deposits ADD COLUMN verified_at DATETIME NULL', 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
SET @col3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='deposits' AND COLUMN_NAME='verification_notes');
SET @sql3 = IF(@col3=0, 'ALTER TABLE deposits ADD COLUMN verification_notes TEXT NULL', 'SELECT 1');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 4) cron_runs (cron monitoring — /admin/cron, semua 8 job tercatat)
CREATE TABLE IF NOT EXISTS cron_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  duration_ms INT NOT NULL DEFAULT 0,
  detail VARCHAR(500) NULL,
  error TEXT NULL,
  triggered_by INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  INDEX cr_job_idx (job, created_at)
) ENGINE=InnoDB;

-- 5) deposits.reminder_sent (email reminder T-2h deposit Pending)
SET @col_rs = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='deposits' AND COLUMN_NAME='reminder_sent');
SET @sql_rs = IF(@col_rs=0, 'ALTER TABLE deposits ADD COLUMN reminder_sent TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt_rs FROM @sql_rs; EXECUTE stmt_rs; DEALLOCATE PREPARE stmt_rs;

-- 6) mailing_list (import XLS email) + xls_list audience
CREATE TABLE IF NOT EXISTS mailing_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL DEFAULT '',
  source VARCHAR(50) NOT NULL DEFAULT 'xls-import',
  subscribed TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ml_email_idx (email),
  INDEX ml_sub_idx (subscribed)
) ENGINE=InnoDB;
-- enum tambah xls_list (idempotent via information_schema check sederhana: coba alter, abaikan bila sudah ada)
SET @hasxls = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_campaigns' AND COLUMN_NAME='target_audience' AND COLUMN_TYPE LIKE '%xls_list%');
SET @sqlxls = IF(@hasxls=0, 'ALTER TABLE email_campaigns MODIFY COLUMN target_audience ENUM(''all'',''active'',''inactive'',''high_spender'',''new_user'',''churn_risk'',''xls_list'') DEFAULT ''all''', 'SELECT 1');
PREPARE stmtxls FROM @sqlxls; EXECUTE stmtxls; DEALLOCATE PREPARE stmtxls;
