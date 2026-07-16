# Socio.id — Rebuild (Astro + SvelteKit)

Monorepo rebuild socio.id. Folder lama (`app.socio.id/` PHP, `socio.id/` WordPress) adalah backup reference — **jangan di-deploy**. Deploy baru hanya dari folder di bawah ini.

## Struktur

| Folder | Stack | Domain | Deploy |
|---|---|---|---|
| `landing/` | Astro 5 + Svelte 5 islands | `socio.id` | Cloudflare Pages |
| `app/` | SvelteKit + adapter-node | `app.socio.id` | Fly.io / Oracle Cloud / VPS |
| `packages/db/` | Drizzle ORM (MySQL) | – | shared |
| `packages/ui/` | shadcn-svelte + Tailwind v4 | – | shared |
| `packages/core/` | pricing, smmturk-client, format, email-templates | – | shared |
| `docs/` | dokumentasi teknis | – | – |

## Dokumen wajib baca

- **`AGENTS.md`** — panduan untuk coding agent (wajib baca sebelum mulai kerja, supaya gak halu kalau switch model)
- `REBUILD_PLAN.md` — master plan (M0-M7, tech stack, roadmap)
- `docs/ADMIN_GAP.md` — analisa gap fitur admin + improvement wajib

## Provider

SMMturk (`smmturk.org/api/v2`) — 8185 layanan, 872 kategori, USD currency. API key via env `SOCIO_SMMTURK_KEY`.

## Quickstart (setelah M0)

```bash
pnpm install
pnpm --filter app dev          # SvelteKit app
pnpm --filter landing dev      # Astro landing
```

## Status

- [x] M0 — Foundation (struktur folder, plan, gap analysis)
- [ ] M1 — Auth + DB wiring
- [ ] M1.5 — Design Pass (WAJIB — looks-expensive + theming-components)
- [ ] M2 — User app core
- [ ] M3 — Admin + gap fix
- [ ] M4 — Cron & webhooks (SMMturk sync)
- [ ] M5 — Landing socio.id
- [ ] M6 — Email + polish (dark mode)
- [ ] M7 — Cutover
