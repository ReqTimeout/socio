import { db } from "@socio/db";
import { backupLogs } from "@socio/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { unlink, stat, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { createWriteStream } from "node:fs";
import mysql from "mysql2/promise";
import { logAudit } from "./admin";

const BACKUP_DIR = process.env.SOCIO_BACKUP_DIR ?? "/app/storage/backups";
const KEEP = Number(process.env.SOCIO_BACKUP_KEEP ?? "10");

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").replace(/\?.*$/, ""),
  };
}

function escape(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) {
    const t = v.getTime();
    if (Number.isNaN(t)) return `'0000-00-00 00:00:00'`;
    return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return String(v);
  if (Buffer.isBuffer(v)) return `'${v.toString("binary").replace(/'/g, "''")}'`;
  const s = Buffer.from(String(v), "utf8").toString("binary").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\0/g, "\\0");
  return `'${s}'`;
}

/** Run logical backup via mysql2 client + gzip via zlib. */
export async function runBackup(triggeredBy: number, ip?: string): Promise<{ id: number; filename: string; sizeBytes: number }> {
  const url = process.env.SOCIO_DB_URL;
  if (!url) throw new Error("SOCIO_DB_URL not set");

  await mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .replace(/(\d{8})(\d{6})/, "$1-$2");
  const filename = `${process.env.SOCIO_DB_NAME ?? "socio_smm"}-${stamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  await db.insert(backupLogs).values({ filename, sizeBytes: 0, status: "running", triggeredBy, startedAt: new Date(), finishedAt: null } as any);
  const last = await db.select({ id: backupLogs.id }).from(backupLogs).orderBy(sql`${backupLogs.id} DESC`).limit(1);
  const logId: number = last[0]?.id ?? 0;

  try {
    const dbc = parseDbUrl(url);
    const conn = await mysql.createConnection({
      host: dbc.host,
      port: dbc.port,
      user: dbc.user,
      password: dbc.password,
      database: dbc.database,
      charset: "utf8mb4",
      decimalNumbers: true,
      timezone: "Z",
    });

    const [tables] = (await conn.query("SHOW TABLES")) as any;
    const tableNames: string[] = tables.map((r: any) => Object.values(r)[0] as string);

    const gzipOut = createWriteStream(filepath);
    const gzip = zlib.createGzip();
    gzip.pipe(gzipOut);

    let header = `-- Socio.id backup\n-- Database: ${dbc.database}\n-- Generated: ${new Date().toISOString()}\n-- Tables: ${tableNames.length}\n\n`;
    gzip.write(Buffer.from(header, "utf8"));
    header = "";

    const q = (s: string) => "`" + s.replace(/`/g, "``") + "`";

    for (const table of tableNames) {
      gzip.write(Buffer.from(`\n-- Table: ${table}\n`, "utf8"));
      gzip.write(Buffer.from(`DROP TABLE IF EXISTS ${q(table)};\n`, "utf8"));

      const [createRows] = (await conn.query("SHOW CREATE TABLE " + q(table))) as any;
      const createSql: string = Object.values(createRows[0] as any)[1] as string;
      gzip.write(Buffer.from(`${createSql};\n`, "utf8"));

      const [countRow] = (await conn.query(`SELECT COUNT(*) AS c FROM ${q(table)}`)) as any;
      const count: number = Number(countRow[0]?.c ?? 0);
      if (count === 0) {
        gzip.write(Buffer.from(`-- 0 rows\n`, "utf8"));
        continue;
      }

      const batchSize = 1000;
      const cols = await conn.query("SHOW COLUMNS FROM " + q(table));
      const colNames: string[] = (cols[0] as any[]).map((c: any) => c.Field);

      for (let offset = 0; offset < count; offset += batchSize) {
        const [rows] = (await conn.query(`SELECT * FROM ${q(table)} LIMIT ${batchSize} OFFSET ${offset}`)) as any;
        if (!rows.length) continue;
        const colList = colNames.map((c) => "`" + c.replace(/`/g, "``") + "`").join("`,`");
        const head = `INSERT INTO ${q(table)} (\`${colList}\`) VALUES\n`;
        const body = (rows as any[])
          .map((r: any, i: number) => {
            const vals = colNames.map((c: string) => escape(r[c])).join(",");
            const end = i === rows.length - 1 ? ";\n" : ",\n";
            return `(${vals})${end}`;
          })
          .join("");
        gzip.write(Buffer.from(head + body, "utf8"));
      }
      gzip.write(Buffer.from(`-- ${count} rows\n`, "utf8"));
    }

    gzip.end();
    await new Promise<void>((resolve, reject) => {
      gzipOut.on("finish", () => resolve());
      gzipOut.on("error", (e) => reject(e));
    });

    const stats = await stat(filepath);

    await db
      .update(backupLogs)
      .set({ sizeBytes: stats.size, status: "success", finishedAt: new Date() })
      .where(eq(backupLogs.id, logId));

    await conn.end();

    await logAudit({
      adminId: triggeredBy,
      action: "backup_create",
      entity: "backup_log",
      entityId: logId,
      detail: { filename, sizeBytes: stats.size },
      ip,
    });

    await rotateBackups();
    return { id: logId, filename, sizeBytes: stats.size };
  } catch (e: any) {
    await db
      .update(backupLogs)
      .set({ status: "failed", error: String(e?.message ?? e).slice(0, 500), finishedAt: new Date() })
      .where(eq(backupLogs.id, logId));
    throw e;
  }
}

export async function rotateBackups() {
  try {
    const entries = await readdir(BACKUP_DIR);
    const sqlGzs = entries.filter((e) => e.endsWith(".sql.gz")).sort().reverse();
    const toDelete = sqlGzs.slice(KEEP);
    for (const f of toDelete) {
      try {
        await unlink(path.join(BACKUP_DIR, f));
      } catch {}
    }
    // Also prune database log rows older than 90 days
    const cutoff = new Date(Date.now() - 90 * 86400_000);
    await db.execute(sql`DELETE FROM ${backupLogs} WHERE ${backupLogs.startedAt} < ${cutoff} AND ${backupLogs.status} = 'success'`);
  } catch (e) {
    console.error("[backup] rotate failed:", e);
  }
}

export async function listBackups() {
  const rows = await db.select().from(backupLogs).orderBy(desc(backupLogs.id)).limit(30);
  return rows as any;
}

export async function deleteBackup(id: number) {
  const [row] = (await db.select().from(backupLogs).where(eq(backupLogs.id, id)).limit(1)) as any;
  if (!row) return null;
  try {
    await unlink(path.join(BACKUP_DIR, row.filename));
  } catch {}
  await db.delete(backupLogs).where(eq(backupLogs.id, id));
  return { filename: row.filename };
}

export function getBackupPath(filename: string): string {
  const safe = path.basename(filename);
  if (!safe.endsWith(".sql.gz")) return "";
  return path.join(BACKUP_DIR, safe);
}
