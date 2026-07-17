import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { desc, eq } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const rows = await db
    .select({
      id: deposits.id,
      userId: deposits.userId,
      amount: deposits.amount,
      methodName: deposits.methodName,
      status: deposits.status,
      createdAt: deposits.createdAt,
    })
    .from(deposits)
    .orderBy(desc(deposits.id))
    .limit(30);
  return { deposits: rows };
};

export const actions: Actions = {
  confirm: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    const [d] = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
    if (!d) return fail(404, { error: "Deposit tidak ditemukan." });
    if (d.status === "Success") return fail(400, { error: "Sudah dikonfirmasi." });

    await db.update(deposits).set({ status: "Success" }).where(eq(deposits.id, id));
    if (d.userId) {
      await db.execute(
        `UPDATE users SET balance = balance + ${Number(d.amount)} WHERE id = ${Number(d.userId)}`,
      );
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "confirm_deposit",
      entity: "deposit",
      entityId: id,
      detail: { amount: Number(d.amount), method: d.methodName },
      ip: (locals as any).ip,
    });
    return { success: `Deposit #${id} dikonfirmasi.` };
  },
  reject: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    await db.update(deposits).set({ status: "Canceled" }).where(eq(deposits.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "reject_deposit",
      entity: "deposit",
      entityId: id,
      ip: (locals as any).ip,
    });
    return { success: `Deposit #${id} ditolak.` };
  },
};
