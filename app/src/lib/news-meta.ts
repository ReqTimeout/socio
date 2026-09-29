/**
 * PRD Service Sync v2 §10 — meta tampilan untuk satu event berita layanan.
 * Dipakai bersama oleh widget "Update" di dashboard dan halaman /berita,
 * supaya icon / warna / label per jenis event selalu konsisten.
 *
 * `icon` merujuk nama glyph di packages/ui/src/components/Icon.svelte.
 * Chip warna memakai token Tailwind (kelas bg- dan text-) yang sudah dipakai app.
 */
export type NewsMeta = {
  icon: string;
  chipBg: string;
  chipInk: string;
  /** Titik warna solid untuk filter chip (bg-*-500). */
  dot: string;
  label: string;
};

export function newsMeta(t: string | null | undefined): NewsMeta {
  switch (t) {
    case "new_service":
      return {
        icon: "sparkles",
        chipBg: "bg-emerald-50",
        chipInk: "text-emerald-700",
        dot: "bg-emerald-500",
        label: "Layanan Baru",
      };
    case "price_down":
      return {
        icon: "trending_down",
        chipBg: "bg-teal-50",
        chipInk: "text-teal-700",
        dot: "bg-teal-500",
        label: "Harga Turun",
      };
    case "price_up":
      return {
        icon: "trending_up",
        chipBg: "bg-amber-50",
        chipInk: "text-amber-700",
        dot: "bg-amber-500",
        label: "Harga Naik",
      };
    case "discontinued":
      return {
        icon: "alert",
        chipBg: "bg-rose-50",
        chipInk: "text-rose-700",
        dot: "bg-rose-500",
        label: "Dihentikan",
      };
    default:
      return {
        icon: "megaphone",
        chipBg: "bg-sky-50",
        chipInk: "text-sky-700",
        dot: "bg-sky-500",
        label: "Pengumuman",
      };
  }
}

/**
 * Event yang layak punya aksi "Pesan sekarang" (deep-link /pesan?service=<id>).
 * 'discontinued' & manual TIDAK — menghindari user pesan layanan yang mati.
 */
export function isOrderableEvent(t: string | null | undefined): boolean {
  return t === "new_service" || t === "price_up" || t === "price_down";
}

/** Filter chip label untuk halaman /berita (sumber: news.event_type). */
export const NEWS_EVENT_FILTERS: ReadonlyArray<{ v: string; label: string }> = [
  { v: "", label: "Semua" },
  { v: "new_service", label: "Layanan Baru" },
  { v: "price_down", label: "Harga Turun" },
  { v: "price_up", label: "Harga Naik" },
  { v: "discontinued", label: "Dihentikan" },
  { v: "manual", label: "Pengumuman" },
];

/**
 * Format relatif singkat untuk timestamp berita (id-ID).
 * Dipakai widget + /berita supaya "kapan" konsisten.
 */
export function newsTimeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "baru";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Bersihkan teks berita untuk tampilan: buang karakter non-ASCII (mojibake
 * legacy seperti "â»ï¸", "Ã¢â‚¬", "⭐", emoji rusak, replacement char, control
 * char) lalu rapikan spasi & pemisah menggantung. Konten layanan/berita
 * Socio pada dasarnya ASCII, jadi whitelist ASCII printable (0x20-0x7E) aman.
 * Idempotent: teks bersih tidak berubah.
 */
export function cleanNewsText(s: string | null | undefined): string {
  // Whitelist ASCII printable + "→" / "—" / "–" (dipakai konten harga naik/turun
  // "Nama — harga Rp A → Rp B" supaya pemisah tetap terbaca).
  let t = String(s ?? "").replace(/[^\x20-\x7E→—–]+/g, " ");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t
    .replace(/^(?:[-|,:;]\s*)+/, "")
    .replace(/(?:\s*[-|,:;])+$/, "")
    .trim();
  return t;
}

/**
 * Pecah teks berita jadi segmen supaya nominal harga ("Rp 5.000") bisa di-
 * highlight. Number amount mana pun setelah "Rp" (dengan pemisah titik/koma)
 * ditandai `price: true`. Dipakai widget "Update" + halaman /berita.
 */
export type NewsSeg = { t: string; price: boolean };
const RP_RE = /Rp\s?\d[\d.,]*/g;
export function newsPriceSegments(s: string | null | undefined): NewsSeg[] {
  const text = cleanNewsText(s);
  if (!text) return [];
  const segs: NewsSeg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RP_RE.lastIndex = 0;
  while ((m = RP_RE.exec(text))) {
    if (m.index > last) segs.push({ t: text.slice(last, m.index), price: false });
    segs.push({ t: m[0], price: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ t: text.slice(last), price: false });
  return segs;
}
