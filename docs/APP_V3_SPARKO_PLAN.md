# APP V3 "SPARKO" — Dashboard-first reskin plan (app.socio.id user)

> Status: PLAN (belum eksekusi). Scope sesi ini: **dashboard `/` dulu** (mobile 360 + desktop 1280).
> Sumber karakter: `sparko/Sparko.svelte` + `sparko/SPARKO_README.md` (6 pose, ~1.6KB, pure SVG).
> Hierarki: `REBUILD_PLAN.md` > `DESIGN.md` > plan ini. Hukum #1 tetap: **nol sentuh
> `*.server.ts` / `packages/core` (kecuali value `copy.ts`, key identik)** — semua di bawah ini visual.
> Keputusan yang dibalik dari V2: AD-3 (palette tetap) → **diganti Sparko palette** (persetujuan user 16 Sep 2026).

---

## S0. Jawaban singkat atas 3 pertanyaan user

### 1. Back button & button style — harus gimana?

Bahasa Sparko = **sticker-tactile**: segala yang bisa disentuh terlihat seperti stiker
(border ink 2px + hard shadow) dan **tenggelam saat ditekan** (signature press):

```
idle:    [ btn ]  border-2 ink + shadow 2px/4px + label bold
press:   [btn]    translate(2px,2px) + shadow NONE + scale 0.98 — 120ms spring
release: [ btn ]  spring balik 260ms ease-spring
```

- `BackButton` (baru, `packages/ui`): lingkaran/stadium paper + border ink 2px + shadow-sm,
  ikon ← 18px, press tenggelam, `aria-label="Kembali"`. Satu komponen dipakai semua
  halaman (ganti link `‹` tekstual yang sekarang beda-beda).
- `Button` primary: fill **ink-900** + teks paper + shadow sticker + press tenggelam
  (ganti indigo — indigo pensiun dari CTA; dipakai hanya untuk data/viz).
- Aksen Sparko di button: tick/check mango, badge "Populer" mango-soft, spinner sky-400.
- Danger: berry fill (`#ef4444`, teks putih AA 4.83:1 — sudah terverifikasi di Button).

### 2. Libs apa yang dibutuhkan?

**NOL dependency runtime baru.** Alasan: Sparko pure SVG+CSS (~1.6KB), semua motion di plan
ini transform/opacity (compositor-only). Yang dilakukan:

1. Port `sparko/Sparko.svelte` → `packages/ui/src/components/Sparko.svelte`
   (WAJIB konversi legacy `export let`/`$:` → Svelte 5 runes `$props()` — aturan skill `svelte`).
2. Tambah token Sparko di `packages/ui/src/tokens.css` (additive, §S1).
3. (Opsional, fase akhir) `canvas-confetti` untuk hujan confetti full-screen — atau tetap
   `ConfettiBurst` existing (SVG, 0 deps). Rekomendasi: **tetap ConfettiBurst**.

### 3. Palette Sparko → token app (mapping, additive)

| Sparko | Hex | Token app (baru) | Dipakai untuk |
|---|---|---|---|
| body sky | `#38bdf8` | `--sparko-sky` (alias sky-400) | spinner, LiveDot inti, sparkline, link aktif, glow dekoratif |
| sky deep | `#0284c7` | `--sparko-sky-deep` (alias sky-600) | teks di atas terang, hover state sky |
| mango vivid | `#fbbf24` | `--sparko-mango` | sparkle, badge reward, tick, indicator dock, streak flame |
| mango soft | `#fbbf24` 22% | `--sparko-mango-soft` | highlight marker, chip reward |
| berry | `#ef4444` | `--sparko-berry` | cheeks Sparko, danger, urgency (stok/expired), fizzle |
| ink | `#1a1a1a` | pakai `--color-ink-900` existing | stroke, border sticker, teks, button fill |
| paper | warm `#faf7f0` | `--sparko-paper` | bg app (ganti slate!), kartu paper |

> Catatan: `--pop-mango` app (mango-500 `#d9a514`) vs Sparko mango (`#fbbf24`) BEDA.
> Keduanya hidup: `pop-*` = sistem lama (dipertahankan, backward-compat),
> `sparko-*` = bahasa baru. Jangan campur dalam satu komponen.

---

## S1. Foundation (sebelum sentuh dashboard)

- [ ] S1-1 Port Sparko → runes + ekspor `index.ts` + QA checklist README (6 pose, reduce-motion, 24px/160px).
- [ ] S1-2 Token `sparko-*` + dark remap (sky tetap, paper→`#0f172a`-ish via ink scale, mango/berry tetap).
- [ ] S1-3 `BackButton.svelte` (sticker-press) + upgrade `Button` (press tenggelam + shine existing).
- [ ] S1-4 App bg slate → `--sparko-paper` (satu baris di layout) + kartu standar → paper-lift + hairline.
- [ ] Verifikasi: `check` 0 error + build + 1 screenshot dashboard (tidak boleh ada perubahan selain bg).

## S2. Dashboard `/` — wireframe + motion (MOBILE 360)

```
┌──────────────────────────┐
│ ~~ OrbField (tetap)      │  fase WIB + label (fungsi tetap)
│ Siang, <Marker>Rina</>   │  ✅ ada (F3)
│ ✦ Sparko wave 28px ──────│  ★ BARU S2-1:FadeSlide masuk 500ms sekali saat mount,
│ halo, siap nge-boost?    │    wave 1.8s ×3 lalu diam (bukan infinite!)
├──────────────────────────┤
│ ╔ SALDO sticker ════════╗ │  ✅ sticker (F3)
│ ║ Rp ▓▓▓ «M2»  [TopUp]║ │  ★ S2-2: sparkle-burst mango saat saldo NAIK
│ ║ ~spark  insight       ║ │    (tween naik → 6 sparkle scale-pop 600ms 1×)
│ ╚══════════════════════╝ │
│ [Pesan][TopUp][Affl][?]  │  ★ S2-3: sticker-press tenggelam (semua quick tile)
│ ┌ Pesan Cepat ────────┐  │  ✅ Favoritmu (F3)
│ │[#1 sticker][#2]…    │  │  ★ S2-4: Sparko peek 32px di ujung kanan kartu #1
│ └─────────────────────┘  │    (wave, muncul delay 600ms, 1×)
│ stat│stat│stat + delta%  │  ★ S2-5: delta chip pop spring saat angka settle
│ [VIP banner]             │  ✅ marker + confetti 1× (F3)
│ chart 7 hari            │  tetap (line sky-400 → ganti warna series ke sky!)
│ recent: ●Live + kartu   │  ★ S2-6: order BARU masuk (SSE) → slide-down 320ms +
│                         │    Sparko celebrate 40px flash 1.2s di header recent
│ trust line              │  tetap
└──────────────────────────┘  bottom dock sticker ✅ (F8)
```

## S3. Dashboard `/` — DESKTOP 1280 (delta dari mobile)

```
┌──────────────┬─────────────────────────────────┐
│ sidebar      │ hero: OrbField kiri + SaldoHero │
│ paper +      │ kanan (layout tetap)            │
│ hairline     │ ★ Sparko wave 36px di samping  │
│ ★ S3-1: item │   greeting (bukan di mobile     │
│ aktif = pill │   header — maskot ≤1/layar!)    │
│ ink fill +   │ quick 1×4 sticker-press        │
│ teks paper   │ Pesan Cepat grid 3 + peek      │
│ (ganti bar   │ recent sticky + celebrate flash │
│ primary)     │                                 │
└──────────────┴─────────────────────────────────┘
```

> Aturan maskot: **≤1 Sparko per layar**. Mobile: di greeting. Desktop: di greeting JUGA
> (posisi beda, tetap 1 instance). Jangan tambah di recent/empty dashboard.

## S4. Katalog motion dashboard (out-of-the-box, semua 1× kecuali disebut)

| ID | Momen | Trigger | Motion | Durasi | Catatan adiktif |
|---|---|---|---|---|---|
| S2-1 | Halo Sparko | mount dashboard | FadeSlide + wave ×3 → diam | 500 + 3×1.8s | disapa duluan = human touch #1 |
| S2-2 | Saldo naik | tween NumberFlow naik | 6 sparkle mango scale-pop | 600ms | reward visual tiap uang masuk |
| S2-3 | Press tile | tap | tenggelam (shadow→none, +2,+2) + spring balik | 120 + 260ms | tactile, "ketagihan mencet" |
| S2-4 | Peek kartu #1 | mount + delay 600ms | slide-in kanan + wave 1× | 400ms | "ada yang ngintip" → curiosity |
| S2-5 | Delta settle | count-up selesai | chip scale 0.6→1.12→1 spring | 350ms | angka terasa "menang" |
| S2-6 | Order baru (SSE) | status/event baru | kartu slide-down + Sparko celebrate flash | 320ms + 1.2s | live = hidup, alasan balik lagi |
| S3-1 | Sidebar aktif | navigasi | pill ink geser (transform, spring) | 260ms | orientasi tanpa mikir |
| — | Streak login (OPT) | mount, jika backend siap | flame mango + "3 hari beruntun!" + Sparko celebrate | 1× | mekanik ketagihan #1 (butuh field/`localStorage`) |
| — | Level progress (OPT) | selalu tampil | bar tipis sky ke level berikut ("RpX lagi naik Reseller") | statis | goal-gradient effect, murni UI dari data existing |

Budget: infinite/layar TETAP max 2 (OrbField drift + LiveDot). Semua di atas 1×.
Reduced-motion: semua di-gate (skeleton statis + tanpa flash).

## S5. Verifikasi per fase (wajib sebelum lanjut)

1. `pnpm --filter app check` 0 error + warning tetap baseline.
2. `pnpm --filter app build` OK.
3. Screenshot lokal 360 + 1280 (script `verify-f7.cjs` bisa dipakai ulang).
4. Gatotkaca check: `git diff --name-only` nihil `*.server.ts`; Sparko ≤1/layar; infinite ≤2.
5. Deploy via API → verifikasi live (khusus dashboard + login).

## S6. Yang SENGAJA tidak masuk plan ini (nanti)

- Route lain (pesan/pesanan/saldo/…) — plan terpisah setelah dashboard approved.
- Streak backend & level system — butuh kolom/tracking baru (diskusi + migrasi).
- Dark mode Sparko penuh — token disediakan, audit visual dark terpisah.
- Ganti font/display global — di luar scope (risiko besar, gain kecil).

---

## S7. Estimasi & keputusan yang diminta user

- Estimasi: S1 (±1 sesi) → S2+S3 (±1 sesi) → verifikasi + deploy (±0.5 sesi).
- **Pilih arah tombol**: (A) ink-fill sticker (rekomendasi — paling Sparko) atau (B) pertahankan indigo + aksen Sparko saja.
- **Pilih streak**: (a) localStorage cepat (tidak sinkron device) atau (b) tunggu backend.
