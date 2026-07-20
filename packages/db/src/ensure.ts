import { db } from "./index";
import { sql } from "drizzle-orm";
import { providerServices, providerSyncLog } from "./schema/cron";

// Bootstrap DDL for new rebuild tables (audit_log, admin_settings, admin_roles).
// Idempotent CREATE TABLE IF NOT EXISTS — run once at admin startup.
// (Drizzle migrate pipeline not wired to VPS DB from CI; this keeps new tables in sync
//  without a separate migration step. Replace with drizzle-kit migrate when pipeline ready.)
let ensured = false;

export async function ensureAdminSchema() {
  if (ensured) return;
  ensured = true;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(50) NOT NULL,
      entity_id VARCHAR(64) DEFAULT NULL,
      detail JSON DEFAULT NULL,
      ip VARCHAR(64) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX audit_admin_idx (admin_id),
      INDEX audit_action_idx (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(60) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      role VARCHAR(20) NOT NULL DEFAULT 'operator',
      permissions JSON DEFAULT NULL,
      INDEX user_idx (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS job_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(64) NOT NULL,
      payload JSON NOT NULL,
      status ENUM('pending','running','done','failed') NOT NULL DEFAULT 'pending',
      priority INT NOT NULL DEFAULT 5,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      locked_at DATETIME DEFAULT NULL,
      run_after DATETIME NOT NULL,
      error TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX jq_status_idx (status, run_after),
      INDEX jq_type_idx (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS provider_services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider_id INT NOT NULL,
      provider_service_id VARCHAR(64) NOT NULL,
      name TEXT NOT NULL,
      category VARCHAR(128) NOT NULL DEFAULT '',
      rate DOUBLE NOT NULL DEFAULT 0,
      min INT NOT NULL DEFAULT 0,
      max INT NOT NULL DEFAULT 0,
      refill TINYINT NOT NULL DEFAULT 0,
      cancel TINYINT NOT NULL DEFAULT 0,
      hash VARCHAR(64) NOT NULL DEFAULT '',
      raw JSON,
      last_seen_at DATETIME NOT NULL,
      INDEX ps_provider_idx (provider_id, provider_service_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS provider_sync_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider_id INT NOT NULL,
      action VARCHAR(32) NOT NULL,
      status ENUM('ok','error','partial') NOT NULL DEFAULT 'ok',
      duration_ms INT NOT NULL DEFAULT 0,
      fetched INT NOT NULL DEFAULT 0,
      changed INT NOT NULL DEFAULT 0,
      error TEXT,
      created_at DATETIME NOT NULL,
      INDEX psl_provider_idx (provider_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Add polling columns to orders if missing (idempotent).
  await db.execute(sql`ALTER TABLE orders ADD COLUMN next_poll_at DATETIME DEFAULT NULL`);
  await db.execute(sql`ALTER TABLE orders ADD COLUMN poll_priority INT NOT NULL DEFAULT 5`);
  // Provider balance column (used by sync)
  await db.execute(sql`ALTER TABLE provider ADD COLUMN balance_provider DOUBLE NOT NULL DEFAULT 0`);
  // job_queue (defined in rebuild.ts but not yet created in DB)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS job_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      payload JSON NOT NULL,
      status ENUM('pending','running','done','failed') NOT NULL DEFAULT 'pending',
      priority INT NOT NULL DEFAULT 5,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 3,
      locked_at DATETIME DEFAULT NULL,
      locked_by VARCHAR(64),
      next_run_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      finished_at DATETIME DEFAULT NULL,
      INDEX job_status_idx (status, next_run_at),
      INDEX job_type_idx (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // web_push_subscriptions (defined in rebuild.ts)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX push_user_idx (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // favorites (I-U11: bookmarked services)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS favorites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      service_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX user_idx (user_id),
      INDEX user_service_idx (user_id, service_id),
      UNIQUE KEY uniq_user_service (user_id, service_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // coupons (I-U1: voucher applied at checkout)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(40) NOT NULL,
      type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
      value DOUBLE NOT NULL DEFAULT 0,
      min_order DOUBLE NOT NULL DEFAULT 0,
      max_discount DOUBLE NOT NULL DEFAULT 0,
      expires_at DATETIME DEFAULT NULL,
      max_usage INT NOT NULL DEFAULT 0,
      used INT NOT NULL DEFAULT 0,
      active ENUM('0','1') NOT NULL DEFAULT '1',
      created_at DATETIME NOT NULL,
      INDEX code_idx (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Seed one test coupon for I-U1 if table is empty.
  await db.execute(sql`
    INSERT IGNORE INTO coupons (id, code, type, value, min_order, max_discount, expires_at, max_usage, used, active, created_at)
    SELECT 1, 'SOCIO10', 'percent', 10, 0, 0, DATE_ADD(NOW(), INTERVAL 1 YEAR), 0, 0, '1', NOW()
      WHERE NOT EXISTS (SELECT 1 FROM coupons)
  `);
  // Record coupon on order (I-U1)
  await db.execute(sql`ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) DEFAULT NULL`);
  await db.execute(sql`ALTER TABLE orders ADD COLUMN discount DOUBLE NOT NULL DEFAULT 0`);
}
