const SMMTURK_ENDPOINT = "https://smmturk.org/api/v2";
const MAX_CONCURRENT = 10;
const REQUEST_DELAY_MS = 100;

export interface SmmturkService {
  service: string;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean | string;
  cancel: boolean | string;
}

export interface SmmturkOrderResult {
  order?: string;
  error?: string;
}

export interface SmmturkStatusResult {
  [key: string]:
    | {
        status?: string;
        start_count?: number | string;
        remains?: number | string;
        currency?: string;
      }
    | string
    | undefined;
}

function getApiKey(): string {
  const key = process.env.SOCIO_SMMTURK_KEY;
  if (!key) throw new Error("SOCIO_SMMTURK_KEY is not set");
  return key;
}

async function postForm(
  params: Record<string, string>,
  endpoint = SMMTURK_ENDPOINT,
  key = getApiKey(),
): Promise<any> {
  const body = new URLSearchParams({ key, ...params });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`SMMturk non-JSON response: ${text.slice(0, 200)}`);
  }
  if (json.error) throw new Error(`Provider error: ${JSON.stringify(json.error)}`);
  return json;
}

/** Balance untuk provider tertentu (pakai URL + key-nya sendiri). */
export async function smmturkBalanceFor(endpoint: string, key: string): Promise<number> {
  const json = await postForm({ action: "balance" }, endpoint, key);
  return Number(json.balance ?? json.remained ?? 0);
}

/** Services untuk provider tertentu (pakai URL + key-nya sendiri). */
export async function smmturkServicesFor(endpoint: string, key: string): Promise<SmmturkService[]> {
  const json = await postForm({ action: "services" }, endpoint, key);
  return Array.isArray(json) ? (json as SmmturkService[]) : [];
}

export async function smmturkBalance(): Promise<number> {
  const json = await postForm({ action: "balance" });
  return Number(json.balance ?? json.remained ?? 0);
}

export async function smmturkServices(): Promise<SmmturkService[]> {
  const json = await postForm({ action: "services" });
  return Array.isArray(json) ? (json as SmmturkService[]) : [];
}

export async function smmturkAdd(
  service: string,
  link: string,
  quantity: number,
): Promise<SmmturkOrderResult> {
  const json = await postForm({
    action: "add",
    service,
    link,
    quantity: String(quantity),
  });
  if (json.order) return { order: String(json.order) };
  return { error: JSON.stringify(json) };
}

/**
 * Add order ke provider tertentu (pakai URL + key-nya sendiri).
 * B5: params dinamis per `services.type` (docs SMMturk) — Custom Comments
 * (`comments`), Package (tanpa quantity), Subscriptions (tanpa link; +
 * username/min/max/delay), Poll (answer_number), Mentions/Invites/SEO
 * (usernames/hashtag/groups/keywords). `link` opsional: tipe tanpa link
 * (Subscriptions) tidak mengirim param link sama sekali.
 */
export async function smmturkAddFor(
  endpoint: string,
  key: string,
  params: {
    service: string;
    link?: string;
    quantity?: number;
    comments?: string;
    username?: string;
    /** Param tambahan per tipe: usernames/hashtag/groups/answer_number/keywords/min/max/delay. */
    extra?: Record<string, string>;
  },
): Promise<SmmturkOrderResult> {
  const form: Record<string, string> = { action: "add", service: params.service };
  if (params.link) form.link = params.link;
  if (params.comments) form.comments = params.comments;
  else if (params.quantity !== undefined) form.quantity = String(params.quantity);
  if (params.username) form.username = params.username;
  if (params.extra) {
    for (const [k, v] of Object.entries(params.extra)) if (v) form[k] = v;
  }
  try {
    const json = await postForm(form, endpoint, key);
    if (json.order) return { order: String(json.order) };
    return { error: JSON.stringify(json) };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

/** Status order untuk provider tertentu (endpoint + key milik provider tsb). */
export async function smmturkStatusFor(
  endpoint: string,
  key: string,
  orders: string[],
): Promise<SmmturkStatusResult> {
  const json = await postForm({ action: "status", orders: orders.join(",") }, endpoint, key);
  return json as SmmturkStatusResult;
}

/** Status refill (action=refill_status, param refill id). */
export async function smmturkRefillStatusFor(
  endpoint: string,
  key: string,
  refillId: string,
): Promise<{ status?: string; raw?: string }> {
  const json = await postForm({ action: "refill_status", refill: refillId }, endpoint, key);
  return { status: typeof json?.status === "string" ? json.status : undefined, raw: JSON.stringify(json) };
}

export async function smmturkStatus(
  orders: string[],
): Promise<SmmturkStatusResult> {
  const json = await postForm({ action: "status", orders: orders.join(",") });
  return json as SmmturkStatusResult;
}

export async function smmturkRefill(ids: string[]): Promise<any> {
  return postForm({ action: "refill", orders: ids.join(",") });
}

/**
 * Refill untuk provider tertentu (endpoint + key milik provider order tsb).
 * Provider-safe — dipakai helper requestOrderRefill (port .my, Refill Center).
 */
export async function smmturkRefillFor(
  endpoint: string,
  key: string,
  ids: string[],
): Promise<any> {
  return postForm({ action: "refill", orders: ids.join(",") }, endpoint, key);
}

export async function smmturkCancel(ids: string[]): Promise<any> {
  return postForm({ action: "cancel", orders: ids.join(",") });
}

/**
 * Klasifikasi error dari `smmturkCancel`/`smmturkRefill` untuk keputusan refund.
 *
 * `postForm` melempar `Error("Provider error: ...")` bila SMMturk membalas body
 * berisi `error` — artinya provider MENOLAK secara eksplisit (order sudah mulai
 * diproses). Kasus ini caller TIDAK BOLEH refund lokal (kalau iya: Socio bayar
 * provider DAN kembalikan saldo user → rugi ganda). Sebaliknya error lain
 * (network/timeout/non-JSON) = provider tidak terkonfirmasi → caller boleh
 * refund lokal untuk lindungi saldo user.
 *
 * Pure, tanpa DB/network — aman di-unit-test offline.
 */
export function isProviderRejection(e: unknown): boolean {
  const msg = (e as any)?.message;
  return typeof msg === "string" && msg.startsWith("Provider error");
}

/** Simple promise pool with fixed concurrency + inter-request delay. */
export async function withConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = MAX_CONCURRENT,
): Promise<void> {
  let idx = 0;
  const runners: Promise<void>[] = [];
  const next = async () => {
    while (idx < items.length) {
      const cur = items[idx++];
      try {
        await worker(cur);
      } catch (e) {
        console.error("[cron] worker error:", e);
      }
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  };
  for (let i = 0; i < Math.min(concurrency, items.length); i++) runners.push(next());
  await Promise.all(runners);
}

/** Exponential backoff sleep helper. */
export function backoffSleep(attempt: number, baseMs = 60 * 60 * 1000): Promise<void> {
  const ms = Math.min(baseMs * Math.pow(2, attempt), 4 * 60 * 60 * 1000);
  return new Promise((r) => setTimeout(r, ms));
}
