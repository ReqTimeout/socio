/**
 * RBAC — Role-Based Access Control for admin panel (G6)
 * Source: docs/ADMIN_GAP.md G6 + docs/audit/dashboard-redesign.md P3-01
 *
 * Roles: super_admin > admin > operator > finance
 * - super_admin: all permissions (wildcard)
 * - admin: operational (users/orders/deposits/services/pricing/providers/banners/news/email/tickets/settings)
 * - operator: orders + deposits (read) + tickets (read/reply) + services (read)
 * - finance: deposits (approve/reject), balance_logs (read), refund (request)
 *
 * Permission format: "module:action" e.g. "users:read", "orders:edit", "deposits:approve"
 * Use `can(role, "module:action")` — returns true if allowed.
 * Super admin always returns true (wildcard).
 *
 * DB source: admin_roles.role (varchar, fallback "admin" if row missing).
 * Bootstrap rule: first admin gets super_admin implicitly until any row exists.
 */

export type AdminRole = "super_admin" | "admin" | "operator" | "finance";

// Viewer is legacy alias for finance (older settings page). Normalize at read time.
export function normalizeRole(raw: string | null | undefined): AdminRole {
  const r = (raw ?? "admin").toLowerCase();
  if (r === "superadmin" || r === "super_admin") return "super_admin";
  if (r === "admin") return "admin";
  if (r === "operator") return "operator";
  if (r === "finance" || r === "viewer") return "finance";
  return "admin";
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super Admin · Akses penuh",
  admin: "Admin · Operasional",
  operator: "Operator · Order & tiket",
  finance: "Finance · Deposit & refund",
};

export const ROLE_BADGE: Record<AdminRole, { label: string; tone: string }> = {
  super_admin: { label: "Super Admin", tone: "from-violet-600 to-indigo-600" },
  admin: { label: "Admin", tone: "from-primary-600 to-accent-500" },
  operator: { label: "Operator", tone: "from-amber-500 to-orange-500" },
  finance: { label: "Finance", tone: "from-emerald-500 to-teal-600" },
};

// Route → required permission (null = public for any admin)
export const ROUTE_PERMISSION: Record<string, string | null> = {
  "/admin": null, // dashboard overview — any admin
  "/admin/users": "users:read",
  "/admin/orders": "orders:read",
  "/admin/deposits": "deposits:read",
  "/admin/services": "services:read",
  "/admin/pricing": "pricing:read",
  "/admin/providers": "providers:read",
  "/admin/banners": "banners:read",
  "/admin/news": "news:read",
  "/admin/email": "email:read",
  "/admin/tickets": "tickets:read",
  "/admin/settings": "settings:read",
  "/admin/coupons": "coupons:read",
  "/admin/affiliate": "affiliate:read",
  "/admin/reporting": "reporting:read",
  "/admin/audit": "audit:read",
  "/admin/refunds": "refund:request",
};

// All permissions per role (explicit list — no wildcard except super_admin)
const PERMISSIONS: Record<AdminRole, Set<string>> = {
  super_admin: new Set(["*"]), // wildcard handled in can()
  admin: new Set([
    "users:read",
    "users:edit",
    "users:suspend",
    "orders:read",
    "orders:edit",
    "deposits:read",
    "deposits:approve",
    "deposits:reject",
    "services:read",
    "services:edit",
    "pricing:read",
    "pricing:edit",
    "providers:read",
    "providers:edit",
    "banners:read",
    "banners:edit",
    "news:read",
    "news:edit",
    "email:read",
    "email:send",
    "tickets:read",
    "tickets:reply",
    "tickets:close",
    "settings:read",
    "settings:edit",
    "coupons:read",
    "coupons:edit",
    "affiliate:read",
    "reporting:read",
    "audit:read",
    "refund:request",
    "refund:approve",
    "refund:reject",
  ]),
  operator: new Set([
    "orders:read",
    "orders:edit",
    "deposits:read",
    "tickets:read",
    "tickets:reply",
    "services:read",
    "settings:read", // read-only for nav visibility, but actions blocked by per-action check
  ]),
  finance: new Set([
    "deposits:read",
    "deposits:approve",
    "deposits:reject",
    "balance_logs:read",
    "refund:request",
    "refund:approve",
    "refund:reject",
    "reporting:read",
    "audit:read",
  ]),
};

export function can(roleRaw: string | null | undefined, permission: string): boolean {
  const role = normalizeRole(roleRaw);
  const set = PERMISSIONS[role];
  if (!set) return false;
  if (set.has("*")) return true;
  return set.has(permission);
}

export function requiredPermissionForPath(pathname: string): string | null {
  // Longest prefix match (e.g. /admin/orders/123 → /admin/orders)
  let best: string | null = null;
  let bestLen = -1;
  for (const [route, perm] of Object.entries(ROUTE_PERMISSION)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      if (route.length > bestLen) {
        best = perm;
        bestLen = route.length;
      }
    }
  }
  return best;
}

export const ALL_ROLES: AdminRole[] = ["super_admin", "admin", "operator", "finance"];
