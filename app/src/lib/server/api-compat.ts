/**
 * API publik kompatibel SMMturk — helper PURE (tanpa DB) untuk mapping format,
 * batch id, status enum, gate level. Dipisah supaya bisa di-unit-test offline
 * (api/v1 adalah modul DB-heavy). Lihat app/src/routes/api/v1/+server.ts.
 * Port socio.my (Socio Reseller API) — mata uang IDR (rupiah integer).
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** Mata uang panel .id (SMMturk pakai USD; socio pakai IDR — format sama, unit rupiah). */
export const API_CURRENCY = "IDR";

/** Keputusan owner: akses API hanya Reseller + Agen (model wholesale/agen). */
export const API_ALLOWED_LEVELS = ["Reseller", "Agen"];

/** Batas batch id (orders/refills) mengikuti docs SMMturk. */
export const API_MAX_BATCH = 100;

export function isApiLevelAllowed(level: string | null | undefined): boolean {
  return API_ALLOWED_LEVELS.includes(level ?? "");
}

/** Status socio → enum SMMturk (Success→Completed; Refilling/Canceling→proses). */
export function mapOrderStatus(s: string): string {
  if (s === "Success") return "Completed";
  if (s === "Refilling") return "In progress";
  if (s === "Canceling") return "Processing";
  return s;
}

/** Parse daftar id koma → unik, trim, buang kosong, batas API_MAX_BATCH. */
export function parseBatchIds(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, API_MAX_BATCH);
}

/** Pesan error cancel sesuai reason requestOrderCancel (format SMMturk, Inggris). */
export function cancelReasonMessage(reason: string): string {
  switch (reason) {
    case "not_found":
      return "Incorrect order ID";
    case "not_supported":
      return "Cancel not available for this service";
    case "not_cancelable":
      return "Order cannot be canceled in its current status";
    case "already":
      return "Cancel already requested";
    case "rejected":
      return "Provider rejected the cancel request";
    case "unreachable":
      return "Provider unreachable, try again later";
    default:
      return "Cancel failed";
  }
}

/** Enum status yang ditampilkan API (output mapOrderStatus) — bisa jadi filter `orders`. */
export const API_ORDER_STATUSES = [
  "Pending",
  "Processing",
  "In progress",
  "Completed",
  "Partial",
  "Canceled",
  "Error",
];

/**
 * Balikan mapOrderStatus untuk filter `orders`: satu status API bisa memetakan
 * beberapa status socio (In progress ← In progress/Refilling; Processing ←
 * Processing/Canceling). Return null kalau status tidak dikenal (filter ditolak).
 */
export function socioStatusesForApiFilter(apiStatus: string): string[] | null {
  switch (apiStatus) {
    case "Pending":
      return ["Pending"];
    case "Processing":
      return ["Processing", "Canceling"];
    case "In progress":
      return ["In progress", "Refilling"];
    case "Completed":
      return ["Success"];
    case "Partial":
      return ["Partial"];
    case "Canceled":
      return ["Canceled"];
    case "Error":
      return ["Error"];
    default:
      return null;
  }
}

/** Batas limit history `orders`: default 50, maks 100, minimum 1 (integer). */
export function clampHistoryLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(100, Math.floor(n));
}

/** Normalisasi idempotency_key: trim, batas 100 char; null kalau kosong/tidak ada. */
export function normalizeIdempotencyKey(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.slice(0, 100);
}

/**
 * Parse `orders` untuk bulk_add: JSON array objek, batas API_MAX_BATCH. Return items
 * (mentah; validasi per-item dilakukan handler) atau error format SMMturk.
 */
export function parseBulkOrders(
  raw: unknown,
): { ok: true; items: Record<string, string>[] } | { ok: false; error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, error: "Missing orders (JSON array)" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return { ok: false, error: "Invalid orders JSON" };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "orders must be a JSON array" };
  if (parsed.length === 0) return { ok: false, error: "orders array is empty" };
  if (parsed.length > API_MAX_BATCH)
    return { ok: false, error: `Max ${API_MAX_BATCH} orders per bulk request` };
  return { ok: true, items: parsed as Record<string, string>[] };
}

/**
 * Cek apakah sebuah IP literal = private/loopback/link-local/CGNAT/multicast/reserved
 * (atau IPv4-mapped IPv6 yang membungkus IP tersebut). Dipakai SSRF guard webhook.
 * Konservatif: string yang bukan IP literal valid → true (blokir). Nama domain BUKAN
 * IP literal — caller (isSafeWebhookUrl) hanya memanggil ini untuk host IP, dan worker
 * memanggilnya untuk SETIAP alamat hasil resolve DNS (mitigasi DNS rebinding).
 */
export function isPrivateOrLocalIp(ipRaw: string): boolean {
  const ip = String(ipRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (!ip) return true;
  // IPv4-mapped IPv6: ::ffff:1.2.3.4 atau ::ffff:7f00:1 → ekstrak IPv4 tersemat.
  const mapped = ip.match(/^::ffff:(.+)$/);
  if (mapped) {
    const rest = mapped[1];
    if (/^\d+\.\d+\.\d+\.\d+$/.test(rest)) return isPrivateOrLocalIp(rest);
    const hex = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const a = parseInt(hex[1], 16);
      const b = parseInt(hex[2], 16);
      return isPrivateOrLocalIp(`${(a >> 8) & 255}.${a & 255}.${(b >> 8) & 255}.${b & 255}`);
    }
    return true;
  }
  if (ip.includes(":")) {
    if (ip === "::1" || ip === "::") return true;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // ULA fc00::/7
    if (/^fe[89ab]/.test(ip)) return true; // link-local fe80::/10
    if (/^fe[cdef]/.test(ip)) return true; // site-local fec0::/10 (deprecated)
    if (ip.startsWith("2001:db8")) return true; // documentation
    return false;
  }
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return true;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a === 198 && b === 51) return true; // TEST-NET-2
  if (a === 203 && b === 0) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

/**
 * SSRF guard webhook URL (diperketat audit Susulan 50): wajib https + hostname publik.
 * Blokir localhost/.local/.internal + SEMUA IP literal private/loopback/link-local/CGNAT/
 * multicast, termasuk IPv4-mapped IPv6 (::ffff:127.0.0.1 / ::ffff:7f00:1). Nama domain
 * lolos cek string ini tetapi WAJIB lolos resolve DNS publik di setUserWebhook + worker
 * (hostResolvesPublic) sebelum di-fetch — mitigasi DNS rebinding.
 */
export function isSafeWebhookUrl(raw: unknown): boolean {
  let u: URL;
  try {
    u = new URL(String(raw ?? "").trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal"))
    return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    return !isPrivateOrLocalIp(host);
  }
  return true;
}

/** HMAC-SHA256 hex payload webhook (header X-Socio-Signature). */
export function webhookSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Backoff retry webhook sesuai attempts: 1m,5m,30m,2h,6h (cap). */
export function webhookBackoffMs(attempts: number): number {
  const steps = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000];
  return steps[Math.min(Math.max(attempts, 0), steps.length - 1)];
}

/**
 * Canonical string untuk HMAC request (Susulan 50): semua param kecuali `signature`,
 * diurutkan sesuai key, digabung `key=value` dengan `&`. Key DAN nilai di-urlencode
 * (encodeURIComponent) supaya nilai yang mengandung `&`/`=` tidak menimbulkan collision
 * canonical (mis. {a:"1&b=2"} vs {a:"1",b:"2"} kini berbeda). `timestamp` ikut masuk
 * kalau ada. Klien SDK harus pakai aturan yang sama.
 */
export function canonicalSignString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => k !== "signature")
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? "")}`)
    .join("&");
}

/** Perbandingan hex constant-time (hindari timing attack). Panjang beda → false. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(String(a ?? ""), "utf8");
  const bb = Buffer.from(String(b ?? ""), "utf8");
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verifikasi HMAC request (diperketat Susulan 50). Return error atau null (lolos).
 * - apiSecret kosong → auth key polos (backward compatible), lolos.
 * - apiSecret ADA → signature WAJIB (sebelumnya bisa dihilangkan kalau apiSignRequired=false;
 *   itu bypass — pencuri key cukup buang signature). Kini secret ada = wajib sign.
 * - signature ada → wajib timestamp dalam ±300s (anti-replay sebagian; nonce penuh di
 *   handler via api_replay) + HMAC cocok (constant-time).
 */
export function checkApiSignature(
  cfg: { apiSecret: string; apiSignRequired: boolean },
  params: Record<string, string>,
  nowMs: number = Date.now(),
): string | null {
  if (!cfg.apiSecret) return null;
  const sig = String(params["signature"] ?? "");
  if (!sig) return "Signature required (api_secret is set for this account)";
  const ts = Number(params["timestamp"]);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > 300)
    return "Invalid or expired timestamp";
  const expected = webhookSignature(canonicalSignString(params), cfg.apiSecret);
  if (!timingSafeEqualHex(sig, expected)) return "Invalid signature";
  return null;
}

/** Mode sandbox: dry-run tanpa deduct/provider/DB. */
export function isSandbox(form: Record<string, string>): boolean {
  const v = String(form["sandbox"] ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** OID sandbox palsu (prefix SBX- supaya status bisa simulasi tanpa DB). */
export function sandboxOrderId(): string {
  return `SBX-${Date.now()}${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
}

export function isSandboxOrderId(oid: string): boolean {
  return String(oid ?? "").startsWith("SBX-");
}

/** Validasi nominal deposit API (rupiah integer). Pesan error protokol = Inggris. */
export function depositAmountError(amountRaw: unknown, min: number, max: number): string | null {
  const amount = Math.round(Number(amountRaw));
  if (!Number.isFinite(amount) || amount <= 0) return "Invalid amount. Provide amount in IDR.";
  if (amount < min) return `Minimum top up is Rp${min}.`;
  if (amount > max) return `Maximum top up is Rp${max}.`;
  return null;
}

/** Bisa tarik komisi kalau pending ≥ minimum dan tidak ada permintaan berjalan. */
export function affiliateCanWithdraw(pending: number, requested: number, min: number): boolean {
  return pending >= min && requested === 0;
}
