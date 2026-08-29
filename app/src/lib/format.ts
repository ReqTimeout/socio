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
 * Short display label for service cards/quick-order.
 * Strips bracket tags and trims; preserves leading flag emoji cleanly.
 */
export function serviceDisplayName(name: string): string {
  const fixed = fixMojibake(name);
  const head = (fixed.split("[")[0] ?? fixed).trim();
  // Collapse whitespace, keep emoji intact
  return head.replace(/\s{2,}/g, " ").trim() || fixed.trim();
}
