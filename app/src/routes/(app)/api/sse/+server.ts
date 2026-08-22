import { db } from "@socio/db";
import { orders } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return new Response("Unauthorized", { status: 401 });
  const userId = Number(locals.user.id);

  let timer: ReturnType<typeof setInterval> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      // Cleanup runs exactly once; any enqueue after the client disconnects
      // throws ERR_INVALID_STATE, so every write is guarded and triggers cleanup
      // instead of crashing the Node process.
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        if (ping) clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      let lastSig = "";
      const tick = async () => {
        if (closed) return;
        try {
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
        } catch {
          // DB hiccup — keep the stream alive, retry on the next tick.
        }
      };

      // Stop everything when the client navigates away / aborts the request.
      request.signal.addEventListener("abort", cleanup);

      send("ready", { ok: true });
      await tick();
      timer = setInterval(tick, 10000);
      ping = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 25000);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
      if (ping) clearInterval(ping);
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
