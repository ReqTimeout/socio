export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

/**
 * Buang karakter non-ASCII (emoji 4-byte, mojibake) supaya teks aman disimpan
 * ke kolom ber-charset utf8mb3 (mis. balance_logs.note). Dipakai untuk catatan
 * log order agar insert riwayat saldo tidak gagal saat nama layanan mengandung
 * emoji (\u{1F1EE}\u{1F1E9} dsb). Idempotent untuk teks ASCII.
 */
export function asciiSafe(s: string): string {
  return String(s ?? "")
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Tanggal singkat konsisten antar halaman: "11 Apr 2023" (bukan "11/4/2023"
 * dari toLocaleDateString default yang ambigu dan berbeda format per-halaman).
 */
export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Display-safe for service names that may contain emoji/flags.
 * Fixes mojibake like "ðŸ‡®ðŸ‡©" → "🇮🇩" when UTF-8 bytes were decoded as latin1.
 * Idempotent: normal strings pass through unchanged.
 */
export function fixMojibake(s: string): string {
  if (!s || !s.includes("ð")) return s;
  // Heuristic: contains the telltale "ð" mojibake prefix + high latin1 chars → likely double-encoded
  try {
    // Cheap check: if "ð" appears, it is almost always mojibake in Indonesian service names
    // Decode latin1 bytes → re-interpret as utf8
    const raw = Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
    const dec = new TextDecoder("utf-8", { fatal: false }).decode(raw);
    // Accept only if decoded has fewer mojibake markers and contains emoji or clean ASCII
    if (dec !== s && !dec.includes("ð") && dec.length < s.length * 1.6) return dec;
    // Fallback: at least contains emoji/flag? prefer decoded
    if (/\p{Extended_Pictographic}/u.test(dec) || dec.includes("🇮")) return dec;
  } catch {
    // decode gagal — kembalikan string asli
  }
  return s;
}

/**
 * Short display label for service cards/quick-order/dropdown.
 * - Strips provider branding ("SMMturk" → "Socio", removes "[...Provider...]" tags).
 * - Fixes mojibake emoji.
 * - Extracts meaningful head before bracket metadata tags.
 */
/**
 * Pola SMMTURK + varian mojibake UTF-8 (Ü Latin1, Ã double-encode,
 * � U+FFFD replacement char — owner 8 Okt: raw "Own SMMT�RK" lolos),
 * dengan/tanpa spasi antara Ü dan RK. Dipakai whitelabel() +
 * serviceDisplayName() + deteksi brand untuk fallback (di bawah).
 */
const SMMT_PAT = "SMMT[\\sÜÃœ�\\u0080-\\u00BF\\uFFFD]*[UÜ]?[\\sÜÃœ�\\u0080-\\u00BF\\uFFFD]*RK";

/**
 * Peta homoglyph Latin → ASCII, case-faithful (kapital→kapital,
 * small-cap→huruf kecil). Daftar EXHAUSTIVE dari sensus HEX prod 8 Okt
 * (876 kategori + 7434 layanan): hanya codepoint yang benar-benar muncul.
 * - İ/ı/ɪ (U+0130/0131/026A): samaran "PROVİDER"/"Provɪder".
 * - Small-cap U+1D00–U+1D20 + ʀ/ʜ/ʟ: "ᴘʀɪᴠᴀᴛᴇ", "ᴅɪʀᴇᴄᴛ", "ᴺᴱᵂ"-style.
 * NFKD di bawah menangani sisanya (math-bold/sans 𝗣, modifier cap ᴾ,
 * fullwidth). Emoji/flag/simbol/Cyrillic TIDAK disentuh.
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  "İ": "I", // U+0130
  "ı": "i", // U+0131
  "ɪ": "i", // U+026A
  "ʀ": "r", // U+0280
  "ʜ": "H", // U+029C
  "ʟ": "L", // U+029F
  "ᴀ": "a", // U+1D00
  "ᴄ": "c", // U+1D04
  "ᴅ": "d", // U+1D05
  "ᴇ": "e", // U+1D07
  "ᴍ": "m", // U+1D0D
  "ᴏ": "o", // U+1D0F
  "ᴘ": "p", // U+1D18
  "ᴛ": "t", // U+1D1B
  "ᴜ": "u", // U+1D1C
  "ᴠ": "v", // U+1D20
};

/**
 * Normalisasi homoglyph → ASCII sebelum deteksi brand.
 * - Petakan eksplisit dulu (İ→I; NFKD akan menurunkannya jadi "i"),
 * - NFKD untuk blok math/modifier-capital/fullwidth,
 * - buang HANYA combining dot above (U+0307, sisa nyata NFKD di korpus;
 *   variation selector FE00-FE0F (❤️→❤) dan mark lain DIPERTAHANKAN),
 * - buang lone surrogate (byte rusak provider, tampil sebagai �).
 */
export function normalizeHomoglyphs(s: string): string {
  let o = "";
  for (const ch of String(s ?? "")) o += HOMOGLYPH_MAP[ch] ?? ch;
  o = o.normalize("NFKD").replace(/\u0307/gu, "");
  // buang lone surrogate (setengah pasangan UTF-16 yatim)
  o = o.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "").replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  return o;
}

/** Ada token brand hulu (varian SMMT, Provider, PROV?DER) di teks? */
function hasBrandToken(s: string): boolean {
  const n = normalizeHomoglyphs(s);
  return (
    new RegExp(SMMT_PAT, "i").test(n) || /P\s*R\s*O\s*V\s*\?\s*D\s*E\s*R\s*S?/i.test(n) || /\bProviders?\b/i.test(n)
  );
}

/**
 * Fallback anti-label-kosong: kalau whitelabel menghabiskan seluruh nama
 * (mis. kategori provider bernama harfiah "Exclusive" — noise word yang
 * ikut ke-strip), jangan kembalikan string hampa (opsi dropdown kosong).
 * Kembalikan mentah (sudah fixMojibake+trim) SELAMA tidak mengandung brand;
 * kalau mengandung brand, jatuhkan ke "Uncategorized" daripada membocorkan.
 */
function nonEmptyDisplay(stripped: string, raw: string): string {
  if (stripped) return stripped;
  const clean = fixMojibake(String(raw ?? ""))
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!clean || hasBrandToken(clean)) return "Uncategorized";
  return clean;
}

export function serviceDisplayName(name: string): string {
  let fixed = fixMojibake(name);
  // Replace provider branding with "Socio" (varian: SMMTURK / SMMTurk /
  // SMMTÜRK / double-encode SMMTÃRK). Owner 7 Okt: nama masih bocor di UI
  // karena spasi + char non-ASCII memisahkan token.
  fixed = fixed.replace(new RegExp(SMMT_PAT, "gi"), "Socio");
  // Normalisasi homoglyph (İ/ı/ɪ, math-bold 𝗣, superscript ᴾ, dst) → ASCII
  // SEBELUM deteksi Provider — pola brand disamarkan lewat blok Unicode
  // eksotis (owner 8 Okt, HEX prod: "PROVİDER", "ᴾᴿᴼⱽᴵᴰᴱᴿ", "𝗣𝗥𝗢𝗩𝗜𝗗𝗘𝗥").
  // Emoji/flag/simbol tidak disentuh.
  fixed = normalizeHomoglyphs(fixed);
  // Remove bracket tags containing "Provider" (e.g. "[ Provider ]", "[%100 Provider]", "[ %100 Provider ]")
  fixed = fixed.replace(/\[\s*%?\d*\s*Provider\s*\]/gi, "");
  // ... maupun versi kurung biasa "(Provider)" / "(Main Provider)" (owner 8
  // Okt: 2 label dropdown lolos karena pola bracket-only tidak kena paren).
  fixed = fixed.replace(/\(\s*[^)]*\bProviders?\b[^)]*\)/gi, "");
  // ... maupun SAMARAN "PROV?DER" (? ganti I) + kata "Provider" standalone
  // ("Provider Service ?", "Youtube Provider", "? Provider" — owner 8 Okt:
  // 11 kategori aktif bocor pola ini) + versi SPASI "P R O V I D E R".
  fixed = fixed.replace(/P\s*R\s*O\s*V\s*\?\s*D\s*E\s*R\s*S?/gi, "");
  fixed = fixed.replace(/\bProviders?\b/gi, "");
  fixed = fixed.replace(/\bP\s+R\s+O\s+V\s+I\s+D\s+E\s+R(\s+S)?\b/gi, "");
  // Collapse whitespace left by removals + buang pemisah menggantung
  // di ujung ("... -" setelah "(Main Provider)" dihapus, "... - !" setelah
  // "PROVİDER!" dihapus) + pasangan
  // kurung/siku hampa sisa penghapusan ("[]", "()").
  fixed = fixed
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/(?:\s*[-|,:;])+$/, "")
    .replace(/\s*[-|,:;]\s*!+\s*$/, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\(\s*\)/g, "")
    .trim();
  // Extract head before first [ metadata tag
  const head = (fixed.split("[")[0] ?? fixed).trim();
  const out = head.replace(/\s{2,}/g, " ").trim() || fixed.trim();
  return nonEmptyDisplay(out, name);
}

/**
 * White-label a provider-supplied name (kategori maupun layanan) supaya nama
 * hulu "SMMTURK/SMMT\u00dcRK" TIDAK pernah tampil ke reseller/user. Dibuat idempotent
 * dan no-op untuk nama yang sudah bersih, sehingga aman dipakai saat tulis
 * (cron service-sync) maupun saat baca (display).
 *
 * 1. buang grup dalam kurung yang menyebut brand,
 * 2. buang segmen ber-pipe yang menyebut brand,
 * 3. buang anak-kalimat trailing (setelah , : - –) yang masih menyebut brand,
  * 4. netralisasi sisa token brand → "Socio",
  * 4b. normalisasi homoglyph (İ/ı/ɪ, math-bold, superscript) → ASCII,
  * 5. rapikan kata noise ("Own"/"Exclusive"/"Special Update") + separator
  *    menggantung,
  * 6. buang tag `[...Provider...]` (bracket/paren-wrapped), kata "Provider"
  *    standalone, samaran "PROV?DER"/"P R O V I D E R", suffix `| Provider`,
  *    dan frasa `of Provider(s)` (idempotent, owner 7-8 Okt).
 */
export function whitelabel(raw: string): string {
  let s = fixMojibake(String(raw ?? ""));
  // (SMMT_PAT kini konstanta module-level — dipakai bersama
  // serviceDisplayName() + hasBrandToken().) Owner 7 Okt: nama kategori
  // masih bocor di dropdown karena space memisahkan Ü dari RK.
  s = s.replace(new RegExp(`\\((?:[^()]*${SMMT_PAT}[^()]*)\\)`, "gi"), " ");
  const parts = s.split("|");
  const kept = parts.filter((p) => !new RegExp(SMMT_PAT, "i").test(p));
  s = (kept.length ? kept : parts).join("|");
  s = s.replace(new RegExp(`[:,–-—\\u2013]\\s*[^|]*${SMMT_PAT}[^|]*$`, "gi"), "");
  s = s.replace(new RegExp(SMMT_PAT, "gi"), "Socio");
  // Normalisasi homoglyph (lihat serviceDisplayName) — WAJIB setelah
  // penanganan SMMT (varian Ü/Ã cocok pra-normalisasi) dan sebelum
  // deteksi Provider.
  s = normalizeHomoglyphs(s);
  // Provider patterns — bracket-wrapped `[Provider]` MAUPUN paren-wrapped
  // `(Provider)`/`(Main Provider)` (owner 8 Okt: 2 label dropdown Telegram
  // lolos karena pola lama bracket-only) OR trailing ` | Provider` suffix OR
  // ` of Provider(s)` frasa. Pertahankan nama provider lain (Tokopedia/Shopee/dll)
  // karena bukan brand panel — itu penanda marketplace.
  s = s.replace(/\[\s*[^\]]*\bProvider(s)?\b[^\]]*\]/gi, "");
  s = s.replace(/\(\s*[^)]*\bProvider(s)?\b[^)]*\)/gi, "");
  // Samaran "PROV?DER", "Provider" standalone, dan "P R O V I D E R" spasi
  // (lihat serviceDisplayName — pola yang sama).
  s = s.replace(/P\s*R\s*O\s*V\s*\?\s*D\s*E\s*R\s*S?/gi, "");
  s = s.replace(/\bProviders?\b/gi, "");
  s = s.replace(/\bP\s+R\s+O\s+V\s+I\s+D\s+E\s+R(\s+S)?\b/gi, "");
  s = s.replace(/\[\s*\]/g, "").replace(/\(\s*\)/g, "");
  s = s.replace(/\|\s*Provider(s)?\s*$/gi, "");
  s = s.replace(/\s+of\s+Providers?\b/gi, "");
  s = s.replace(/(^|\||,|;|\s|[-–—:])(\s*)(Special Update|Own|Exclusive)\b/gi, "$1");
  s = s.replace(/\s{2,}/g, " ").trim();
  // buang pemisah menggantung di ujung hasil penghapusan (mis. "... -",
  // "... |", "... - !" sisa "PROVİDER!")
  s = s
    .replace(/^(?:[-|,:;]\s*)+/, "")
    .replace(/(?:\s*[-|,:;])+$/, "")
    .replace(/\s*[-|,:;]\s*!+\s*$/, "")
    .trim();
  // Anti-label-kosong: raw semacam "Exclusive" (murni noise word) ikut
  // habis ke-strip → kembalikan mentah; yang ber-brand → "Uncategorized".
  return nonEmptyDisplay(s, raw);
}
