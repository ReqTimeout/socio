import { writable } from "svelte/store";

export type ToastKind = "success" | "error" | "info";
export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export const toasts = writable<ToastItem[]>([]);

let counter = 0;
export function toast(
  message: string,
  kind: ToastKind = "info",
  timeout = 3000,
) {
  const id = ++counter;
  toasts.update((t) => [...t, { id, message, kind }]);
  setTimeout(() => {
    toasts.update((t) => t.filter((x) => x.id !== id));
  }, timeout);
  return id;
}

/**
 * Extracts a human message from a SvelteKit form action result.data
 * because SvelteKit serializes action return values with devalue, so
 * `result.data` is often `[obj, str]` array, not a plain object.
 *
 * @example
 *   extractActionMsg(result.data) ?? "Selesai";
 */
export function extractActionMsg(d: unknown): string | undefined {
  // SvelteKit devalue can produce "[{\"success\":1},\"msg\"]" string or [obj, str] array.
  if (d == null) return undefined;
  if (typeof d === "string") {
    const s = d as string;
    // devalue array encoded as JSON string: "[{\"success\":1},\"msg\"]"
    if (s.startsWith("[") && (s.includes("success") || s.includes("error"))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const obj = (parsed as any[]).find(
            (x) =>
              x &&
              typeof x === "object" &&
              ((x as any).success != null ||
                (x as any).error != null ||
                (x as any).message != null),
          );
          const str = (parsed as any[]).find((x) => typeof x === "string");
          if (obj) {
            const v = ((obj as any).success ??
              (obj as any).error ??
              (obj as any).message) as unknown;
            if ((v === 1 || v == null) && typeof str === "string") return str;
            if (v != null && v !== 1) return String(v);
          }
          if (typeof str === "string") return str;
        }
      } catch {}
    }
    return s;
  }
  if (Array.isArray(d)) {
    const obj = (d as any[]).find(
      (x) =>
        x &&
        typeof x === "object" &&
        (x.success != null || x.error != null || (x as any).message != null),
    );
    const str = (d as any[]).find((x) => typeof x === "string");
    if (obj) {
      const v = ((obj as any).success ??
        (obj as any).error ??
        (obj as any).message) as unknown;
      if ((v === 1 || v == null) && typeof str === "string") return str;
      if (v != null && v !== 1) return String(v);
      if (typeof str === "string") return str;
    }
    return typeof str === "string" ? str : undefined;
  }
  if (typeof d === "object") {
    const o = d as { success?: unknown; error?: unknown; message?: unknown };
    const v = (o.success ?? o.error ?? o.message) as unknown;
    return v != null ? String(v) : undefined;
  }
  return undefined;
}
