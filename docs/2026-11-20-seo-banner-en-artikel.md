# Jurnal — Banner EN socio.id untuk Image Artikel SEO (J4) — 20 Nov 2026

> **Status: LIVE.** Deploy Cloudflare Pages `796d0de4` (production, `status=success`,
> created `2026-11-19T18:24:15Z` ≈ 20 Nov 01:24 WIB). Commit runner `0f12c59` di
> `ReqTimeout/socio-seo-runner` `main` (parent `d82b326`, 236 file: 231 webp + 5 teks).
> Monorepo `e6bc7cc` = `origin/main` (4 commit granular: `d5ea4d7` aset, `adb1bd6`
> data+mapping, `049acd3` halaman+sitemap, `e6bc7cc` sync keyword). Dua gate L3 fresh
> (owner: "Run L3 deep security review") **0 findings**. GO owner: **"ini dulu pastikan
> semua keyword terpublish dan baru km bisa pakai banner ini yang bahasa inggris untuk
> image2 artikel"** (baris P4.4 "SEO J-remainder").

## 1. Kontrak owner & scope

Owner minta dua hal berurutan: (1) pastikan semua keyword terpublish, (2) baru pakai
banner bahasa Inggris dari `minimax-image/socio.my image` untuk image artikel. Keputusan
owner via AskUserQuestion:
- **Pace publish**: "Biarkan 20/hari (~31 hari)" — pipeline jalan sendiri, tanpa intervensi.
- **Banner**: "Re-render branding socio.id" — render ulang overlay dari cache `_art`
  socio.my dengan branding socio.id/app.socio.id, teks EN, **0 request API**.
- **720 keyword baru**: "Approve semua 720" — terverifikasi sudah owner-approved
  (24 Okt) di state live; total 1614 approved+promoted.

Teks EN pada artwork banner = pengecualian yang disetujui owner (aturan bahasa repo
tetap Indonesia untuk komentar/docs/UI/commit). Alt text EN mengikuti artwork.

## 2. State keyword & publish (terverifikasi live)

- `keywords.geo.json`: **1614 approved+promoted** (owner 24 Okt). Salinan monorepo
  basi (894 approved/720 pending) → di-sync dari state live runner, commit `e6bc7cc`.
- Queue **1853 MDX** (semua ter-generate, **0 gap**); **1226 terpublish**, **627 draft**.
- Publish harian `daily_count=20` (min 1, maks 20, halt false). Sisa 627 ÷ 20 ≈ **31 hari**.
- Cron host `/etc/cron.d/seo-publish-git` (08:15 UTC) → `publish-git.mjs --count=20`
  (flip `draft:false` + commit git, tanpa build di container). Deploy Pages otomatis
  tiap push `main`. Commit publish 17/18/19 Nov @20 artikel — sehat.
- Sitemap live: **1377 loc**, **1329 blog loc**, **1226 `<image:image>`** (1 per artikel
  terpublish). Index rate 84.8%.

## 3. Pack banner (render ulang, 0 API)

- Renderer `minimax-image/socio_id_pack.py` dari cache artwork `socio.my image/_art`
  (overlay teks di-render ulang, bukan generate baru) → **231 webp** = **77 base** ×
  hero (`1200×675`) / og (`1200×630`) / thumb (`400×210`), total ≈ 11 MB, 0 gagal.
- Output pack: `minimax-image/socio.id image/` (webp + `manifest.json` 231 entri +
  `manifest.csv`). Branding socio.id/app.socio.id, alt "Indonesia" (bukan Malaysia).
- **Dua base platform-only** (tanpa suffix type): `reseller-agent` (type panel) dan
  `press-release` (type distribution). Sisanya `platform-type`.

## 4. Integrasi ke landing (mapping deterministik, fallback terjaga)

- `landing/src/data/blogBanners.ts` — data 77 `{base, alt}` dari manifest (hero).
- `landing/src/data/blogHeroes.ts` — `bannerFor/heroFor/thumbFor/ogFor`. Banner-first,
  fallback Unsplash **terjaga** (hanya bila base tak ada). Fix `resolveBase()`: coba
  `platform-type` dulu, lalu `platform-only` (untuk reseller-agent/press-release);
  default `discord:"members"`. Urutan token `reviews` sebelum `views` (kritikal).
- `landing/src/pages/blog/[slug].astro` — hero `<img>` = `heroFor`; `og:image` +
  `twitter:image` + schema `Article.image` = `ogFor` (URL absolut) ?? hero;
  `figcaption` = "Ilustrasi: Socio.id" bila banner, "Foto: Unsplash" bila fallback.
- `landing/astro.config.mjs` — `sitemap.serialize()` tambah `item.img=[{url}]` untuk
  URL blog (bukan `page`); `categoryOf()` baca frontmatter MDX agar base cocok dengan
  hero halaman. Runtime `sitemap@9.0.1` render `<image:image>` (namespace image aktif).
- `seo/fix-sitemap.mjs` — regex di-update agar **mempertahankan child `<image:image>`**
  saat ganti `lastmod` (regex lama putus bila ada image). Unit-test 5 kasus lulus.
- Konsumen thumb (blog/index, RelatedArticles, BlogSidebar, BlogCard, ArticleRow)
  otomatis dapat banner via fungsi shared — tanpa edit terpisah.

## 5. Bug ditemukan & difix

1. **225 slug missing base `reseller-agent-panel`** (dry-run): mapping bangun
   `platform-type` padahal pack pakai `reseller-agent` (platform-only). Fix
   `resolveBase()` + default discord. Dry-run ulang: **0 missing** (1853 slug).
2. **Regex fix-sitemap putus dengan image child** — diganti capture `([\s\S]*?)`
   untuk pertahankan image + ganti lastmod.
3. **237 file junk AppleDouble `._*`** di repo runner (dari `tar` macOS yang embed
   xattr `com.apple.provenance`). `ls *.webp` skip dotfile (231) tapi `readdirSync`
   hitung 462 → pre-check apply **abort fail-fast** (sebelum commit). Cleanup
   `find landing seo -name '._*' -type f -delete` → 0 junk; 5 teks sha256 tetap cocok.
   Pencegahan ke depan: `COPYFILE_DISABLE=1 tar czf`.

## 6. Gate & deploy

- `astro check` **0 error/0 warning** (35 hint); `build` sukses; prettier bersih pada
  file tersentuh (347 fail prettier landing = pre-existing di HEAD, tidak disentuh).
- 4 commit granular monorepo → L3 fresh **0 findings** → push FF `9b2ecbf..e6bc7cc`
  + re-sync ref `origin/main`.
- Runner: file di-transfer (tar→scp→docker cp), sha256 5 teks **identik** monorepo↔runner.
  Apply dipisah **fase commit** (pre-check 231 webp/0 junk → add 6 path → staged 236 →
  commit `0f12c59`) lalu **gate L3 fresh** (owner: Run L3, **0 findings**) lalu **fase
  push** (`pull --ff-only` → `push origin HEAD:main`). Auth `GITHUB_TOKEN` extraHeader
  basic (token tidak pernah di-print), replikasi `publish-git.mjs`.
- Pages `796d0de4` build+deploy **success** (~85s+). Tanpa race cron (host 18:13 UTC,
  publish berikutnya 08:15 UTC 20 Nov).

## 7. Verifikasi live (read-only)

- Aset: `hero-layanan-en-1200x675.webp` HTTP 200 `image/webp` (81626 byte);
  `og-layanan`, `hero-apa-itu-socio` 200 webp.
- Sitemap: 1226 `<image:image>` → `/img/banner/hero-*.webp`, namespace
  `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` declared.
- Artikel `agen-smm-panel-bandung` (base reseller-agent): hero
  `hero-reseller-agent-en-1200x675.webp` (1200×675, fetchpriority=high, aspect-16/9);
  `og:image`/`twitter:image`/schema `image` = `og-reseller-agent-en-1200x630.webp`
  (absolut); figcaption "Ilustrasi: Socio.id"; alt EN branding app.socio.id;
  thumb related = banner (layanan/reseller-agent/tiktok-followers).
- `apa-itu-panel-smm` → base `apa-itu-socio` (rule `/^apa-itu/`);
  `berapa-harga-followers-bandung` → `instagram-followers` (kategori frontmatter).
- Blog index: **0 Unsplash** — semua thumb banner (instagram-followers ×8, layanan ×7,
  order-pertama ×1, featured hero-layanan). JSON-LD `"@type":"Article"` ada; robots.txt
  lengkap (Sitemap reference + AI allowlist).

## 8. Reproducibility (generator dipersist)

Header `blogBanners.ts` menjanjikan "regenerate via skrip generate-blog-banners" —
skrip itu belum ada. Dipersist **`seo/generate-blog-banners.mjs`**: baca manifest pack
(`crop=banner`/hero), derive `base` dari filename, alt verbatim, sort, emit
`blogBanners.ts`. Pakai:
`node seo/generate-blog-banners.mjs "<path>/socio.id image/manifest.json" [out.ts]`.
Terverifikasi **idempoten**: regen → `diff` vs committed = **0** (77 base), prettier-clean.
Manifest sumber ada di `minimax-image/` (di luar repo, sisi laptop) — output
`socio_id_pack.py`. Skrip ini dev-tool sisi monorepo; tidak dipakai saat build live
(data `blogBanners.ts` sudah ter-commit di runner), jadi **tanpa re-deploy runner**.

## 9. Sisa / follow-up

- **627 draft** terpublish otomatis 20/hari (~31 hari) oleh cron existing — tanpa
  intervensi (keputusan owner). Banner sudah otomatis terpakai untuk artikel baru
  (mapping deterministik via `bannerFor`, semua base tersedia).
- Scanner CJK/Melayu: hit `socio.my` hanya di komentar provenance (sumber artwork) =
  wajar, diizinkan scanner; aset/URL/alt semua socio.id/EN.
- Tidak ada perubahan tech stack/struktur folder. Folder lama tidak disentuh.