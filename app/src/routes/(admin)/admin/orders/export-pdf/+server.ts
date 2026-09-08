/**
 * PDF export — Orders (invoice/laporan) dengan filter aktif (q / status).
 */
import { db } from "@socio/db";
import { orders, users } from "@socio/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import { baseDoc, sendPdf, idr, fmtDateTime } from "$lib/server/pdf";
import type { RequestHandler } from "./$types";

const MAX_EXPORT = 500;

export const GET: RequestHandler = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  assertAdmin(locals);
  await assertAdminRate("orders-export-pdf", (locals as any).ip ?? "0.0.0.0", 5, 60);

  const status = String(url.searchParams.get("status") ?? "");
  const q = String(url.searchParams.get("q") ?? "");

  const notAdmin = sql`(${users.level} IS NULL OR ${users.level} <> 'Admin')`;
  const conds = [notAdmin];
  if (status) conds.push(eq(orders.status, status as never));
  if (q) {
    conds.push(
      sql`(${orders.id} = ${Number(q) || 0} OR ${users.username} LIKE ${"%" + q + "%"} OR ${orders.serviceName} LIKE ${"%" + q + "%"})`,
    );
  }

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
    .where(and(...conds))
    .orderBy(desc(orders.id))
    .limit(MAX_EXPORT);

  const totalPrice = rows.reduce((a, r) => a + Number(r.price ?? 0), 0);
  const totalProfit = rows.reduce((a, r) => a + Number(r.profit ?? 0), 0);

  const doc = baseDoc(
    [
      {
        text: `Ringkasan: ${rows.length} order · Harga ${idr(totalPrice)} · Profit ${idr(totalProfit)}`,
        style: "sub",
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [28, 52, 60, "*", 32, 60, 50, 45],
          body: [
            [
              { text: "ID", style: "tableHeader" },
              { text: "OID", style: "tableHeader" },
              { text: "User", style: "tableHeader" },
              { text: "Layanan", style: "tableHeader" },
              { text: "Qty", style: "tableHeader" },
              { text: "Harga", style: "tableHeader" },
              { text: "Profit", style: "tableHeader" },
              { text: "Status", style: "tableHeader" },
            ],
            ...rows.map((r) => [
              { text: String(r.id), style: "tableBody" },
              { text: String(r.oid ?? "-"), style: "tableBody" },
              { text: String(r.username ?? "-"), style: "tableBody" },
              { text: String(r.serviceName ?? "-").slice(0, 42), style: "tableBody" },
              { text: String(r.quantity ?? 0), style: "tableBody", alignment: "right" },
              { text: idr(Number(r.price ?? 0)), style: "tableBody", alignment: "right" },
              { text: idr(Number(r.profit ?? 0)), style: "tableBody", alignment: "right" },
              { text: String(r.status ?? "-"), style: "tableBody" },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.75 : 0),
          vLineWidth: () => 0,
          fillColor: (i: number) => (i === 0 ? "#1f2a44" : i % 2 === 1 ? "#f6f8fb" : null),
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
      {
        text: `Dicetak: ${fmtDateTime(new Date())} · Maks ${MAX_EXPORT} baris terbaru · Filter: ${status || "semua"}${q ? ` · q="${q}"` : ""}`,
        style: "footerLeft",
        margin: [0, 10, 0, 0],
      },
    ],
    {
      title: "Laporan Order",
      subtitle: `Socio Admin — ${status || "Semua status"}`,
      fileName: "orders.pdf",
    },
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `socio-orders-${status ? status.toLowerCase().replace(/\s+/g, "-") + "-" : ""}${stamp}.pdf`;
  return sendPdf(doc, filename);
};
