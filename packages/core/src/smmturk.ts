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
): Promise<any> {
  const body = new URLSearchParams({ key: getApiKey(), ...params });
  const res = await fetch(SMMTURK_ENDPOINT, {
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
  if (json.error) throw new Error(`SMMturk error: ${JSON.stringify(json.error)}`);
  return json;
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

export async function smmturkStatus(
  orders: string[],
): Promise<SmmturkStatusResult> {
  const json = await postForm({ action: "status", orders: orders.join(",") });
  return json as SmmturkStatusResult;
}

export async function smmturkRefill(ids: string[]): Promise<any> {
  return postForm({ action: "refill", orders: ids.join(",") });
}

export async function smmturkCancel(ids: string[]): Promise<any> {
  return postForm({ action: "cancel", orders: ids.join(",") });
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
