/**
 * lib/money-links.ts —
 * Memetakan artikel → money page yang relevan, untuk link kontekstual di body.
 *
 * Kenapa perlu (temuan 1 Okt 2026, GSC):
 *   42 money page = halaman yang menghasilkan duit, tapi hampir tidak punya
 *   internal link kontekstual — hanya 5 yang ditaut dari /layanan/, dan 0 dari
 *   artikel. Google membalas "Discovered - currently not indexed" untuk 37 dari
 *   42 halaman itu, sementara 2 halaman yang paling banyak ditautkan
 *   (/ dan /layanan) terindeks. Pola klasik: yang tidak punya jalur crawl
 *   internal tidak dipilih.
 *
 * Kenapa matching otomatis, bukan daftar manual:
 *   44 money page × 5 artikel akan cepat basi kalau dipetakan manual, dan
 *   pemetaan manual tidak ikut berkembang saat artikel baru ditambahkan.
 *   Skor ini memakai kata yang benar-benar muncul di artikel dan di money page,
 *   jadi tetap relevan walau daftar money page bertambah.
 *
 * Batas keras: TIDAK PERNAH return money page yang slug-nya sama dengan artikel,
 * dan tidak return apa pun kalau skor di bawah ambang — lebih baik tidak punya
 * link daripada punya link yang tidak nyambung.
 */
import { beliPages, type BeliPageData } from '../data/beli-pages';

// Kata umum yang tidak membawa sinyal topik.
const STOP = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'itu', 'ini',
  'atau', 'juga', 'akan', 'bisa', 'sudah', 'tidak', 'adalah', 'sebagai', 'lebih',
  'murah', 'terpercaya', 'terbaik', 'resmi', 'gratis', 'promo', 'terbaru',
  'smm', 'panel', 'socio', 'id', 'kami', 'kamu', 'anda', 'saya', 'nya', 'ada',
  'dalam', 'oleh', 'sebagai', 'agar', 'karena', 'tapi', 'namun', 'yaitu',
  'layanan', 'layanan', 'harga', 'order', 'pesan', 'beli', 'website', 'situs',
  'seorang', 'para', 'satu', 'dua', 'tiga', 'banyak', 'semua', 'banyak',
]);

function tokens(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
}

/** Bobot kata dari money page: keyword utama + serviceMatch + platform. */
function moneyTokens(p: BeliPageData): string[] {
  return tokens([p.keyword, p.serviceMatch || '', p.platform || ''].join(' '));
}

export interface MoneyLink {
  page: BeliPageData;
  score: number;
  /** Kata kunci yang jadi alasan link ini nyambung. */
  shared: string[];
}

/** Halaman katalog — fallback kalau tidak ada money page yang cukup nyambung. */
export const FALLBACK_HREF = '/layanan/';

/*
 * Ambang sengaja TINGGI. Percobaan pertama pakai ambang 2 dan hasilnya jelek:
 * artikel "SMM Panel" (umum) ikut ter-link ke /beli-followers-twitter/ cuma
 * karena sama-sama punya kata "followers" — link tak nyambung lebih buruk
 * daripada tidak ada link, dan Google membacanya sebagaipath yang-toggle.
 * Sekarang: kandidat pertama harus >= AMBANG_PUTUS, sisanya >= 60% dari terbaik.
 * Kalau tidak ada yang lolos, pemanggil memakai fallback ke /layanan/
 * (halaman katalog yang sudah terindeks) — jujur dan tetap bernilai.
 */
const AMBANG_PUTUS = 6;
const RASIO_TAMBAHAN = 0.6;

/**
 * Cari money page paling relevan untuk satu artikel.
 *
 * SENGAJA HANYA judul + deskripsi, bukan isi body.
 *
 * Percobaan pertama ikut menghitung body dan hasilnya jelek: body artikel
 * memuat TABEL HARGA yang mendaftarkan puluhan layanan, jadi artikel generik
 * kayak "SMM Panel: Pengertian, Cara Kerja" ikut nyangkut ke
 * `/beli-jam-tayang-youtube/` atau `/beli-likes-tiktok/` hanya karena tabel
 * namanya kebetulan ada di situ. Link tak nyambung itu lebih buruk daripada
 * tidak ada link. Judul + deskripsi menyatakan topik artikel dengan jujur.
 *
 * Bobot: judul 3x, deskripsi 2x.
 */
export function moneyLinksFor(judul: string, deskripsi?: string, maks = 2): MoneyLink[] {
  const w = new Map<string, number>();
  for (const t of tokens(judul)) w.set(t, (w.get(t) || 0) + 3);
  for (const t of tokens(deskripsi || '')) w.set(t, (w.get(t) || 0) + 2);

  const out: MoneyLink[] = [];
  for (const page of beliPages) {
    let score = 0;
    const shared: string[] = [];
    for (const t of new Set(moneyTokens(page))) {
      const b = w.get(t);
      if (b) {
        score += b;
        shared.push(t);
      }
    }
    if (score > 0) out.push({ page, score, shared });
  }
  out.sort((a, b) => b.score - a.score || a.page.slug.localeCompare(b.page.slug));
  const terbaik = out[0];
  if (!terbaik || terbaik.score < AMBANG_PUTUS) return [];
  const batas = Math.max(AMBANG_PUTUS, Math.round(terbaik.score * RASIO_TAMBAHAN));
  return out.filter((x) => x.score >= batas).slice(0, maks);
}

/** Semua money page, dikelompokkan per platform — untuk hub di /layanan. */
export function moneyPagesByPlatform(): { platform: string; pages: BeliPageData[] }[] {
  const map = new Map<string, BeliPageData[]>();
  for (const p of beliPages) {
    const key = p.platform || 'Lainnya';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .map(([platform, pages]) => ({
      platform,
      pages: pages.sort((a, b) => a.slug.localeCompare(b.slug)),
    }))
    .sort((a, b) => b.pages.length - a.pages.length || a.platform.localeCompare(b.platform));
}
