import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { verifyUnsubscribeToken } from "$lib/server/marketing/unsubscribe.js";
import { applyUnsubscribe } from "$lib/server/marketing/optout.js";

/** Mask email untuk tampilan (privasi): a***@dom.com. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1);
  return `${head}${"***"}@${domain}`;
}

export const load: PageServerLoad = async ({ params }) => {
  const payload = verifyUnsubscribeToken(params.token);
  // Token cacat/disalah-tandatangani → 400 ramah (halaman tanpa login, jadi
  // token itu sendiri yang membuktikan kepemilikan email).
  if (!payload) {
    error(400, "Tautan berhenti berlangganan tidak valid atau sudah kedaluwarsa.");
  }
  return { email: payload.email, display: maskEmail(payload.email) };
};

export const actions: Actions = {
  // Form action SvelteKit → sudah CSRF-protected bawaan. Manusia mengklik
  // tombol konfirmasi di halaman; ini BEDA dari endpoint one-click /api/u.
  default: async ({ params, request }) => {
    const payload = verifyUnsubscribeToken(params.token);
    if (!payload) return { ok: false as const };
    const fd = await request.formData();
    if (fd.get("confirm") !== "yes") return { ok: false as const };
    await applyUnsubscribe(payload.email, payload.campaignKey);
    return { ok: true as const };
  },
};
