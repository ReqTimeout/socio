import { json } from "@sveltejs/kit";
import { db } from "@socio/db";
import { deposits, users, balanceLogs } from "@socio/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/**
 * Jasamutasi bank mutation callback. Receives JSON:
 *   { bank: "BCA"|"MANDIRI"|..., data: [{ type: "Credit"|"Debit", amount, description, ... }] }
 * Credits balance for matching pending deposits (matched by post_amount + validasi=bank).
 * Secured by IP allowlist (Jasamutasi server IPs) + optional API signature.
 */
const ALLOWED_IPS = [
  "154.26.128.137",
  // add more Jasamutasi IPs as documented
];

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const ip = getClientAddress();
  const sig = request.headers.get("api-signature");
  const expectedSig = process.env.JASAMUTASI_API_KEY;

  // auth: either IP allowlist or API signature
  const ipOk = ALLOWED_IPS.includes(ip);
  const sigOk = expectedSig && sig === expectedSig;
  if (!ipOk && !sigOk) {
    return json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const bank = String(body.bank ?? "").toUpperCase();
  const entries: any[] = Array.isArray(body.data) ? body.data : [];

  let credited = 0;
  for (const entry of entries) {
    if (entry.type !== "credit" && entry.type !== "Credit") continue;
    const amount = Math.ceil(Number(entry.amount));
    if (!amount || amount <= 0) continue;

    // find matching pending deposit (unique amount + bank + pending)
    const [dep] = await db
      .select()
      .from(deposits)
      .where(
        and(
          eq(deposits.status, "Pending"),
          eq(deposits.validasi, bank),
          eq(deposits.postAmount, amount),
        ),
      )
      .limit(1);
    if (!dep) continue;

    // credit balance
    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, dep.userId))
      .limit(1);
    const newBal = Number(u?.balance ?? 0) + Number(dep.amount);
    await db.update(users).set({ balance: newBal }).where(eq(users.id, dep.userId));
    await db.update(deposits).set({ status: "Success" }).where(eq(deposits.id, dep.id));
    await db.insert(balanceLogs).values({
      userId: dep.userId,
      type: "dep",
      amount: Number(dep.amount),
      note: `Deposit ${bank} (Jasamutasi) #${dep.id}`,
      createdAt: new Date(),
    });
    credited++;
  }

  return json({ ok: true, credited });
};
