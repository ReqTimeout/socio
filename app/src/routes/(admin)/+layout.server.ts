import { redirect } from "@sveltejs/kit";
import { ensureAdminSchema } from "@socio/db/ensure";
import { db } from "@socio/db";
import { notifications, deposits, orders } from "@socio/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getSetting } from "$lib/server/admin";
import { getClientIp } from "$lib/server/ip";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const { locals, request } = event;
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");

  await ensureAdminSchema();

  // P2-03: Pakai centralized IP resolver (cf-connecting-ip > x-forwarded-for > x-real-ip)
  const ip = getClientIp(event) ?? "0.0.0.0";

  const [unreadRow, pendingDepositRow, pendingOrderRow] = await Promise.all([
    db
      .select({ unreadAdmin: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, Number(locals.user.id)), sql`${notifications.readAt} IS NULL`),
      ),
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(deposits)
      .where(eq(deposits.status, "Pending")),
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(orders)
      .where(sql`${orders.status} IN ('Pending','Processing')`),
  ]);
  const unreadAdmin = unreadRow[0]?.unreadAdmin ?? 0;
  const pendingDeposits = pendingDepositRow[0]?.c ?? 0;
  const pendingOrders = pendingOrderRow[0]?.c ?? 0;

  return {
    admin: {
      id: locals.user.id,
      name: locals.user.fullName ?? locals.user.username,
      username: locals.user.username,
      level: (locals.user as any).level,
    },
    ip,
    unreadCount: Number(unreadAdmin ?? 0),
    pendingDeposits: Number(pendingDeposits),
    pendingOrders: Number(pendingOrders),
    maintenance: (await getSetting("maintenance_mode")) === "1",
  };
};
