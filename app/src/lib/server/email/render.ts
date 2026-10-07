/**
 * Komponen email DNA — SATU-SATUNYA tempat string HTML email boleh tinggal.
 *
 * TEMA = socio.id (landing/src/styles/tokens.css): cyan-teal + mango, header
 * putih + wordmark, CTA accent-ink, Sparko kecil. BUKAN indigo.
 *
 * Aturan:
 * - Table-based, semua style inline. `<style>` hanya untuk dark mode.
 * - Warna HANYA dari `./tokens` (hex literal). Jangan hardcode hex di sini.
 * - Copy teks transaksional yang sudah terbukti TIDAK boleh diubah maknanya.
 * - CTA selalu bulletproof (conditional MSO untuk Outlook).
 */

import { EMAIL_COLORS as C, EMAIL_FONTS as F, EMAIL_LAYOUT as L } from "./tokens.js";

const FONT = F.sans;
const DISPLAY = F.display;

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ShellOpts {
  preheader?: string;
  /** Sub-judul kecil di bawah wordmark. Kosong = hanya wordmark. */
  headerSub?: string;
  content: string;
  footer: string;
  /** HTML setelah kartu (mis. support-line wrapEmail). Di dalam outer td. */
  afterCard?: string;
  /** Lebar kartu. 480 = transaksional, 600 = marketing. */
  maxWidth?: number;
  lang?: string;
  /** Maskot Sparko di atas konten. Lihat panduan pose di SPARKO_README (repo). */
  mascot?: SparkoPose;
}

/** Dokumen email lengkap + blok dark mode. Header PUTIH + wordmark (gaya navbar). */
export function emailShell(o: ShellOpts): string {
  const w = o.maxWidth ?? 480;
  return `<!doctype html><html lang="${o.lang ?? "id"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>@media (prefers-color-scheme: dark){.em-body{background:#07161c !important;}.em-card{background:#0e2129 !important;border-color:#1e3a44 !important;}.em-text{color:#e2e8f0 !important;}.em-muted{color:#94a3b8 !important;}}</style></head>
<body class="em-body" style="margin:0;padding:0;background:${C.bodyBg}">
${o.preheader ? `  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${o.preheader}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.bodyBg};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="em-card" style="max-width:${w}px;background:${C.surface};border-radius:${L.cardRadius}px;overflow:hidden;border:1px solid ${C.borderCard}">
        <tr><td style="background:${C.surface};padding:18px 24px 14px 24px;text-align:center;border-bottom:1px solid ${C.dividerSoft}">
          <div style="font-family:${DISPLAY};font-size:19px;font-weight:800;letter-spacing:-0.02em;color:${C.inkTitle}">socio<span style="color:${C.accentInk}">.id</span></div>${
            o.headerSub
              ? `
          <div style="font-family:${FONT};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${C.inkSecondary};margin-top:3px">${o.headerSub}</div>`
              : ""
          }
        </td></tr>
        <tr><td class="em-text" style="padding:22px 24px;color:${C.inkBody};font-size:14px;line-height:1.7;font-family:${FONT}">
          ${o.mascot ? emailMascot(o.mascot) : ""}${o.content}
        </td></tr>
        ${o.footer}
      </table>${o.afterCard ?? ""}
    </td></tr>
  </table>
</body></html>`;
}

/** Judul + intro. */
export function emailTitleBlock(title: string, intro: string): string {
  return `<div style="padding:2px 0 0 0">
    <h1 style="margin:0;font-family:${DISPLAY};font-size:20px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;color:${C.inkTitle}">${title}</h1>
    <p style="margin:10px 0 0 0;font-family:${FONT};font-size:14px;line-height:1.65;color:${C.inkBody}">${intro}</p>
  </div>`;
}

export interface CtaOpts {
  label: string;
  href: string;
  /** Tambah conditional MSO roundrect untuk Outlook desktop. Default true. */
  mso?: boolean;
}

/** Tombol CTA — fill accent-ink + teks putih (7.17:1). Satu-satunya gaya CTA. */
export function emailCta(o: CtaOpts): string {
  const a = `<a href="${o.href}" style="display:inline-block;background:${C.accentInk};color:${C.ctaText};font-family:${FONT};font-size:15px;font-weight:700;line-height:${L.btnHeight}px;text-align:center;text-decoration:none;border-radius:${L.btnRadius}px;padding:0 32px;min-width:${L.btnMinWidth}px">${o.label}</a>`;
  const inner =
    o.mso === false
      ? a
      : `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${o.href}" style="height:${L.btnHeight}px;v-text-anchor:middle;width:230px" arcsize="50%" strokecolor="${C.accentInk}" fillcolor="${C.accentInk}"><center style="color:${C.ctaText};font-family:sans-serif;font-size:15px;font-weight:700">${o.label}</center></v:roundrect><![endif]--><!--[if !mso]><!-->${a}<!--<![endif]-->`;
  return `<div style="text-align:center;margin:20px 0 4px 0">${inner}</div>`;
}

/** Baris "atau salin link ini" di bawah CTA. */
export function emailCopyLink(href: string, note?: string): string {
  return `<div style="padding:8px 0 4px 0">
    <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.inkSecondary};word-break:break-all">Atau salin link ini: <a href="${href}" style="color:${C.accentInk};text-decoration:underline">${href}</a></p>${
      note
        ? `
    <p style="margin:12px 0 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:${C.inkSecondary}">${note}</p>`
        : ""
    }
  </div>`;
}

// ---------- Footer ----------

function footerCell(inner: string): string {
  return `<tr><td class="em-muted" style="padding:18px 24px;border-top:1px solid ${C.dividerSoft}">
    <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.5;color:${C.inkSecondary};text-align:center">${inner}</p>
  </td></tr>`;
}

function supportLine(href = "https://app.socio.id/tiket"): string {
  return `<div style="max-width:480px;margin:12px auto 0 auto;text-align:center"><p style="margin:0;font-family:${FONT};font-size:11px;color:${C.inkSecondary}">Butuh bantuan? Balas email ini atau buka <a href="${href}" style="color:${C.accentInk}">pusat bantuan</a>.</p></div>`;
}

export interface FooterOpts {
  year?: number;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  /** Alamat fisik bisnis — wajib untuk footer marketing. */
  address?: string;
}

/**
 * Footer TRANSAKSIONAL.
 * @param kind 'help' = gaya deposit ("Butuh bantuan? Balas email ini.")
 *             'security' = gaya wrapEmail (+ "Jika bukan Anda yang meminta...").
 *             'bare' = hanya baris © (gaya cron lama + email reseller).
 */
export function emailFooterTransactional(
  kind: "help" | "security" | "bare",
  o: FooterOpts = {},
): string {
  const y = o.year ?? new Date().getFullYear();
  if (kind === "help") {
    return footerCell(`© ${y} Socio.id — Panel SMM Indonesia<br>Butuh bantuan? Balas email ini.`);
  }
  if (kind === "bare") {
    return footerCell(`© ${y} Socio.id — Panel SMM Indonesia`);
  }
  return footerCell(
    `© ${y} Socio.id — Panel SMM Indonesia<br>Jika bukan Anda yang meminta, abaikan email ini. Akun Anda tetap aman.`,
  );
}

/** Support-line untuk slot afterCard. Default = tiket app (socio.id/tiket 404 — jangan dipakai). */
export function emailSupportAfterCard(href = "https://app.socio.id/tiket"): string {
  return supportLine(href);
}

/**
 * Alamat default footer marketing (keputusan user 6 Okt 2026: domain + kota).
 * Ganti dengan alamat fisik lengkap bila sudah ada.
 */
export const DEFAULT_MARKETING_ADDRESS = "Socio.id — Jakarta, Indonesia";

/**
 * Footer MARKETING — wajib mencantumkan identitas + cara berhenti.
 * Jangan pakai untuk email transaksional (risiko user opt-out dari reset password).
 */
export function emailFooterMarketing(
  o: Required<Pick<FooterOpts, "unsubscribeUrl" | "preferencesUrl" | "address">> & FooterOpts,
): string {
  const y = o.year ?? new Date().getFullYear();
  return footerCell(
    `© ${y} Socio.id — Panel SMM Indonesia<br>${esc(o.address)}<br>` +
      `Anda menerima email ini karena terdaftar di Socio.id.<br>` +
      `<a href="${o.preferencesUrl}" style="color:${C.accentInk};text-decoration:underline">Atur preferensi</a> · ` +
      `<a href="${o.unsubscribeUrl}" style="color:${C.accentInk};text-decoration:underline">Berhenti berlangganan</a>`,
  );
}

// ---------- Komponen konten ----------

/** Kotak nominal terang (gaya aktivasi reseller). */
export function emailAmountBox(o: { amount: string; caption: string }): string {
  return `<div style="background:${C.paperLift};border:1px solid ${C.borderCard};border-radius:12px;padding:16px;margin:16px 0;text-align:center">
    <div style="font-family:${DISPLAY};font-size:24px;font-weight:800;letter-spacing:-0.01em;color:${C.inkTitle};font-variant-numeric:tabular-nums">${o.amount}</div>
    <div style="font-family:${FONT};margin-top:6px;font-size:13px;color:${C.inkBody}">${o.caption}</div>
  </div>`;
}

/** Kartu bank GELAP (gaya deposit — kontras lolos di permukaan gelap). */
export function emailBankCard(o: {
  bankLabel: string;
  accountNumber: string;
  accountName: string;
  amountLabel: string;
  amount: string;
  meta: string;
}): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.darkSurface};border-radius:12px;margin:16px 0">
    <tr><td style="padding:18px 20px">
      <div style="font-family:${FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${C.inkMutedOnDark}">${o.bankLabel}</div>
      <div style="font-family:${DISPLAY};font-size:22px;font-weight:800;letter-spacing:0.02em;color:#ffffff;margin:4px 0;font-variant-numeric:tabular-nums">${o.accountNumber}</div>
      <div style="font-family:${FONT};font-size:12px;color:${C.inkOnDark}">${o.accountName}</div>
      <div style="border-top:1px solid ${C.darkDivider};margin:12px 0"></div>
      <div style="font-family:${FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${C.inkMutedOnDark}">${o.amountLabel}</div>
      <div style="font-family:${DISPLAY};font-size:24px;font-weight:800;color:${C.accentBright};margin:4px 0;font-variant-numeric:tabular-nums">${o.amount}</div>
      <div style="font-family:${FONT};font-size:12px;color:${C.inkOnDark}">${o.meta}</div>
    </td></tr>
  </table>`;
}

/** Kartu kupon — bg mango-soft (rasa promo situs). */
export function emailPriceCard(o: { label: string; price: string; note?: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.mangoSoft};border:1px solid ${C.mango};border-radius:12px;margin:16px 0">
    <tr><td style="padding:18px 20px;text-align:center">
      <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.inkBody}">${o.label}</div>
      <div style="font-family:${DISPLAY};font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${C.inkTitle};margin:4px 0;font-variant-numeric:tabular-nums">${o.price}</div>${
        o.note
          ? `
      <div style="font-family:${FONT};font-size:12px;color:${C.inkBody}">${o.note}</div>`
          : ""
      }
    </td></tr>
  </table>`;
}

/** Grid layanan 2 kolom (mobile menumpuk natural karena table). Maks 6 item. */
export function emailServiceGrid(items: { name: string; price: string; href: string }[]): string {
  const list = items.slice(0, 6);
  const cell = (it: { name: string; price: string; href: string }) =>
    `<td width="50%" style="padding:6px;vertical-align:top">` +
    `<a href="${it.href}" style="display:block;text-decoration:none;background:${C.surface};border:1px solid ${C.borderCard};border-radius:12px;padding:12px;text-align:center">` +
    `<span style="display:block;font-family:${FONT};font-size:13px;font-weight:700;color:${C.inkHeading}">${it.name}</span>` +
    `<span style="display:block;font-family:${DISPLAY};font-size:14px;font-weight:800;color:${C.accentInk};margin-top:4px;font-variant-numeric:tabular-nums">${it.price}</span>` +
    `</a></td>`;
  const rows: string[] = [];
  for (let i = 0; i < list.length; i += 2) {
    const right = i + 1 < list.length ? cell(list[i + 1]) : `<td width="50%"></td>`;
    rows.push(`<tr>${cell(list[i])}${right}</tr>`);
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:12px 0">${rows.join("")}</table>`;
}

/** Strip statistik tipografis — angka + label, tanpa card chrome. */
export function emailStatStrip(items: { value: string; label: string }[]): string {
  const cells = items
    .slice(0, 4)
    .map(
      (it) => `<td style="text-align:center;padding:8px 4px">
      <div style="font-family:${DISPLAY};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${C.inkTitle};font-variant-numeric:tabular-nums">${it.value}</div>
      <div style="font-family:${FONT};font-size:11px;color:${C.inkSecondary};margin-top:2px">${it.label}</div>
    </td>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:12px 0"><tr>${cells}</tr></table>`;
}

/** Pahlawan promo: eyebrow pill mango (maks 1) + judul + subjudul. */
export function emailHero(o: { eyebrow?: string; heading: string; sub?: string }): string {
  return `<div style="text-align:center;padding:8px 0 4px 0">${
    o.eyebrow
      ? `
    <div style="display:inline-block;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${C.inkTitle};background:${C.mango};border-radius:9999px;padding:6px 14px;margin-bottom:12px">${o.eyebrow}</div>`
      : ""
  }
    <div style="font-family:${DISPLAY};font-size:22px;font-weight:800;line-height:1.3;letter-spacing:-0.01em;color:${C.inkTitle}">${o.heading}</div>${
      o.sub
        ? `
    <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.inkBody};margin-top:8px">${o.sub}</div>`
        : ""
    }
  </div>`;
}

/** Base URL aset email (PNG Sparko di-deploy via landing/public/email). */
export const EMAIL_ASSETS = "https://socio.id/email";

/** Pose Sparko yang tersedia sebagai PNG email-safe (@2x, transparan). */
export type SparkoPose = "idle" | "wave" | "celebrate" | "sad";

const SPARKO_ALT: Record<SparkoPose, string> = {
  idle: "Sparko, maskot Socio.id",
  wave: "Sparko melambaikan tangan",
  celebrate: "Sparko merayakan",
  sad: "Sparko bersedih",
};

/**
 * Maskot Sparko di email. Selalu pakai PNG (SVG tidak konsisten di Gmail/Outlook),
 * selalu dengan alt + dimensi eksplisit (klien dengan gambar mati tetap rapi).
 * Ukuran tampil 72px (file @2x = tajam di retina), ±12-14KB per pose.
 */
export function emailMascot(pose: SparkoPose, alt?: string): string {
  if (!SPARKO_ALT[pose]) {
    throw new Error(`Pose Sparko tidak dikenal: ${pose}. Valid: idle|wave|celebrate|sad.`);
  }
  return (
    `<div style="text-align:center;padding:4px 0 0 0">` +
    `<img src="${EMAIL_ASSETS}/sparko-${pose}@2x.png" alt="${alt ?? SPARKO_ALT[pose]}" width="72" height="78" style="display:inline-block;border:0;outline:none;text-decoration:none">` +
    `</div>`
  );
}
