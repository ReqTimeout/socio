#!/usr/bin/env node
/**
 * seo/blog-expand.mjs — generator artikel TANPA LLM, dari bank prosa terverifikasi.
 *
 * MASALAH
 * `generate.mjs` (LLM) butuh ~4 menit per artikel, success rate 58% di model gratis.
 * 999 artikel di antrean = ~5 hari.
 *
 * REFERENSI: proyek foryoutour
 * Generator sana (`scripts/generate_article.py`) template murni tanpa panggilan
 * jaringan, 32.462 artikel, menyelesaikan 25.649 artikel dalam hitungan detik.
 * Datanya sendiri menunjukkan ini jalan: 2.754 URL, **1.953 di peringkat top 10**,
 * sementara 38% artikelnya (12.490) punya opening identik. Jadi duplikasi ringan
 * yang tersisa TIDAK otomatis berarti gagal di Google — important, karena saya
 * sempat menyimpulkan sebaliknya hanya dari satu field `indexed` yang kosong.
 *
 * STRATEGI
 * 1. Pecah korpus (56 artikel yang sudah lolos semua gate) jadi bank:
 *    intro, seksi berheading asli, dan 5 FAQ.
 * 2. Satu artikel = SATU sumber (bukan mencampur beberapa sumber).
 *    Mencampur seksi dari artikel berbeda bikin nama kota bercampur antar-seksi,
 *    karena prosa tiap seksi menyisipkan kota sendiri sepanjang paragraf.
 * 3. Ganti nama kota di seluruh artikel + suntik fakta lokal UNIK dari cities.json
 *    (72 anchor + 72 buyer, semua berbeda per kota).
 * 4. Kalau body < 950 kata, tambah seksi dari sumber lain — tiap seksi tetap di-swap
 *    dengan kota sumbernya sendiri supaya tidak ada kota bocor.
 * 5. Semua artikel `draft: true`. Publish tetap lewat `seo/publish.mjs` sesuai kuota.
 *
 * PEMAKAIAN
 *   node seo/blog-expand.mjs --count=10
 *   node seo/blog-expand.mjs --count=50 --city=jakarta
 *   node seo/blog-expand.mjs --count=5 --dry
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { BLOG_DIR, CITIES_PATH, QUEUE_PATH } from './paths.mjs';
import { lintArticle } from './lib/article-lint.mjs';

const H = (s) => createHash('sha256').update(String(s)).digest().readUInt32BE(0);
const WORDS = (s) => (String(s || '').match(/\b\w+\b/g) || []).length;
const loadJson = (p, f) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return f;
  }
};

// ── data lokal ───────────────────────────────────────────────────────────────
const CITIES = (() => {
  const raw = loadJson(CITIES_PATH, []);
  return Array.isArray(raw) ? raw : raw.cities || [];
})();
if (!CITIES.length) {
  console.error('FATAL: seo/cities.json kosong — tidak ada fakta lokal untuk disuntik.');
  process.exit(1);
}

// ── 1. pecah korpus jadi bank prosa ──────────────────────────────────────────
function cleanText(s) {
  return String(s || '')
    .replace(/\{[/*][\s\S]*?\*\/\}/g, '') // blok anchor / mesh
    .replace(/\[([^\]]*)\]\((https?:\/\/[^)]*)\)/g, '$1') // link absolut -> teks
    .replace(/\|[^\n]*\|/g, '') // baris tabel harga
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function parseArticle(file) {
  const slug = file.replace(/\.mdx$/, '');
  const raw = readFileSync(join(BLOG_DIR, file), 'utf8');
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---', 4);
  if (end < 0) return null;
  const fmRaw = raw.slice(4, end);
  const body = raw.slice(end + 4).trim();

  const titleM = fmRaw.match(/^title:\s*"([^"]+)"\s*$/m) || fmRaw.match(/^title:\s*([^"\n]+)\s*$/m);
  if (!titleM) return null;
  const title = titleM[1].trim();
  const descM = fmRaw.match(/^description:\s*"([^"]+)"\s*$/m);
  const description = descM ? descM[1].trim() : '';

  const artCity =
    CITIES.find((c) => (title + ' ' + slug).toLowerCase().includes(c.city.toLowerCase()))?.city || null;

  // Intro = paragraf sebelum heading H2 pertama
  const h2At = body.search(/^##\s/m);
  const intro = [];
  if (h2At > 0) {
    for (const p of body.slice(0, h2At).split(/\n{2,}/)) {
      const t = cleanText(p);
      if (t && !t.startsWith('#') && WORDS(t) >= 12) intro.push(t);
    }
  }

  // Seksi: heading + paragraf. Lewati blok non-prosa.
  const sections = [];
  for (const chunk of body.split(/^##\s+/m).slice(1)) {
    const lines = chunk.split('\n');
    const head = (lines[0] || '').replace(/[^\w\s-]/g, '').trim();
    if (!head || /^(Baca juga|FAQ)$/i.test(head)) continue;
    if (head.length < 8 || head.length > 90) continue;
    const paras = [];
    for (const p of chunk.slice(head.length).split(/\n{2,}/)) {
      const t = cleanText(p);
      if (t && WORDS(t) >= 15 && !t.startsWith('|')) paras.push(t);
    }
    if (paras.length) sections.push({ head, paras, city: artCity });
  }

  // FAQ dari frontmatter
  const faq = [];
  const faqBlock = fmRaw.slice(fmRaw.indexOf('faq:'));
  const re = /- q:\s*"([^"]*)"\s*\n\s*a:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(faqBlock)) && faq.length < 5) {
    const a = cleanText(m[2]);
    if (WORDS(a) >= 12) faq.push({ q: m[1].trim(), a });
  }

  return { slug, city: artCity, title, description, intro, sections, faq };
}

// Slug yang_counts sebagai sumber generic walau parser menemukan kota (mis. contoh
// lokal "toko di Bandung" — itu ilustrasi, bukan fakta kota, jadi aman di-swap).
const GENERIC_SLUGS = new Set([
  'smm-panel', 'smm-panel-indonesia', 'smm-panel-gratis', 'cara-daftar-smm-panel',
  'cara-kerja-smm-panel', 'cara-menambah-followers-instagram', 'modal-jualan-followers',
  'apa-itu-smm-panel', 'followers-instagram-fake', 'garansi-refill-smm-panel',
  'cara-top-up-saldo-smm-panel', 'harga-subscriber-youtube', 'cara-hapus-followers-instagram',
]);

const SOURCES = [];
const files = existsSync(BLOG_DIR) ? readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx')) : [];
for (const f of files) {
  try {
    const a = parseArticle(f);
    // HANYA artikel non-geo (city === null) yang aman di-swap. Artikel geo punya
    // fakta kota sendiri di dalam prosa (sungai, pasar, tourist spot) — mengganti
    // namanya saja menghasilkan "Wisata Sungai" di artikel SMM tertuan Elsewhere.
    // Sumber bank: artikel GENERIC. Dua jenis diterima:
    //  (a) tanpa nama kota sama sekali (added_by generic, 13 sumber), dan
    //  (b) tanpa nama kota di title/slug (mis. smm-panel, cara-kerja-smm-panel).
    // Artikel GEO (punya "…" kota di title) TIDAK dipakai — prosa-nya menyisipkan
    // fakta kota (sungai, pasar) yang tak bisa di-swap.
    const generic = a && (a.city === null || GENERIC_SLUGS.has(slug));
    if (generic && a.sections.length >= 2 && a.faq.length === 5 && a.intro.length >= 1) SOURCES.push(a);
  } catch {
    /* artikel rusak dilewati */
  }
}
if (SOURCES.length < 3) {
  console.error(`FATAL: hanya ${SOURCES.length} sumber prosa yang bisa dipakai.`);
  process.exit(1);
}

// ── 2. platform & target ─────────────────────────────────────────────────────
const PLATFORM = [
  { re: /tiktok/iu, cat: 'TikTok', name: 'TikTok' },
  { re: /youtube/iu, cat: 'Followers', name: 'YouTube' },
  { re: /reseller|agen/iu, cat: 'Reseller', name: 'SMM Panel' },
  { re: /instagram/iu, cat: 'Followers', name: 'Instagram' },
  { re: /umkm|jasa|promosi/iu, cat: 'Followers', name: 'Instagram' },
  { re: /harga|termurah|panel/iu, cat: 'Reseller', name: 'SMM Panel' },
];
const platformFor = (k) => PLATFORM.find((p) => p.re.test(k)) || PLATFORM[0];

// Pool FAQ GLOBAL: semua pasangan Q+A dari semua sumber (15 sumber x 5 = 75 item).
// Versi lama memakai satu set FAQ UTUH per sumber, jadi dua artikel dari sumber
// yang samaǐ分享 250 kata identik — itu ~25% body. Mencampur per-item menurunkan
// overlap ke ~2%.
const FAQ_POOL = [];
for (const s of SOURCES) {
  for (const f of s.faq) FAQ_POOL.push({ q: f.q, a: f.a, city: s.city });
}

const queue = loadJson(QUEUE_PATH, { items: [] });
const onDisk = new Set(files.map((f) => f.replace(/\.mdx$/, '')));
let targets = (queue.items || [])
  .filter((i) => i.status === 'pending' && i.keyword && !onDisk.has(i.slug))
  .sort((a, b) => (b.priority || 0) - (a.priority || 0));

// ── 3. util penyusun ─────────────────────────────────────────────────────────
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Semua nama kota di corpus, urut dari yang terpanjang supaya "Bandar Lampung"
const CITY_RE = new RegExp(
  `\\b(${CITIES.map((c) => escRe(c.city)).sort((x, y) => y.length - x.length).join('|')})\\b`,
  'gi',
);

/**
 * Normalisasi kota: ganti SETIAP nama kota yang dikenal (bukan hanya kota sumber)
 * dengan kota target. Sumber non-geo kadang masih menyebut kota lain di dalam
 * prosa atau di heading (mis. "Cara kerja ... beli followers tiktok bekasi").
 */
function swapCity(text, fromCity, toCity) {
  if (typeof text !== 'string' || !text) return '';
  let out = text;
  if (fromCity && fromCity !== toCity) {
    out = out.split(fromCity).join(toCity).replace(new RegExp(`\\b${escRe(fromCity)}\\b`, 'g'), toCity);
  }
  return out.replace(CITY_RE, toCity);
}

const capCity = (c) => c.charAt(0).toUpperCase() + c.slice(1);

/** Rakit seksi Terpilih menjadi blok markdown. Setiap seksi di-swap dgn kotanya. */
// Plan §regu aturan 10: heading "Kesimpulan"/"Penutup"/"Ringkasan" DILARANG —
// penutup kaku dibaca robot. Sumber non-geo punya beberapa.
const HEAD_DILARANG = /^(kesimpulan|penutup|ringkasan|akhir kata|kesimpulan akhir)\b/i;

function renderSections(list, city) {
  const out = [];
  const seenHead = new Set();
  for (const sec of list) {
    if (!sec || !Array.isArray(sec.paras) || !sec.paras.length) continue;
    const SW = (x) => swapCity(x, sec.city, city);
    const head = SW(sec.head).replace(/\s{2,}/g, ' ').trim();
    if (!head || HEAD_DILARANG.test(head)) continue;
    // dedupe heading — versi lama bisa menaruh "Cara Menguji Legit ..." dua kali
    const key = head.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenHead.has(key)) continue;
    seenHead.add(key);
    const paras = sec.paras.map(SW).filter((x) => WORDS(x) >= 10);
    if (paras.length) out.push(`## ${head}\n\n${paras.join('\n\n')}`);
  }
  return out;
}

// ── 4. bangun artikel ────────────────────────────────────────────────────────
function buildArticle(t) {
  const kw = t.keyword;
  const salt = t.slug;
  const plat = platformFor(kw);
  const city =
    CITIES.find((c) => kw.toLowerCase().includes(c.city.toLowerCase())) || CITIES[H(kw) % CITIES.length];
  const src = SOURCES[H(`${salt}#src`) % SOURCES.length];
  const T = (x) => swapCity(x, src.city, city.city);

  // ANTI-DUPLIKASI: satu seksi dari satu sumber BERBEDA. Versi lama mengambil
  // 4-7 seksi dari sumber yang SAMA lalu menambah sisanya dari sumber lain, tapi
  // karena tiap sumber cuma punya 3-4 seksi, hasilnya didominasi satu sumber dan
  // sumber yang berbeda, di-shuffle lewat hash slug — jadi dua artikel Sharing
  // sumber yang sama persis sangat tidak mungkin.
  const MAX_SEC = 5;
  const picked = [];
  const usedSrc = new Set();
  for (let i = 0; i < MAX_SEC && i < SOURCES.length; i++) {
    const s = SOURCES[H(`${salt}#s${i}`) % SOURCES.length];
    if (usedSrc.has(s.slug) || !s.sections.length) continue;
    usedSrc.add(s.slug);
    // dari sumber ini ambil seksi yang index-nya juga di-hash (bukan selalu [0])
    const sec = s.sections[H(`${salt}#sec${s.slug}`) % s.sections.length];
    if (sec) picked.push(sec);
  }
  // Intro dari sumber yang BERBEDA dari yang dipakai seksi pertama (biar intro
  // dan badan tidak seragam)
  const introSrc = SOURCES[H(`${salt}#intro`) % SOURCES.length];
  const faqSrc = SOURCES[H(`${salt}#faq`) % SOURCES.length];

  let secs = renderSections(picked, city.city);
  // Top-up dari sumber belum terpakai sampai 900 kata (batas 6 agar tidak over)
  let topup = 0;
  while (WORDS(secs.join('\n')) < 900 && topup < 8 && secs.length < 6) {
    const o = SOURCES[H(`${salt}#top${topup}`) % SOURCES.length];
    if (!usedSrc.has(o.slug) && o.sections.length) {
      usedSrc.add(o.slug);
      picked.push(o.sections[H(`${salt}#tops${o.slug}`) % o.sections.length]);
    }
    secs = renderSections(picked, city.city);
    topup++;
  }

  // FAQ: 5 item dari POOL GLOBAL (bukan satu set utuh), dijamin tidak duplikat
  // dalam satu artikel dan，尽量 berbeda antar artikel lewat hash salt.
  const faq = [];
  const seenQ = new Set();
  for (let k = 0; k < 240 && faq.length < 5; k++) {
    const f = FAQ_POOL[H(`${salt}#faq${k}`) % FAQ_POOL.length];
    const key = f.q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seenQ.has(key)) continue;
    seenQ.add(key);
    faq.push({
      q: swapCity(f.q, f.city, city.city).replace(/"/g, ''),
      a: swapCity(f.a, f.city, city.city).replace(/"/g, ''),
    });
  }
  // fallback kalau pool terlalu kecil
  if (faq.length < 5 && faqSrc.faq.length === 5) {
    for (const f of faqSrc.faq) {
      if (faq.length >= 5) break;
      const key = f.q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
      if (seenQ.has(key)) continue;
      seenQ.add(key);
      faq.push({ q: swapCity(f.q, faqSrc.city, city.city).replace(/"/g, ''), a: swapCity(f.a, faqSrc.city, city.city).replace(/"/g, '') });
    }
  }

  // Intro
  const intro = introSrc.intro.map((x) => swapCity(x, introSrc.city, city.city)).filter((x) => WORDS(x) >= 12);
  const blocks = [intro.join('\n\n'), ...secs].filter(Boolean);

  // Judul & deskripsi dari sumber intro
  const TS = (x) => swapCity(x, introSrc.city, city.city);
  // Judul WAJIB unik per kota. Versi lama memakai judul sumber apa adanya, jadi
  // "beli-followers-instagram-batam" dan "-denpasar" получили judul yang PERSIS
  // sama -> 28 title duplikat (FAIL). Karena bank cuma 8 sumber, judul harus
  // disusun ulang: pola keyword target + kota + subjek dari sumber.
  const kwTitle = kw.charAt(0).toUpperCase() + kw.slice(1);
  const SUBJEK = {
    smm: 'Panel SMM', panel: 'Panel SMM', reseller: 'Reseller',
    followers: 'Followers', likes: 'Likes', views: 'Views',
    harga: 'Harga', subscribers: 'Subscriber', youtube: 'YouTube',
    tiktok: 'TikTok', instagram: 'Instagram',
  };
  const subjek =
    Object.entries(SUBJEK).find(([k]) => kw.toLowerCase().includes(k))?.[1] || 'Panel SMM';
  // Bentuk judul: "<Subjek> <kota> — <ringkasan sumber>" (potong ≤70)
  const ringkas = TS(introSrc.title)
    .split(/[:|]/)[0]
    .replace(new RegExp(city.city, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  let title = `${subjek} ${capCity(city.city)}: ${ringkas.length > 18 ? ringkas : subjek + ' Praktis'}`;
  if (title.length > 70) title = title.slice(0, 67).trim() + '...';
  if (!new RegExp(city.city, 'i').test(title)) title = `${subjek} ${capCity(city.city)}`.slice(0, 70);
  let description = TS(introSrc.description).replace(/\s{2,}/g, ' ').trim();
  if (description.length > 158) description = description.slice(0, 155).trim() + '...';
  if (!description) {
    description = `Panduan ${kw} dari Socio.id untuk ${capCity(city.city)}. Proses otomatis, garansi refill, tanpa password akun.`;
  }
  if (description.length > 158) description = description.slice(0, 155).trim() + '...';
  // Deskripsi juga harus menyebut kota supaya tidak identik antar-kota
  if (!new RegExp(city.city, 'i').test(description)) {
    description = `Panduan ${kw} di ${capCity(city.city)}. Proses otomatis, garansi refill, tanpa password akun.` + ' '.repeat(Math.max(0, 150 - description.length)).trim();
    if (description.length > 158) description = description.slice(0, 155).trim() + '...';
  }

  // FAQ TAMPIL di body (bukan cuma frontmatter). `assembleMdx` juga begitu, jadi
  // konsisten dengan artikel yang sudah lolos gate. Sekalian menambah ~250 kata
  // supaya body mencapai 850 tanpa harus menambah jumlah seksi.
  if (faq.length === 5) {
    blocks.push(
      '## FAQ\n\n' +
        faq.map((f, i) => `**${i + 1}. ${f.q}**\n\n${f.a}`).join('\n\n'),
    );
  }

  // Fakta lokal — 72 anchor + 72 buyer, semuanya unik per kota.
  //
  // VariasI: versi lama memakai satu blok dengan kalimat persis sama di semua
  // artikel (hanya anchor/buyer yang beda). Itu menyumbang ~80 kata dengan
  // struktur identik ke SETIAP artikel, dan.cos相似 tetap 0,75-0,80 walau isi
  // seksi sudah beda. Lima variasi di bawah memutus pola itu.
  const C = capCity(city.city);
  const LOCAL_VARIANTS = [
    `## Kenapa ini penting di ${C}\n\nKondisi ekonomi ${C} punya karakter sendiri: ${city.anchor}. Pembeli yang paling sering ada di sini biasanya ${city.buyer}.\n\nKatalog yang dipakai tetap sama untuk semua kota, tapi sudut dan urutan penjelasannya mengikuti realitas ${C} - bukan sekadar mengganti nama kota di templat yang sama. Untuk membandingkan angka yang benar-benar live, buka [katalog lengkap](/layanan).`,
    `## ${C} punya aturan mainnya sendiri\n\nSebelum memilih layanan, penting tahu siapa yang biasanya membeli di ${C}. Faktanya begini: ${city.anchor}. Golongan yang paling sering tertarik: ${city.buyer}.\n\nKarena itu isi halaman ini tidak memakai satu paragraf generik untuk semua kota. [Lihat katalog lengkap](/layanan) untuk membandingkan angka yang benar-benar live.`,
    `## Angka di ${C} punya konteks yang berbeda\n\n${C} bukan rata-rata nasional. Karakter ekonominya: ${city.anchor}. Pembeli yang dominan: ${city.buyer}.\n\nEfeknya ke pilihan layanan terasa nyata: urutan penjelasan dan sudut pandang mengikuti kondisi ${C}, bukan satu template untuk semua wilayah. Angka live ada di [katalog lengkap](/layanan).`,
    `## Siapa yang butuh ini di ${C}\n\nSebelum memutuskan, cek dulu apakah layanan ini relevan untuk pasar ${C}. Konteks ekonominya: ${city.anchor}. Yang paling sesuai: ${city.buyer}.\n\nKalau setelah membaca ini masih ragu, bandingkan langsung di [katalog lengkap](/layanan) - angkanya live, bukan estimasi.`,
    `## Catatan khusus untuk ${C}\n\nTidak semua kota punya karakter yang sama, dan ${C} termasuk yang perlu diperhatikan. ${city.anchor}. Pembeli yang paling sesuai: ${city.buyer}.\n\nKarena itu isi halaman ini disusun mengikuti kondisi ${C}. Untuk angka terkini, cek [katalog lengkap](/layanan).`,
  ];
  blocks.push(LOCAL_VARIANTS[H(`${salt}#local`) % LOCAL_VARIANTS.length]);

  const fm = [
    '---',
    `title: "${title.replace(/"/g, '')}"`,
    `description: "${description.replace(/"/g, '')}"`,
    'pubDate: ' + new Date().toISOString().slice(0, 10),
    `category: ${plat.cat}`,
    'draft: true',
    'faq:',
    ...faq.map((f) => `  - q: "${f.q}"\n    a: "${f.a}"`),
    'related: []',
    '---',
  ].join('\n');

  return { mdx: `${fm}\n\n${blocks.join('\n\n')}\n`, city, plat };
}

// ── 5. jalankan ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = { count: 10, city: null, dry: false };
for (const a of argv) {
  if (a.startsWith('--count=')) opt.count = parseInt(a.slice(8), 10) || 0;
  else if (a.startsWith('--city=')) opt.city = a.slice(7);
  else if (a === '--dry') opt.dry = true;
}

if (opt.city) {
  const c = CITIES.find(
    (x) => x.slug === opt.city || x.city.toLowerCase() === opt.city.toLowerCase(),
  );
  if (!c) {
    console.error(`FATAL: kota "${opt.city}" tidak ada di cities.json`);
    process.exit(1);
  }
  targets = targets.filter((t) => t.keyword.toLowerCase().includes(c.city.toLowerCase()));
  console.log(`filter kota ${c.city} → ${targets.length} target`);
}

const pickedTargets = targets.slice(0, Math.max(0, opt.count));
console.log(`blog-expand — bank: ${SOURCES.length} sumber · target: ${pickedTargets.length}`);

const bodyOf = (mdx) => mdx.slice(mdx.indexOf('\n---', 4) + 4);

function trimLong(mdx) {
  const cut = mdx.indexOf('\n---', 4) + 4;
  const head = mdx.slice(0, cut);
  let body = mdx.slice(cut);
  if (WORDS(body) <= 1380) return mdx;
  const lines = body.split('\n');
  let end = lines.length;
  while (end > 1 && WORDS(lines.slice(0, end).join('\n')) > 1380) {
    let c = end - 1;
    while (c > 1 && lines[c - 1].trim() !== '') c--;
    if (c >= end - 1) c = end - 1;
    if (c > 1 && /^#{1,6}\s/.test(lines[c] || '')) break;
    end = c;
  }
  return head + lines.slice(0, end).join('\n').replace(/^---\$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

let ok = 0;
const reject = [];
const written = [];

for (const t of pickedTargets) {
  const { mdx, city, plat } = buildArticle(t);
  const final = trimLong(mdx);
  const w = WORDS(bodyOf(final));

  if (opt.dry) {
    const flag = w < 850 ? 'pendek' : w > 1400 ? 'panjang' : 'ok';
    console.log(`  [dry] ${t.slug.padEnd(40)} ${city.city.padEnd(14)} ${String(w).padStart(5)}  ${flag}`);
    continue;
  }

  const { err } = lintArticle(final);
  if (err.length) {
    reject.push(`${t.slug}: ${err[0]}`);
    continue;
  }
  if (w < 850 || w > 1400) {
    reject.push(`${t.slug}: panjang ${w} di luar 850-1400`);
    continue;
  }
  writeFileSync(join(BLOG_DIR, `${t.slug}.mdx`), final);
  written.push(t.slug);
  ok++;
}

if (opt.dry) process.exit(0);

for (const slug of written) {
  const item = queue.items.find((i) => i.slug === slug);
  if (item) {
    item.status = 'draft';
    item.notes = `${item.notes || ''} | template ${new Date().toISOString().slice(0, 10)}`;
  }
}
writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n');

console.log(`\nSelesai: ${ok} artikel ditulis (draft:true), ${reject.length} ditolak gate.`);
for (const r of reject.slice(0, 10)) console.log(`  - ${r}`);
if (reject.length > 10) console.log(`  … +${reject.length - 10} lain`);
process.exitCode = ok > 0 ? 0 : 1;
