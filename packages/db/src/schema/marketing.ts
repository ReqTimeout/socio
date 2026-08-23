import {
  datetime,
  decimal,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const emailCampaigns = mysqlTable("email_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }),
  templateType: mysqlEnum("template_type", [
    "promotional",
    "educational",
    "retention",
    "engagement",
    "transactional",
  ]).default("promotional"),
  subjectLine: varchar("subject_line", { length: 255 }).notNull(),
  emailBody: longtext("email_body"),
  ctaButtonText: varchar("cta_button_text", { length: 50 }),
  ctaButtonUrl: varchar("cta_button_url", { length: 500 }),
  targetAudience: mysqlEnum("target_audience", [
    "all",
    "active",
    "inactive",
    "high_spender",
    "new_user",
    "churn_risk",
  ]).default("all"),
  targetGroup: varchar("target_group", { length: 50 }).notNull().default("all"),
  scheduledAt: datetime("scheduled_at"),
  sentAt: datetime("sent_at"),
  status: mysqlEnum("status", [
    "draft",
    "scheduled",
    "sent",
    "paused",
    "cancelled",
  ]).default("draft"),
  totalRecipients: int("total_recipients").default(0),
  openRate: decimal("open_rate", { precision: 5, scale: 2 }).default("0.00"),
  clickRate: decimal("click_rate", { precision: 5, scale: 2 }).default("0.00"),
  conversionRate: decimal("conversion_rate", {
    precision: 5,
    scale: 2,
  }).default("0.00"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const emailQueue = mysqlTable("email_queue", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientId: int("recipient_id"),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  templateData: longtext("template_data"),
  priority: mysqlEnum("priority", ["low", "normal", "high"]).default("normal"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending"),
  attempts: int("attempts").default(0),
  maxAttempts: int("max_attempts").default(3),
  errorMessage: text("error_message"),
  sentAt: datetime("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailCampaignLog = mysqlTable("email_campaign_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  campaignType: varchar("campaign_type", { length: 50 }).notNull(),
  queueId: int("queue_id"),
  emailSent: mysqlEnum("email_sent", ["pending", "sent", "failed"]).default(
    "pending",
  ),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: datetime("opened_at"),
  clickedAt: datetime("clicked_at"),
  notes: text("notes"),
});

export const emailCampaignTracking = mysqlTable("email_campaign_tracking", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull(),
  userId: int("user_id").notNull(),
  emailSent: datetime("email_sent"),
  emailOpened: datetime("email_opened"),
  linkClicked: datetime("link_clicked"),
  converted: tinyint("converted").default(0),
  conversionValue: decimal("conversion_value", {
    precision: 12,
    scale: 2,
  }).default("0.00"),
  status: mysqlEnum("status", [
    "pending",
    "sent",
    "opened",
    "clicked",
    "converted",
  ]).default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailQuotaLog = mysqlTable("email_quota_log", {
  id: int("id").autoincrement().primaryKey(),
  date: datetime("date").notNull(),
  campaignType: varchar("campaign_type", { length: 50 }),
  emailsSent: int("emails_sent").default(0),
  emailsFailed: int("emails_failed").default(0),
  remainingQuota: int("remaining_quota"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailQueueItem = typeof emailQueue.$inferSelect;
export type NewEmailQueueItem = typeof emailQueue.$inferInsert;
