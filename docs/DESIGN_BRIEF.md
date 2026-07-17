# DESIGN_BRIEF.md — socio.id (M1.5 Phase 1 + 2)

> Companion to `DESIGN.md` (Phase 3 design contract) and `MOBILE_UX_GUIDE.md` (Phase 4 screen spec).
> This brief sets the **taste filter** and the **research evidence** before any component is built.

---

## Phase 1 — Product Positioning

1. **What is this product?** Panel SMM reseller + layanan publik — tempat reseller & end-user Indonesia beli followers/likes/views/subscribe murah, top-up saldo, dan pantau order secara real-time dari HP.
2. **Who is it for?** Reseller SMM Indonesia (18–35 th, mobile-only, data-cost-aware, transaksi berulang). Admin internal (desktop primary, mobile secondary).
3. **Brand or Product register?** **Product** (dashboard/SaaS) untuk app user + admin; **Brand** untuk landing `socio.id`.
4. **The memorable thing?** "Top up, pesan, status update — semua 1 tap di mobile."
5. **What are you NOT?** Bukan WhatsApp AI bot, bukan CRM, bukan marketplace umum, bukan template panel SMM generik yang jelek.
6. **Quality matches:** GoPay / DANA (app user mobile — fintech vibe), Linear / Stripe (admin — clean SaaS), haloka (landing micro-interaction).
7. **Emotional temperature?** **Bold / High-Contrast** (consumer app — satu saturated accent di link/icon/tinted block; primary button fill pakai `--accent-ink` per DESIGN.md §5). **Neutral / Clean** untuk admin.
8. **Constraints?** 1 dev, monorepo pnpm, SvelteKit + Tailwind v4, harus mobile-first 100%, pakai token dari `packages/ui`.

### Scene sentence (anchor for every decision)
"Reseller SMM Indonesia 25 tahun di warung kopi, buka HP siang hari, top-up saldo Rp100k lewat QRIS, pesan 500 follower IG, tutup HP, lanjut kerja. Balik buka app 5 menit kemudian — status sudah Berhasil, notif masuk."

→ Force: **light theme** (siang, outdoor, layar kecil), dense tapi breathe, high-contrast CTA, instant feedback (haptic + optimistic).

---

## Phase 2 — Competitive Research

### TL;DR
Panel SMM rata-rata jelek (Bootstrap, tabel rapat, CTA kecil). Kita menang di: mobile-first fintech-grade, status real-time, micro-interaction haloka-level, palette berani bukan abu-abu.

### Steal list (dengan evidence)
| Produk | Diambil | Evidence |
|---|---|---|
| **GoPay / DANA** | Saldo hero prominent + animated counter, quick-grid 2×2 aksi, bottom-nav 5 + FAB, list transaksi dgn icon status | Fintech ID sudah dididik pola ini → zero learning curve |
| **Linear** | Density done right: sidebar + dense table di admin, keyboard-free tapi rapi, status dot | Admin tidak perlu "mobile-pretty", butuh "baca cepat" |
| **Stripe** | Card-list mobile admin, invoice/table rapi, copy yang jelas | Pricing/balance history pakai ledger, bukan card spam |
| **haloka (existing clone)** | Micro-interaction: hover lift, reveal, OrderSimulator auto-play | Landing vibe, tapi konten di-rewrite ke SMM |
| **SMMturk/JAP panel** | Katalog 6000+ layanan, filter kategori, price per 1k | Search-first catalog wajib |

### Avoid list (anti-pattern bukti)
| Produk/Pattern | Dihindari | Why |
|---|---|---|
| Panel SMM generik (PerfectPanel/Boom/Rush) | Tabel abu-abu 12 kolom, tombol biru default, font kecil | Terlihat murah, tinggi cognitive load di mobile |
| Bootstrap default card | `border-radius:16px` + `border:1px solid #eee` di tiap section | AI tell #3 — card chrome sama |
| 3-tier pricing card (Member/Agen/Reseller/Admin) | 3 card kolom identik dgn checkmark | AI tell #4 — pakai HTML table (pricing_rules port) |
| 4-col stat strip dgn counter | "10rb user / 6rb layanan / 99% uptime" | AI tell #5 — pakai inline-stat narrative |
| Inter font | — | AI tell #8 — pakai Plus Jakarta Sans / Sora (sudah di DESIGN.md) |
| Gradient blob hero | — | AI tell #6 — pakai `<img>` real / CSS mockup |

### Cross-pollination (kategori luar)
- **Food delivery (GoFood/ShopeeFood):** bottom-sheet untuk pilihan, swipe-to-dismiss, skeleton saat load → adapt ke order detail & quick-reorder.
- **E-commerce (Tokopedia/Shopee):** "Pesan Lagi" 1-tap dari history, saved address → adapt ke saved links & quick reorder.
- **Banking app:** security-first (Turnstile, rate-limit, session) tapi UX mulus → adapt ke auth + deposit.

### ASCII wireframe (app shell — sudah di DESIGN.md §6, ringkas)
```
[Header sticky 56px: judul + notif]
[Content scroll: saldo hero / list / catalog]
[Sticky CTA atau FAB]
[Bottom nav 5: Beranda·Saldo·[FAB Pesan]·Pesanan·Akun]
```

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-17 | Palette indigo+cyan (bukan hijau WA) | Bedakan dari haloka, SMM tech vibe |
| 2026-07-17 | Plus Jakarta Sans + Sora | Anti-Inter, mobile-product UI |
| 2026-07-17 | Light-first, dark template ada (M6) | Scene = siang outdoor |
| 2026-07-17 | Fintech-grade mobile (GoPay/DANA ref) | Zero learning curve reseller ID |
