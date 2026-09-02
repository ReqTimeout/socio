# SEO Keyword Research — socio.id

> Prosedur repeatable untuk expand & validate keyword queue.
> Token-cheap: 0 token AI (hanya Google Suggest free + heuristic).
> Update: tiap ada batch baru (cron mingguan + on-demand setelah GSC sync).

---

## 0. Prinsip

Spec LANDING_SEO_SYSTEM.md §0:
- **150-300 keyword terkurasi** (bukan 12k)
- Ekspansi HANYA dari GSC (demand nyata)
- 5 kategori: AEO/definisi (p90), how-to (p85), keamanan (p80), reseller (p75), trend/long-tail (p40 — KOSONG sebelum GSC data)

Anti-pattern beriklan: kejar volume thin content → helpful content risk. **Quality + internal mesh + freshness.**

---

## 1. Sumber keyword (urutan prioritas)

| # | Sumber | Cara | Demand signal |
|---|---|---|---|
| 1 | **prices.json (katalog layanan)** | Iterate `top[]` services + manual kurasi EXTRA_BASES (live viewers, comments, story, reels, spotify, twitter, facebook) | High (real products) |
| 2 | **Google Suggest ID region** | depth-1 (langsung) + depth-2 (recursion top-3 suggs) untuk seeds: `jasa viewers tiktok`, `beli live viewers`, `beli komentar tiktok`, `beli story views`, `beli spotify plays`, `beli retweet twitter`, `beli share facebook`, `beli reels views` | Real search patterns |
| 3 | **Existing blog posts** | Manual review D7 (3 seed articles) → extract keyword mereka | Internal mesh |
| 4 | **GSC mingguan** | Query impresi ≥20 tanpa URL cocok → tambah queue (p=40+imps/5) | Real traffic |
| 5 | **YouTube/Bing Suggest** | Optional — p40 long-tail | Trend (belum dipakai) |
| 6 | **Money pages** | 10 page `/beli-*` sudah jadi money intent — tidak masuk blog queue | Money intent |

---

## 2. Prosedur expand

### 2.1 Sumber katalog (services + intent)

File: `seo/s2b-expand.mjs`

**Input**: `landing/src/data/prices.json` (`top[]` 14 services + 7 platforms counts)

**Manual EXTRA_BASES** (dibuat karena top14 TIDAK cover beberapa layanan high-volume):
- TikTok LIVE: `live viewers tiktok`, `viewers tiktok live`, `live streaming tiktok`, `tiktok live viewers`, `penonton live tiktok`, `jasa live tiktok`, dll
- YouTube LIVE: `live viewers youtube`, `viewers youtube live`, `jasa live youtube`
- Instagram LIVE: `live viewers instagram`, `viewers instagram live`
- Comments: `beli komentar tiktok`, `beli komentar youtube`, `beli komentar instagram`, `jasa komentar tiktok`
- Story / Reels: `beli story views instagram`, `beli reels views`, `beli reels likes`, `beli reels plays`
- Spotify: `beli spotify plays`, `beli spotify streams`, `beli spotify listeners`
- Twitter/X: `beli retweet twitter`, `beli likes twitter`, `beli tweet views`
- Facebook: `beli share facebook`, `beli page likes facebook`
- AEO smm panel: `smm panel termurah`, `smm panel terbaik`

### 2.2 Prefix × suffix matrix

PREFIX_COMMERCIAL = `beli | jasa | order`
SUFFIX_COMMERCIAL = `murah | aman | gratis` (subset untuk limit noise)

Formula per base:
- plain: `<base>` → prio 85
- prefix: `<prefix> <base>` → prio 85
- prefix+suffix: `<prefix> <base> <suffix>` → prio 80

**Skip rules** (`isNoDouble`, `shouldSkipPrefix`):
- Skip consecutive prefix di awal (`beli jasa X`, `jasa beli X`) → grammatik Aneh
- Skip duplicate prefix/suffix anywhere
- Skip prefix kalau base starts with action verb (`beli tambah X` → keep `tambah X` only)

### 2.3 Normalize service name

`prices.top[].name` seperti "Instagram Followers" perlu di-reverse jadi "followers instagram" untuk search intent. Helper `normalizeServiceName(name, platform)`:
- Strip "paling murah", "(...)"
- Kalau kata pertama = platform, reverse order

**Bug fix sebelumnya**: normalize Twitter/X followers dengan "X/" → split jadi ["x", "followers"] tidak match platform "X/Twitter" → output jadi "x followers twitter" (bukan "followers x/twitter"). Heuristik `startsWith`/`startsWith reversed` handle sebagian.

### 2.4 Autocomplete depth

```js
const AUTOCOMPLETE_SEEDS = [
  'jasa view live tiktok', 'jasa viewers tiktok', 'jasa live tiktok',
  'view live tiktok', 'live viewers tiktok', 'viewers tiktok live',
  'beli viewers tiktok', 'beli live viewers tiktok',
  'beli komentar tiktok', 'beli komentar youtube',
  'beli story views instagram', 'beli reels views',
  'beli spotify plays', 'beli followers spotify', 'beli retweet twitter',
  'beli share facebook', 'beli reels likes',
  'jasa reels views', 'live streaming tiktok',
];

for (const seed of AUTOCOMPLETE_SEEDS) {
  const sgs = await suggest(seed);            // depth-1
  for (const sg of sgs.slice(0, 2)) {
    const sgs2 = await suggest(sg);           // depth-2
    out.push(...sgs2);
  }
}
```

API: `https://suggestqueries.google.com/complete/search?client=firefox&hl=id&q=<query>` — FREE, no auth. Timeout 5s.

### 2.5 Demand signal mapping

Setelah autocomplete:
- ≥6 suggs → `high`
- 3-5 suggs → `medium`
- 1-2 suggs → `low`
- 0 suggs → `aeo` (definisi/AEO — AI Overview & PAA converts well untuk SaaS)

### 2.6 Sort + cap

Composite score = `priority + demand_weight * 5` (w: high=4, medium=3, aeo=2, low=1).
Sort DESC, cap at **150** (spec §0 target fase1).

Cap alasan: hindari thin content. Setelah GSC data tersedia, ekspansi ke 200-300 bertahap.

---

## 3. Usage

### 3.1 Expand (dry-run)

```bash
node seo/s2b-expand.mjs --dry
```

Output: stats + top 50 final. Tidak write file.

### 3.2 Expand + write

```bash
node seo/s2b-expand.mjs
```

Append ke `seo/queue.json` `items[]`. Update `_meta.updated` + `_meta.note`.

### 3.3 Validasi sort order

```bash
node seo/s2b-expand.mjs --dry 2>&1 | head -60
```

Top 50 harusnya: service_base head terms (high demand ≥6 suggs), LIVE/viewers variants, AEO, money-intent long-tail.

---

## 4. Schema queue item

```ts
{
  keyword: string,           // lowercase, spasi
  priority: 90 | 85 | 80 | 75 | 40,
  category: 'definisi' | 'howto' | 'keamanan' | 'reseller',
  status: 'pending' | 'draft' | 'published' | 'skipped',
  slug: string,               // kebab-case, ≤80 char
  cluster: string,            // instagram | tiktok | youtube | telegram | facebook | twitter | spotify | live | story | komentar | smm-panel | lainnya
  demand_signal: 'high' | 'medium' | 'low' | 'aeo',
  autocomplete_count: number, // 0-10
  kd_estimate: 'low' | 'medium' | 'high',
  notes: string?,             // observasi/GSC findings
  added_by: 'seed' | 'autocomplete' | 'katalog' | 'gsc' | 'manual',
}
```

---

## 5. Demand validation limits

- Google Suggest API: ~rate-limit friendly sampai ~500 req/menit (no auth, no quota). Script pakai ~300 req/expand run (~5-7 detik total). Aman.
- Tidak ada paid API (DataForSEO MCP, SEMrush, dll). Trade-off: tidak dapat **numeric monthly search volume**, hanya relative suggest count. Untuk numeric, upgrade ke GSC nanti (mingguan, §6 LANDING_SEO_SYSTEM.md).
- Bahasa: `hl=id` untuk Indonesia. Ekspansi ke `hl=en` hanya untuk keyword global SMM (niche).

---

## 6. Cron / on-demand

- **On-demand**: tiap spec baru selesai (D-phase, beli-* baru) → run `s2b-expand.mjs` 1x untuk update queue.
- **Mingguan** (sesuai spec §6 GSC sync): `seo/gsc-sync.mjs` — parse GSC CSV → query impresi ≥20 tanpa URL cocok → tambah ke queue dengan `added_by:'gsc'` + priority 40+imps/5.
- **Bulanan**: review manual queue, set `status:'skipped'` untuk keyword dengan CTR ≤1% & posisi >50 (low value).

---

## 7. Output stats target fase 1

| Metric | Target | Status (Sep 2026) |
|---|---|---|
| Total keyword | 150-300 | 183 (seed 33 + autocomplete 0 + katalog 150) |
| p90 (definisi) | ~10 | 9 |
| p85 (howto) | ~30-50 | 82 |
| p80 (keamanan) | ~20-30 | 22 |
| p75 (reseller) | ~10-15 | 6 |
| p40 (trend) | TBD GSC | 0 (belum ada data) |
| high demand | ~50-80 | ~80 |
| medium | ~50-100 | ~40 |
| aeo | ~30-50 | ~50 |
| low | <20 | ~13 |

Cluster coverage: instagram, tiktok, youtube, telegram, facebook, twitter, spotify, live, story, komentar, smm-panel, lainnya.

---

## 8. Pitfalls (pelajaran)

1. **Node child_process execSync + Python escaping** — quote-in-quote hell. Pakai Node `fetch()` langsung.
2. **Sort order before slice** — kalau tidak, `merged.slice(0, 150)` ambil by INSERTION order (candidates duluan, suggs belakangan). LIVE/viewers di akhir → ke-cap. **Sort composite DESC dulu, baru slice**.
3. **Double prefix** — `beli jasa live tiktok` dari EXTRA_BASES `jasa live tiktok` + prefix `beli`. Filter `isNoDouble` cek consecutive prefix di awal.
4. **Action verb + prefix** — `beli tambah viewers tiktok` (prefix `beli` + base `tambah viewers tiktok`). Filter `shouldSkipPrefix` skip prefix kalau base starts with verb.
5. **Twitter/X name normalization** — "Twitter/X Followers" → split by `/` → heuristic reverse fragile. Manual fix atau accept partial.
6. **Google Suggest 0 suggs untuk definisi** — "apa itu smm panel" return 0 tapi tetap high-intent untuk AEO/AI Overview. Tag `demand_signal:'aeo'` jangan di-skip.
7. **Google Trends 429** — tidak reliable tanpa DataForSEO MCP. Trust suggest count sebagai proxy.

---

## 9. Next: gsc-sync.mjs (S3 phase)

Parse GSC Performance export (28 hari CSV) → identifikasi:
- Query impresi ≥20 tanpa URL cocok → tambah queue (added_by:'gsc', prio=40+imps/5)
- Posisi 4-20 → flag `push_refresh`
- CTR ≤2% & posisi ≤20 → flag `ctr_fix`

Format output → update queue.json + state.json. Token: 0 (CSV parse + heuristics).