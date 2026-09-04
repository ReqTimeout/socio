/**
 * CSV export — Deposits dengan filter aktif (q / status).
 */
import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { sql, eq, and, desc, ne } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { dateStamp, sendCsv, toCsvUtf8, type CsvColumn } from "$lib/server/csv";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { RequestHandler } from "./$types";

const MAX_EXPORT = 10_000;
const STATUSES = ["Pending", "Success", "Canceled"] as const;

export const GET: RequestHandler = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  assertAdmin(locals);
  await assertAdminRate("deposits-export", (locals as any).ip ?? "0.0.0.0", 10, 60);

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "");

  const conds: any[] = [ne(users.level, "Admin")];
  if (status && STATUSES.includes(status as any)) {
    conds.push(eq(deposits.status, status as never));
  }
  if (q) {
    const n = Number(q) || 0;
    conds.push(
      sql`(${deposits.id} = ${n} OR ${users.username} LIKE ${"%" + q + "%"} OR ${deposits.methodName} LIKE ${"%" + q + "%"} OR ${deposits.status} LIKE ${"%" + q + "%"})`,
    );
  }
  const where = and(...conds);

  const rows = await db
    .select({
      id: deposits.id,
      username: users.username,
      payment: deposits.payment,
      type: deposits.type,
      methodName: deposits.methodName,
      target: deposits.target,
      amount: deposits.amount,
      status: deposits.status,
      createdAt: deposits.createdAt,
    })
    .from(deposits)
    .leftJoin(users, eq(deposits.userId, users.id))
    .where(where)
    .orderBy(desc(deposits.id))
    .limit(MAX_EXPORT);

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "ID", value: (r) => r.id },
    { header: "Username", value: (r) => r.username ?? "" },
    { header: "Payment", value: (r) => r.payment },
    { header: "Tipe", value: (r) => r.type },
    { header: "Metode", value: (r) => r.methodName },
    { header: "Target", value: (r) => r.target },
    { header: "Nominal (Rp)", value: (r) => r.amount },
    { header: "Status", value: (r) => r.status },
    {
      header: "Tgl Deposit",
      value: (r) =>
        r.createdAt instanceof Date
          ? r.createdAt.toISOString().slice(0, 19).replace("T", " ")
          : String(r.createdAt),
    },
  ];

  const csv = toCsvUtf8(rows, columns);
  const stamp = dateStamp();
  const filename = status
    ? `socio-deposits-${status.toLowerCase()}-${stamp}.csv`
    : `socio-deposits-${stamp}.csv`;

  return sendCsv(csv, filename);
};
