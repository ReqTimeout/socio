import { redirect, error } from "@sveltejs/kit";
import { ensureAdminSchema } from "@socio/db/ensure";
import { db } from "@socio/db";
import { notifications, deposits, orders, adminRoles, adminNotifications } from "@socio/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getSetting } from "$lib/server/admin";
import { getClientIp } from "$lib/server/ip";
import { normalizeRole, ROLE_LABEL, can, requiredPermissionForPath } from "@socio/core/rbac";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const { locals, url } = event;
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");

  await ensureAdminSchema();

  // P3-01 RBAC: resolve role (admin_roles overrides, fallback to "admin")
  const [roleRow] = await db
    .select({ role: adminRoles.role })
    .from(adminRoles)
    .where(eq(adminRoles.userId, Number(locals.user.id)))
    .limit(1);
  const rawRole = roleRow?.role ?? null;
  const role = normalizeRole(rawRole);
  const roleLabel = ROLE_LABEL[role];

  // Enforce per-route permission (longest prefix match). Null = any admin.
  const required = requiredPermissionForPath(url.pathname);
  if (required && !can(role, required)) {
    throw error(403, `Akses ditolak · role kamu: ${role} · butuh: ${required}`);
  }

  // P2-03: Pakai centralized IP resolver (cf-connecting-ip > x-forwarded-for > x-real-ip)
  const ip = getClientIp(event) ?? "0.0.0.0";

  const [unreadRow, pendingDepositRow, pendingOrderRow, adminNotifRow, latestAdminNotifs] = await Promise.all([
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
    db
      .select({ c: sql<number>`COUNT(*)` })
      .from(adminNotifications)
      .where(
        and(eq(adminNotifications.adminId, Number(locals.user.id)), sql`${adminNotifications.readAt} IS NULL`),
      ),
    db
      .select({
        id: adminNotifications.id,
        title: adminNotifications.title,
        message: adminNotifications.message,
        actionUrl: adminNotifications.actionUrl,
        priority: adminNotifications.priority,
        createdAt: adminNotifications.createdAt,
      })
      .from(adminNotifications)
      .where(eq(adminNotifications.adminId, Number(locals.user.id)))
      .orderBy(sql`${adminNotifications.createdAt} DESC`)
      .limit(10),
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
      role,
      roleLabel,
      rawRole,
    },
    ip,
    unreadCount: Number(unreadAdmin ?? 0),
    adminNotifCount: Number((adminNotifRow as any)[0]?.c ?? 0),
    adminNotifs: (latestAdminNotifs as any[]).map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message ?? "",
      actionUrl: n.actionUrl ?? "/admin",
      priority: n.priority ?? "low",
      at: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    })),
    pendingDeposits: Number(pendingDeposits),
    pendingOrders: Number(pendingOrders),
    maintenance: (await getSetting("maintenance_mode")) === "1",
  };
};
