# Socio.id Landing — Project Study Notes

Baseline setelah migrate dari clone `haloka-landing` ke stack Socio.id.

## Tech Stack

- Framework: Astro 5
- UI Components: Svelte 5 (islands, `client:*` directives)
- Styling: **Tailwind CSS v4** (CSS-first `@import "tailwindcss"` + `@theme`), via `@tailwindcss/vite`
- Design tokens: `@socio/ui` (`packages/ui/src/tokens.css`) — source of truth untuk landing & app
- Workspace: pnpm monorepo (`packages/ui`, `app`, `landing`)
- Fonts: Plus Jakarta Sans (body) + Sora (display) via Google Fonts

## Struktur

- Entry: `src/pages/index.astro`
- Layout + SEO + JSON-LD: `src/layouts/Layout.astro`
- Global styles + token import: `src/styles/global.css`
- Komponen (urutan render di index):
  - `Navbar` — fixed nav, CTA ke `app.socio.id`
  - `StickyCTA` — floating "Daftar" setelah scroll
  - `FloatingWhatsApp` — WA float
  - `OrderSimulator` — hero visual (simulasi form order SMM)
  - `TrustBadges` — 4 poin kepercayaan
  - `PainPoints` — kalkulator hemat + 3 masalah
  - `Features` — katalog 8000+, status realtime, garansi refill
  - `HowItWorks` — 5 langkah daftar→topup→order→pantau
  - `SocialProof` — testimoni reseller
  - `PricingInteractive` — paket top-up saldo
  - `FinalCTA` — CTA besar
  - `Faq` — FAQ SMM

## Konteks Bisnis (penting)

- socio.id = panel SMM (jual follower/like/views/SEO via provider SMMturk).
- CTA utama mengarah ke `https://app.socio.id/register` & `/login`.
- Tidak ada subscription bulanan — model top-up saldo.

## Catatan Teknis

- Tailwind v4: tidak ada `tailwind.config.mjs`; warna/radius/dll didefinisikan di `@theme` (`packages/ui/src/tokens.css`).
- Reduced-motion: global reset di `theme.css` + `prefers-reduced-motion` di FloatingWhatsApp.
- Belum ada `og-image.png` — tambahkan di `public/` sebelum deploy Cloudflare Pages.

## Deploy

- Build: `pnpm --filter landing build` → `dist/`
- Target: Cloudflare Pages (`socio.id`).
