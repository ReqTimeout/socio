import { writable } from "svelte/store";

export type ToastKind = "success" | "error" | "info";
export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export const toasts = writable<ToastItem[]>([]);

let counter = 0;
export function toast(message: string, kind: ToastKind = "info", timeout = 3000) {
  const id = ++counter;
  toasts.update((t) => [...t, { id, message, kind }]);
  setTimeout(() => {
    toasts.update((t) => t.filter((x) => x.id !== id));
  }, timeout);
  return id;
}
