# DASHBOARD UI/UX AUDIT — Socio.id (Premium + Repeat Order)

> Audit 26 Agu 2026. Target: dashboard user (`app/src/routes/(app)/+page.svelte` + `+page.server.ts`)
> terasa **premium** & **nyaman untuk repeat order** (karena SMM panel = penggunaan berulang
> tinggi, bukan one-shot). Referensi standar: `looks-expensive` (bullet ≤5, eyebrow ≤1,
> card chrome ≤2, no generic Inter, AA contrast), `web-design-guidelines`, `review-animations`.

---

## 1) Filosofi: kenapa repeat-order itu inti SMM panel

User SMM itu **habitual**: tiap hari/nanti pesan followers/like/views buat client yang sama.
Dashboard bagus = user bisa **ulang order dalam 2 tap**, bukan 6 tap. PHP lama & banyak
kompetitor gagal di sini (harus buka layanan → cari → isi link lagi). Rebuild sudah punya
benih `quickOrders` (Pesan Cepat) — tapi perlu dipoles jadi *premium habit loop*.

---

## 2) Yang SUDAH bagus (pertahankan)
- `quickOrders` (Pesan Cepat) ambil layanan paling sering di-order + `lastLink` ✅
- Saved-link chips di `/pesan` (`pesan/coupon` + saved-links) ✅
- Chart 14 hari + delta WoW ✅
- Banner CMS (`promotion_banners`) ✅
- FAB "Pesan Sekarang" mobile ✅
- Greeting dinamis + active-order count ✅

---

## 3) Gap premium (priority tinggi)

### P-UX-1 — "Pesan Cepat" belum 1-tap repeat
Sekarang `quickOrders` tampil tapi user masih harus pilih qty & submit. Untuk repeat order
sejati:
- **Saved default qty per layanan**: waktu pertama order, simpan qty terakhir → next tap
  langsung pakai qty itu. Field `saved_links` (`packages/db`) sudah ada, perlu `defaultQty`.
- **"Pesan Lagi" button**: di card recent order & quick order → langsung POST order pakai
  `lastLink` + qty tersimpan, konfirmasi toast (bukan page penuh).
- **Pre-fill link**: kalau `lastLink` ada, tampilkan sebagai placeholder "Pesan lagi ke link yang sama?".

### P-UX-2 — Empty state dashboard terasa "kosong", bukan premium
User baru (0 order) lihat chart kosong + "Belum ada pesanan". Ini momen churn.
- Ganti empty state jadi **onboarding premium**: 3 step ("Top up → Pilih layanan → Pesan")
  + mini-demo visual, bukan teks abu-abu.
- Tambah `eyebrow` pill tunggal ("Mulai di sini") — jangan >1 pill (aturan looks-expensive).

### P-UX-3 — Tipografi & warna terlalu "default SaaS"
- Font masih Inter-ish (`font-display` perlu cek = Inter?). **Ganti ke sans lebih karakter**
  (mis. `Satoshi`/`General Sans`/`Plus Jakarta Sans`) untuk kesan agency $150k.
- Accent fill (button, badge, active tab) wajib **AA contrast 4.5:1** — pakai `--accent-ink`
  L=0.42–0.48 untuk text di atas accent. Verifikasi di `/saldo/top-up` & FAB.
- Card chrome: batasi **≤2** dekorasi per card (shadow + 1 border). Sekarang ada yang
  terlalu banyak glow — reduksi.

### P-UX-4 — Micro-interaction "premium" kurang
- `card-lift`/`surface-pop` sudah ada (`primitives.css`) tapi belum konsisten di semua card.
- Tambah: **number count-up** saat load saldo & stat (bukan langsung angka), **shimmer**
  saat data fetch, **toast sukses** dengan checkmark animasi.
- Semua animasi: hanya `transform`/`opacity`, `prefers-reduced-motion` dihormati
  (aturan `review-animations`). Verifikasi tidak ada animasi layout/throwing.

### P-UX-5 — Stat strip jangan 4-col generik
- Dashboard stat (total order, spent, deposit) pakai **inline-stat** bukan 4-col box strip
  (aturan looks-expensive anti-pattern). Bisa jadi 2 stat + 1 chart tersemat rapi.

### P-UX-6 — Dark mode belum konsisten (admin sudah, user belum)
- User dashboard `theme` field ada tapi tidak ada toggle terlihat di `(app)/+layout`.
- Premium = dark mode polished. Tambah toggle + pastikan kontras AA di dark.

---

## 4) Repeat-order blueprint (rekomendasi konkret)

```
Dashboard
├─ Greeting + Saldo (inline-stat, bukan 4-box)
├─ Pesan Cepat (4 chip: layanan + lastLink + defaultQty)
│   └─ tap → sheet bawah: "Pesan Lagi?" → 1 tap confirm → toast
├─ Recent Orders (list, tiap row ada "Pesan Lagi" + status live badge)
├─ Chart 14h (count-up saat load)
└─ Banner CMS (1 card, ≤2 chrome)
```

**Key metric sukses**: time-to-repeat-order < 10 detik (sekarang ~30–40 detik lewat /pesan).

---

## 5) Checklist polish sebelum deploy
- [ ] Ganti font ke non-Inter, set `--accent-ink` & audit AA contrast (button/badge/tab)
- [ ] Saved `defaultQty` + "Pesan Lagi" 1-tap di quick order & recent
- [ ] Empty-state onboarding premium (bukan teks kosong)
- [ ] Count-up angka + shimmer fetch + toast checkmark
- [ ] Stat → inline-stat (buang 4-col strip)
- [ ] Dark mode toggle user + audit kontras
- [ ] Review animasi via `review-animations` (transform/opacity only, reduced-motion)

> Catatan: jangan over-decorate. `looks-expensive` minta **subtraction** — hapus glow
> berlebih, batasi eyebrow & card chrome. Premium = tenang, bukan ramai.
