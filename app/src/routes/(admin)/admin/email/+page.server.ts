import { db } from "@socio/db";
import {
  emailCampaigns,
  emailCampaignLog,
  emailCampaignTracking,
  emailQueue,
} from "@socio/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";
import type { RowDataPacket } from "mysql2";

const TEMPLATE_TYPES = [
  "promotional",
  "educational",
  "retention",
  "engagement",
  "transactional",
] as const;
const AUDIENCES = ["all", "active", "inactive", "high_spender", "new_user", "churn_risk"] as const;
const STATUSES = ["draft", "scheduled", "sent", "paused", "cancelled"] as const;

type TemplateType = (typeof TEMPLATE_TYPES)[number];
type Audience = (typeof AUDIENCES)[number];

const isTemplateType = (v: string): v is TemplateType =>
  (TEMPLATE_TYPES as readonly string[]).includes(v);
const isAudience = (v: string): v is Audience => (AUDIENCES as readonly string[]).includes(v);

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const status = url.searchParams.get("status") ?? "";
  const rawP = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15
  const perPage = 15;

  // A-10: WHERE + LIMIT/OFFSET di DB (bukan fetch-all + JS slice).
  const where = status ? eq(emailCampaigns.status, status as never) : undefined;
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(emailCampaigns)
      .where(where)
      .orderBy(desc(emailCampaigns.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ c: count() }).from(emailCampaigns).where(where),
  ]);
  const campaigns = rows;
  const total = Number(totalRow[0]?.c ?? 0);

  const trackingRows = await db
    .select({
      campaignId: emailCampaignTracking.campaignId,
      sent: sql<number>`SUM(${emailCampaignTracking.status} IN ('sent','opened','clicked','converted'))`,
      opened: sql<number>`SUM(${emailCampaignTracking.status} IN ('opened','clicked','converted'))`,
      clicked: sql<number>`SUM(${emailCampaignTracking.status} IN ('clicked','converted'))`,
    })
    .from(emailCampaignTracking)
    .groupBy(emailCampaignTracking.campaignId);
  const trackById = new Map(trackingRows.map((t) => [t.campaignId, t]));

  const [pendingQ, failedQ] = await Promise.all([
    db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "pending")),
    db.select({ c: count() }).from(emailQueue).where(eq(emailQueue.status, "failed")),
  ]);

  return {
    campaigns: campaigns.map((c) => {
      const t = trackById.get(Number(c.id));
      const sent = Number(t?.sent ?? 0);
      const opened = Number(t?.opened ?? 0);
      const clicked = Number(t?.clicked ?? 0);
      return {
        id: Number(c.id),
        title: c.title,
        subject: c.subjectLine,
        body: c.emailBody ?? "",
        ctaText: c.ctaButtonText ?? "",
        ctaUrl: c.ctaButtonUrl ?? "",
        templateType: c.templateType ?? "promotional",
        audience: c.targetAudience ?? "all",
        group: c.targetGroup ?? "all",
        status: c.status ?? "draft",
        sentAt: c.sentAt,
        scheduledAt: c.scheduledAt,
        totalRecipients: Number(c.totalRecipients ?? 0),
        track: { sent, opened, clicked },
      };
    }),
    page,
    perPage,
    total,
    pages: Math.max(1, Math.ceil(total / perPage)),
    status,
    filterStatuses: [""].concat(STATUSES),
    queuePending: Number(pendingQ[0]?.c ?? 0),
    queueFailed: Number(failedQ[0]?.c ?? 0),
    templateTypes: TEMPLATE_TYPES,
    audiences: AUDIENCES.map((a) => ({
      value: a,
      label:
        a === "all"
          ? "Semua"
          : a === "active"
            ? "Aktif (order 7 hr)"
            : a === "inactive"
              ? "Nonaktif (no order 30 hr)"
              : a === "high_spender"
                ? "Depositor 30 hr"
                : a === "new_user"
                  ? "User baru (7 hr)"
                  : "Churn risk (30 hr)",
    })),
  };
};

/**
 * Push campaign ke queue: segment user → insert email_queue + tracking row.
 * Worker kirim via Resend dibuat di M4 (cron/email-queue) — M3 hanya CRUD + queue.
 */
export const actions: Actions = {
  save: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("email-save", (locals as any).ip ?? "0.0.0.0", 30, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id") ?? 0);
    const title = String(form.get("title") ?? "").trim();
    const subject = String(form.get("subjectLine") ?? "").trim();
    const body = String(form.get("emailBody") ?? "").trim();
    const ctaText = String(form.get("ctaButtonText") ?? "").trim();
    const ctaUrl = String(form.get("ctaButtonUrl") ?? "").trim();
    const templateType = String(form.get("templateType") ?? "promotional");
    const audience = String(form.get("targetAudience") ?? "all");
    const group = String(form.get("targetGroup") ?? "all");

    if (!title) return fail(400, { error: "Judul campaign wajib diisi." });
    if (!subject) return fail(400, { error: "Subject email wajib diisi." });
    if (!body) return fail(400, { error: "Isi email wajib diisi." });
    if (!isTemplateType(templateType)) return fail(400, { error: "Template type tidak valid." });
    if (!isAudience(audience)) return fail(400, { error: "Target audience tidak valid." });

    if (id > 0) {
      const [c] = await db
        .select({ id: emailCampaigns.id, status: emailCampaigns.status })
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, id))
        .limit(1);
      if (!c) return fail(404, { error: "Campaign tidak ditemukan." });
      if (c.status === "sent")
        return fail(400, { error: "Campaign sudah terkirim dan tidak bisa diedit." });

      await db
        .update(emailCampaigns)
        .set({
          title,
          subjectLine: subject,
          emailBody: body,
          ctaButtonText: ctaText || null,
          ctaButtonUrl: ctaUrl || null,
          templateType,
          targetAudience: audience,
          targetGroup: group,
        })
        .where(eq(emailCampaigns.id, id));
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "update_email_campaign",
        entity: "email_campaign",
        entityId: id,
        detail: { title },
        ip: (locals as any).ip,
      });
      return { success: `Campaign "${title}" diperbarui.` };
    }

    await db.insert(emailCampaigns).values({
      title,
      subjectLine: subject,
      emailBody: body,
      ctaButtonText: ctaText || null,
      ctaButtonUrl: ctaUrl || null,
      templateType,
      targetAudience: audience,
      targetGroup: group,
      status: "draft",
      totalRecipients: 0,
      createdBy: Number(locals.user!.id),
    });
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "create_email_campaign",
      entity: "email_campaign",
      detail: { title },
      ip: (locals as any).ip,
    });
    return { success: `Campaign "${title}" dibuat sebagai draft.` };
  },

  send: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("email-send", (locals as any).ip ?? "0.0.0.0", 5, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });

    const [c] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1);
    if (!c) return fail(404, { error: "Campaign tidak ditemukan." });
    if (c.status === "sent") return fail(400, { error: "Campaign sudah terkirim." });
    if (c.status === "cancelled") return fail(400, { error: "Campaign sudah dibatalkan." });

    // Segment penerima — hanya kolom users yang real (Draft PHP pakai kolom
    // email_marketing_opt yang tidak pernah ada di schema, jadi skip).
    const group = c.targetGroup ?? "all";
    const audience = c.targetAudience ?? "all";
    const audienceFilter =
      audience === "active"
        ? sql`u.id IN (SELECT user_id FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))`
        : audience === "inactive"
          ? sql`u.created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY) AND u.id NOT IN (SELECT user_id FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))`
          : audience === "new_user"
            ? sql`u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
            : audience === "high_spender"
              ? sql`u.id IN (SELECT user_id FROM deposits WHERE status='Success' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))`
              : audience === "churn_risk"
                ? sql`u.created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY) AND u.id NOT IN (SELECT user_id FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))`
                : sql`1=1`;

    const recipients = await db.execute(
      sql`SELECT u.id, u.email FROM users u
          WHERE u.verify = 'Yes' AND u.email <> ''
            AND ${group === "all" ? sql`1=1` : sql`u.level = ${group}`}
            AND ${audienceFilter}
          LIMIT 5000`,
    );
    const rows = recipients[0] as unknown as (RowDataPacket & { id: number; email: string })[];
    if (!rows || rows.length === 0)
      return fail(400, { error: "Tidak ada penerima untuk segment ini." });

    const templateData = JSON.stringify({
      subject: c.subjectLine,
      body: c.emailBody,
      cta_text: c.ctaButtonText ?? "",
      cta_url: c.ctaButtonUrl ?? "",
    });

    await db.transaction(async (tx) => {
      for (const r of rows) {
        const [q] = await tx
          .insert(emailQueue)
          .values({
            recipientEmail: String(r.email),
            recipientId: Number(r.id),
            templateName: `campaign-${c.id}`,
            templateData,
            priority: "normal",
            status: "pending",
          })
          .$returningId();
        await tx.insert(emailCampaignTracking).values({
          campaignId: Number(c.id),
          userId: Number(r.id),
          status: "pending",
        });
        await tx.insert(emailCampaignLog).values({
          userId: Number(r.id),
          campaignType: `campaign_${c.id}`,
          queueId: Number(q?.id ?? 0),
          emailSent: "pending",
        });
      }
      await tx
        .update(emailCampaigns)
        .set({ status: "sent", sentAt: new Date(), totalRecipients: rows.length })
        .where(eq(emailCampaigns.id, Number(c.id)));
    });

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "send_email_campaign",
      entity: "email_campaign",
      entityId: id,
      detail: {
        title: c.title,
        recipients: rows.length,
        audience: c.targetAudience,
        group: c.targetGroup,
      },
      ip: (locals as any).ip,
    });
    return { success: `Campaign "${c.title}" di-queue untuk ${rows.length} penerima.` };
  },

  cancel: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("email-cancel", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });
    const [c] = await db
      .select({ id: emailCampaigns.id, title: emailCampaigns.title, status: emailCampaigns.status })
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id))
      .limit(1);
    if (!c) return fail(404, { error: "Campaign tidak ditemukan." });
    if (c.status === "sent") return fail(400, { error: "Campaign sudah terkirim." });

    await db.update(emailCampaigns).set({ status: "cancelled" }).where(eq(emailCampaigns.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "cancel_email_campaign",
      entity: "email_campaign",
      entityId: id,
      detail: { title: c.title },
      ip: (locals as any).ip,
    });
    return { success: `Campaign "${c.title}" dibatalkan.` };
  },

  delete: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("email-delete", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });
    const [c] = await db
      .select({ id: emailCampaigns.id, title: emailCampaigns.title, status: emailCampaigns.status })
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id))
      .limit(1);
    if (!c) return fail(404, { error: "Campaign tidak ditemukan." });
    if (c.status === "sent")
      return fail(400, { error: "Campaign terkirim tidak bisa dihapus (audit trail)." });

    await db.delete(emailCampaignTracking).where(eq(emailCampaignTracking.campaignId, id));
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "delete_email_campaign",
      entity: "email_campaign",
      entityId: id,
      detail: { title: c.title },
      ip: (locals as any).ip,
    });
    return { success: `Campaign "${c.title}" dihapus.` };
  },
};
