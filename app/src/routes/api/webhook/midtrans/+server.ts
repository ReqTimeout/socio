import { json } from "@sveltejs/kit";
import crypto from "node:crypto";
import { db } from "@socio/db";
import { deposits, users, balanceLogs } from "@socio/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/**
 * Midtrans payment notification. Verifies signature_key then credits balance.
 * signature = sha512(order_id + status + gross_amount + server_key)
 */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return json({ status: "error" }, { status: 500 });

  const orderId = String(body.order_id ?? "");
  const status = String(body.transaction_status ?? "");
  const amount = String(body.gross_amount ?? "");
  const expected = crypto
    .createHash("sha512")
    .update(orderId + status + amount + serverKey)
    .digest("hex");
  if (expected !== body.signature_key) return json({ status: "invalid signature" }, { status: 403 });

  const [dep] = await db
    .select()
    .from(deposits)
    .where(and(eq(deposits.idPm, orderId), eq(deposits.status, "Pending")))
    .limit(1);
  if (!dep) return json({ status: "ok" });

  const paid = status === "settlement" || status === "capture";
  const failed = status === "expire" || status === "cancel" || status === "deny" || status === "failure";

  if (paid) {
    await db.update(deposits).set({ status: "Success" }).where(eq(deposits.id, dep.id));
    const [u] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, dep.userId)).limit(1);
    const newBal = Number(u?.balance ?? 0) + Number(dep.amount);
    await db.update(users).set({ balance: newBal }).where(eq(users.id, dep.userId));
    await db.insert(balanceLogs).values({
      userId: dep.userId,
      type: "dep",
      amount: Number(dep.amount),
      note: `Deposit Midtrans #${dep.id}`,
      createdAt: new Date(),
    });
  } else if (failed) {
    await db.update(deposits).set({ status: "Canceled" }).where(eq(deposits.id, dep.id));
  }

  return json({ status: "ok" });
};
