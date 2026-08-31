# LANDING PAGE AUDIT — Socio.id (`landing/src`)

> Audit 26 Agu 2026. Cek semua section, urutan, copy, & broken link sebelum deploy.
> Ref: `docs/BUG_REPORT.md` (B-04, B-05, B-12).

---

## 1) Daftar section saat ini (dari `index.astro` + components)

| # | Section | Komponen | Status |
|---|---|---|---|
| 1 | Navbar | `Navbar.svelte` | ✅ ada, tapi CTA `register` (B-04) |
| 2 | Hero | inline `index.astro` | ✅ kuat, claim "Termurah & Tercepat" |
| 3 | SMM Provider Proof | `SmmProviderProof.svelte` | ✅ social proof |
| 4 | Trust Badges | `TrustBadges.svelte` | ✅ |
| 5 | Pain Points | `PainPoints.svelte` | ✅ |
| 6 | Features | `Features.svelte` (id=`layanan`) | ✅ |
| 7 | How It Works | `HowItWorks.svelte` (id=`cara-kerja`) | ✅ |
| 8 | Social Proof | `SocialProof.svelte` | ✅ |
| 9 | Pricing | `PricingInteractive.svelte` (id=`harga`) | ✅ interaktif |
| 10 | Final CTA | `FinalCTA.svelte` | ⚠️ posisi SEBELUM FAQ |
| 11 | FAQ | `Faq.svelte` (id=`faq`) | ✅ |
| 12 | Footer | inline `index.astro` | ❌ link `api-docs` & `/blog` 404 (B-05) |

**Kekurangan section (belum ada):**
- ❌ **Halaman Reseller terpisah** (user minta penjelasan + rules) → lihat `docs/RESELLER_PAGE_SPEC.md`
- ❌ **Blog/Artikel** (WordPress lama punya, rebuild belum) → `/blog` 404
- ❌ **Testimoni/video** (bisa masuk SocialProof)
- ❌ **Syarat & Ketentuan / Privacy** page (legal, butuh untuk payment)
- ❌ **API docs page** (footer link 404)

---

## 2) Urutan section — saran perbaiki

Sekarang: `...Pricing → FinalCTA → FAQ → Footer`.
**Masalah**: Final CTA di tengah memotong momentum sebelum FAQ (FAQ itu penghilang keraguan
terakhir). Rekomendasi urutan:

```
Hero → ProviderProof → TrustBadges → PainPoints → Features(layanan)
→ HowItWorks(cara-kerja) → SocialProof → Pricing(harga) → FAQ
→ FinalCTA → Footer
```

FAQ **sebelum** FinalCTA = conversion lebih tinggi (objection handled dulu).

---

## 3) Broken links (P0/P1)

| Link | Lokasi | Masalah | Fix |
|---|---|---|---|
| `app.socio.id/register` | Navbar, StickyCTA, PainPoints, FinalCTA, Pricing, index | route tidak ada (ada `/daftar`) | redirect `/register`→`/daftar` + ganti ke `/daftar` |
| `app.socio.id/api-docs` | footer | route tidak ada | buat `/api-docs` di app |
| `/blog` | footer | landing cuma `index.astro` | buat `blog/index.astro` atau hapus |
| `regBase` hardcode `app.socio.id` | 6 file | gak bisa test staging | pakai relative `/daftar` |

---

## 4) Copy audit (claim vs bukti)

| Claim di Hero | Cek | Catatan |
|---|---|---|
| "#1 Panel SMM Termurah" | subjektif | ok sebagai positioning, tapi hati-hati kata "Termurah" vs competitor — bisa diuji |
| "8.185+ layanan" | sesuaikan dgn `provider_services` count | verifikasi angka aktif (bukan total import) |
| "Rp18/1K" | cek harga terendah katalog | ok kalau ada di `services` |
| "50.000+ reseller" | klaim sosial | pastikan tidak berlebihan (bisa "puluhan ribu") |
| "Gagal? Saldo balik — refill otomatis" | cron refill ada | ✅ benar, tapi pastikan refill jalan (cron) |

**Saran**: ganti angka absolut yang gampang dibuktikan lawan jadi range/"puluhan ribu"
kecuali punya data riil, untuk hindari claim menyesatkan (bisa kena isu iklan).

---

## 5) Premium feel (alignment dgn dashboard)

- Landing & app HARUS satu design language (sudah pakai `primary`/`accent` token ✅).
- Hero pakai `<img>` nyata (bukan placeholder) untuk SMM — `SmmHeroVisual` cek apakah
  pakai visual asli, bukan shape abstrak doang (aturan looks-expensive: "no imagery = cheap").
- Pastikan **1 eyebrow pill** per section, bullet ≤5, card chrome ≤2.
- CTA utama pakai accent fill + AA contrast (`--accent-ink`).

---

## 6) Checklist sebelum deploy
- [ ] Fix B-04 (register→daftar) & B-05 (api-docs, blog)
- [ ] Pindah FinalCTA setelah FAQ
- [ ] Buat halaman `/reseller` (RESELLER_PAGE_SPEC)
- [ ] Buat `/api-docs` + `/blog` (atau hapus link)
- [ ] Buat `/terms` & `/privacy` (untuk payment gateway)
- [ ] Audit claim angka (8.185, 50.000, Rp18) — pakai data riil
- [ ] Lighthouse mobile ≥90 (route public)
