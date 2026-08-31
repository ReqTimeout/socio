# RESELLER PAGE SPEC & RULES — Socio.id

> Spec + copywriting untuk halaman penjelasan reseller. Diimplementasikan di
> `landing/src/pages/reseller.astro` (26 Agu 2026). Rule resmi ada di bawah.

---

## 1) Rules Resmi (sesuai instruksi user)

| No | Aturan | Nilai | Sumber |
|---|---|---|---|
| 1 | Biaya daftar reseller | **Rp50.000** (aktivasi satu kali) | user instruction |
| 2 | Detail rekening | dikirim ke **email** user setelah daftar | user instruction |
| 3 | Konfirmasi | **admin approve manual** setelah transfer diterima | user instruction |
| 4 | Saldo awal khusus reseller | **Rp20.000** (sudah termasuk di Rp50.000) | user instruction |
| 5 | Metode | Transfer BCA manual (nominal unik 3 digit) | `signup.ts` |
| 6 | Kadaluarsa | 12 jam sejak email dikirim | `signup.ts:172` |
| 7 | Verify | `No` → `Yes` saat admin confirm | `activateReseller` |

**Alur**: daftar (mode=reseller) → insert `users`(level=Reseller, verify=No) +
`deposits`(untuk_apa=reseller, Pending, amount=50rb+suffix) → email instruksi BCA →
admin confirm manual → `activateReseller` (verify=Yes + +20rb saldo).

> Catatan: PHP lama credit **Rp30.000** saat aktivasi (`confirm.php:23`). Spec user = **20.000**,
> rebuild sudah benar (default `SOCIO_RESELLER_BONUS=20000`). Jangan kembalikan ke 30rb.

---

## 2) Copywriting principles (premium, bukan "jualan murahan")

- **Positioning**: "Harga grosir untuk bisnis SMM" — bukan "murah abal-abal".
- **Transparan**: sebut Rp50rb = aktivasi, Rp20rb saldo included. Jangan sembunyi.
- **Bahasa**: Indonesia casual-pro ("kamuu", "cuan", "jualan ulang") tapi tetap rapi.
- **CTA**: primer amber ("Daftar Reseller — Rp50.000"), sekunder outline ("Daftar Member gratis").
- **Anti-claim menyesatkan**: angka "50.000+ reseller" pakai cautiously; better "puluhan ribu".

---

## 3) Section yang sudah dibuat (`reseller.astro`)

1. Hero — judul "Jadi Reseller SMM dengan Harga Grosir", USP, 2 CTA, visual kartu saldo.
2. Aturan — 4 langkah + callout "saldo 20rb included, 50rb = aktivasi".
3. Keuntungan — 6 card (margin, API, 8185 layanan, refill, affiliate 2%, support).
4. FAQ — 4 details (biaya, kapan aktif, saldo bisa ditarik?, API bot?).
5. Final CTA — amber button ke `/daftar?mode=reseller`.
6. Footer.

Link masuk: footer landing utama sudah ada "Reseller" → `/reseller`.

---

## 4) TODO lanjutan
- [ ] Tambah `reseller` ke Navbar dropdown (saat ini Navbar cuma "Daftar").
- [ ] Schema.org `Product`/local business markup khusus reseller (SEO).
- [ ] OG image khusus `/reseller`.
- [ ] Hubungkan CTA "Pelajari program" di hero landing utama → `/reseller`.
- [ ] Pastikan `/reseller` masuk sitemap (`sitemap.xml` Astro).
