/**
 * Token DNA email — HEX LITERAL dari tema socio.id yang sebenarnya.
 *
 * SUMBER KEBENARAN: `landing/src/styles/tokens.css` (design contract OKLCH,
 * LANDING_DESIGN_PLAN §2). Hex di bawah = konversi TERVERIFIKASI dari nilai
 * oklch tersebut (converter diuji: putih/hitam/merah murni tepat).
 * BUKAN dari `packages/ui` (itu untuk app, paletnya beda).
 *
 * Email client (Gmail, Outlook, Yahoo) TIDAK mendukung CSS custom properties,
 * web font, atau <link> stylesheet. Semua warna harus inline hex.
 *
 * ATURAN (dari kontrak landing):
 * - CTA SATU-SATUNYA: accent-ink fill + teks putih (7.17:1).
 * - Pop colors (mango/berry) HANYA highlight/badge/sticker kecil — BUKAN fill CTA.
 * - `#94a3b8` DILARANG untuk teks di permukaan TERANG (sub-AA).
 *   Boleh di permukaan GELAP (±7:1) — token dipisah inkOnDark.
 * - Teks sekunder terang minimal 4.5:1 → `#4f565b` (ink-2).
 */

export const EMAIL_COLORS = {
  // Brand cyan-teal (oklch 220)
  accentInk: "#005f7c", // oklch(0.44 0.11 220) — FILL CTA + link (7.17:1 vs putih)
  accentHover: "#005370", // oklch(0.4 0.11 220) — MSO fallback / tekan
  accentBright: "#00aacf", // oklch(0.68 0.13 220) — angka di atas GELAP saja

  // Pop (highlight kecil, badge, urgency — BUKAN fill CTA)
  mango: "#f7c243", // oklch(0.84 0.15 85) — eyebrow pill + badge
  mangoSoft: "#fdf0d0", // mango 25% di atas putih — bg kartu kupon
  berryInk: "#c01242", // oklch(0.52 0.2 15) — teks urgency di atas putih (6.16:1)

  // Permukaan terang
  surface: "#ffffff", // kartu
  bodyBg: "#f7fbfc", // oklch(0.985 0.004 220) — bg body email
  paperLift: "#eff4f6", // oklch(0.965 0.006 220) — kotak nominal
  borderCard: "#ebecec", // hairline ink 8% — border kartu
  dividerSoft: "#ebecec",
  headerGradient: "linear-gradient(135deg,#005f7c 0%,#00aacf 100%)", // (cadangan — header default PUTIH)

  // Teks di atas permukaan TERANG
  inkTitle: "#041116", // oklch(0.175 0.015 235) — judul
  inkHeading: "#041116", // subjudul
  inkBody: "#4f565b", // oklch(0.45 0.012 235) — body (lolos AA)
  inkSecondary: "#4f565b", // sekunder (sama — hierarki lewat ukuran, bukan warna)

  // Panel gelap (kartu bank, footer alt)
  darkSurface: "#07161c", // oklch(0.19 0.02 235)
  inkOnDark: "#cbd5e1", // teks biasa di atas gelap
  inkMutedOnDark: "#94a3b8", // label kecil di atas gelap — BOLEH (±7:1)
  darkDivider: "rgba(255,255,255,0.12)",

  // Semantik terang (dipakai hemat)
  successSoft: "#dcfce7",
  successInk: "#047857",
  warningSoft: "#fef3c7",
  warningInk: "#92400e",
  dangerSoft: "#fee2e2",
  dangerInk: "#991b1b",
  primarySoft: "#e0e7ff",

  // CTA
  ctaText: "#ffffff", // teks di atas accent-ink (7.17:1)
} as const;

/** Dilarang untuk teks di permukaan terang. Dijaga self-test. */
export const BANNED_ON_LIGHT = ["#94a3b8", "#000000", "#4f46e5", "#06b6d4"] as const;

export const EMAIL_FONTS = {
  // Display = Sora (judul situs), body = Plus Jakarta Sans.
  // Keduanya tidak dimuat di mayoritas client — degrade rapi ke system stack.
  display: '"Sora", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  sans: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export const EMAIL_TEXT = {
  title: { size: "20px", weight: 800, lineHeight: 1.3, letterSpacing: "-0.02em" },
  section: { size: "16px", weight: 700, lineHeight: 1.4, letterSpacing: "-0.01em" },
  body: { size: "14px", weight: 400, lineHeight: 1.7 },
  small: { size: "12px", weight: 400, lineHeight: 1.6 },
  caption: { size: "11px", weight: 400, lineHeight: 1.5 },
} as const;

export const EMAIL_LAYOUT = {
  maxWidth: 600,
  cardRadius: 16,
  btnRadius: 9999,
  btnHeight: 46,
  btnMinWidth: 200,
  gutter: 24,
} as const;

// ---------- Kontras (WCAG relative luminance, tanpa dependensi) ----------

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Rasio kontras dua warna hex. Contoh: contrastRatio("#ffffff", "#005f7c") ≈ 7.17. */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Gagal (throw) bila pasangan fg/bg di bawah ambang AA.
 * Dipakai di self-test untuk pasangan resmi DNA.
 */
export function assertContrast(fg: string, bg: string, min = 4.5, label = ""): void {
  const r = contrastRatio(fg, bg);
  if (r < min) {
    throw new Error(
      `Kontras ${label || `${fg} di atas ${bg}`} = ${r.toFixed(2)}:1, di bawah AA ${min}:1.`,
    );
  }
}
