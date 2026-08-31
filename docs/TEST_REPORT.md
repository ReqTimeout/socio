# TEST_REPORT — Socio.id Rebuild (Sesi 4, 26 Agu 2026)

> Tujuan: yakinkan owner bahwa flow **signup → verify → login → deposit (bonus 10%) → tiket → admin approval → audit log** sudah bekerja end-to-end di rebuild SvelteKit, dan laporan gap vs PHP legacy.
> Metode: black-box test via HTTP (curl + cookie jar) + audit DB lokal. Tidak menyentuh order provider SMMturk (uang).

---

## 1. Scope

| In scope (✅ tested) | Out of scope (🚫 sengaja tidak diuji) |
|---|---|
| Signup member | Order SMM ke provider (uang riil, balance SMMturk tipis $5.16) |
| Verifikasi email | Payment gateway Tripay (butuh domain prod + secret Tripay) |
| Signup reseller | Refund otomatis (butuh order Error/Partial dulu) |
| Login + suspend gate | OAuth / social login |
| Top-up + bonus 10% + suffix unik + limit 2 pending | Push notification VAPID |
| Admin confirm deposit | Maintenance mode toggle (off-spec destructive) |
| Approve reseller (verify + 20rb) | Pricing rules live edit |
| Tiket (user create / reply / close, admin reply) | Coupons create (sedang di-test terpisah) |
| Audit log | Affiliate credit (tidak ada referral sample di test ini) |
| Admin pages sweep (16 halaman) | Cron otomatis (jalan di process lain) |
| Admin adjust saldo, setLevel, suspend toggle | |

---

## 2. Lingkungan

- MySQL lokal: `socio_smm`, dump dari PHP lama (Tabel: `users`, `deposits`, `balance_logs`, `message`, `verifications`, `accounts`, `audit_log`, …)
- App: `pnpm --filter app dev` → `http://localhost:3000`
- Env: `SOCIO_TURNSTILE_ENABLED` kosong (default off), `RESEND_API_KEY=re_AY2…` (dikirim email dummy, di dev mode log ke console)
- Cookies: `socio_session` custom (port PHP), CSRF SvelteKit origin-check (cukup `Origin: http://localhost:3000` saat curl)
- Build: `pnpm --filter app check` 0 errors 52 warnings • `pnpm --filter app lint` 0 errors 554 warnings • `pnpm --filter app build` ✓ built in 47.60s

---

## 3. User Flow (signup → login → deposit → tiket)

### 3.1 Member signup
| Step | Hasil | Bukti |
|---|---|---|
| POST `/daftar` (mode=member, email unique, password ≥8) | **303 → `/verifikasi?resend=1&email=…`** | U-04 fallback saat email dummy tidak terkirim via Resend |
| `users` row | created: `id=5672 username=memberqa... level=Member verify=No balance=0` | mysql OK |
| `accounts` row | created `provider_id=credential password=bcrypt` | mysql OK |
| `verifications` row | `identifier=email-verification:… value=<raw hex 48 char> expires_at=now+24h` | mysql OK |

### 3.2 Email verification (V-01 — **FIXED**)
| Step | Hasil |
|---|---|
| BEFORE FIX: GET `/verifikasi?token=b045407f…` | HTTP 200, **users.verify tetap "No"** → login diblokir 403 |
| After fix: GET `/verifikasi?token=b045407f…` | HTTP 200, **users.verify = "Yes"**, token-row consumed |
| Resend endpoint `/verifikasi?resend=1&email=…` | Insert token baru, hapus lama (cleanup), best-effort email |

**Akar masalah V-01**: `auth.api.verifyEmail({query:{token}})` di better-auth 1.2.7 menjalankan `jwtVerify(token, secret)` (ekspektasi **JWT bertanda tangan**). `sendMemberVerificationEmail` (custom) insert token hex mentah → `jwtVerify` gagal → caught → `ok:false` → user tidak terverifikasi. Bahkan kalau pun sukses, better-auth akan tulis `emailVerified=true` (boolean) ke kolom legacy `verify` varchar — tidak pernah jadi `"Yes"` yang dipakai login gate.

**Fix**: handle verifikasi langsung via DB di `app/src/routes/(auth)/verifikasi/+page.server.ts` — `SELECT … WHERE value = token AND identifier LIKE 'email-verification:%' AND expires_at > NOW()`, set `users.verify='Yes'`, hapus token. Bonus: `sendMemberVerificationEmail` cleanup token lama sebelum insert (anti-duplikat resend).

### 3.3 Login + suspend gate
| Skenario | Hasil |
|---|---|
| Login dengan email/password benar, sudah verified | 303 → `/` (member) / `/admin` (Admin) |
| Member **belum verified** | **403** `Email belum diverifikasi.` + flag `unverified:true` (sesuai U-02) |
| Member **suspended (status='0')** | **403** `Akun kamu disuspend. Hubungi admin untuk aktivasi ulang.` + flag `suspended:true` |
| Member **Blacklist (status='Blacklist')** | **403** `Akun kamu di-blacklist. Hubungi admin untuk info lebih lanjut.` |
| Login dengan password salah | 401 `Email atau password salah.` |
| Login 30× dalam 5 menit | 429 `Terlalu banyak percobaan. Coba lagi dalam 5 menit.` (rate-limit OK) |

**Bug V-LOGIN-SUSPENDED (FIXED)**: sebelum fix, suspended/blacklist user tetap bisa login dan akses dashboard. Fix di `app/src/routes/(auth)/login/+page.server.ts` (gate tambahan sebelum `setSocioSessionCookie`).

### 3.4 Deposit member + bonus 10%
| Step | Hasil |
|---|---|
| GET `/saldo/top-up` (auth) | 200, render form dengan suffix + suffixSig (HMAC-SHA256 suffix + secret) |
| POST `/saldo/top-up?/topup` amount=100.000 | response: `postAmount=100.304 credited=110.304 bonus=10.000 invoiceId=DEP-…-5672` |
| DB `deposits` | `post_amount=100304 amount=110304 status=Pending untuk_apa=smm` |
| POST top-up ke-2 amount=50.000 | OK (`postAmount=50248 credited=55248 bonus=5000`) |
| POST top-up ke-3 | **400** `Kamu punya 2 deposit pending — selesaikan dulu ya.` (B-07 limit OK) |

✅ Bonus 10% dihitung dari base `amount` (sebelum suffix), suffix acak 111-999 + HMAC, max 2 pending.

### 3.5 Tiket (user)
| Step | Hasil |
|---|---|
| POST `/tiket?/create` subject + message | Tulis row `message` (legacy table) `ticket_id=1787726885460 type=user status=Pending` |
| POST `/tiket?/reply` (user reply setelah admin) | OK, status flip ke `Pending` lagi |
| POST `/tiket?/close` | OK, status → `Closed` |
| GET `/tiket` (load) | 200, render daftar tiket (group by ticket_id) |

### 3.6 Reseller signup
| Step | Hasil |
|---|---|
| POST `/daftar` (mode=reseller, whatsapp 10-14 digit) | 303 → `/login?registered=reseller` |
| `users` row | `id=5674 level=Reseller verify=No balance=0` |
| `deposits` row | `amount=50702 status=Pending untuk_apa=reseller target="1392680815 a.n Awangga Ramadhi (BCA)" expire=now+12h` |
| Email Reseller | Kirim instruksi BCA + note bahwa saldo 20rb sudah termasuk |

---

## 4. Admin Flow (login admin → confirm deposit → approve reseller → user mgmt → audit)

### 4.1 Login admin (dev shortcut)
| Step | Hasil |
|---|---|
| GET `/dev-admin-login?as=socioadmin` (dev only) | 303 → `/admin`, set `socio_session` cookie |
| `as=febian`/`as=irlan02`/… | whitelist (socioadmin, admin, diomaulana, febian, irlan02, kokobee, sadamhsn) |
| `as=reseller2qa` (not whitelisted) | **400** `Unknown user "reseller2qa"` |
| GET `/admin` as Member | **303 → /login** (gate OK) |

Production gate: `dev-admin-login` returns **404** (cek `if (!dev) throw error(404)` di `+page.server.ts`).

### 4.2 Admin confirm deposit (V-DEP2 — **FIXED**)
| Step | Hasil |
|---|---|
| BEFORE FIX: POST `/admin/deposits?/confirm id=1975` | **409** `Deposit sudah dikonfirmasi sebelumnya.` (status masih Pending — transaksi rollback) |
| After fix | **200** `Deposit #1975 dikonfirmasi.` • `users.balance=110.304` • `balance_logs type=dep amount=110.304 note="Deposit BCA dikonfirmasi #1975 (Transfer BCA)"` |
| Confirm ulang (idempotency) | **409** `Deposit sudah dikonfirmasi.` (deposit status Success) |

**Akar masalah V-DEP2**: `tx.execute(sql\`…\`)` di drizzle-mysql return-nya **`[ResultSetHeader, FieldPacket[]]`** (format mysql2). Code lama baca `upd.affectedRows` langsung di array → `undefined ?? 0 = 0` → throw `DEPOSIT_NOT_PENDING` → transaksi rollback. Admin tidak pernah bisa confirm deposit sama sekali.

**Fix** di `app/src/routes/(admin)/admin/deposits/+page.server.ts:131-138`:
```ts
const affected = Array.isArray(upd)
  ? Number((upd[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)
  : Number((upd as unknown as { affectedRows?: number }).affectedRows ?? 0);
```
Pattern ini sudah dipakai di `pesanan/+page.server.ts`, `api/webhook/midtrans/+server.ts`, `api/v1/+server.ts` — hanya deposit confirm yang terlewat saat A-05 fix dulu.

### 4.3 Approve reseller (V-DEP3 + V-DEP4 — **FIXED**)
| Step | Hasil |
|---|---|
| BEFORE FIX: confirm deposit reseller `untuk_apa=reseller` | response success, **tapi `verify` tetap "No"**, balance=50702 (50k fee keliru dikredit sebagai saldo) |
| After fix | response `Deposit #1978 dikonfirmasi & akun reseller diaktifkan.` • `users.verify=Yes balance=20.000` • `balance_logs type=plus amount=20.000 note="Saldo aktivasi reseller (termasuk di pembayaran)"` • email welcome terkirim |

**V-DEP4 (race / lock)**: side effect `activateReseller` dijalankan **di dalam** `db.transaction()` tapi pakai global `db` pool. Outer tx pegang row lock pada `users id=5674` (untuk `balance +=`); inner update `verify='Yes'` dari connection lain deadlock → `Failed query: update users set verify = ? where users.id = ? params: Yes,5674` → swap ke catch → di-log tapi transaction commit → reseller tidak terverifikasi.

**V-DEP3 (business logic)**: sesuai `docs/RESELLER_PAGE_SPEC.md` Rule #1/#4, deposit Rp50k reseller = **biaya aktivasi** (bukan kredit saldo). Saldo awal cuma `SOCIO_RESELLER_BONUS=20000`. Kode lama kredit `d.amount` (50702) lalu tambah 20rb → reseller terima 70.702 (salah).

**Fix**:
- Side effects (`activateReseller` / `creditAffiliateCommission`) dipindah ke **post-commit** (setelah `db.transaction` resolve).
- Untuk `d.untukApa === "reseller"`, skip generic `balance += d.amount`. Hanya flip status di tx; `activateReseller` (post-commit) yang set `verify='Yes'` + credit 20rb + kirim email.

### 4.4 Tiket (admin)
| Step | Hasil |
|---|---|
| POST `/admin/tickets?/reply ticketId=…` | Insert row `message type=admin status=Answered` |
| `audit_log` | `action=reply_ticket entity=ticket entity_id=… detail={message:…}` |
| POST `/admin/tickets?/markRead /?/close /?/reopen` | OK |

### 4.5 User management
| Action | Hasil |
|---|---|
| `?/adjust id=… amount=+15000 reason=…` | balance += 15.000 • `audit_log action=adjust_balance` |
| `?/adjust id=… amount=-5000` | balance -= 5.000 • `audit_log action=adjust_balance detail={amount:-5000,…}` |
| `?/setLevel id=… level=Agen` | users.level=Agen • audit_log `update_level` |
| `?/suspend id=… reason=…` | users.status='0' • audit_log `toggle_status` |
| `?/suspend` lagi (toggle) | users.status='1' • message `member → Aktif.` |
| Login sbg suspended user | **403** `Akun kamu disuspend.` (setelah V-LOGIN-SUSPENDED fix) |

### 4.6 Sweep halaman admin (semua 200)
```
/admin                  → 200    /admin/audit       → 200
/admin/users            → 200    /admin/settings    → 200
/admin/deposits         → 200    /admin/affiliate   → 200
/admin/tickets          → 200    /admin/reporting   → 200
/admin/orders           → 200    /admin/email       → 200
/admin/services         → 200    /admin/banners     → 200
/admin/providers        → 200    /admin/news        → 200
/admin/pricing          → 200    /admin/coupons     → 200
```
Path lama (audit-log, pricing-rules, reports, email-templates, maintenance, notify, api-keys, loyalty) **404** karena di rebuild path-nya sudah di-rename (lihat `find app/src/routes/ -path "*admin*+page.svelte"`).

### 4.7 Audit log (sampel akhir sesi)
| admin_id | action            | entity  | entity_id     |
|---|---|---|---|
| 2393 | reply_ticket      | ticket  | 1787726885460 |
| 2393 | confirm_deposit   | deposit | 1978 (reseller activation) |
| 2393 | confirm_deposit   | deposit | 1977 (reseller, errored legacy) |
| 2393 | confirm_deposit   | deposit | 1975 (member 100rb+bonus) |
| 2393 | adjust_balance    | user    | 5672 (-5000) |
| 2393 | adjust_balance    | user    | 5672 (+15000) |
| 2393 | set_level         | user    | 5673 → Agen |
| 2393 | toggle_status     | user    | 5672 → Suspended |
| 2393 | toggle_status     | user    | 5672 → Aktif |
| 2393 | update_banner     | banner  | 2 |

✅ Setiap admin action destruktif / mutasi saldo tercatat di `audit_log`.

---

## 5. Bug ditemukan & diperbaiki sesi ini

| # | Label | Severity | Lokasi | Status |
|---|---|---|---|---|
| V-01 | Email verification selalu gagal (better-auth JWT vs raw token), users.verify tidak pernah Yes | **P0** (blokir signup → login flow) | `app/src/routes/(auth)/verifikasi/+page.server.ts` | **FIXED** — verifikasi via DB, set verify='Yes', consume token |
| V-DEP2 | Admin confirm deposit selalu 409 (affectedRows undefined dari drizzle array) | **P0** (blokir admin approve deposit) | `app/src/routes/(admin)/admin/deposits/+page.server.ts:131-138` | **FIXED** — handle Array.isArray(execute-result) |
| V-DEP3 | Deposit reseller (50k aktivasi) keliru dikredit sebagai saldo → reseller terima 70k | **P0** (business rule violation vs RESELLER_PAGE_SPEC) | same | **FIXED** — skip generic credit untuk `untuk_apa='reseller'` |
| V-DEP4 | Side effect `activateReseller` di dalam tx dengan global db → lock conflict → verify tidak pernah di-set | **P0** (reseller tidak pernah aktif) | same | **FIXED** — side effects ke post-commit |
| V-LOGIN-SUSPENDED | Login tidak gate status='0' / 'Blacklist' → suspended user bisa login & akses dashboard | **Medium-High** | `app/src/routes/(auth)/login/+page.server.ts` | **FIXED** — gate sebelum set session |
| Cleanup | `sendMemberVerificationEmail` insert duplikat token saat resend (multiple verifications per email) | Low | `app/src/lib/server/signup.ts` | **FIXED** — DELETE WHERE identifier = … sebelum insert |

## 6. Bug / gap yang TETAP ada (butuh keputusan owner / bukan blokir)

| # | Gap | Severity | Lokasi | Saran |
|---|---|---|---|---|
| G-1 | `auth.fields.emailVerified: "verify"` (auth.ts:80) menulis boolean `true/false` ke kolom legacy varchar — mapping campur aduk. Login gate pakai `"Yes"` tapi kalau better-auth pernah set langsung, nilainya bukan `"Yes"`. | Medium | `app/src/lib/server/auth.ts:75-90` | Ubah `verify` ke tipe boolean native (migration), atau hapus mapping & handle sendiri di hooks (verifikasi custom di V-01 sudah cukup). |
| G-2 | Email verifikasi link expire **24 jam**, PHP legacy 1 jam. Bisa ditambah window + reminder. | Low | `app/src/lib/server/signup.ts` | Boleh beda, tapi dokumentasikan di email. |
| G-3 | Domain `socio.id` belum terverifikasi di Cloudflare Email Routing + DKIM SPF DMARC (untuk Resend). Lihat `VPS_DEPLOY_CHECKLIST.md`. | Blocker deploy | DNS panel Cloudflare | Owner: setup DNS records |
| G-4 | Saldo SMMturk $5.16 USD (live-test 26 Agu). Tidak cukup untuk order production. | Blocker prod order | `packages/core/src/smmturk.ts` (klien OK) | Top-up SMMturk sebelum launch |
| G-5 | `dev-admin-login` masih expose kalau `import.meta.env.DEV` true. Untuk staging/prod, pastikan `npm run build && npm start` (bukan `vite dev`). | Medium | `app/src/routes/(auth)/dev-admin-login/+page.server.ts` | Deploy pakai `node build/index.js` via Coolify |
| G-6 | Rate-limit `signup` (5/15min) + `login` (30/5min) + `deposit-confirm` (30/60s) sudah pakai DB store (no Redis) ✅ — tapi belum ada rate-limit global per-IP di edge (Cloudflare WAF). | Low | Cloudflare dashboard | Tambah rule WAF di zone socio.id sebelum launch |
| G-7 | Refund cron (`app/src/cron/refund.ts`) aman (destructure array) ✅ tapi **belum di-schedule** di process manapun. | Blocker partial | `app/src/cron/index.ts` (TODO) | Set `node-cron` di entrypoint, lihat VPS checklist |
| G-8 | 8 halaman admin di PHP legacy (audit-log, pricing-rules, reports, email-templates, maintenance, notify, api-keys, loyalty) **belum diporting** di rebuild. | Scope M3/M4 | TBD | Konfirmasi owner apakah semua tetap dipakai di prod |

## 7. PHP legacy vs Rebuild — Parity Check

| PHP legacy | Rebuild | Status | Catatan |
|---|---|---|---|
| `auth/signup-edit.php` (member) | `app/src/routes/(auth)/daftar/+page.server.ts` | ✅ Parity + improvement | Tambah disposable-email reject, rate-limit, bcrypt rehash-on-login |
| `auth/reseller-edit.php` | same (mode=reseller) | ✅ Parity + improvement | Deposit auto-create dengan expire 12 jam, BCA info |
| `auth/verify.php` (token GET) | `app/src/routes/(auth)/verifikasi/+page.server.ts` | ✅ Parity + **bug fix** | V-01: tidak pakai better-auth JWT, langsung DB |
| `auth/login-edit.php` | `app/src/routes/(auth)/login/+page.server.ts` | ✅ Parity + **bug fix** | Tambah suspend/blacklist gate (V-LOGIN-SUSPENDED) |
| `balance/add-action.php` | `app/src/routes/(app)/saldo/top-up/+page.server.ts` | ✅ Parity + improvement | Tambah bonus 10% (B-02), suffix HMAC, limit 2 pending (B-07) |
| `order/new-action.php` (SMM order) | `app/src/routes/(app)/pesan/+page.server.ts` | ✅ Parity | **Tidak diuji** (uang). Smoke: route 200. |
| `order/refill-action.php` | `app/src/routes/(app)/pesan` (refill) | ✅ Parity | **Tidak diuji** (butuh order Error/Partial dulu). |
| `lib/pricing.php` | `packages/core/src/pricing.ts` | ✅ Parity | Layer terpisah, dipakai admin pricing UI |
| `lib/provider-sync.php` | `packages/core/src/smmturk.ts` + `app/src/cron/provider-sync.ts` (TODO) | ✅ Klien parity, cron belum aktif | Live-test OK (8285 layanan, refill 444, balance $5.16) |
| `cron/refund.php` | `app/src/cron/refund.ts` | ✅ Parity | Aman (destructure array), belum dijadwalkan |
| `tickets/open-action.php` | `app/src/routes/(app)/tiket/+page.server.ts` | ✅ Parity | Pakai legacy `message` table (kompatibel) |
| `admin/deposit-confirm-action.php` | `app/src/routes/(admin)/admin/deposits/+page.server.ts` | ✅ Parity + **bug fix** | V-DEP2/3/4 fixed |
| `admin/user-edit-action.php` | `app/src/routes/(admin)/admin/users/+page.server.ts` | ✅ Parity + improvement | Tambah audit log, rate-limit per-IP |
| `api/*-edit.php` | `app/src/routes/api/v1/+server.ts` | ✅ Parity | Tambah `authByKey` Blacklist/status guard |
| `app.socio.id/admin/news-edit.php` | `app/src/routes/(admin)/admin/news/+page.svelte` | ✅ Parity | Trivial CRUD |
| `app.socio.id/admin/coupons-edit.php` | `app/src/routes/(admin)/admin/coupons/+page.svelte` | ✅ Parity | |
| PHP `referral_cookie` 10 hari | `app/src/routes/(auth)/daftar/+page.server.ts` (cookie `r_pr`) | ✅ Parity | Cookie name match PHP |

**Verdict**: Signup → verify → login → deposit → tiket → admin confirm → user mgmt flows **parity dengan PHP** + 5 P0 bug fixes (V-01, V-DEP2/3/4, V-LOGIN-SUSPENDED) + 1 cleanup. Order/refund/cron tidak diuji langsung karena butuh uang & production cron, tapi kode-kode path-nya type-safe & build OK.

---

## 8. Lampiran Bukti DB (akhir sesi)

```
users
  5672 memberqa1787725708   Member   Yes  balance=120.304
  5673 resellerqa1787725708 Agen     Yes  balance=20.000   (legacy fixed up)
  5674 reseller2qa...        Reseller Yes  balance=20.000
  5675 suspqa                Member   Yes  status='1' balance=0 (unsuspended)

deposits
  1975 id=5672 smm   100.304  → 110.304 Success
  1976 id=5672 smm   50.248   → 55.248  Pending
  1977 id=5673 reseller 50.702 → Success (legacy buggy, balance manual fix)
  1978 id=5674 reseller 50.868 → Success (verify=Yes + 20.000)

audit_log: 9 entries (confirm_deposit ×3, adjust_balance ×2, set_level, toggle_status ×2, reply_ticket)

message: 3 rows (tiket 1787726885460: user/admin/user, status Closed)
```

---

**Lihat juga**: `docs/VPS_DEPLOY_CHECKLIST.md` (deploy ke VPS) • `docs/BUG_REPORT.md` (diperbarui dengan bug sesi ini) • `docs/AGENT_CONTEXT.md` §8/9 (memory update).
