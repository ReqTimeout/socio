/**
 * seo/lib/geo-anchor.mjs — anchor kota WAJIB untuk artikel geo (anti-doorway).
 *
 * Kenapa file ini ada (temuan 2 Okt 2026):
 *   `seo/cities.json` sejak awal designing field `anchor` (fakta ekonomi lokal
 *   per kota) + `buyer` (siapa yang kemungkinan beli di kota itu). `_meta.note`
 *   di file itu sendiri menulis: *"Setiap kota punya `anchor` = fakta ekonomi
 *   lokal yang HARUS disebut di artikel supaya halaman punya nilai nyata
 *   (anti-doorway)"*.
 *
 *   Hook itu **tidak pernah tersambung**. `geo-expand.mjs` sudah mengirim
 *   `local_anchor` + `local_buyer` ke queue, tapi `generate.mjs` hanya
 *   meneruskannya ke `buildUserPrompt` (jalur LLM) — jalur template
 *   deterministik membuangnya. Terukur: dari 14 artikel geo, hanya 4 memuat
 *   anchor kotanya, dan `qc-uniqueness` mengukur similarity 0,58-0,68
 *   antar-kota untuk varian yang sama.
 *
 *   Tanpa anchor, 864 halaman geo berpotensi jadi doorway page, dan similarity
 *   tinggi antar-kota = scaled-content-abuse (policy Google).
 *
 * Kenapa modul terpisah, bukan helper di dalam SHARED_HELPERS:
 *   SHARED_HELPERS itu literal template yang di-`new Function` untuk fungsi-fungsi
 *   prompt. Menaruh logika yang perlu diuji di sana berarti harus mengekstrak
 *   literal-nya dulu — rapuh. Modul ini bisa diimpor & diuji langsung.
 *
 * Prinsip: **suntik deterministik, jangan bergantung LLM.** Free model sering
 * tidak patuh, dan "kalau LLM kebetulan menulis anchor" bukan jaminan.
 */

export const ANCHOR_MARKER = 'geo-anchor';

/** Bangun section H2 berisi fakta ekonomi lokal kota. Null kalau data kurang. */
export function renderGeoAnchor(geo) {
  // Queue dari geo-expand.mjs memakai prefix `local_`, sedangkan pemanggil
  // lain bisa memakai nama polos. Terima keduanya supaya tidak diam-diam null.
  const city = geo.city;
  const provinsi = geo.provinsi;
  const anchor = geo.local_anchor ?? geo.anchor;
  const buyer = geo.local_buyer ?? geo.buyer;
  if (!city || !anchor || String(anchor).trim().length < 20) return null;
  const p = [];
  p.push(`## Kenapa layanan SMM di ${city} perlu dilihat dari konteks lokal`);
  p.push('');
  p.push(`${city}${provinsi ? ` (${provinsi})` : ''} punya karakter ekonomi sendiri, dan itu ikut`);
  p.push('menentukan layanan mana yang paling masuk akal dipakai di sini.');
  p.push('');
  p.push(`- **Konteks lokal:** ${anchor}`);
  if (buyer) p.push(`- **Siapa yang biasanya butuh:** ${buyer}`);
  p.push('');
  p.push(`Katalog yang dipakai tetap sama untuk semua kota, tapi sudut dan urutan`);
  p.push(`penjelasannya mengikuti realitas ${city} — bukan sekadar mengganti nama kota di`);
  p.push('templat yang sama. Untuk membandingkan angka yang benar-benar live, buka');
  p.push('[katalog lengkap](/layanan).');
  return `<!-- ${ANCHOR_MARKER} -->\n${p.join('\n')}\n<!-- /${ANCHOR_MARKER} -->`;
}

/** Sisipkan content tepat setelah blok H2 pertama. Sama seperti injectAfterFirstH2. */
function insertAfterFirstH2(body, content) {
  const m = body.match(/^##\s+[^\n]+\n([\S\s]*?)(?=\n## |\n*$)/);
  if (!m) return `${body}\n\n${content}`;
  const at = m.index + m[0].length;
  return `${body.slice(0, at)}\n\n${content}\n\n${body.slice(at)}`;
}

/**
 * Idempoten. Kalau anchor sudah ada (marker, atau LLM sudah menyebut potongan
 * anchor yang sama) body dikembalikan apa adanya — supaya regenerasi tidak
 * menumpuk section kembar.
 */
export function injectGeoAnchor(mdx, geo) {
  if (!mdx || !geo || !geo.local_anchor) return mdx;
  const section = renderGeoAnchor(geo);
  if (!section) return mdx;
  if (mdx.includes(ANCHOR_MARKER)) return mdx;
  if (alreadyCited(mdx, geo.local_anchor)) return mdx;
  return insertAfterFirstH2(mdx, section);
}

/**
 * Kata kunci pembeda dari anchor kota.
 * Ambil yang paling PANJANG dulu (cenderung paling khas — "batik", "mebel"),
 * bukan yang paling sering (yang biasanya kata umum seperti "dengan", "serta").
 */
export function anchorProbe(anchor) {
  if (!anchor) return [];
  return [...new Set(String(anchor).split(/[\s,.;:()]+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter((w) => w.length > 4))]
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

/** Sudah tercantum? Majority (2 dari 3) cukup — LLM sering menyebut sebagian. */
function alreadyCited(text, anchor) {
  const probe = anchorProbe(anchor);
  if (probe.length < 2) return false;
  const hits = probe.filter((w) => text.toLowerCase().includes(w.toLowerCase())).length;
  return hits >= 2;
}

/** Cek apakah satu artikel geo sudah punya anchor. Dipakai gate qc-uniqueness. */
export function hasGeoAnchor(text, anchor) {
  if (!text || !anchor) return false;
  if (text.includes(ANCHOR_MARKER)) return true;
  const probe = String(anchor)
    .split(/[\s,.;]+/)
    .filter((w) => w.length > 5)
    .slice(0, 3);
  return probe.length >= 2 && probe.every((w) => text.toLowerCase().includes(w.toLowerCase()));
}
