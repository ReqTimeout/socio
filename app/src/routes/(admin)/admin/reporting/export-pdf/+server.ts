/**
 * PDF export — Reporting summary (overview + status + top services/users).
 */
import { db } from "@socio/db";
import { sql } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import { baseDoc, sendPdf, idr, fmtDateTime } from "$lib/server/pdf";
import type { RequestHandler } from "./$types";

const RANGES = ["7d", "30d", "month", "all"] as const;
type Range = (typeof RANGES)[number];

function startOfRange(range: Range): Date | null {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === "all") return null;
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 hari terakhir",
  "30d": "30 hari terakhir",
  month: "Bulan ini",
  all: "Semua waktu",
};

export const GET: RequestHandler = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  assertAdmin(locals);
  await assertAdminRate("reporting-export-pdf", (locals as any).ip ?? "0.0.0.0", 5, 60);

  const rangeRaw = String(url.searchParams.get("range") ?? "7d");
  const range: Range = (RANGES as readonly string[]).includes(rangeRaw) ? (rangeRaw as Range) : "7d";
  const since = startOfRange(range);

  const [overviewRows, statusRows, topServices, topUsers] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status NOT IN ('Canceled','Error') THEN 1 ELSE 0 END) AS success_orders,
        SUM(CASE WHEN status IN ('Success','In progress','Processing','Partial') THEN price ELSE 0 END) AS revenue,
        SUM(CASE WHEN status = 'Success' THEN price ELSE 0 END) AS revenue_done,
        SUM(profit) AS total_profit
      FROM orders WHERE ${since ? sql`created_at >= ${since}` : sql`1=1`}
    `),
    db.execute(sql`
      SELECT status, COUNT(*) AS c, SUM(price) AS revenue
      FROM orders WHERE ${since ? sql`created_at >= ${since}` : sql`1=1`}
      GROUP BY status ORDER BY c DESC
    `),
    db.execute(sql`
      SELECT service_name, COUNT(*) AS orders_count, SUM(price) AS revenue, SUM(profit) AS profit
      FROM orders
      WHERE ${since ? sql`created_at >= ${since}` : sql`1=1`} AND status = 'Success'
      GROUP BY service_name
      ORDER BY revenue DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT o.user_id, u.username, COUNT(*) AS orders_count, SUM(o.price) AS spend
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE ${since ? sql`o.created_at >= ${since}` : sql`1=1`} AND o.status = 'Success'
      GROUP BY o.user_id, u.username
      ORDER BY spend DESC
      LIMIT 10
    `),
  ]);

  const ovRows: any[] = Array.isArray((overviewRows as any)[0]) ? (overviewRows as any)[0] : (overviewRows as any);
  const o = ovRows[0] ?? {};
  const totalOrders = Number(o.total_orders ?? 0);
  const successOrders = Number(o.success_orders ?? 0);
  const successRate = totalOrders > 0 ? (successOrders / totalOrders) * 100 : 0;

  const statusData = (Array.isArray((statusRows as any)[0]) ? (statusRows as any)[0] : (statusRows as any)) ?? [];
  const servicesData = (Array.isArray((topServices as any)[0]) ? (topServices as any)[0] : (topServices as any)) ?? [];
  const usersData = (Array.isArray((topUsers as any)[0]) ? (topUsers as any)[0] : (topUsers as any)) ?? [];

  const tableLayout = {
    hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.75 : 0),
    vLineWidth: () => 0,
    fillColor: (i: number) => (i === 0 ? "#1f2a44" : i % 2 === 1 ? "#f6f8fb" : null),
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 3,
    paddingBottom: () => 3,
  };

  const doc = baseDoc(
    [
      // Overview summary
      {
        table: {
          widths: [110, 90, 110, 90],
          body: [
            [
              { text: "Total Order", style: "summaryLabel" },
              { text: String(totalOrders), style: "summaryValue" },
              { text: "Revenue (berjalan)", style: "summaryLabel" },
              { text: idr(Number(o.revenue ?? 0)), style: "summaryValue" },
            ],
            [
              { text: "Order Sukses", style: "summaryLabel" },
              { text: String(successOrders), style: "summaryValue" },
              { text: "Revenue (selesai)", style: "summaryLabel" },
              { text: idr(Number(o.revenue_done ?? 0)), style: "summaryValue" },
            ],
            [
              { text: "Success Rate", style: "summaryLabel" },
              { text: `${successRate.toFixed(1)}%`, style: "summaryValue" },
              { text: "Total Profit", style: "summaryLabel" },
              { text: idr(Number(o.total_profit ?? 0)), style: "summaryValue" },
            ],
          ],
        },
        layout: { ...tableLayout, fillColor: (i: number) => (i % 2 === 1 ? "#f6f8fb" : null) },
        margin: [0, 0, 0, 16],
      },
      // Status breakdown
      { text: "Breakdown Status", style: "h2", margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 100],
          body: [
            [
              { text: "Status", style: "tableHeader" },
              { text: "Order", style: "tableHeader" },
              { text: "Revenue", style: "tableHeader" },
            ],
            ...statusData.map((r: any) => [
              { text: String(r.status), style: "tableBody" },
              { text: String(r.c), style: "tableBody", alignment: "right" },
              { text: idr(Number(r.revenue ?? 0)), style: "tableBody", alignment: "right" },
            ]),
          ],
        },
        layout: tableLayout,
        margin: [0, 0, 0, 16],
      },
      // Top services
      { text: "Top 10 Layanan (by revenue)", style: "h2", margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 45, 80, 80],
          body: [
            [
              { text: "Layanan", style: "tableHeader" },
              { text: "Order", style: "tableHeader" },
              { text: "Revenue", style: "tableHeader" },
              { text: "Profit", style: "tableHeader" },
            ],
            ...servicesData.map((r: any) => [
              { text: String(r.service_name ?? "-").slice(0, 50), style: "tableBody" },
              { text: String(r.orders_count ?? 0), style: "tableBody", alignment: "right" },
              { text: idr(Number(r.revenue ?? 0)), style: "tableBody", alignment: "right" },
              { text: idr(Number(r.profit ?? 0)), style: "tableBody", alignment: "right" },
            ]),
          ],
        },
        layout: tableLayout,
        margin: [0, 0, 0, 16],
      },
      // Top users
      { text: "Top 10 User (by spend)", style: "h2", margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 45, 100],
          body: [
            [
              { text: "User", style: "tableHeader" },
              { text: "Order", style: "tableHeader" },
              { text: "Spend", style: "tableHeader" },
            ],
            ...usersData.map((r: any) => [
              { text: String(r.username ?? `user#${r.user_id}`), style: "tableBody" },
              { text: String(r.orders_count ?? 0), style: "tableBody", alignment: "right" },
              { text: idr(Number(r.spend ?? 0)), style: "tableBody", alignment: "right" },
            ]),
          ],
        },
        layout: tableLayout,
      },
      {
        text: `Dicetak: ${fmtDateTime(new Date())} · Range: ${RANGE_LABEL[range]}`,
        style: "footerLeft",
        margin: [0, 10, 0, 0],
      },
    ],
    {
      title: "Laporan Reporting",
      subtitle: `Socio Admin — ${RANGE_LABEL[range]}`,
      fileName: "reporting.pdf",
    },
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return sendPdf(doc, `socio-reporting-${range}-${stamp}.pdf`);
};
