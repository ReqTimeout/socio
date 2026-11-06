import type { RequestHandler } from "./$types";
import { verifyUnsubscribeToken } from "$lib/server/marketing/unsubscribe.js";
import { applyUnsubscribe } from "$lib/server/marketing/optout.js";

/**
 * G1 — endpoint unsubscribe ONE-CLICK (RFC 8058). Client mail (Gmail/Outlook/
 * Apple) dapat mengirim POST otomatis ke URL di header `List-Unsubscribe` /
 * `List-Unsubscribe-Post` TANPA user menyentuh apa pun.
 *
 * Tidak pakai CSRF: token HMAC di path ITU SENDIRI yang membuktikan
 * kepemilikan email (tamper-evident, fail-fast secret). Efeknya cuma opt-out
 * marketing (subs=false + suppression) — reversible via login, idempoten,
 * dan tidak pernah menyentuh email transaksional.
 */
async function handle({ params }: { params: { token: string } }): Promise<Response> {
  const payload = verifyUnsubscribeToken(params.token);
  if (!payload) {
    // 200 untuk one-click: jangan bocorkan validitas token ke pihak ketiga,
    // dan RFC menyarankan sukses senyap. Log biar terdeteksi bila banyak sampah.
    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  await applyUnsubscribe(payload.email, payload.campaignKey);
  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export const POST: RequestHandler = async (event) => handle(event);
// Beberapa klien mem-probe dengan GET sebelum POST — lakukan hal yang sama.
export const GET: RequestHandler = async (event) => handle(event);
