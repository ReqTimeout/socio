import { json } from "@sveltejs/kit";
import crypto from "node:crypto";
import { db } from "@socio/db";
import { deposits, users, balanceLogs } from "@socio/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/**
 * Tripay payment callback. Verifies the callback signature, then credits the
 * user's balance when a deposit is paid. Signature = sha256(merchant_ref + private_key).
 */
export const POST: RequestHandler = async ({ request }) => {
  const raw = await request.text();
  const privateKey = process.env.SOCIO_TRIPAY_PRIVATE_KEY;
  if (!privateKey) return json({ success: false, message: "not configured" }, { status: 500 });

  const signature = request.headers.get("x-callback-signature");
  const expected = crypto.createHmac("sha256", privateKey).update(raw).digest("hex");
  if (signature !== expected) return json({ success: false, message: "invalid signature" }, { status: 403 });

  const body = JSON.parse(raw);
  const merchantRef = body.merchant_ref ?? body.reference;
  const status = body.status; // PAID / EXPIRED / FAILED

  const [dep] = await db
    .select()
    .from(deposits)
    .where(and(eq(deposits.idPm, merchantRef), eq(deposits.status, "Pending")))
    .limit(1);
  if (!dep) return json({ success: true });

  if (status === "PAID") {
    await db.update(deposits).set({ status: "Success" }).where(eq(deposits.id, dep.id));
    const [u] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, dep.userId)).limit(1);
    const newBal = Number(u?.balance ?? 0) + Number(dep.amount);
    await db.update(users).set({ balance: newBal }).where(eq(users.id, dep.userId));
    await db.insert(balanceLogs).values({
      userId: dep.userId,
      type: "dep",
      amount: Number(dep.amount),
      note: `Deposit Tripay #${dep.id}`,
      createdAt: new Date(),
    });
  } else if (status === "EXPIRED" || status === "FAILED") {
    await db.update(deposits).set({ status: "Canceled" }).where(eq(deposits.id, dep.id));
  }

  return json({ success: true });
};
