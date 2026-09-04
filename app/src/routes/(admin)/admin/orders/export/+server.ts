/**
 * CSV export — Orders dengan filter aktif (q / status).
 */
import { db } from "@socio/db";
import { orders, users } from "@socio/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { dateStamp, sendCsv, toCsvUtf8, type CsvColumn } from "$lib/server/csv";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { RequestHandler } from "./$types";

const MAX_EXPORT = 10_000;

export const GET: RequestHandler = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  assertAdmin(locals);
  await assertAdminRate("orders-export", (locals as any).ip ?? "0.0.0.0", 10, 60);

  const status = String(url.searchParams.get("status") ?? "");
  const q = String(url.searchParams.get("q") ?? "");

  const notAdmin = sql`(${users.level} IS NULL OR ${users.level} <> 'Admin')`;
  const conds = [notAdmin];
  if (status) conds.push(eq(orders.status, status as never));
  if (q) {
    conds.push(
      sql`(${orders.id} = ${Number(q) || 0} OR ${users.username} LIKE ${"%" + q + "%"} OR ${orders.serviceName} LIKE ${"%" + q + "%"} OR ${orders.status} LIKE ${"%" + q + "%"})`,
    );
  }
  const where = and(...conds);

  const rows = await db
    .select({
      id: orders.id,
      oid: orders.oid,
      username: users.username,
      serviceName: orders.serviceName,
      data: orders.data,
      quantity: orders.quantity,
      price: orders.price,
      profit: orders.profit,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(where)
    .orderBy(desc(orders.id))
    .limit(MAX_EXPORT);

  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: "ID", value: (r) => r.id },
    { header: "OID", value: (r) => r.oid },
    { header: "Username", value: (r) => r.username ?? "" },
    { header: "Layanan", value: (r) => r.serviceName },
    { header: "Target/Link", value: (r) => r.data },
    { header: "Quantity", value: (r) => r.quantity },
    { header: "Harga (Rp)", value: (r) => r.price },
    { header: "Profit (Rp)", value: (r) => r.profit },
    { header: "Status", value: (r) => r.status },
    {
      header: "Tgl Order",
      value: (r) =>
        r.createdAt instanceof Date
          ? r.createdAt.toISOString().slice(0, 19).replace("T", " ")
          : String(r.createdAt),
    },
  ];

  const csv = toCsvUtf8(rows, columns);
  const stamp = dateStamp();
  const filename = status
    ? `socio-orders-${status.toLowerCase().replace(/\s+/g, "-")}-${stamp}.csv`
    : `socio-orders-${stamp}.csv`;

  return sendCsv(csv, filename);
};
