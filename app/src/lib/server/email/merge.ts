/**
 * Merge tags personalisasi email.
 *
 * Token yang didukung (kurung kurawal ganda):
 *   {{greeting}} {{fullName}} {{username}} {{level}} {{balance}} {{saldoFormatted}}
 *   {{lastOrderDays}} {{topService}} {{city}} {{couponCode}} {{referralCode}}
 *
 * Aturan keras:
 * - Nilai kosong → fallback wajar, JANGAN biarkan tag mentah lolos.
 * - Setelah render, pindai sisa `{{...}}` — kalau masih ada, GAGALKAN kirim.
 * - Semua nilai dari DB di-escape HTML (anti XSS ke body email).
 */

export interface MergeContext {
  fullName?: string | null;
  username?: string | null;
  level?: string | null;
  balance?: number | null;
  lastOrderDays?: number | null;
  topService?: string | null;
  city?: string | null;
  couponCode?: string | null;
  referralCode?: string | null;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function idr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "Rp0";
  return "Rp" + Math.round(Number(n)).toLocaleString("id-ID");
}

const FALLBACKS: Record<string, (c: MergeContext) => string> = {
  // Sapaan lengkap — pakai ini, JANGAN tulis "Halo {{fullName}}," manual
  // (kalau nama kosong akan jadi "Halo Halo,").
  greeting: (c) => {
    const first = (c.fullName || "").trim().split(/\s+/)[0] || "";
    return first ? `Halo ${first},` : "Halo,";
  },
  fullName: (c) => (c.fullName || "").trim() || "Pelanggan Socio.id",
  username: (c) => (c.username || "").trim() || "member",
  level: (c) => (c.level || "").trim() || "Member",
  balance: (c) => String(Math.max(0, Math.round(Number(c.balance ?? 0)) || 0)),
  saldoFormatted: (c) => idr(c.balance),
  lastOrderDays: (c) =>
    c.lastOrderDays === null || c.lastOrderDays === undefined
      ? "beberapa waktu lalu"
      : `${c.lastOrderDays} hari lalu`,
  topService: (c) => (c.topService || "").trim() || "layanan favoritmu",
  city: (c) => (c.city || "").trim() || "kotamu",
  couponCode: (c) => (c.couponCode || "").trim(),
  referralCode: (c) => (c.referralCode || "").trim(),
};

/**
 * Render template + guard anti-bocor.
 * @throws Error bila masih ada tag `{{...}}` tersisa setelah render.
 */
export function renderMergeTags(template: string, ctx: MergeContext): string {
  let out = String(template ?? "");
  for (const [key, fn] of Object.entries(FALLBACKS)) {
    out = out.split(`{{${key}}}`).join(esc(fn(ctx)));
  }
  const leftover = out.match(/\{\{[a-zA-Z]+\}\}/);
  if (leftover) {
    throw new Error(
      `Merge tag mentah bocor ke email: ${leftover[0]}. Gagal kirim — perbaiki template/caller.`,
    );
  }
  return out;
}

/** Daftar tag valid (untuk validasi template di admin sebelum simpan). */
export function validMergeTags(): string[] {
  return Object.keys(FALLBACKS);
}
