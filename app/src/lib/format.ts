export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
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
export function serviceDisplayName(name: string): string {
  let fixed = fixMojibake(name);
  // Replace provider branding with "Socio" (varian: SMMTURK / SMMTurk / SMMTÜRK)
  fixed = fixed.replace(/SMMT[UÜ]RK/gi, "Socio");
  // Remove bracket tags containing "Provider" (e.g. "[ Provider ]", "[%100 Provider]", "[ %100 Provider ]")
  fixed = fixed.replace(/\[\s*%?\d*\s*Provider\s*\]/gi, "");
  // Collapse whitespace left by removals
  fixed = fixed.replace(/\s{2,}/g, " ").trim();
  // Extract head before first [ metadata tag
  const head = (fixed.split("[")[0] ?? fixed).trim();
  return head.replace(/\s{2,}/g, " ").trim() || fixed;
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
 * 5. rapikan kata noise ("Own"/"Exclusive"/"Special Update") + separator menggantung.
 */
export function whitelabel(raw: string): string {
  let s = fixMojibake(String(raw ?? ""));
  s = s.replace(/\((?:[^()]*\bSMMT[UÜ]RK\b[^()]*)\)/gi, " ");
  const parts = s.split("|");
  const kept = parts.filter((p) => !/SMMT[UÜ]RK/i.test(p));
  s = (kept.length ? kept : parts).join("|");
  s = s.replace(/[:,\-\u2013]\s*[^|]*\bSMMT[UÜ]RK\b[^|]*$/gi, "");
  s = s.replace(/SMMT[UÜ]RK/gi, "Socio");
  s = s.replace(/(^|\||,|\s)\s*(Special Update|Own|Exclusive)\b/gi, "$1");
  s = s.replace(/[ ,]+$/, "").replace(/^[ ,]+/, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}
