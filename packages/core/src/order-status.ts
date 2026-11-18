/**
 * Order status helpers (pure, no DB / no framework deps) so they can be
 * unit-tested. Imported by `app/src/cron/status-polling.ts`.
 */

/** Our `orders.status` enum (packages/db/src/schema/orders.ts). */
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Error"
  | "Partial"
  | "Success"
  | "In progress"
  | "Canceled"
  | "Refilling"
  | "Canceling";

/** Statuses that will never change again → stop polling. */
export const FINAL_STATUSES: readonly OrderStatus[] = [
  "Success",
  "Canceled",
  "Partial",
  "Error",
];

export function isFinalStatus(status: string | null | undefined): boolean {
  return !!status && (FINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Status yang BOLEH dimohon cancel (F12). Provider adalah pihak berwenang:
 * kalau order sudah mulai diproses, provider akan MENOLAK dan kita tidak
 * mengubah apa-apa. Sebelumnya user hanya boleh cancel `Pending`, jadi order
 * `In progress` terjebak tanpa jalan keluar (F11).
 */
export const CANCELABLE_STATUS: readonly OrderStatus[] = [
  "Pending",
  "Processing",
  "In progress",
];

export function isCancelableStatus(status: string | null | undefined): boolean {
  return !!status && (CANCELABLE_STATUS as readonly string[]).includes(status);
}

/**
 * `Canceling` = permintaan cancel sudah dikirim ke provider tetapi provider
 * BELUM mengonfirmasi. Bukan final — harus terus di-poll. Uang customer tidak
 * boleh bergerak selama status ini (lihat lib/server/order-cancel.ts).
 */
export function isCancelPending(status: string | null | undefined): boolean {
  return status === "Canceling";
}

/**
 * Status yang berarti order MASIH HIDUP di provider — modal owner sudah dibayar
 * dan provider masih bisa menyelesaikan layanan itu.
 *
 * KENAPA konstanta ini ada (F12/H5): refund manual atas order dalam daftar ini
 * mengembalikan uang customer sementara provider masih menagih modal owner. Itu
 * kerugian owner secara langsung. Setiap pintu refund HARUS memeriksa ini, bukan
 * hanya satu route — kalau tidak, pintu kedua (admin/refunds → approveRefund →
 * executeRefund) membuka kebocoran yang sama walau pintu pertama sudah dijaga.
 *
 * `Canceling` termasuk: permintaan cancel sudah dikirim tetapi provider BELUM
 * mengonfirmasi, jadi modal masih di provider. `Refilling` termasuk: provider
 * sedang mengisi ulang jumlah yang jatuh.
 */
export const LIVE_AT_PROVIDER: readonly OrderStatus[] = [
  "Pending",
  "Processing",
  "In progress",
  "Canceling",
  "Refilling",
];

export function isLiveAtProvider(status: string | null | undefined): boolean {
  return !!status && (LIVE_AT_PROVIDER as readonly string[]).includes(status);
}

/**
 * Map a provider status string to our order status enum.
 *
 * BUG FIX 2026-10-02 — SMMturk returns `"Processing"` for an order that is
 * running. The old substring chain tested `v.includes("progress")`, but
 * `"processing"` does NOT contain `"progress"` (pro-cess-ing), so it fell
 * through every branch and returned `null`. A `null` mapping means the
 * polling loop skips `update.status` entirely → the order stays stuck at
 * whatever it was before (usually `Pending`) even though the provider is
 * processing it. Legacy PHP (`app.socio.id/cron/status.php`) mapped
 * `'Processing' => 'Processing'` explicitly; this port lost that case.
 *
 * Returns `null` only for statuses we genuinely don't recognise — callers
 * must then keep the existing status and NOT overwrite it with garbage.
 */
export function mapProviderStatus(s?: string | null): OrderStatus | null {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  if (!v) return null;

  // Order matters: check the specific/terminal words before the vague ones
  // ("partial" also contains no other key, but "refunded" must not fall into
  // "error" etc.).
  if (v.includes("complete") || v.includes("success")) return "Success";
  if (v.includes("cancel")) {
    // F12/H6 — kata "cancel" TIDAK selalu berarti order SUDAH batal. Panel bisa
    // melaporkan "Canceling"/"Cancelling"/"Cancellation requested" selagi masih
    // memproses permintaan itu, atau "cancel failed" saat MENOLAK batal.
    // Memetakan salah satunya ke `Canceled` (final) akan memicu cron auto-refund
    // padahal provider belum mengonfirmasi → customer dapat uang sementara modal
    // owner masih di provider. Itu kebocoran yang sama lewat pintu polling, bukan
    // pintu cancel.
    //
    // null = "tak dikenali" → poller TETAP pada status sekarang (Canceling) dan
    // terus poll 1 menit. Uang tidak bergerak. Band cancelWatch di /admin/orders
    // memberi tahu owner agar menagih provider.
    if (
      v.includes("canceling") ||
      v.includes("cancelling") ||
      v.includes("cancel pending") ||
      v.includes("cancel in progress") ||
      v.includes("requested") ||
      v.includes("fail")
    )
      return null;
    return "Canceled";
  }
  if (v.includes("partial")) return "Partial";
  if (v.includes("error") || v.includes("fail")) return "Error";
  // "processing" AND "in progress" AND "running" AND "processing/done" variants
  if (v.includes("processing") || v.includes("progress") || v.includes("running"))
    return "In progress";
  if (v.includes("pending") || v.includes("waiting") || v.includes("hold")) return "Pending";

  return null;
}

/**
 * Milliseconds until the next provider poll for a non-final order.
 * Stratified so we don't hammer the API (see REBUILD_PLAN §2.2).
 */
export function nextPollIntervalMs(
  status: string | null | undefined,
  createdAt: Date,
  now: Date = new Date(),
): number {
  const MIN = 60 * 1000;
  if (isFinalStatus(status)) return 0;
  // Cancel menunggu konfirmasi → poll paling rapat supaya refund tidak tertunda.
  if (isCancelPending(status)) return 1 * MIN;
  if (status === "In progress" || status === "Processing") return 5 * MIN;

  const ageMs = now.getTime() - createdAt.getTime();
  const hour = 60 * MIN;
  if (ageMs < hour) return 1 * MIN;
  if (ageMs < 6 * hour) return 5 * MIN;
  return 30 * MIN;
}
