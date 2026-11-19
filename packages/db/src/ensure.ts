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
      (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
    // 1060 dup column, 1061 dup key, 1826 dup FK, 1091 can't drop
    if (code && ["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_CANT_DROP_FIELD_OR_KEY"].includes(code))
      return;
    throw e;
  }
}

/**
 * Guard DDL boot (insiden 17 Nov 2026): ALTER yang "idempotent" pun tetap
 * meminta metadata lock (MDL) eksklusif di tabelnya. Kalau ada query lama
 * menahan MDL shared, ALTER antre — dan SEMUA query baru ke tabel itu ikut
 * terblokir di belakangnya (convoy). Boot deploy saat itu macet ±8 menit:
 * 4 query populer /pesanan jalan 20+ menit → ALTER services antre → /layanan
 * ikut mati. Solusi: cek information_schema DULU (tanpa MDL tabel user),
 * ALTER hanya jalan kalau definisi memang belum sesuai.
 */
async function metaRows(stmt: ReturnType<typeof sql>): Promise<any[]> {
  // any: hasil mentah db.execute (mysql2 RowDataPacket[]) — pola sama dgn ensureTableUtf8mb4.
  const res: any = await db.execute(stmt);
  return Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
}

/** Definisi kolom dari information_schema (undefined kalau kolom tidak ada). */
async function columnInfo(table: string, column: string) {
  const rows = await metaRows(
    sql`SELECT COLUMN_TYPE ct, CHARACTER_MAXIMUM_LENGTH len, IS_NULLABLE nullable
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${column}`,
  );
  return rows[0] as { ct?: string; len?: number | null; nullable?: string } | undefined;
}

/** ADD COLUMN hanya kalau kolom belum ada (tryExec tetap menjaga race). */
async function addColumn(table: string, column: string, ddl: string) {
  if (await columnInfo(table, column)) return;
  await tryExec(sql.raw(ddl));
}

async function indexExists(table: string, index: string): Promise<boolean> {
  const rows = await metaRows(
    sql`SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND INDEX_NAME = ${index} LIMIT 1`,
  );
  return rows.length > 0;
}

async function tableEngine(table: string): Promise<string | undefined> {
  const rows = await metaRows(
    sql`SELECT ENGINE eng FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}`,
  );
  return (rows[0] as { eng?: string } | undefined)?.eng;
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
    const rows = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
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
  // Add polling columns to orders if missing (guard information_schema —
  // bukan ALTER buta tiap boot, lihat catatan MDL convoy di atas).
  await addColumn(
    "orders",
    "next_poll_at",
    "ALTER TABLE orders ADD COLUMN next_poll_at DATETIME DEFAULT NULL",
  );
  await addColumn(
    "orders",
    "poll_priority",
    "ALTER TABLE orders ADD COLUMN poll_priority INT NOT NULL DEFAULT 5",
  );
  // Provider balance column (used by sync)
  await addColumn(
    "provider",
    "balance_provider",
    "ALTER TABLE provider ADD COLUMN balance_provider DOUBLE NOT NULL DEFAULT 0",
  );
  // Widen provider_services.category — SMMturk category names can exceed 128 chars
  // (cron provider-sync threw ER_DATA_TOO_LONG on long Instagram category labels).
  const psCat = await columnInfo("provider_services", "category");
  if (!psCat || Number(psCat.len) < 512) {
    await tryExec(
      sql`ALTER TABLE provider_services MODIFY COLUMN category VARCHAR(512) NOT NULL DEFAULT ''`,
    );
  }
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
  await addColumn(
    "orders",
    "coupon_code",
    "ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) DEFAULT NULL",
  );
  await addColumn(
    "orders",
    "discount",
    "ALTER TABLE orders ADD COLUMN discount DOUBLE NOT NULL DEFAULT 0",
  );
  // Affiliate withdrawal approval queue (M3 Task #3). Extend status enum
  // non-destruktif — 'Withdraw' legacy (auto-credit lama) tetap valid.
  // Guard: MODIFY hanya kalau enum belum memuat 'Requested' (MDL convoy).
  const affStatus = await columnInfo("affiliate", "status");
  if (!affStatus || !String(affStatus.ct ?? "").includes("'Requested'")) {
    await db.execute(sql`
      ALTER TABLE affiliate
        MODIFY COLUMN status ENUM('Pending','Withdraw','Requested','Paid','Rejected') NOT NULL DEFAULT 'Pending'
    `);
  }
  // Legacy tables pakai MyISAM → tidak bisa ikut transaction + violate GTID
  // saat mixed dengan InnoDB (approve withdrawal gagal). Convert ke InnoDB
  // HANYA kalau engine belum InnoDB — ALTER no-op pun tetap minta MDL.
  if ((await tableEngine("affiliate")) !== "InnoDB") {
    await db.execute(sql`ALTER TABLE affiliate ENGINE=InnoDB`);
  }
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
  await addColumn(
    "categories",
    "name_raw",
    "ALTER TABLE categories ADD COLUMN name_raw VARCHAR(512) NOT NULL DEFAULT ''",
  );
  await addColumn(
    "services",
    "service_name_raw",
    "ALTER TABLE services ADD COLUMN service_name_raw VARCHAR(255) NOT NULL DEFAULT ''",
  );
  await addColumn(
    "services",
    "description",
    "ALTER TABLE services ADD COLUMN description TEXT NULL",
  );
  await addColumn(
    "services",
    "description_locked",
    "ALTER TABLE services ADD COLUMN description_locked TINYINT NOT NULL DEFAULT 0",
  );
  await addColumn(
    "services",
    "allow_cancel",
    "ALTER TABLE services ADD COLUMN allow_cancel TINYINT NOT NULL DEFAULT 0",
  );
  await addColumn(
    "services",
    "is_dripfeed",
    "ALTER TABLE services ADD COLUMN is_dripfeed TINYINT NOT NULL DEFAULT 0",
  );
  await addColumn(
    "services",
    "created_at",
    "ALTER TABLE services ADD COLUMN created_at DATETIME NULL",
  );
  await addColumn(
    "services",
    "updated_at",
    "ALTER TABLE services ADD COLUMN updated_at DATETIME NULL",
  );
  await addColumn(
    "services",
    "price_changed_at",
    "ALTER TABLE services ADD COLUMN price_changed_at DATETIME NULL",
  );

  // news integrasi sync (PRD §10)
  await addColumn(
    "news",
    "event_type",
    "ALTER TABLE news ADD COLUMN event_type VARCHAR(32) NOT NULL DEFAULT 'manual'",
  );
  await addColumn(
    "news",
    "source",
    "ALTER TABLE news ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'manual'",
  );
  await addColumn(
    "news",
    "service_id",
    "ALTER TABLE news ADD COLUMN service_id INT NOT NULL DEFAULT 0",
  );
  await addColumn(
    "news",
    "is_hidden",
    "ALTER TABLE news ADD COLUMN is_hidden TINYINT NOT NULL DEFAULT 0",
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

  // ── G1 lifecycle/winback — email_suppressions (daftar hitam marketing).
  // Unique pada email → upsert `applyUnsubscribe` idempoten. Disaring oleh
  // worker email-queue (marketing only) + NOT EXISTS di segmen BASE_FILTER.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_suppressions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      reason VARCHAR(20) NOT NULL DEFAULT 'unsubscribe',
      source VARCHAR(32) DEFAULT NULL,
      detail VARCHAR(100) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY email_suppressions_email_uq (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── G1 lifecycle — email_triggers_sent (klaim idempotensi per periode).
  // UNIQUE (user,trigger,periode) → cron dua-run seminggu gak kirim dobel.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_triggers_sent (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      trigger_key VARCHAR(40) NOT NULL,
      period_key VARCHAR(24) NOT NULL,
      queue_id INT DEFAULT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY email_triggers_sent_uq (user_id, trigger_key, period_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── G2 retire-verify — pemisahan status aktivasi reseller dari kolom
  // `verify` (overload). Prod sudah di-backfill manual (56 reseller aktif);
  // tryExec ini cuma menjamin env lain (dev/lokal) ikut punya kolomnya.
  await addColumn(
    "users",
    "reseller_activated",
    "ALTER TABLE users ADD COLUMN reseller_activated TINYINT NOT NULL DEFAULT 0",
  );

  // ── Multi-provider (item I) — switcher satu-aktif + routing per-kategori.
  // `provider.status` = 1 → provider aktif global (satu-satunya yang melayani
  // kategori TANPA routing). Backfill: aktifkan provider utama (SMMturk) HANYA
  // kalau belum ada provider aktif — menjaga invariant "tepat satu aktif".
  await addColumn(
    "provider",
    "status",
    "ALTER TABLE provider ADD COLUMN status TINYINT NOT NULL DEFAULT 0",
  );
  await db.execute(sql`
    UPDATE provider SET status = 1
    WHERE api_url_order LIKE ${"https://smmturk.org%"}
      AND NOT EXISTS (
        SELECT 1 FROM (SELECT id FROM provider WHERE status = 1) AS already_active
      )
  `);
  // Routing per-kategori (TikTok → provider kedua). Tabel baru.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS category_provider_routing (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      provider_id INT NOT NULL,
      is_active TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT NULL,
      UNIQUE KEY uq_routing_category (category_id),
      INDEX idx_routing_provider (provider_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Pelebaran kolom nama layanan: SMMfollows punya nama sampai 326 char →
  // varchar(255) memicu ER_DATA_TOO_LONG saat sync (jebakan .my §11).
  // Guard information_schema: MODIFY yang "sudah sesuai" tetap minta MDL
  // eksklusif tiap boot → convoy kalau ada query lama (insiden 17 Nov 2026).
  const svcName = await columnInfo("services", "service_name");
  if (!svcName || Number(svcName.len) < 1024 || svcName.nullable === "YES") {
    await db.execute(sql`ALTER TABLE services MODIFY COLUMN service_name VARCHAR(1024) NOT NULL`);
  }
  const svcNameRaw = await columnInfo("services", "service_name_raw");
  if (!svcNameRaw || Number(svcNameRaw.len) < 1024 || svcNameRaw.nullable === "YES") {
    await db.execute(
      sql`ALTER TABLE services MODIFY COLUMN service_name_raw VARCHAR(1024) NOT NULL DEFAULT ''`,
    );
  }

  // Index join katalog↔order untuk widget "layanan populer" /pesanan.
  // Tanpa index ini, JOIN orders×services di provider_service_id jadi
  // nested-loop ratusan juta baris (20+ menit/query — pemicu convoy MDL).
  // Sudah dibuat manual di prod 17 Nov 2026; guard ini menjamin env lain.
  if (!(await indexExists("services", "idx_provider_service"))) {
    await db.execute(
      sql`ALTER TABLE services ADD INDEX idx_provider_service (provider_service_id, provider_id)`,
    );
  }

  // ── Charset: tabel penampung teks MENTAH provider (bisa ada emoji 4-byte,
  // mis. kategori "IMPOSSIBLE SERVICES ❤️"). ADD COLUMN service-sync v2 mewarisi
  // charset tabel lama (latin1/utf8mb3) → INSERT/UPDATE "Incorrect string value"
  // bikin runServiceSync crash total → berita layanan (harga naik/turun/baru/
  // stop) tidak pernah terbentuk. Lebarkan ke utf8mb4 (guard, sekali jalan).
  await ensureTableUtf8mb4("categories", "name_raw");
  await ensureTableUtf8mb4("services", "service_name_raw");
  await ensureTableUtf8mb4("news", "content");

  // ── API publik /api/v1 (port socio.my — Socio Reseller API 14 action).
  // api_idempotency: klaim key idempotensi action `add` SEBELUM deduct/provider
  // supaya replay key sama tidak membuat order kedua (race-safe via UNIQUE).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_idempotency (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      idem_key VARCHAR(100) NOT NULL,
      oid VARCHAR(50) DEFAULT NULL,
      status ENUM('processing','done') NOT NULL DEFAULT 'processing',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ai_user_key_uq (user_id, idem_key),
      KEY ai_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Kolom users: webhook callback (Tier 2) + secret HMAC request (Tier 3).
  // addColumn = probe information_schema dulu (doktrin MDL convoy di atas).
  await addColumn(
    "users",
    "webhook_url",
    "ALTER TABLE users ADD COLUMN webhook_url VARCHAR(500) NOT NULL DEFAULT ''",
  );
  await addColumn(
    "users",
    "webhook_secret",
    "ALTER TABLE users ADD COLUMN webhook_secret VARCHAR(100) NOT NULL DEFAULT ''",
  );
  await addColumn(
    "users",
    "api_secret",
    "ALTER TABLE users ADD COLUMN api_secret VARCHAR(100) NOT NULL DEFAULT ''",
  );
  await addColumn(
    "users",
    "api_sign_required",
    "ALTER TABLE users ADD COLUMN api_sign_required TINYINT NOT NULL DEFAULT 0",
  );

  // Antrian delivery webhook — worker cron `api-webhooks` (pola email-queue).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_webhook_deliveries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      oid VARCHAR(50) NOT NULL,
      event VARCHAR(40) NOT NULL DEFAULT 'order.status',
      url VARCHAR(500) NOT NULL,
      payload TEXT NOT NULL,
      signature VARCHAR(64) NOT NULL DEFAULT '',
      status ENUM('pending','delivered','failed') NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      last_error VARCHAR(255) DEFAULT NULL,
      next_run_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME DEFAULT NULL,
      KEY awd_status_run_idx (status, next_run_at),
      KEY awd_user_idx (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // api_replay: nonce anti-replay request bertanda tangan HMAC (Susulan 50).
  // Signature dicatat segera setelah checkApiSignature lolos; UNIQUE(user_id,
  // nonce) menolak replay dalam window timestamp ±300s. TTL 600s, dibersihkan
  // cron `api-hygiene`.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_replay (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      nonce VARCHAR(128) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ar_user_nonce_uq (user_id, nonce),
      KEY ar_expires_idx (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
