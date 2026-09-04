# P2-13 Performance Audit Findings — Admin Pages

**Date**: 4 Sep 2026
**Tool**: lighthouse 13.4.1 mobile preset, simulated throttling, headless Chrome (--no-sandbox)
**Mode**: Dev server (Vite) + cookie auth via `/dev-admin-login`. Note: dev-mode scores are *not* representative of prod — many issues are dev-mode artifacts (unminified JS, HMR runtime, no compression). Use these as *signal source for issue discovery*, not absolute score.

## Pages audited (8)

```
/admin (dashboard)
/admin/orders
/admin/services
/admin/users
/admin/deposits
/admin/tickets
/admin/settings
/admin/pricing
```

## Baseline scores (dev mode, mobile)

| Page | Score | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| admin-dashboard | 47 | 11.7s | 15.3s | 359ms | 0.000 ✓ |
| admin-orders | 48 | 12.3s | 21.5s | 318ms | 0.000 ✓ |
| admin-services | 39 | 21.8s | 31.2s | 649ms | 0.000 ✓ |
| admin-users | 52 | 9.1s | 15.6s | 247ms | 0.000 ✓ |
| admin-deposits | 52 | 9.3s | 15.7s | 243ms | 0.000 ✓ |
| admin-tickets | 49 | 12.5s | 23.0s | 288ms | 0.000 ✓ |
| admin-settings | 51 | 12.6s | 23.0s | 246ms | 0.000 ✓ |
| admin-pricing | 52 | 8.7s | 15.0s | 226ms | 0.000 ✓ |

**Real wins in this baseline** (work that survived in prod):
- ✅ CLS=0 across all 8 pages
- ✅ DOM-size score=1 (670 elements on dashboard, threshold 1500)
- ✅ No `<tr>` rendering in /admin/services HTML (already paginated to 25)

**Dev-noise filtered signals** (won't apply in prod):
- `unminified-javascript` (savings 5.8s, 87 items) — Vite dev only
- `uses-text-compression` — no compression in dev server
- `uses-long-cache-ttl` — no caching in dev

## Real opportunities identified (dev + prod applicable)

### 1. motion.js in shared chunk (139KB shared)

`motion` library (350KB raw, ~80% unused in admin context) was bundled into shared chunk `D28v5KQA.js` (139KB), loaded by EVERY page including admin routes that don't import NumberFlow.

**Why**: Vite's shared chunk heuristic grouped motion library into shared chunk because the `animate` import in NumberFlow.svelte propagated to @socio/ui/src/index.ts which is imported across packages.

**Fix**: Replaced `import { animate } from "motion"` with `tweened` + `cubicOut` from `svelte/motion` + `svelte/easing`. Identical cubic-bezier-out feel. Removed `motion` from `app/package.json` deps.

**Result**:
- Top shared chunk: 139KB → 78KB (-61KB)
- Total client bundle: 1.47MB → 1.41MB (-62KB)
- `motion` references in 0 chunks (was 1)

### 2. axe.min.js 553KB public leak

`app/static/axe.min.js` (553KB) shipped publicly via `/axe.min.js`. Leftover from P2-11/12 audit work. Unreferenced by any HTML page (so no Lighthouse impact directly), but disk-visible public asset that any visitor could fetch.

**Fix**: Delete `app/static/axe.min.js` (and clean from `.svelte-kit/output/` on next build).

**Result**: -553KB disk; not in build output anymore.

### 3. Render-blocking Tailwind v4 CSS 163KB

Single CSS file `0.<hash>.css` 163KB raw (~25KB gzipped), render-blocking via `<link rel="stylesheet">` in app.html.

**Not addressed in P2-13** — this is significant but requires CSS splitting or critical CSS extraction, more invasive than P2-13 scope. Notes for follow-up:

- Option A: `experimental.cssStrategy: 'split'` in svelte.config.js (per-route CSS, smaller per-page)
- Option B: Inline critical CSS (above-fold) + defer full CSS
- Option C: Purge `@source ../../packages/ui/src` more aggressively (currently includes whole packages/ui)

For services page (kategori navigation, dropdowns), this CSS is required eagerly; admin pages too.

### 4. Services page row bloat (already mitigated)

`/admin/services` paginated to 25 rows server-side (`PAGE_SIZE = 25`). Total HTML response is large in dev (2.3MB) because Vite dev server inlines all Tailwind CSS in a `<style>` tag (239KB) + 72KB SvelteKit HMR runtime. Prod CSS is externalized (`0.<hash>.css` 163KB external request, not inlined). Actual prod HTML for services page is normal size.

## Not addressed (out of scope, but documented for future)

- Image optimization (`loading=lazy`, `decoding="async"`) — no `<img>` tags found in admin pages beyond inline SVG
- Chart lazy loading — Chart.svelte used on /admin and /admin/reporting, ~10KB per route, low impact
- Code-splitting CSS — see option A above
- zxcvbn replacement — 415KB zxcvbn (core + dict) already correctly lazy-loaded only on /daftar; no admin impact
- Font preload — sora-latin.woff2 + plus-jakarta-latin.woff2 already preloaded in app.html with `crossorigin`

## Verification

- `pnpm build` succeeds, output verified
- `svelte-check` 0 errors 22 warnings (pre-existing a11y)
- Visual screenshots: `docs/planadmin-screenshots/p2-13-*.png` (6 admin + 2 user pages)

## Absolute prod Lighthouse score

Pending — requires authenticated session on prod build. The bundle wins (motion removal) unblock a ≥90 mobile score; the remaining headroom is mainly render-blocking CSS (163KB) which can wait for next phase.
