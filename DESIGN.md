# DESIGN.md — socio.id Design Contract (M1.5)

> **Source of truth for all UI** in `landing/` (Astro) and `app/` (SvelteKit) and `packages/ui`.
> Tokens below are already implemented in `packages/ui/src/tokens.css` (Tailwind v4 `@theme`).
> This document is the **contract** — every new route/component MUST conform. Audit against §5 before marking any route done (AGENTS.md §7).

---

## 0. Principles (non-negotiable)

- **100% mobile-first.** User one-handed flows. Primary CTA reachable by thumb (bottom-sheet, not modal). Safe-area insets for notch/gesture bar.
- **Instant feel.** Optimistic UI, skeletons, `navigator.vibrate(10)` on CTA taps (gated by `prefers-reduced-motion`).
- **Real imagery, not blobs.** Where a photo is needed, use real `<img>` (Unsplash/Picsum), never gradient blobs.
- **Variance is the design.** Sections must not share identical container chrome (see §5 #7).
- **One source of tokens.** `packages/ui/src/tokens.css`. Never hardcode hex in components — use token utilities (`bg-primary`, `text-accent`, etc.).

---

## 1. Brand palette

| Token | Value | Use |
|---|---|---|
| `--color-primary-600` (`--color-primary`) | `#4f46e5` | Primary actions, active states, links |
| `--color-primary-800` (`--color-primary-dark`) | `#3730a3` | Hover/active of primary (DARKER, never lighter) |
| `--color-accent-500` (`--color-accent`) | `#06b6d4` | Secondary accent, highlights, status energy |
| `--color-accent-700` (`--color-accent-dark`) | `#0e7490` | Hover/active of accent |

**Full scales** (50–900 primary, 50–700 accent) live in `tokens.css`. Use semantic shortcuts in components.

### Status (SMM order states)
| State | Token | Value |
|---|---|---|
| Pending | `--color-status-pending` | `#d97706` |
| Progress | `--color-status-progress` | `#2563eb` |
| Complete | `--color-status-complete` | `#16a34a` |
| Canceled | `--color-status-canceled` | `#dc2626` |
| Partial | `--color-status-partial` | `#7c3aed` |

### Feedback
| Token | Value | Soft bg |
|---|---|---|
| success | `#16a34a` | `#dcfce7` |
| warning | `#d97706` | `#fef3c7` |
| danger | `#dc2626` | `#fee2e2` |

---

## 2. Neutrals (ink)

`--color-ink-50` `#f8fafc` → `--color-ink-900` `#0f172a`. Used for surfaces, text, borders.

- **Body text**: `ink-700`/`ink-800` on light; `ink-100`/`ink-200` on dark.
- **Muted text**: `ink-500`/`ink-600` (max 2 levels lighter than body).
- **Borders**: `ink-200`/`ink-300`.

---

## 3. Typography

| Role | Family | Notes |
|---|---|---|
| `--font-sans` | **Plus Jakarta Sans** | Body, UI. (NOT Inter — anti-pattern #8) |
| `--font-display` | **Sora** | Headings, hero, numbers |

- **Display headings**: Sora, weight 600–700, tight tracking (`-0.02em`).
- **Body**: Plus Jakarta Sans, 14–16px, line-height 1.5.
- **Numbers/counters**: Sora tabular-nums.
- **Mono**: only for data (API keys, IDs), max 14px, accent-tinted. Never for prose.
- **No italics** for emphasis (anti-pattern detail).

---

## 4. Radius / Shadow / Motion

| Token | Value |
|---|---|
| `--radius-card` | `1.5rem` |
| `--radius-pill` | `9999px` |
| `--shadow-card` | `0 1px 2px rgb(15 23 42/.04), 0 8px 30px rgb(15 23 42/.06)` |
| `--shadow-card-hover` | `0 4px 12px rgb(15 23 42/.06), 0 20px 40px rgb(15 23 42/.1)` |
| `--ease-out-soft` | `cubic-bezier(0.16, 1, 0.3, 1)` |

**Motion rules** (from `review-animations`):
- Transform + opacity ONLY. No layout-thrash (no animating width/height/margins).
- Duration: 150–250ms enter, 200–350ms exit. Ease `--ease-out-soft`.
- `prefers-reduced-motion`: disable all non-essential motion.
- ≥2 animation types per screen; ≥1 domain-specific (e.g. balance counter, order-status pulse).

---

## 5. Anti-pattern audit (MUST pass before "done")

| # | Anti-pattern | Rule | Enforcement |
|---|---|---|---|
| 1 | **Bullet spam** | ≤5 `<li>` per page section. Excess → prose / ledger / table / definition list. | Count `<li>` per route. |
| 2 | **Eyebrow pill** | Max 1 per page (ideally 0). Heading carries context. | `grep` for pill classes. |
| 3 | **Card chrome sameness** | Max 2 sections use default rounded card. Others → ledger, table, full-bleed photo, prose. | Visual audit. |
| 4 | **3-tier pricing card** | Use real HTML `<table>` or inline pricing. No generic 3 stacked cards. | Pricing routes only. |
| 5 | **4-col stat strip** | Use inline-stat narrative or single hero stat. Counter animation NOT required. | Stat sections. |
| 6 | **No imagery** | Real `<img>` where photo needed; never gradient blob. | Imagery audit. |
| 7 | **Identical containers** | Variance IS the design — ≥3 distinct containment patterns per page, max 2 default cards. | Layout audit. |
| 8 | **Inter default** | Use Plus Jakarta Sans / Sora (set in §3). Never Inter. | Font audit. |

**Contrast (AA minimum 4.5:1)**:
- Accent-filled surfaces (button, badge, active tab, recommended stripe): use `--color-accent`/`--color-primary` fills with **white or near-white ink** only. Verify AA at rest + hover.
- `--accent-hover` / `--primary-hover` = DARKER shade, never lighter.
- Focus ring: visible contrast (≥3:1 against adjacent), `outline` + offset, never color-only.
- Use `--accent-ink` / `--primary-ink` token for text ON accent fills.

---

## 6. App shell (mobile, from REBUILD_PLAN §6.1)

```
┌─────────────────────────────┐
│  Header (sticky, 56px)      │  ← page title + back + notif badge
├─────────────────────────────┤
│   Content (scrollable)      │  ← safe-area top padding
│   - Skeleton on load        │
│   - Pull-to-refresh         │
│   - Infinite scroll (history)
├─────────────────────────────┤
│   Sticky CTA (if any)       │  ← "Buat Pesanan" / "Top Up" / "Bayar"
├─────────────────────────────┤
│  Bottom nav 5 tab + FAB     │  ← safe-area bottom padding
│  Beranda │ Saldo │ [FAB] │ Pesanan │ Akun
└─────────────────────────────┘
```

- **Bottom nav 5**: Beranda · Saldo · **FAB Pesan (center, elevated)** · Pesanan · Akun.
- **FAB** → bottom-sheet quick-action: Buat Pesanan · Layanan · Tiket · Affiliate.
- **Hamburger** (top-right) → off-canvas panel: Profil, Pengaturan, Riwayat, Bantuan, Admin (if admin), Logout.
- **Off-canvas/drawer**: scroll-lock + focus-trap + `Esc` to close (a11y).
- **Safe-area**: `env(safe-area-inset-bottom/top)`.
- **Haptic**: `navigator.vibrate(10)` on CTA tap / add-to-cart / order success (gated `prefers-reduced-motion`).

### Reference vibes (REBUILD_PLAN §6.0.1)
- **Landing**: Haloka clone — gradient + blur + micro-interaction, hero OrderSimulator, sticky CTA, FAQ accordion, pricing toggle → reseller SMM packages.
- **App user (mobile)**: Indo fintech (GoPay/DANA) — bottom nav, prominent balance card, QRIS quick top-up, 2×2 action grid, transaction list with icons.
- **App admin**: Modern SaaS (Linear/Stripe) — desktop sidebar + mobile off-canvas, dense tables, audit log, queue/cron monitoring.

---

## 7. Shared components (`packages/ui`)

Implemented & contract-bound:
- `Button.svelte` — class passthrough, uses `--color-primary` fill, darker hover, AA ink.
- `Card.svelte` — `--radius-card`, `--shadow-card`, hover lift.
- `StatusBadge.svelte` — maps order status → §1 status tokens.
- `BalancePill.svelte` — prominent balance display (fintech vibe).
- `MobileShell.svelte` — safe-area wrapper + bottom-nav slot.

**Rule**: build new UI from these primitives. Do not recreate buttons/cards inline.

---

## 8. Verification checklist (per route, before "done")

- [ ] `pnpm --filter app lint && typecheck && test && build` clean
- [ ] Mobile 320 / 360 / 768 renders correctly
- [ ] §5 anti-pattern audit passes (all 8)
- [ ] AA contrast on all accent-filled surfaces
- [ ] `prefers-reduced-motion` respected
- [ ] Drawer/off-canvas has scroll-lock + focus-trap + Esc
- [ ] Focus ring visible
- [ ] Uses `packages/ui` primitives, not inline hex
- [ ] Loaded `web-design-guidelines` + `review-animations` review
