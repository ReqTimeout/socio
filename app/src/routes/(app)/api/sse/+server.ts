import { db } from "@socio/db";
import { orders } from "@socio/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return new Response("Unauthorized", { status: 401 });
  const userId = Number(locals.user.id);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      let lastSig = "";
      const tick = async () => {
        const rows = await db
          .select({ id: orders.id, status: orders.status, startCount: orders.startCount })
          .from(orders)
          .where(eq(orders.userId, userId))
          .limit(30);
        const sig = rows.map((r) => `${r.id}:${r.status}:${r.startCount}`).join("|");
        if (sig !== lastSig) {
          lastSig = sig;
          send("orders", rows);
        }
      };

      send("ready", { ok: true });
      await tick();
      const timer = setInterval(tick, 10000);

      const ping = setInterval(() => controller.enqueue(enc.encode(": ping\n\n")), 25000);

      // @ts-expect-error close handled by client abort
      controller.signal?.addEventListener?.("abort", () => {
        clearInterval(timer);
        clearInterval(ping);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
