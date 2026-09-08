/**
 * PDF export — Deposits (laporan) dengan filter aktif (q / status).
 */
import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { sql, eq, and, desc, ne } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import { baseDoc, sendPdf, idr, fmtDateTime } from "$lib/server/pdf";
import type { RequestHandler } from "./$types";

const MAX_EXPORT = 500;
const STATUSES = ["Pending", "Success", "Canceled"] as const;

export const GET: RequestHandler = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  assertAdmin(locals);
  await assertAdminRate("deposits-export-pdf", (locals as any).ip ?? "0.0.0.0", 5, 60);

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "");

  const conds: any[] = [ne(users.level, "Admin")];
  if (status && STATUSES.includes(status as any)) {
    conds.push(eq(deposits.status, status as never));
  }
  if (q) {
    const n = Number(q) || 0;
    conds.push(
      sql`(${deposits.id} = ${n} OR ${users.username} LIKE ${"%" + q + "%"} OR ${deposits.methodName} LIKE ${"%" + q + "%"})`,
    );
  }

  const rows = await db
    .select({
      id: deposits.id,
      username: users.username,
      methodName: deposits.methodName,
      amount: deposits.amount,
      status: deposits.status,
      createdAt: deposits.createdAt,
    })
    .from(deposits)
    .leftJoin(users, eq(deposits.userId, users.id))
    .where(and(...conds))
    .orderBy(desc(deposits.id))
    .limit(MAX_EXPORT);

  const totalSuccess = rows.filter((r) => r.status === "Success").reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const totalPending = rows.filter((r) => r.status === "Pending").reduce((a, r) => a + Number(r.amount ?? 0), 0);

  const doc = baseDoc(
    [
      {
        text: `Ringkasan: ${rows.length} transaksi · Success ${idr(totalSuccess)} · Pending ${idr(totalPending)}`,
        style: "sub",
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [30, 70, "*", 70, 55, 90],
          body: [
            [
              { text: "ID", style: "tableHeader" },
              { text: "User", style: "tableHeader" },
              { text: "Metode", style: "tableHeader" },
              { text: "Nominal", style: "tableHeader" },
              { text: "Status", style: "tableHeader" },
              { text: "Tanggal", style: "tableHeader" },
            ],
            ...rows.map((r) => [
              { text: String(r.id), style: "tableBody" },
              { text: String(r.username ?? "-"), style: "tableBody" },
              { text: String(r.methodName ?? "-").slice(0, 30), style: "tableBody" },
              { text: idr(Number(r.amount ?? 0)), style: "tableBody", alignment: "right" },
              { text: String(r.status ?? "-"), style: "tableBody" },
              { text: fmtDateTime(r.createdAt), style: "tableBody" },
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
      title: "Laporan Deposit",
      subtitle: `Socio Admin — ${status || "Semua status"}`,
      fileName: "deposits.pdf",
    },
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `socio-deposits-${status ? status.toLowerCase() + "-" : ""}${stamp}.pdf`;
  return sendPdf(doc, filename);
};
