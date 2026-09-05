# Skill On-Demand Catalog — socio.id

> **Prinsip**: skill di-load sesuai task, **bukan sekaligus**. Saya yang minta skill via `skill <name>` saat relevan.
>
> Daftar ini jadi **referensi cepat** supaya kita berdua tahu skill mana yang tersedia untuk project ini, tanpa harus hafal.

## Cara kerja on-demand

Saat ada task, saya akan:
1. **Cek katalog ini** → identifikasi skill yang relevan dengan task
2. **Load** hanya skill yang relevan via `skill <name>`
3. **Kerjakan** dengan guidance skill itu di konteks
4. **Selesai** → skill masih di konteks tapi tidak memperburuk ke task berikutnya (next task akan fresh scan)

## Cloudflare (domain infrastructure)

| Skill | Kapan dipakai |
|---|---|
| `cloudflare` | Workers/Pages/R2/AI/Vectorize/D1/Queues/Flags — setup, debugging, API |
| `cloudflare-email-service` | Email Sending/Receiving via Workers binding atau REST API |
| `cloudflare-one` | Zero Trust/Access/Gateway/Tunnel/CASB/DLP/WAN — security posture |
| `cloudflare-one-migrations` | Migrasi dari Zero Trust lama ke Cloudflare One |
| `wrangler` | Workers CLI — wrangler.jsonc, deploy, secrets, bindings |
| `turnstile-spin` | Setup Turnstile widget untuk proteksi form |
| `durable-objects` | DO stateful coordination + SQLite-backed storage |
| `workers-best-practices` | Review Workers code (config, bindings, patterns, security) |
| `agents-sdk` | Cloudflare Agents SDK — persistent state, RPC, scheduling, workflows |
| `cloudflare-one-migrations` | Migrasi Zero Trust → Cloudflare One |

## SEO Engineer

| Skill | Kapan dipakai |
|---|---|
| `seo` | Umbrella — full audit, plan, programmatic, hreflang |
| `seo-technical` | Audit 9 kategori: crawlability, indexability, CWV, security |
| `seo-page` | Deep single-page analysis |
| `seo-schema` | Generate/validasi JSON-LD structured data |
| `seo-audit` | Full website audit parallel-delegation |
| `seo-content-writer` | Long-form SEO post |
| `seo-content-planner` | Content calendar/topic clusters |
| `seo-content-refresher` | Update old posts |
| `seo-aeo-blog-writer` | AEO-optimized blog (TL;DR, FAQ, citations) |
| `seo-aeo-keyword-research` | AEO keyword research |
| `seo-fundamentals` | SEO principles primer |
| `geo-fundamentals` | GEO (AI Overviews) optimization |
| `ai-seo` | LLM citability (3 pillars: Structure/Authority/Presence) |
| `seo-dataforseo` (extension) | Live SERP data via DataForSEO API |
| `seo-image-gen` (extension) | AI image generation untuk SEO assets |

## UI/UX

| Skill | Kapan dipakai |
|---|---|
| `ui-ux-pro-max` | Searchable UX DB (67 styles, 161 palettes, 57 fonts) — untuk referensi cepat |
| `web-design-guidelines` | Compliance audit per Vercel interface guidelines |
| `looks-expensive` | 9-phase design methodology (positioning → ship); anti-tells audit |
| `looks-expensive-update` | Auto-update skill looks-expensive dari GitHub |
| `emil-design-eng` | Emil Kowalski design engineering philosophy — animation decision framework |
| `review-animations` | Motion code review (10 non-negotiable standards) |
| `animation-vocabulary` | Motion term glossary (spring, stagger, clip-path, dll) |
| `guiding-users` | Onboarding, product tours, tooltips, empty states guidance |
| `page-cro` | Page-level conversion rate optimization |
| `form-cro` | Form-level conversion optimization |
| `copywriting` | Copy audit + generation |
| `design-system` | Design system creation (tokens, components) |
| `design` | Visual identity (logo, palette, typography) |
| `designing-layouts` | Responsive grid + layout systems |
| `assembling-components` | Component integration |

## Frontend Designer

| Skill | Kapan dipakai |
|---|---|
| `svelte` | Svelte 5 runes + SvelteKit + Drizzle (sudah loaded) |
| `astro` | Landing page (Astro 5) |

## Testing / Audit / Debug

| Skill | Kapan dipakai |
|---|---|
| `diagnosing-bugs` | Bug diagnosis 6-phase (sudah loaded) |
| `bug-hunter` | Systematic bug hunt + fix |
| `brooks-lint` | Code review (grounded in classic software engineering books) |
| `logic-lens` | Deep code review dengan logic/reasoning framework |
| `ecl-harness-engineer` | CI/CD lint checks (EKL harness) |
| `codebase-audit-pre-push` | Security + optimization audit before push |
| `improve-codebase-architecture` | Deep scan + grill through opportunities |
| `performance-optimizer` | Performance bottleneck hunt + measurement |

## Data / Research

| Skill | Kapan dipakai |
|---|---|
| `sql-sentinel` | BigQuery/Snowflake cost optimization (overkill untuk socio.id tapi tersedia) |
| `firecrawl-scraper` | Web scraping + screenshots |
| `search-specialist` | Advanced search techniques |
| `efficient-web-research` | Token-efficient research |
| `apify-competitor-intelligence` | Competitor analysis |
| `apify-trend-analysis` | Trend discovery |
| `deep-research` | Autonomous research planning |

## Content / Creative

| Skill | Kapan dipakai |
|---|---|
| `brand` | Brand voice/visual identity |
| `content-creator` | Platform-specific content |
| `competitive-landscape` | Competitor analysis framework |
| `marketing-ideas` | Marketing strategies |
| `free-tool-strategy` | Engineering as marketing |

## Ops / Infra

| Skill | Kapan dipakai |
|---|---|
| `tmux` | Terminal multiplexer (untuk multiple shell session) |
| `socio-router` | Project-specific router (sudah loaded) — untuk `/admin`, `(app)`, `packages/ui/*` |

## Catatan

- **Skill yang TIDAK ada di sistem**: `prototyping`, `themeing-components` (ganti `design-system`), `svelte5-animations` (DLL)
- **Context budget**: setiap skill yang loaded menambah system prompt ~2-10KB. Lebih hemat load on-demand
- **Session state**: skill loaded di awal sesi **persist sepanjang sesi**. Kalau ada 10 skill loaded total di satu sesi, semua tetap di konteks
- **Iteration speed**: skill besar (`looks-expensive`, `cloudflare-one`) butuh ~10-15 detik untuk load. Skill kecil (`review-animations`) lebih cepat
- **Bundling**: beberapa skill sudah bundled (mis. `socio-router` mencakup Google-ads-fullstack style routing otomatis)

## Workflow yang direkomendasikan

Saat ada task baru, saya akan otomatis:
1. Identifikasi skill relevan dari katalog ini
2. Load via `skill <name>`
3. Cari skill referensi (subdirectory `references/` atau `reference/`) via `grep` atau `read` jika perlu
4. Kerjakan task dengan guidance
5. Update dokumentasi `docs/IMPLEMENTATION_CHECKLIST.md` jika applicable
6. Commit + deploy (jika code changes)

Tidak perlu Anda panggil manual — saya yang kerjakan. Anda cukup request tasknya.
