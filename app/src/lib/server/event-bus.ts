/**
 * In-memory event bus — single-process pub/sub for SSE.
 * Used by P3-09 activity feed to push feed updates without polling-only.
 */
type Listener = (payload: any) => void;

class EventBus {
  private subs = new Set<Listener>();
  emit(event: string, payload: any) {
    const msg = { event, data: payload, at: new Date().toISOString() };
    for (const cb of this.subs) {
      try {
        cb(msg);
      } catch {}
    }
  }
  subscribe(cb: Listener): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  get count() {
    return this.subs.size;
  }
}

export const eventBus = new EventBus();

/** Helper to emit activity feed events from admin actions / cron */
export function emitActivity(
  kind: "order" | "deposit" | "user" | "audit",
  title: string,
  meta: string,
  opts: { href?: string; status?: string | null } = {},
) {
  eventBus.emit("activity", {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    title,
    meta,
    href: opts.href ?? "/admin",
    status: opts.status ?? null,
    at: new Date().toISOString(),
  });
}
