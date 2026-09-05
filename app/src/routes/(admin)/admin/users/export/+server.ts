/**
 * CSV export — Users dengan filter aktif (q / level / status / verified).
 * Refleksikan filter dari URL supaya admin bisa ekspor subset yang sama
 * dengan yang ditampilkan di tabel.
 */
import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { sql, eq, ne, and, desc, inArray } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { dateStamp, sendCsv, toCsvUtf8, type CsvColumn } from "$lib/server/csv";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { RequestHandler } from "./$types";

const MAX_EXPORT = 10_000;

export const GET: RequestHandler = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  assertAdmin(locals);

  // Rate-limit export per-IP (10/min) — export mahal
  await assertAdminRate("users-export", (locals as any).ip ?? "0.0.0.0", 10, 60);

  const q = String(url.searchParams.get("q") ?? "").trim();
  const levelParam = String(url.searchParams.get("level") ?? "");
  const levels = levelParam
    ? levelParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const status = String(url.searchParams.get("status") ?? "");
  const verified = String(url.searchParams.get("verified") ?? "");

  const conds = [];
  if (q) {
    conds.push(
      sql`(${users.username} LIKE ${"%" + q + "%"} OR ${users.email} LIKE ${"%" + q + "%"} OR ${users.fullName} LIKE ${"%" + q + "%"})`,
    );
  }
  if (levels.length === 1) conds.push(eq(users.level, levels[0] as never));
  else if (levels.length > 1) conds.push(inArray(users.level, levels as never[]));
  if (status) conds.push(status === "1" ? eq(users.status, "1") : ne(users.status, "1"));
  if (verified) conds.push(verified === "1" ? eq(users.verify, "Yes") : ne(users.verify, "Yes"));
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      level: users.level,
      balance: users.balance,
      status: users.status,
      verify: users.verify,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.id))
    .limit(MAX_EXPORT);

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "ID", value: (r) => r.id },
    { header: "Username", value: (r) => r.username },
    { header: "Email", value: (r) => r.email },
    { header: "Nama Lengkap", value: (r) => r.fullName },
    { header: "Level", value: (r) => r.level },
    { header: "Saldo (Rp)", value: (r) => r.balance },
    { header: "Status", value: (r) => (r.status === "1" ? "Aktif" : "Suspended") },
    { header: "Verifikasi", value: (r) => (r.verify === "Yes" ? "Verified" : "Belum") },
    {
      header: "Tgl Daftar",
      value: (r) =>
        r.createdAt instanceof Date
          ? r.createdAt.toISOString().slice(0, 19).replace("T", " ")
          : String(r.createdAt),
    },
  ];

  const csv = toCsvUtf8(rows, columns);
  const stamp = dateStamp();
  const filterTag =
    levels.length > 1
      ? "-l" + levels.length
      : levels.length === 1
        ? "-" + levels[0].toLowerCase()
        : "";
  const filename = `socio-users${filterTag}-${stamp}.csv`;

  return sendCsv(csv, filename);
};
