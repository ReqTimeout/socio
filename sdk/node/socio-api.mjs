/**
 * Socio Reseller API — client resmi Node.js (SDK Tier 1).
 *
 * Drop-in kompatibel dengan format API panel SMM v2 populer. Khusus akun
 * Reseller / Agen. Mata uang: IDR (rupiah). Tanpa dependensi (fetch native, Node 18+).
 *
 *   import { SocioApi } from "./socio-api.mjs";
 *   const api = new SocioApi("API_KEY_KAMU");
 *   console.log(await api.balance());
 *   const { order } = await api.add({ service: 1234, link: "https://...", quantity: 1000 });
 *   console.log(await api.status(order));
 */

export class SocioApiError extends Error {}

import { createHmac } from "node:crypto";

export class SocioApi {
  constructor(
    apiKey,
    { baseUrl = "https://app.socio.id/api/v1", timeout = 30000, apiSecret = null } = {},
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeout = timeout;
    this.apiSecret = apiSecret; // Tier 3 HMAC: auto-sign kalau diset
  }

  async #call(action, params = {}) {
    const fields = { key: this.apiKey, action };
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") fields[k] = String(v);
    }
    if (this.apiSecret) {
      fields.timestamp = String(Math.floor(Date.now() / 1000));
      // Canonical (Susulan 50): key + value di-urlencode, urut key, buang signature.
      const canonical = Object.keys(fields)
        .filter((k) => k !== "signature")
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(fields[k] ?? "")}`)
        .join("&");
      fields.signature = createHmac("sha256", this.apiSecret).update(canonical).digest("hex");
    }
    const body = new URLSearchParams(fields);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeout);
    let res;
    try {
      res = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
    const json = await res.json();
    if (json && typeof json === "object" && !Array.isArray(json) && "error" in json) {
      throw new SocioApiError(json.error);
    }
    return json;
  }

  services() {
    return this.#call("services");
  }
  balance(sandbox = false) {
    return this.#call("balance", { sandbox: sandbox ? "1" : null });
  }
  profile() {
    return this.#call("profile");
  }

  /** Buat secret HMAC request-signing baru (Tier 3). Return {api_secret, sign_required}. */
  setApiSecret(requireSignature = null) {
    return this.#call("set_api_secret", {
      require_signature: requireSignature === null ? null : requireSignature ? "1" : "0",
    });
  }

  /** Buat order. params = field sesuai tipe layanan. idempotencyKey → retry aman. */
  add(params, idempotencyKey = null) {
    return this.#call("add", { ...params, idempotency_key: idempotencyKey });
  }

  status(order = null, orders = null) {
    if (orders) return this.#call("status", { orders: orders.join(",") });
    return this.#call("status", { order });
  }

  /** Riwayat order. status pakai enum API (Completed, In progress, ...). */
  orders({ status = null, service = null, limit = 50, offset = 0 } = {}) {
    return this.#call("orders", { status, service, limit, offset });
  }

  refill(order = null, orders = null) {
    if (orders) return this.#call("refill", { orders: orders.join(",") });
    return this.#call("refill", { order });
  }

  refillStatus(refill = null, refills = null) {
    if (refills) return this.#call("refill_status", { refills: refills.join(",") });
    return this.#call("refill_status", { refill });
  }

  cancel(orders) {
    return this.#call("cancel", { orders: orders.join(",") });
  }

  /** Buat hingga 100 order dalam 1 request. orders = array objek parameter add.
   *  Return [{order}|{error}] selaras input; item gagal refund sendiri-sendiri. */
  bulkAdd(orders) {
    return this.#call("bulk_add", { orders: JSON.stringify(orders) });
  }

  /** Set URL callback status order (https publik). "" = nonaktif. Return
   *  {webhook_url, webhook_secret, enabled}. Verifikasi HMAC-SHA256(body, secret). */
  setWebhook(url, regenerateSecret = false) {
    return this.#call("set_webhook", { url, regenerate_secret: regenerateSecret ? "1" : null });
  }

  /** Buat invoice top-up manual BCA (pending; admin konfirmasi kredit saldo). */
  deposit(amount) {
    return this.#call("deposit", { amount });
  }
  deposits({ limit = 50, offset = 0 } = {}) {
    return this.#call("deposits", { limit, offset });
  }
  /** Statistik affiliate (read-only). Penarikan tetap di web app. */
  affiliate() {
    return this.#call("affiliate");
  }
}
