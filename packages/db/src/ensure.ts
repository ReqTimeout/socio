import { db } from "./index";
import { sql } from "drizzle-orm";

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
      value TEXT NOT NULL DEFAULT '',
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
}
