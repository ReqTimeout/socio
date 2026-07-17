import { db } from "@socio/db";
import { affiliate, users } from "@socio/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import QRCode from "qrcode";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  const userId = Number(locals.user.id);
  const base = process.env.SOCIO_APP_URL ?? "https://app.socio.id";

  const [row] = await db.select().from(affiliate).where(eq(affiliate.userId, userId)).limit(1);
  const [{ downline }] = await db
    .select({ downline: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.upLink, String(locals.user!.username)));

  const code = (locals.user as any).reffKode ?? userId;
  const refLink = `${base}/daftar?ref=${code}`;
  const qr = await QRCode.toDataURL(refLink, { margin: 1, width: 240 });

  return {
    commission: row?.balance ?? 0,
    downline: Number(downline),
    refLink,
    code: String(code),
    qr,
  };
};
