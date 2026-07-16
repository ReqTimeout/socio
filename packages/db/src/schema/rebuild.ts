import {
  boolean,
  datetime,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/**
 * better-auth session table (MySQL adapter).
 * `user_id` links to `users.id`. Token is the session cookie value.
 */
export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    token: varchar("token", { length: 128 }).notNull(),
    expiresAt: datetime("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
    impersonatedBy: varchar("impersonated_by", { length: 64 }),
  },
  (t) => ({
    tokenIdx: index("session_token_idx").on(t.token),
    userIdx: index("session_user_idx").on(t.userId),
  }),
);

/**
 * better-auth verification table (email verification, password reset, 2FA).
 */
export const verifications = mysqlTable(
  "verifications",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    identifier: varchar("identifier", { length: 191 }).notNull(),
    value: text("value").notNull(),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (t) => ({
    identifierIdx: index("verification_identifier_idx").on(t.identifier),
  }),
);

/**
 * G1 (ADMIN_GAP): audit log for all destructive admin actions.
 */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    adminId: int("admin_id").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    detail: json("detail"),
    ip: varchar("ip", { length: 64 }),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    adminIdx: index("audit_admin_idx").on(t.adminId),
    actionIdx: index("audit_action_idx").on(t.action),
  }),
);

/**
 * DB-backed job queue (no Redis). Used by cron workers.
 */
export const jobQueue = mysqlTable(
  "job_queue",
  {
    id: int("id").autoincrement().primaryKey(),
    type: varchar("type", { length: 50 }).notNull(),
    payload: json("payload").notNull(),
    status: mysqlEnum("status", ["pending", "running", "done", "failed"]).notNull().default("pending"),
    priority: int("priority").notNull().default(5),
    attempts: int("attempts").notNull().default(0),
    maxAttempts: int("max_attempts").notNull().default(3),
    lockedAt: datetime("locked_at"),
    lockedBy: varchar("locked_by", { length: 64 }),
    nextRunAt: datetime("next_run_at").notNull(),
    createdAt: datetime("created_at").notNull(),
    finishedAt: datetime("finished_at"),
  },
  (t) => ({
    statusIdx: index("job_status_idx").on(t.status, t.nextRunAt),
    typeIdx: index("job_type_idx").on(t.type),
  }),
);

/**
 * Web Push subscriptions (VAPID).
 */
export const webPushSubscriptions = mysqlTable(
  "web_push_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("push_user_idx").on(t.userId),
  }),
);
