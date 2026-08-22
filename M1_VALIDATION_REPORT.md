# M1 Validation Report — Auth + DB (empiris vs data asli & agent design)

**Tanggal:** 23 Jul 2026
**Metode:** Dev server `pnpm --filter app dev` (http://localhost:3000) → tunnel SSH ke VPS MySQL (127.0.0.1:3307 → `socio_smm`), lalu curl + query SQL langsung ke DB asli. Bukan code-review semata — ini validasi runtime dengan data produksi.

---

## 1. Baseline data asli (`socio_smm` via tunnel 3307)

| Tabel | Jumlah | Catatan |
|---|---|---|
| `users` | **3.228** | Admin 4, Developers 0, Member 2.974, sisanya Reseller/Agen/Demo |
| `users.status` | `1`=3.224, `2`=4 | legacy: varchar(1), bukan enum active/banned |
| `orders` | **26.029** | |
| `deposits` | **1.298** | |
| `services` | **6.044** | |
| `provider` | 5 | |
| `categories` | 249 | |
| `pricing_rules` | 4 | |
| `admin_roles` | **0** | ⚠️ kosong |
| `audit_log` | 11 | |
| `accounts` (better-auth) | **8** | ⚠️ hanya 8 user punya credential |
| `sessions` (better-auth) | 93 | |

**Distribusi `users.password` (legacy):** bcrypt = **3.226**, EMPTY = 2. Semua 7 user whitelist punya hash bcrypt valid (60 char `$2...`).

**8 row `accounts` milik:** `socioadmin` (Admin), `admin` (Admin), + 6 akun test/seed (`testuser` x2, `audittester`, `testgap`, `audit_user_aug2026`, `audit_admin_aug2026`).

---

## 2. Yang SUDAH JALAN (terbukti dengan data asli)

| Test | Hasil | Bukti |
|---|---|---|
| `dev-admin-login?as=socioadmin` | 303 → `/admin`, cookie `socio_session` ke-set (81 char = `<id>.<token>`) | `Set-Cookie: socio_session=...; HttpOnly; SameSite=Lax` |
| GET `/admin` (dgn cookie) | **200**, 203 KB, render "Command Center" + **"3.228"** user (cocok DB) | admin.html mengandung `3228` / `3.228` |
| `dev-admin-login?as=febian` | 303 → `/`, cookie ke-set | |
| GET `/` (dgn cookie febian) | **200**, 189 KB, render **"Rp165.905"**, **"199 order"**, nama `febian` | user.html cocok dgn balance febian di DB (165905) |
| Turnstile | skip aman saat `SOCIO_TURNSTILE_ENABLED != 1` | tidak blokir auth |
| Resolusi session (custom cookie) | `readSocioSession` di hooks.server.ts jalan | dashboard ke-render dgn data user yg benar |

**Kesimpulan pipeline:** session/cookie/dashboard **end-to-end work dengan data produksi asli**. Session strategy (custom `socio_session`, bukan cookie better-auth) sudah benar & stabil.

---

## 3. GAP KRITIS (dgn sitasi agent design)

### 🔴 G-LOGIN-1 — Real `/login` hanya jalan untuk 8 dari 3.228 user
- **Root cause = deviasi dari AGENTS.md §5 Auth.** Spec tertulis: *"`bcryptjs.compare(input, user.password)` — kompatibel PHP `$2y$`"* (verifikasi kolom **`users.password`** legacy). Tapi `app/src/routes/(auth)/login/+page.server.ts` step 2–3 malah verifikasi **`accounts.password`** (tabel better-auth, hanya **8 row**).
- **Bukti empiris:** `/login` POST `febian@...` → body `"Email atau password salah"`, **tidak ada cookie session** (account row = 0). User whitelist yg PUNYA `accounts`: hanya `socioadmin` + `admin`. `diomaulana`, `febian`, `irlan02`, `kokobee`, `sadamhsn` = **0 row** → TIDAK BISA login via form meski punya data order real.
- **Dampak:** 3.220 dari 3.228 user (termasuk 5 dari 7 akun test berdata real) tidak bisa login. Ini penyimpangan langsung dari desain agent.
- **Fix (sejalan desain):** ubah step 2–3 login ke `bcrypt.compareSync(input, user.password)` (legacy). `maybeRehashPassword` sudah update `users.password` + `accounts.password`, jadi aman. Hasil: 3.226 user langsung bisa login pakai password lama.

### 🔴 G-ROLES-1 — `admin_roles` kosong (0 row)
- Tabel RBAC kosong → halaman admin yg gate per-role akan default/break. (Masuk M3, tapi blokir fungsi admin penuh.)

### 🟠 G-DESIGN-1 — Anti-pattern #5: 4-col stat strip (DESAIN.md §5)
- Admin dashboard pakai `class="grid grid-cols-2 gap-3 lg:grid-cols-4 ..."` → **stat strip 4 kolom**. DESIGN.md §5 #5: *"Use inline-stat narrative or single hero stat. NO 4-col stat strip."* ❌
- Perlu diubah jadi inline-stat naratif / single hero stat.

### 🟠 G-DESIGN-2 — Anti-pattern #8: "Inter" di fallback font (DESAIN.md §5)
- `packages/ui/src/tokens.css:72`: `"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Inter", ui-sans-serif, ...`. Inter masih ada di fallback chain. DESIGN.md §5 #8: *"Never Inter."* ❌ (minor — primary sudah Plus Jakarta, tapi kontrak bilang never).

### 🟠 G-DESIGN-3 — M1.5 (Design Pass, WAJIB) belum dijalankan
- AGENTS.md line 9 & 70: M1.5 `[ ] belum mulai`, tapi route login/dashboard SUDAH ada. AGENTS.md line 9: *"DILARANG ngoding route apapun sebelum M1.5 selesai."* Gejala: 4-col strip + Inter fallback di atas adalah akibat belum ada design contract.

### 🟡 G-TRACK-1 — Milestone tracker tidak update
- AGENTS.md §3 / REBUILD_PLAN §9 masih `[ ] belum mulai` untuk M1 & M1.5, padahal sesi sebelumnya klaim M1 100%. AGENTS.md §7 step 11: wajib tandai `[x]` + update `docs/` saat selesai. **M1 TIDAK BOLEH ditandai selesai** sampai gap di atas beres & audit 8 anti-pattern lulus.

### 🟡 G-SECURE-1 — Cookie `Secure` tidak diset (config note)
- `socio_session` kembali `HttpOnly; SameSite=Lax` **tanpa `Secure`** (karena `SOCIO_SECURE_COOKIES=0`, benar untuk localhost HTTP). Di produksi HTTPS wajib set `SOCIO_SECURE_COOKIES=1` atau cookie tidak terkirim. Catatan cutover.

---

## 4. Verdict vs AGENTS.md §7 ("selesai")

AGENTS.md §7 mewajibkan: lint ✅ (assumed), typecheck ✅ (assumed), build ✅ (assumed), **mobile emulation**, **web-design-guidelines audit**, **8 anti-pattern audit (step 8)**, **AA contrast**, **Lighthouse ≥90**.

- Audit 8 anti-pattern (step 8) **GAGAL** → #5 (4-col strip) & #8 (Inter) terbukti dilanggar.
- Login real **GAGAL** untuk 3.220 user (deviasi AGENTS.md §5).
- M1.5 belum dijalankan.

**➡️ M1 BELUM "SELESAI" menurut AGENTS.md.** Pipeline session/dashboard sudah hijau dengan data asli, tapi auth form + design pass masih bermasalah.

---

## 5. Rekomendasi eksekusi (urutan)

1. **Fix G-LOGIN-1** (prioritas #1): verifikasi `users.password` di `login/+page.server.ts` sesuai AGENTS.md §5. ~5 baris, tidak breaking, langsung buka akses 3.226 user.
2. **Fix G-DESIGN-1**: ganti 4-col stat strip admin → inline-stat / hero stat.
3. **Fix G-DESIGN-2**: hapus "Inter" dari fallback `tokens.css`.
4. **Jalankan M1.5 Design Pass** (load skill `looks-expensive` + `theming-components`) — audit 8 anti-pattern, AA contrast, mobile 360×640.
5. **Isi `admin_roles`** (G-ROLES-1) sebelum M3.
6. **Update tracker** AGENTS.md §3 + REBUILD_PLAN §9 → tandai M1 `[x]` hanya setelah 1–5 lulus.
7. **Cutover**: set `SOCIO_SECURE_COOKIES=1` di prod (G-SECURE-1).

---

*Lampiran: raw evidence ada di `/tmp/*.sql` dan `/tmp/*.html` (admin.html, user.html, login.html).*
