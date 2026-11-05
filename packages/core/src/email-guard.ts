/**
 * GUARD "email tidak boleh kosong" — definisi tunggal apa itu email BLANK.
 * Port hardening .my `email/guard.ts` (insiden 31 Okt 2026, owner lapor
 * "transaksional email malah blank") ke socio.id — logika murni, offline-testable.
 *
 * Sumber email kosong/miring yang ditemukan di audit produksi .my:
 *  1. Body notifikasi admin diinterpolasi RAW ke HTML → `User: Ali <ali@mail.com>`
 *     dimakan parser sebagai tag tak dikenal → alamat email HILANG dari email.
 *  2. Template tanpa kartu brand jatuh ke fallback teks polos → terlihat "kosong".
 *  3. TemplateData rusak / body kosong → worker kirim `<pre></pre>` (hampir kosong).
 *
 * Dipakai worker `cron/email-queue.ts` SEBELUM kirim: kalau HTML kosong/ringkas,
 * email TIDAK dikirim (dikirim ke user = hasil buruk), row ditandai `failed` +
 * alasannya sehingga kelihatan di panel admin & bisa diperbaiki.
 *
 * Prinsip: ukur TEKS YANG TERLIHAT user (setelah tag dibuang), bukan
 * panjang HTML — email panjang tapi tak terbaca tetap "kosong".
 */

/** Minimal karakter teks yang harus terlihat di email. Di bawah ini = kosong. */
export const MIN_VISIBLE_TEXT = 24;

/** Blokir yang TIDAK terlihat user (preheader, style, script, komentar). */
const INVISIBLE_BLOCKS: RegExp[] = [
  /<!--[\s\S]*?-->/g,
  /<style[\s\S]*?<\/style>/gi,
  /<script[\s\S]*?<\/script>/gi,
  // Preheader emailShell: div display:none max-height:0 → teksnya tak terlihat.
  /<div[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/div>/gi,
];

/**
 * CHROME email (bukan isi): header wordmark + footer ©. Buang ini saat
 * mengukur "apa yang benar-benar dilihat user" — kalau tak dibuang, email
 * yang isinya KOSONG tetap lolos karena footer © masih 39 karakter.
 * Kelas `em-head` / `em-muted` dipasang oleh `emailShell` (app render.ts).
 */
const CHROME_BLOCKS: RegExp[] = [
  /<td class="em-head"[\s\S]*?<\/td>/gi,
  /<td class="em-muted"[\s\S]*?<\/td>/gi,
];

/** Decode entity HTML (urutan aman: `&amp;` terakhir agar tak dobel-decode). */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/**
 * Teks yang benar-benar terlihat user (tanpa tag, tanpa blok tersembunyi,
 * tanpa chrome header/footer). Kalau email-nya cuma header+footer → hasilnya
 * kosong → email dianggap KOSONG.
 */
export function visibleText(html: string): string {
  let s = String(html ?? "");
  for (const re of INVISIBLE_BLOCKS) s = s.replace(re, " ");
  for (const re of CHROME_BLOCKS) s = s.replace(re, " ");
  s = s.replace(/<[^>]+>/g, " ");
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

/**
 * Alasan kenapa email dianggap kosong, atau null bila OK.
 * @returns null = aman dikirim. String = alasan penolakan.
 */
export function blankReason(html: string): string | null {
  const raw = String(html ?? "");
  if (!raw.trim()) return "HTML kosong total";
  if (!/<html[\s>]/i.test(raw)) return "bukan dokumen HTML lengkap (tag <html> hilang)";
  const text = visibleText(raw);
  if (text.length < MIN_VISIBLE_TEXT) {
    return `teks terlihat hanya ${text.length} karakter (min ${MIN_VISIBLE_TEXT})`;
  }
  return null;
}

/** true = email kosong / tidak layak dikirim. */
export function isBlankEmail(html: string): boolean {
  return blankReason(html) !== null;
}

/**
 * Penjelasan ringkas untuk log admin (panjang HTML + cuplikan teks).
 * @param maxChars berapa karakter cuplikan teks yang ditampilkan
 */
export function describeEmail(html: string, maxChars = 120): string {
  const raw = String(html ?? "");
  const text = visibleText(raw);
  return `html=${raw.length}B text=${text.length}ch preview="${text.slice(0, maxChars)}"`;
}
