import { db } from "./index";
import { sql } from "drizzle-orm";
import { providerServices, providerSyncLog } from "./schema/cron";

// Bootstrap DDL for new rebuild tables (audit_log, admin_settings, admin_roles).
// Idempotent CREATE TABLE IF NOT EXISTS — run once at admin startup.
// (Drizzle migrate pipeline not wired to VPS DB from CI; this keeps new tables in sync
//  without a separate migration step. Replace with drizzle-kit migrate when pipeline ready.)
let ensured = false;

/**
 * Run an idempotent DDL statement that MySQL cannot express with IF NOT EXISTS
 * (e.g. ALTER TABLE ADD COLUMN). Swallows "duplicate column/key" errors so a
 * re-run on an already-migrated DB does not abort the whole bootstrap and skip
 * the CREATE TABLE statements that come after it.
 */
async function tryExec(stmt: ReturnType<typeof sql>) {
  try {
    await db.execute(stmt);
  } catch (e) {
    // Drizzle wraps MySQL errors in DrizzleQueryError → kode asli ada di e.cause.code.
    const code =
      (e as { code?: string })?.code ??
      (e as { cause?: { code?: string } })?.cause?.code;
    // 1060 dup column, 1061 dup key, 1826 dup FK, 1091 can't drop
    if (
      code &&
      [
        "ER_DUP_FIELDNAME",
        "ER_DUP_KEYNAME",
        "ER_CANT_DROP_FIELD_OR_KEY",
      ].includes(code)
    )
      return;
    throw e;
  }
}

/**
 * Lebarkan charset satu TABEL ke utf8mb4 bila kolom teks mentah-nya masih
 * latin1/utf8mb3. Guard via information_schema → ALTER jalan sekali; boot
 * berikutnya kolom sudah utf8mb4 → skip (tidak rebuild tiap restart).
 * Memakai CONVERT TO (bukan MODIFY per kolom) supaya type/nullable/DEFAULT
 * tiap kolom tetap utuh — penting karena categories INSERT mengandalkan
 * DEFAULT '' pada name_raw.
 */
async function ensureTableUtf8mb4(table: string, probeColumn: string) {
  try {
    const res: any = await db.execute(
      sql`SELECT CHARACTER_SET_NAME cs FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${probeColumn}`,
    );
    const rows = Array.isArray(res?.[0])
      ? res[0]
      : Array.isArray(res)
        ? res
        : [];
    const cs = (rows[0] as { cs?: string } | undefined)?.cs;
    if (!cs || cs === "utf8mb4") return; // kolom tak ada / sudah utf8mb4
    await db.execute(
      sql.raw(
        `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      ),
    );
    console.log(`[ensure] ${table}: charset ${probeColumn} ${cs} → utf8mb4`);
  } catch (e) {
    console.error(
      `[ensure] convert ${table} → utf8mb4 gagal:`,
      (e as { message?: string })?.message ?? e,
    );
  }
}

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
  await tryExec(
    sql`ALTER TABLE orders ADD COLUMN next_poll_at DATETIME DEFAULT NULL`,
  );
  await tryExec(
    sql`ALTER TABLE orders ADD COLUMN poll_priority INT NOT NULL DEFAULT 5`,
  );
  // Provider balance column (used by sync)
  await tryExec(
    sql`ALTER TABLE provider ADD COLUMN balance_provider DOUBLE NOT NULL DEFAULT 0`,
  );
  // Widen provider_services.category — SMMturk category names can exceed 128 chars
  // (cron provider-sync threw ER_DATA_TOO_LONG on long Instagram category labels).
  await tryExec(
    sql`ALTER TABLE provider_services MODIFY COLUMN category VARCHAR(512) NOT NULL DEFAULT ''`,
  );
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
  await tryExec(
    sql`ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) DEFAULT NULL`,
  );
  await tryExec(
    sql`ALTER TABLE orders ADD COLUMN discount DOUBLE NOT NULL DEFAULT 0`,
  );
  // Affiliate withdrawal approval queue (M3 Task #3). Extend status enum
  // non-destruktif — 'Withdraw' legacy (auto-credit lama) tetap valid.
  // MODIFY COLUMN itu idempotent, jadi tidak perlu tryExec.
  await db.execute(sql`
    ALTER TABLE affiliate
      MODIFY COLUMN status ENUM('Pending','Withdraw','Requested','Paid','Rejected') NOT NULL DEFAULT 'Pending'
  `);
  // Legacy tables pakai MyISAM → tidak bisa ikut transaction + violate GTID
  // saat mixed dengan InnoDB (approve withdrawal gagal). Convert ke InnoDB
  // (idempotent; no-op kalau sudah InnoDB).
  await db.execute(sql`ALTER TABLE affiliate ENGINE=InnoDB`);
  // promotion_banners (Banner CMS — tabel baru, PHP lama tidak pernah membuatnya)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS promotion_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      subtitle VARCHAR(255) NOT NULL DEFAULT '',
      image_url VARCHAR(500) NOT NULL DEFAULT '',
      link_url VARCHAR(500) NOT NULL DEFAULT '',
      position ENUM('home','services','dashboard') NOT NULL DEFAULT 'dashboard',
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT NOT NULL DEFAULT 1,
      start_at DATETIME DEFAULT NULL,
      end_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX banner_pos_idx (position, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ─── PRD Service Sync v2 — kolom audit + raw + flag API provider ───
  await tryExec(
    sql`ALTER TABLE categories ADD COLUMN name_raw VARCHAR(512) NOT NULL DEFAULT ''`,
  );
  await tryExec(
    sql`ALTER TABLE services ADD COLUMN service_name_raw VARCHAR(255) NOT NULL DEFAULT ''`,
  );
  await tryExec(sql`ALTER TABLE services ADD COLUMN description TEXT NULL`);
  await tryExec(
    sql`ALTER TABLE services ADD COLUMN description_locked TINYINT NOT NULL DEFAULT 0`,
  );
  await tryExec(
    sql`ALTER TABLE services ADD COLUMN allow_cancel TINYINT NOT NULL DEFAULT 0`,
  );
  await tryExec(
    sql`ALTER TABLE services ADD COLUMN is_dripfeed TINYINT NOT NULL DEFAULT 0`,
  );
  await tryExec(sql`ALTER TABLE services ADD COLUMN created_at DATETIME NULL`);
  await tryExec(sql`ALTER TABLE services ADD COLUMN updated_at DATETIME NULL`);
  await tryExec(
    sql`ALTER TABLE services ADD COLUMN price_changed_at DATETIME NULL`,
  );

  // news integrasi sync (PRD §10)
  await tryExec(
    sql`ALTER TABLE news ADD COLUMN event_type VARCHAR(32) NOT NULL DEFAULT 'manual'`,
  );
  await tryExec(
    sql`ALTER TABLE news ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'manual'`,
  );
  await tryExec(
    sql`ALTER TABLE news ADD COLUMN service_id INT NOT NULL DEFAULT 0`,
  );
  await tryExec(
    sql`ALTER TABLE news ADD COLUMN is_hidden TINYINT NOT NULL DEFAULT 0`,
  );

  // service_changelog (PRD §6.3) — tabel baru
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS service_changelog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider_id INT NOT NULL,
      service_id INT NOT NULL DEFAULT 0,
      event ENUM('created','name_changed','category_changed','price_up','price_down','minmax_changed','type_changed','refill_changed','cancel_changed','dripfeed_changed','enabled','disabled') NOT NULL,
      field VARCHAR(32) DEFAULT NULL,
      old_value TEXT DEFAULT NULL,
      new_value TEXT DEFAULT NULL,
      detected_at DATETIME NOT NULL,
      INDEX scl_service_idx (service_id, detected_at),
      INDEX scl_event_idx (event, detected_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── balance_requests (G3 dual-control): penyesuaian saldo admin > hard cap
  // butuh approval admin kedua sebelum dieksekusi. Pola reuse refund_requests.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS balance_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      amount DOUBLE NOT NULL,
      reason VARCHAR(255) NOT NULL DEFAULT '',
      requested_by INT NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewed_by INT DEFAULT NULL,
      review_note VARCHAR(255) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX br_user_idx (user_id),
      INDEX br_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── api_usage (G20): rekam pemakaian API publik /api/v1 per user/key/action.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_usage (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      action VARCHAR(32) NOT NULL DEFAULT '',
      ok TINYINT NOT NULL DEFAULT 1,
      ip VARCHAR(64) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX au_user_idx (user_id, created_at),
      INDEX au_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Charset: tabel penampung teks MENTAH provider (bisa ada emoji 4-byte,
  // mis. kategori "IMPOSSIBLE SERVICES ❤️"). ADD COLUMN service-sync v2 mewarisi
  // charset tabel lama (latin1/utf8mb3) → INSERT/UPDATE "Incorrect string value"
  // bikin runServiceSync crash total → berita layanan (harga naik/turun/baru/
  // stop) tidak pernah terbentuk. Lebarkan ke utf8mb4 (guard, sekali jalan).
  await ensureTableUtf8mb4("categories", "name_raw");
  await ensureTableUtf8mb4("services", "service_name_raw");
  await ensureTableUtf8mb4("news", "content");
}
