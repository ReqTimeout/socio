import { int, mysqlTable, varchar, text, datetime, index } from "drizzle-orm/mysql-core";

export const broadcastCampaigns = mysqlTable(
  "broadcast_campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    targetSegment: varchar("target_segment", { length: 50 }).notNull().default("all"), // all | member | agen | reseller | verified | unverified
    channel: varchar("channel", { length: 20 }).notNull().default("in_app"), // in_app | web_push | both
    sentCount: int("sent_count").notNull().default(0),
    sentAt: datetime("sent_at"),
    createdBy: int("created_by").notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    segmentIdx: index("segment_idx").on(t.targetSegment),
    createdIdx: index("created_idx").on(t.createdAt),
  }),
);

export type BroadcastCampaign = typeof broadcastCampaigns.$inferSelect;
export type NewBroadcastCampaign = typeof broadcastCampaigns.$inferInsert;
