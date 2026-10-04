# BLOG DESIGN MEMORY — socio.id (portal + single post)

> Ditulis 30 Sep 2026 setelah B13–B15 live (`e3ebdd2c`). WAJIB dibaca sebelum ubah
> file apa pun di `landing/src/pages/blog/`, `landing/src/components/Blog*.astro`,
> `landing/src/data/blogHeroes.ts`, `landing/src/data/blogTags.ts`.
> Prinsip: portal berita, rasa Socio (playful premium), jangan jadi koran kaku.

## 1. Bahasa visual (jangan dilanggar)

- Token: `paper/paper-2` bg, `ink/ink-2/ink-3` teks, `accent-ink` fill CTA + link,
  `pop-mango` HANYA aksen kecil (sticker label, marker, badge angka, shadow CTA gelap).
- Chrome sticker = border 2px ink + hard shadow (`shadow-[4px_4px_0_var(--ink)]`).
  Budget: max 4 elemen sticker besar per halaman.
- Font: Sora (`font-display`) headline, Plus Jakarta Sans body. Tidak ada font baru
  (self-host policy — zero third-party).
- Link body: underline mango 2px offset 4. Hover kartu: underline mango + thumb scale.
- Kelas util existing di `global.css`: `.sticker`, `.tilt-*`, `.marker-swipe`,
  `.reveal` (wajib di blok baru agar entrance konsisten).

## 2. /blog index & /blog/page/[n] (portal)

- Hero kompak: breadcrumb pill + headline + stats (artikel, layanan). Bukan hero raksasa.
- Featured: 1 kartu sticker 2-kolom (foto eager + konten + tombol ink). Dipilih:
  kategori Reseller dulu, fallback terbaru.
- Grid: 2 kolom kartu (`BlogCard.astro`) — foto 16/10, sticker kategori miring,
  tag #topik (max 3), tanggal + menit baca. PER_PAGE = 3 dari `rest` (non-featured).
- Sidebar sticky (`BlogSidebar.astro`): Cari (filter judul live) → Topik populer (+count)
  → Kategori (+count) → Terbaru bernomor 01–04 → CTA reseller gelap.
- Filter kombinasi AND (topik + kategori + cari) + `#blog-count` + `#blog-empty`.
  Pagination angka + prev/next, `aria-current="page"`.
- Newsletter: panel ink + shadow mango. Form POST ke `app.socio.id/newsletter`
  (masih 404 — diperbaiki Fase E, jangan ubah action sembarangan).

## 3. Single post [slug]

- Header: mesh blobs + breadcrumb pill + sticker kategori + H1 52px + lead
  (description) + meta penulis + tombol salin-link & share WA + hero sticker + credit.
- Body: main `paper-2` + blobs; artikel = kartu paper terangkat; grid `1fr 320px`.
- Prose: drop-cap paragraf pertama, H2 bernomor otomatis (CSS counter, pill mango),
  tabel sticker (th ink/teks putih, scroll mobile), blockquote mango.
- Sidebar kanan sticky: TOC card → slot iklan → Terbaru → Topik → CTA reseller.
  Mobile: TOC `<details>` di atas, sidebar menumpuk di bawah artikel.
- FAQ accordion bernomor (01–05). CTA sticker press-effect. Related berfoto.
  Author box "Tim Socio.id" (schema Person). DILARANG heading Kesimpulan/Penutup.
- OG image per-artikel dari hero. Reading progress bar tetap.

## 4. Foto (`blogHeroes.ts`)

- 9 ID Unsplash TERVERIFIKASI (dilihat isinya 30 Sep; 2 ditolak: logo Netflix, 404).
  JANGAN tambah ID baru tanpa curl 200 + lihat fotonya.
- Prioritas mapping: pembayaran → uang → platform → aman/tips → default.
  `heroFor` w=1200 (hero+OG), `thumbFor` w=400 (rows/related).
- Credit "Foto: Unsplash" di hero. `img-src https:` di CSP sudah mencakup.

## 5. Iklan (blog-only, JANGAN pasang di money page/home)

- Client `ca-pub-4438184351486735` via `PUBLIC_ADSENSE_CLIENT`. `Layout adsense`
  render meta + pagead2 + loader lazy HANYA di `[slug]`.
- 4 posisi slot: top/mid/bottom (`[slug]`) + sidebar. Slot render HANYA jika
  Slot ID (`PUBLIC_ADSENSE_SLOT_*`) terisi — tanpa itu yang jalan cuma Auto Ads.
- Pelajaran keras: `<script>` Astro tanpa `is:inline` di-hoist keluar conditional.

## 6. SEO yang menempel di theme (jangan copot)

- Schema: Blog/ItemList (`/blog`, arsip), Article+Person+Speakable+FAQPage+Breadcrumb
  (artikel). Semua JSON-LD harus lolos `JSON.parse` (pernah ada template literal
  mentah di Organization — sudah difix via `JSON.stringify`).
- Sitemap lastmod jujur via `seo/fix-sitemap.mjs` (post-build, wire di `build`).
- Canonical self dari Layout. Pagination indexable (bukan noindex).
