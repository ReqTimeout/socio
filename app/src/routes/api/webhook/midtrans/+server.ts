import { json } from "@sveltejs/kit";
import crypto from "node:crypto";
import { db } from "@socio/db";
import { deposits, users, balanceLogs } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "$lib/server/notification";
import { creditAffiliateCommission } from "$lib/server/affiliate";
import type { RequestHandler } from "./$types";

/**
 * Midtrans payment notification. Verifies signature_key then credits balance.
 * signature = sha512(order_id + status + gross_amount + server_key)
 *
 * P0-5 audit fix:
 *  - Idempotency: hanya deposit Pending yang diproses; status di-UPDATE dgn
 *    guard `status='Pending'` sehingga settlement+capture concurrent tidak
 *    bisa double-credit (user yang sama, 2 webhook paralel).
 *  - `gross_amount` di-cross-check dgn `post_amount` sebelum kredit.
 *  - Kredit saldo atomik (`balance = balance + x`), bukan read-then-write.
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
  if (expected !== body.signature_key)
    return json({ status: "invalid signature" }, { status: 403 });

  const [dep] = await db.select().from(deposits).where(eq(deposits.idPm, orderId)).limit(1);
  if (!dep) return json({ status: "ok" });

  const paid = status === "settlement" || status === "capture";
  const failed =
    status === "expire" || status === "cancel" || status === "deny" || status === "failure";

  if (paid) {
    // Validasi nominal webhook vs yang diminta di invoice (tolak manipulasi gross_amount)
    const paidAmount = Math.round(Number(amount));
    if (paidAmount !== Math.round(Number(dep.postAmount || dep.amount))) {
      return json({ status: "amount mismatch", accepted: true }, { status: 200 });
    }

    // Claim atomik: hanya 1 webhook yang bisa flip Pending→Success (idempotency).
    // Settle terlambat setelah Canceled/expire juga ditolak — uang harus reconcile manual.
    const res = await db
      .update(deposits)
      .set({ status: "Success" })
      .where(and(eq(deposits.id, dep.id), eq(deposits.status, "Pending")));
    const claimed = getAffectedRows(res);
    if (claimed === 0) return json({ status: "already processed" });

    await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${Number(dep.amount)}` })
      .where(eq(users.id, dep.userId));
    await db.insert(balanceLogs).values({
      userId: dep.userId,
      type: "dep",
      amount: Number(dep.amount),
      note: `Deposit Midtrans #${dep.id}`,
      createdAt: new Date(),
    });

    if (dep.untukApa === "reseller") {
      const { activateReseller } = await import("$lib/server/signup");
      await activateReseller(dep.userId).catch((e) =>
        console.error("[midtrans] activateReseller failed:", e),
      );
    } else {
      await creditAffiliateCommission(dep.userId, Number(dep.amount), dep.untukApa);
    }

    await createNotification(
      dep.userId,
      "Deposit berhasil",
      `Saldo Rp${Number(dep.amount).toLocaleString("id-ID")} telah ditambahkan.`,
      "deposit",
    );
  } else if (failed) {
    await db
      .update(deposits)
      .set({ status: "Canceled" })
      .where(and(eq(deposits.id, dep.id), eq(deposits.status, "Pending")));
  }

  return json({ status: "ok" });
};

/** affectedRows dari hasil update MySQL (dialek mysql2 pool/drizzle). */
function getAffectedRows(res: unknown): number {
  const rows: any = res;
  if (Array.isArray(rows) && typeof rows[0]?.affectedRows === "number") return rows[0].affectedRows;
  return Number(rows?.affectedRows ?? 1);
}
