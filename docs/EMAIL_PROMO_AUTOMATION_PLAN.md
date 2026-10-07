# EMAIL PROMO AUTOMATION PLAN — Work Order Fase 0–7

> **Untuk coding agent.** Dokumen ini work order, bukan wacana. Kerjakan **berurutan per fase**.
> Setiap task punya: file yang disentuh, cara verifikasi, dan acceptance criteria.
> **Dilarang lompat fase.** Fase 0 adalah gate keras — kalau tidak lolos, Fase 3 tidak boleh dimulai.
>
> Keputusan user yang mendasari dokumen ini ada di `docs/SEO_DECISIONS_2026-10-06.md`.
> Baca dulu sebelum mengerjakan apa pun.

---

## 0. Konteks terverifikasi (jangan dipercaya buta — cek ulang bila ragu)

Semua fakta di bawah diambil langsung dari server/repo/DB/DNS pada **6 Okt 2026**.

### 0.1 Infrastruktur

| Komponen | Nilai |
|---|---|
| Provider VPS | **TNA Hosting** (bukan Hostinger — jangan salah) |
| Panel deploy | **Coolify 4.3.23** di VPS yang sama |
| DNS | **Cloudflare** (zona `socio.id`) |
| IP VPS | `130.254.47.93` (IPv4), `2607:adc0:5::215` (IPv6) |
| SSH | `root@130.254.47.93` |
| MTA | container `mailserver` = `mailserver/docker-mailserver:14`, IP internal `10.0.2.2` |
| Config MTA | `/opt/mailu/scripts/mail-server/{config,mail-data,mail-state,mail-config}` |
| DB | container `rebicrj57r3afbg9knieq9ks` (mysql:8.0), database **`socio_smm`** |
| App container | `nqsjafrei6k8dkup1pxkcuwf-122951474254` |
| SEO runner container | `c9iqug5vvi9kjywt1fn6xnsc-135758379657` |

**Proyek lain di VPS yang sama — JANGAN DISENTUH:**
`xeamhqvjpz9x3dwzvguxbyz6-102345799391` (sgb.beriklan.co.id), `/opt/seo-pipeline`,
`igsbaxpsvuhopghoutiit2kk-085951037002`, `searxng`, `vonbh1dpbrfzlrm26lwvdain`,
`lmzgomlezarhl32f012v7ydm`, semua container `coolify*`.

### 0.2 Kondisi DNS / deliverability saat ini

```
SPF    : v=spf1 +a +mx include:mailgun.org ip4:130.254.47.93 ~all
DMARC  : v=DMARC1; p=reject; rua=mailto:dmarc@socio.id; ruf=mailto:dmarc@socio.id; pct=100; adkim=s; aspf=s
DKIM   : mail._domainkey.socio.id  → v=DKIM1; k=rsa; p=MIIBIjAN...  (2048-bit, ADA ✅)
MX     : 10 mail.socio.id · 10 mx1.privateemail.com · 10 mx2.privateemail.com
A      : mail.socio.id → 130.254.47.93 DAN 45.41.205.105  ← 45.41.205.105 TIDAK ADA di server ini
AAAA   : mail.socio.id → 2607:adc0:5::215
PTR v4 : 130.254.47.93     → static.130.254.47.93.hostname.com      ← SALAH
PTR v6 : 2607:adc0:5::215  → static.2607:adc0:5::215.hostname.com   ← SALAH
Port 25 outbound ke gmail-smtp-in.l.google.com : TERBUKA ✅
```

Catatan penting:
- `include:mailgun.org` di SPF = sisa lama, Mailgun tidak dipakai. Membuang jatah SPF lookup (batas 10).
- `mx1/mx2.privateemail.com` = pihak ketiga. **Konfirmasi ke user masih dipakai atau tidak** sebelum diubah.
- MTA **tidak menandatangani DKIM**: `config/setup.cf` tidak ada, `config/opendkim/KeyTable` dan
  `SigningTable` = **0 baris**. Signing dilakukan **di aplikasi** via nodemailer
  (`app/src/lib/server/email.ts`, env `SOCIO_DKIM_PRIVATE_KEY`, selector `mail`, `d=socio.id`).
- DMARC `adkim=s aspf=s` = **strict alignment**. Kalau nanti kirim dari subdomain
  (mis. `promo.socio.id`), subdomain itu WAJIB punya DKIM `d=promo.socio.id` sendiri.
  Jalan termurah: **tetap From `@socio.id`**, isolasi reputasi lewat IP/HELO, bukan subdomain.

### 0.3 Data nyata dari DB `socio_smm`

```
users                : 3.338 total · 1.896 verify='Yes' · semua punya email
  level Member       : 3.063
  level Reseller     :   270
  level Agen         :     3
  level Admin        :     2
email_queue          : 25.302 baris — SEMUA status='sent' (tidak ada backlog pending)
  marketing-upsell          10.183
  marketing-acquisition_12d  5.049
  marketing-acquisition_7d   4.592
  marketing-acquisition_3d   4.261
  new-user-day12/day7/day3     369/366/357
email_campaigns      : 0     ← fitur campaign BELUM PERNAH dipakai
mailing_list         : 0
```

**Implikasi:** 24.085 email marketing sudah pernah terkirim. Itu penyebab insiden
Gmail `421-4.7.28` Sep-2026 (lihat `docs/AGENT_MEMORY.md` §6). Volume bukan masalah baru —
**reputasi yang harus dipulihkan lebih dulu.**

### 0.4 Yang SUDAH ADA di kode (jangan bikin ulang)

| Sudah ada | Lokasi |
|---|---|
| Admin campaign UI (save/send/cancel/delete/importXls) | `app/src/routes/(admin)/admin/email/+page.server.ts` (550 baris) + `+page.svelte` (664 baris) |
| Skema campaign | `packages/db/src/schema/marketing.ts` → `emailCampaigns`, `emailQueue`, `emailCampaignLog`, `emailCampaignTracking` |
| Skema mailing list eksternal | `packages/db/src/schema/mailingList.ts` |
| Worker pengirim | `app/src/cron/email-queue.ts` (cron tiap 5 menit, key `email-queue` di `app/src/cron/jobs.ts`) |
| Provider + DKIM + List-Unsubscribe | `app/src/lib/server/email.ts` (`sendEmail`, `wrapEmail:134`, `buildFrom`) |
| Layout email deposit | `app/src/lib/server/deposit-emails.ts` (`shell()`, `idr()`) |
| Broadcast in-app + web push (**bukan email**) | `app/src/lib/server/broadcast.ts` |
| Notifikasi admin | `notifyAdmins()` + tabel `admin_notifications` |
| Audit log | `logAudit()` di `app/src/lib/server/admin.ts` |
| Kolom opt-out legacy | `users.subs` (default true), `users.sentMail` — **NOL pemakaian di kode app** (terverifikasi grep) |

### 0.5 Yang BOLONG (inilah pekerjaannya)

| Bolong | Bukti |
|---|---|
| Tidak ada tabel suppression bounce/complaint | grep `suppress\|bounced\|complaint` di `packages/db/src/schema/*.ts` = kosong |
| Tidak ada rute unsubscribe | `find app/src/routes -ipath '*unsub*'` = kosong |
| Tidak ada webhook mail (hanya midtrans) | `app/src/routes/api/webhook/` cuma `midtrans` |
| `emailOpened` / `linkClicked` **tidak pernah ditulis** | grep 0 writer → `openRate`/`clickRate` di admin selalu `0.00` |
| Tidak ada pusat preferensi | tidak ada rute `/preferensi` |
| 3 layout email terduplikasi & tidak dari token DNA | `wrapEmail` (email.ts), `shell()` (deposit-emails.ts), HTML inline (email-queue.ts ~baris 75–105) |
| Template masih pakai warna sub-AA | `#94a3b8` — padahal `packages/ui/src/tokens.css:47` sudah mencapnya **2.56:1 sub-AA** dan menggantinya `#64748b` |
| Footer marketing tidak patuh | `wrapEmail` menulis "Jika bukan Anda yang meminta, abaikan email ini" — copy transaksional, tanpa link unsubscribe & tanpa alamat bisnis |
| Cap kirim kasar | `MAX_MARKETING_PER_RUN=10`, `MAX_GMAIL_PER_RUN=5` → **120 marketing/jam, 60 Gmail/jam** |
| `xls_list` = risiko spam trap | audience impor list eksternal aktif di action `send` |

---

## DNA DESIGN — kontrak wajib untuk SEMUA email

Sumber kebenaran: `packages/ui/src/tokens.css` + `docs/DESIGN.md`.

### Warna (email client TIDAK mendukung CSS variable → harus hex literal)

```
primary-600  #4f46e5   ← CTA fill, link, aksen utama
primary-700  #4338ca   ← hover/tekan
accent-500   #06b6d4   ← gradient pasangan primary
accent-ink   #0e7490   ← teks di atas permukaan accent (AA)
surface      #ffffff   ← kartu
ink-50       #f8fafc   ← background body email
ink-100      #f1f5f9   ← garis pemisah lembut
ink-200      #e2e8f0   ← border kartu
ink-400      #64748b   ← teks sekunder (AA 5.74:1 di putih)
ink-500      #475569   ← teks body (AAA 8.59:1)
ink-700      #1e293b   ← heading
ink-900      #0f172a   ← judul utama
success      #047857 / soft #dcfce7
warning      #b45309 / soft #fef3c7
danger       #b91c1c / soft #fee2e2
```

**DILARANG KERAS:**
- `#94a3b8` (sub-AA 2.56:1) — masih dipakai `wrapEmail`, harus diganti `#64748b`
- `#000000` dan `#ffffff` polos untuk **teks** (`docs/DESIGN.md` §B.1)
- Teks di atas fill `primary-600` harus `#ffffff` (rasio 8.6:1 ✅). Jangan teks gelap di atas indigo.

### Tipografi

```css
font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system,
             'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```
- Web font **tidak boleh** di-`<link>` (Gmail/Outlook strip). Harus degrade rapi ke system stack.
- Nuansa "display" (Sora) ditiru lewat `font-weight:800` + `letter-spacing:-0.02em`, bukan lewat font lain.
- Angka (saldo, harga, statistik): `font-variant-numeric: tabular-nums;` + helper `idr()` dari `deposit-emails.ts`.
- Skala: judul 20px/800 · subjudul 16px/700 · body 14px/1.6 · kecil 12px · footer 11px.

### Bentuk & ritme

- Kartu `max-width:600px`, `border-radius:16px`, `border:1px solid #e2e8f0`.
- Header gradient `linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%)` — sudah jadi ciri, pertahankan.
- CTA pill `border-radius:9999px`, tinggi 44px, `min-width:180px`, plus conditional MSO roundrect untuk Outlook.
- Padding konsisten 24px; pemisah `border-top:1px solid #f1f5f9`.
- **Bullet budget ≤ 5** per email (anti-pattern `looks-expensive`). Jangan kirim email berisi 12 bullet.

### Aturan teknis email

- Table-based layout, **semua** style inline (`style="..."`), `<style>` hanya untuk dark mode.
- Total HTML **< 102 KB** (melebihi itu Gmail memotong dengan `[…]` dan membunuh CTA).
- Rasio gambar:teks **< 40%**. Setiap `<img>` wajib `alt` + `width` + `height`.
- Jangan andalkan `background-image` untuk konten penting.
- Preheader wajib (`<div style="display:none;max-height:0;overflow:hidden;opacity:0">`) — sudah ada polanya di `wrapEmail`.
- Dark mode: `<meta name="color-scheme" content="light dark">` +
  `<meta name="supported-color-schemes" content="light dark">` + blok
  `@media (prefers-color-scheme: dark)`. Client yang tidak dukung harus tetap terbaca (degrade ke light).
- **Footer marketing wajib berisi:** nama bisnis, alamat fisik, link unsubscribe, link preferensi,
  dan kalimat "Anda menerima email ini karena terdaftar di socio.id".

---

# FASE 0 — Prasyarat infra mail (BLOCKER · sebagian tugas MANUSIA)

> **Tujuan:** membuat SMTP VPS sendiri benar-benar bisa sampai Inbox Gmail.
> Selama fase ini belum lolos, **jangan** memindahkan volume marketing ke SMTP sendiri.

### Task 0.1 — PTR / reverse DNS  ⚠️ TUGAS USER, BUKAN AGENT

**Fakta yang harus dipahami agent:** PTR **tidak bisa** diubah lewat SSH, Coolify, atau Cloudflare.
Reverse DNS hanya bisa diubah oleh pemilik alokasi IP = **TNA Hosting**. Cloudflare hanya memegang
forward DNS zona `socio.id`. Agent **tidak punya** jalur teknis untuk ini — jangan mencoba
`dig`, `nsupdate`, atau edit zone file di VPS; itu tidak berpengaruh apa pun.

**Yang harus dilakukan user:** buka panel TNA Hosting (cari menu *Reverse DNS* / *PTR*) atau kirim tiket.

Template tiket (tinggal salin):

```
Subjek: Permohonan set Reverse DNS (PTR) untuk IP VPS

Halo, mohon set PTR record untuk VPS saya:

  IPv4: 130.254.47.93      → PTR: mta1.socio.id
  IPv6: 2607:adc0:5::215   → PTR: mta1.socio.id

Saat ini keduanya masih default (static.130.254.47.93.hostname.com dan
static.2607:adc0:5::215.hostname.com) sehingga Gmail menolak email keluar
dengan 550 5.7.25 (missing/incorrect PTR) dan 421 4.7.28 (rate limit).

Saya akan menambahkan A/AAAA record mta1.socio.id yang menunjuk ke IP tersebut
sehingga FCrDNS (forward-confirmed reverse DNS) valid dua arah.

Terima kasih.
```

**Verifikasi (agent jalankan setelah user bilang sudah):**

```bash
dig +short -x 130.254.47.93 @1.1.1.1        # harus: mta1.socio.id.
dig +short -x 2607:adc0:5::215 @1.1.1.1     # harus: mta1.socio.id.
dig +short A mta1.socio.id @1.1.1.1         # harus: 130.254.47.93  (FCrDNS dua arah)
```

**Kalau PTR IPv6 tidak bisa di-set:** paksa egress IPv4 saja di postfix
(`inet_protocols = ipv4`, atau `smtp_bind_address = 130.254.47.93`) dan hapus AAAA dari `mail.socio.id`.
Email yang keluar lewat IPv6 tanpa PTR akan ditolak Gmail.

### Task 0.2 — Rapikan record `mail.socio.id` (Cloudflare)

`mail.socio.id` saat ini menunjuk **dua** IP, dan `45.41.205.105` **tidak ada** di server ini
(terverifikasi: `ip -4 -o a show scope global` hanya menampilkan `130.254.47.93`).

- [ ] Tambah `A  mta1.socio.id  → 130.254.47.93` (DNS-only, **abu-abu**, bukan proxied — record mail tidak boleh di-proxy)
- [ ] Tambah `AAAA mta1.socio.id → 2607:adc0:5::215` **hanya jika** PTR IPv6 berhasil
- [ ] **Tanya user dulu** sebelum menghapus `A mail.socio.id → 45.41.205.105` (mungkin mail server lama / sedang migrasi). Jangan hapus diam-diam.
- [ ] **Tanya user dulu** soal `mx1/mx2.privateemail.com` — masih dipakai untuk inbound? Kalau ya, biarkan.
- Pastikan semua record mail berstatus **DNS-only** di Cloudflare.

Kerjakan lewat skill `cloudflare` (bukan klik manual) supaya sesuai dokumentasi resmi.

### Task 0.3 — Bersihkan SPF

Dari:
```
v=spf1 +a +mx include:mailgun.org ip4:130.254.47.93 ~all
```
Menjadi (buang Mailgun yang tidak dipakai; tambah IPv6 hanya bila PTR IPv6 beres):
```
v=spf1 +a +mx ip4:130.254.47.93 ~all
```
- [ ] Verifikasi jumlah SPF lookup ≤ 10
- [ ] Verifikasi: `nslookup -type=TXT socio.id 1.1.1.1`
- **Jangan** ubah DMARC. `p=reject` itu benar dan melindungi domain; mengubahnya ke `p=none` demi "biar lolos" adalah kesalahan fatal.

### Task 0.4 — Google Postmaster Tools

- [ ] Daftarkan domain `socio.id` di https://postmaster.google.com (TXT `google-site-verification` sudah ada di root — verifikasi domain mungkin butuh record tambahan khusus Postmaster; ikuti petunjuk di sana).
- [ ] Setelah terdaftar, catat baseline: **Domain reputation**, **IP reputation**, **Spam rate**, **Encryption**.
- [ ] Ini sumber data untuk ramp otomatis di Fase 3.2. Tanpa Postmaster, ramp hanya bisa manual.

### Task 0.5 — Uji deliverability end-to-end

- [ ] Kirim tes dari app ke mailbox yang user kontrol (Gmail pribadi + Yahoo + Outlook):
      enqueue ke `email_queue` → trigger cron `email-queue` → cek.
      **JANGAN pernah test kirim ke user asli** (aturan `docs/AGENT_MEMORY.md` §6).
- [ ] Cek skor https://www.mail-tester.com — target **≥ 9/10**.
- [ ] Baca `.eml` mentah di maildir untuk memastikan header benar:
      ```bash
      ls -t /opt/mailu/scripts/mail-server/mail-data/socio.id/*/new/ | head -3
      ```
      Periksa: `From` tidak double-wrap, `DKIM-Signature d=socio.id s=mail` ada,
      `List-Unsubscribe` + `List-Unsubscribe-Post` ada, `Authentication-Results` = `dkim=pass spf=pass dmarc=pass`.
- [ ] **Wajib masuk tab Primary/Inbox, bukan Spam.**

### Acceptance Criteria Fase 0 (semua harus ✅)

1. `dig -x` kedua IP → `mta1.socio.id.`
2. FCrDNS valid dua arah
3. SPF bersih, ≤ 10 lookup
4. Postmaster terdaftar + baseline tercatat
5. mail-tester ≥ 9/10
6. Tes ke Gmail pribadi masuk **Inbox**
7. Header menunjukkan `dkim=pass spf=pass dmarc=pass`

### Kalau Fase 0 GAGAL (PTR ditolak TNA Hosting)

**Jangan memaksa.** Laporkan ke user dengan tiga alternatif ini, lalu berhenti:

| Alternatif | Biaya | Catatan |
|---|---|---|
| Resend Audiences/Broadcasts | **$40/bln** — 5.000 kontak, **unlimited sends** | 3.338 user muat. Termudah, shared pool bersih. Perlu verifikasi domain Resend (TXT `resend._domainkey` + SPF `include:amazonses.com`) |
| AWS SES + dedicated IP | ~$25/bln + ~$0.34 per blast 3.338 | Praktis tanpa batas, tapi perlu production access + warmup 2–4 minggu + SNS webhook sendiri |
| VPS mail terpisah ber-IP bersih | sewa VPS kecil | PTR bisa di-set sendiri, tapi tetap butuh warmup |

Keputusan user saat ini: **coba perbaiki SMTP VPS sendiri (budget $0)**. Jadi Fase 0 wajib diusahakan
lewat tiket TNA Hosting lebih dulu.

---

# FASE 1 — Kepatuhan & suppression (kode · sebelum kirim apa pun)

> **Prinsip:** tanpa opt-out yang dihormati dan suppression bounce, menambah volume hanya
> mempercepat domain masuk spam. Fase ini **wajib selesai sebelum Fase 3**.

### Task 1.1 — Tabel `email_suppressions`

File: `packages/db/src/schema/marketing.ts` (+ export di `packages/db/src/schema/index.ts`)

```
email_suppressions
  id           int PK autoincrement
  email        varchar(255) NOT NULL UNIQUE
  reason       enum('hard_bounce','soft_bounce','complaint','unsubscribe','spamtrap','manual')
  source       varchar(50)            -- 'webhook' | 'cron-scan' | 'admin' | 'preference-center'
  campaign_id  int NULL
  detail       text NULL
  created_at   timestamp default now
  index(reason), index(created_at)
```
- [ ] Migration: `pnpm --filter @socio/db drizzle:generate` lalu `drizzle:migrate` (ikuti cara yang sudah dipakai repo)
- [ ] **Jangan** edit migration yang sudah jalan (AGENTS.md §5)

### Task 1.2 — Opt-out di `users`

Gunakan kolom **yang sudah ada**: `users.subs` (boolean, default true) — terverifikasi **nol pemakaian**
di `app/src`, jadi aman diambil alih sebagai flag opt-out marketing.

- [ ] Tambah kolom `users.email_opt_out_at datetime NULL`
- [ ] Tambah kolom `users.email_prefs varchar(500) NULL` (JSON: `{categories:[], frequency:'weekly'}`)
- [ ] Helper di `app/src/lib/server/email-prefs.ts`: `isMarketingAllowed(userId|email)`, `setOptOut()`, `getPrefs()`, `setPrefs()`
- [ ] **Transaksional tidak boleh dipengaruhi `subs`** — reset password, deposit, refund tetap terkirim. Hanya marketing yang di-gate.

### Task 1.3 — Rute unsubscribe satu-klik (RFC 8058)

File baru: `app/src/routes/u/[token]/+server.ts` dan/atau `+page.svelte`

- [ ] `token` = HMAC-SHA256(`email` + `campaignId`) pakai secret yang sudah ada (`SOCIO_AUTH_SECRET`) — lihat pola di `app/src/lib/server/crypto.ts`
- [ ] **Tanpa login.** Harus bisa diklik dari Gmail di HP tanpa autentikasi.
- [ ] GET → halaman konfirmasi ("Berhenti berlangganan?") dengan satu tombol
- [ ] POST/aksi → `users.subs = false`, `users.email_opt_out_at = now`, insert `email_suppressions(reason='unsubscribe')`, `logAudit()`, redirect ke `/preferensi?token=...`
- [ ] Idempoten: klik dua kali tidak error
- [ ] Rate-limit per IP (pakai `app/src/lib/server/rate-limit.ts` yang sudah ada)

### Task 1.4 — Header `List-Unsubscribe` lengkap

File: `app/src/lib/server/email.ts`

Sekarang hanya `mailto:`. Tambahkan URL HTTPS:
```
List-Unsubscribe: <mailto:unsubscribe@socio.id?subject=unsubscribe>, <https://app.socio.id/u/TOKEN>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```
- [ ] `sendEmail()` perlu parameter opsional `unsubscribeUrl?: string`
- [ ] Header ini **wajib ada di setiap email marketing** (syarat Google/Yahoo untuk bulk sender)
- [ ] Mailbox `unsubscribe@socio.id` harus benar-benar memproses subject tersebut (Task 1.6)

### Task 1.5 — Pusat preferensi `/preferensi`

File baru: `app/src/routes/preferensi/+page.svelte` + `+page.server.ts`

- [ ] Akses via signed token (sama seperti 1.3), tanpa login
- [ ] Pilihan kategori: Promo & diskon · Update layanan · Tips & edukasi · Info Reseller
- [ ] Pilihan frekuensi: Maks harian / mingguan / bulanan / berhenti semua
- [ ] Simpan ke `users.email_prefs`
- [ ] Desain mengikuti DNA (skill `svelte` + `ui-ux-pro-max`; ini halaman app, bukan email)
- [ ] Mobile-first 360px

### Task 1.6 — Penanganan bounce & complaint

Dua jalur, kerjakan yang (a) dulu:

**(a) Cron scan maildir** — file baru `app/src/cron/email-bounce-scan.ts`, daftar di `app/src/cron/jobs.ts` (tiap 15 menit):
- [ ] Baca maildir `postmaster@` / `noreply@` di `/opt/mailu/scripts/mail-server/mail-data/socio.id/`
- [ ] Parse DSN (`5.1.1` user unknown → `hard_bounce`; `4.x.x` → `soft_bounce`) dan ARF (`feedback-type: abuse` → `complaint`)
- [ ] Tulis ke `email_suppressions`, tandai `email_queue.status='failed'` untuk baris terkait
- [ ] **WAJIB pakai `doveadm expunge` untuk membersihkan**, JANGAN `grep` manual —
      insiden Sep-2026: 12.000 file bounce 113 MB membuat grep sangat lambat (`docs/AGENT_MEMORY.md` §6)
- [ ] Pindahkan file yang sudah diproses, jangan hapus mentah tanpa backup

**(b) Webhook** — file baru `app/src/routes/api/webhook/mail/+server.ts`:
- [ ] Endpoint untuk laporan dari provider (dipakai bila nanti fallback ke Resend/SES)
- [ ] Verifikasi signature/secret; tolak tanpa auth
- [ ] Tulis `email_suppressions`

### Task 1.7 — Terapkan filter suppression di SEMUA jalur kirim

Tiga tempat, jangan ada yang terlewat:

| File | Kapan |
|---|---|
| `app/src/cron/email-queue.ts` | sebelum `sendEmail()` — skip bila email ada di suppression atau `subs=false` (marketing saja) |
| `app/src/routes/(admin)/admin/email/+page.server.ts` action `send` | saat resolve recipients — jangan enqueue yang tersupresi |
| `app/src/lib/server/broadcast.ts` | bila nanti ditambah channel email |

- [ ] Query batch pakai `inArray()` — **jangan** ``sql`id IN (${ids.join(",")})` `` (bug Drizzle: hanya match ID pertama, lihat `docs/AGENT_MEMORY.md` §7)
- [ ] Log jumlah yang di-skip beserta alasannya (visible di admin)

### Task 1.8 — Matikan audience `xls_list`

- [ ] Di action `send`: tolak `audience === 'xls_list'` dengan pesan jelas
- [ ] Di action `importXls`: nonaktifkan, atau wajibkan **double opt-in** sebelum boleh dipakai
- [ ] Alasan: list email eksternal yang tidak terbukti consent = sumber spam trap. Satu spam trap bisa menghancurkan reputasi IP yang baru di-warmup.
- [ ] **Tanya user** sebelum menghapus data `mailing_list` (saat ini 0 baris, jadi kemungkinan cukup nonaktifkan fitur)

### Acceptance Criteria Fase 1

1. Kirim email marketing tes ke alamat yang user kontrol → ada link unsubscribe yang berfungsi
2. Klik link → `users.subs = 0`, `email_opt_out_at` terisi, baris `email_suppressions` muncul, audit log tercatat
3. Jalankan campaign kedua ke segmen yang sama → alamat itu **tidak** ikut terkirim (cek log skip)
4. Enqueue ke alamat bounce sintetis → cron 1.6 menulis `hard_bounce` ke suppression
5. `/preferensi?token=` bisa dibuka tanpa login dan tersimpan
6. Email transaksional (reset password) ke user yang sudah opt-out **tetap terkirim**
7. `pnpm --filter app lint && pnpm --filter app typecheck && pnpm --filter app build` semua lolos

---

# FASE 2 — Template DNA (satu sumber kebenaran)

> **Tujuan:** hilangkan 3 layout terduplikasi, patuh token DNA & AA contrast, siap dipakai marketing.

### Task 2.1 — `app/src/lib/server/email/tokens.ts`

- [ ] Mirror token DNA ke **hex literal** (email client tidak mendukung CSS variable)
- [ ] Ekspor objek `EMAIL_COLORS`, `EMAIL_FONTS`, `EMAIL_SPACING`, `EMAIL_RADIUS`
- [ ] Komentar di kepala file: sumber `packages/ui/src/tokens.css`, dan peringatan
      "jangan pakai `#94a3b8` (sub-AA 2.56:1)"
- [ ] Ekspor helper `assertContrast(fg, bg)` untuk dipakai di test

### Task 2.2 — `app/src/lib/server/email/render.ts`

Komponen (semua mengembalikan string HTML, table-based, inline style):

```
emailShell({ preheader, title?, content, footer })   → dokumen lengkap + dark mode <style>
emailHeader({ subtitle? })                           → bar gradient + wordmark Socio.id
emailHero({ heading, subheading? })
emailBody(html | text)
emailPriceCard({ label, price, note? })
emailServiceGrid(items[])                            → maks 6 item, mobile 1 kolom
emailStatStrip({ items[] })                          → typographic strip, TANPA card chrome
emailCta({ label, href })                            → bulletproof: MSO roundrect + fallback <a>
emailDivider()
emailFooter({ unsubscribeUrl, preferencesUrl, address })  → WAJIB untuk marketing
```

- [ ] `max-width:600px`, background `#f8fafc`, kartu putih `border-radius:16px` + `border:1px solid #e2e8f0`
- [ ] Preheader `<div style="display:none;max-height:0;overflow:hidden;opacity:0">`
- [ ] Dark mode: `<meta name="color-scheme">`, `<meta name="supported-color-schemes">`, blok `@media (prefers-color-scheme: dark)`
- [ ] **Bullet budget ≤ 5**, **eyebrow pill ≤ 1** per email (anti-pattern `looks-expensive`)
- [ ] `emailFooter` untuk marketing wajib: alamat bisnis, link unsubscribe, link preferensi,
      "Anda menerima email ini karena terdaftar di socio.id"
- [ ] Sediakan `footerVariant: 'transactional' | 'marketing'` — footer transaksional
      TIDAK boleh berisi unsubscribe massal (bikin user opt-out dari reset password)

### Task 2.3 — Merge tags

File: `app/src/lib/server/email/merge.ts`

- [ ] Token: `{{fullName}} {{username}} {{level}} {{balance}} {{saldoFormatted}} {{lastOrderDays}} {{topService}} {{city}} {{couponCode}} {{referralCode}}`
- [ ] **Fallback aman**: nilai kosong → string default yang wajar (`"Halo,"` bukan `"Halo {{fullName}},"`)
- [ ] Guard: setelah render, scan hasil — kalau masih ada `{{...}}` tersisa, **gagal kirim** dan log error. Jangan pernah bocor tag mentah ke user.
- [ ] Escape HTML semua nilai dari DB (XSS ke body email)

### Task 2.4 — Refactor 3 layout lama → `render.ts`

| File | Aksi |
|---|---|
| `app/src/lib/server/email.ts` (`wrapEmail`, baris ~134) | ganti isi menjadi pemanggil `emailShell` + `emailCta` + footer **transaksional**. Ganti semua `#94a3b8` → `#64748b`. **Copy/jangan ubah makna teks.** |
| `app/src/lib/server/deposit-emails.ts` (`shell()`) | pakai `emailShell`; pertahankan kartu bank & `idr()` |
| `app/src/cron/email-queue.ts` (HTML inline ~baris 75–105) | pakai `emailShell`; CTA lewat `emailCta` |

- [ ] Tidak boleh ada lagi string HTML email di luar `app/src/lib/server/email/`
- [ ] Jangan ubah **isi pesan** email transaksional yang sudah terbukti jalan (deposit, reset, refund) — hanya sumber HTML-nya

### Task 2.5 — Budget & kualitas

- [ ] Total HTML **< 102 KB** (kalau lebih, Gmail memotong dengan `[…]`)
- [ ] Rasio gambar:teks **< 40%**
- [ ] Setiap `<img>` punya `alt` + `width` + `height`
- [ ] Tidak ada `background-image` untuk konten penting
- [ ] Test unit (Vitest): render tiap komponen → assert tidak ada `#94a3b8`, tidak ada `{{`, ukuran < 102KB, kontras CTA ≥ 4.5:1

### Task 2.6 — Preview di admin

File: `app/src/routes/(admin)/admin/email/+page.svelte` (+ action/server load baru)

- [ ] Tab **Preview**: render iframe desktop 600px **dan** mobile 360px berdampingan
- [ ] Tombol **"Kirim tes ke email saya"** → hanya ke email admin yang sedang login. **Dilarang** kirim ke user asli.
- [ ] Toggle dark mode di preview
- [ ] Tampilkan skor: ukuran HTML, jumlah gambar, ada/tidaknya unsubscribe link

### Acceptance Criteria Fase 2

1. Screenshot preview desktop + mobile (pakai skill `pw-vision`) → lampirkan ke laporan
2. `grep -rn '#94a3b8' app/src/lib/server/` = **kosong**
3. Test kontras lolos (CTA, footer, teks sekunder)
4. mail-tester ≥ 9/10 dengan template baru
5. Tampil konsisten di Gmail web, Gmail Android, dan Outlook (minimal cek Gmail web + Android)
6. `pnpm --filter app lint && typecheck && test && build` lolos

---

# FASE 3 — Mesin kirim: throttle, ramp, warmup

> **GATE:** fase ini hanya boleh dimulai setelah **Acceptance Fase 0 lolos dan stabil ≥ 2 minggu**.

### Task 3.1 — Throttle per-domain

Tabel baru `email_send_policy` (`packages/db/src/schema/marketing.ts`):
```
id · domain_pattern varchar(100) · max_per_run int · max_per_hour int · enabled bool · note
```
Seed: `gmail|googlemail` · `yahoo|ymail` · `hotmail|outlook|live` · `*` (default)

- [ ] Ganti konstanta kasar `MAX_MARKETING_PER_RUN=10` / `MAX_GMAIL_PER_RUN=5` di `app/src/cron/email-queue.ts` dengan baca dari tabel
- [ ] Transaksional **selalu** prioritas (`ORDER BY priority DESC` sudah benar — pertahankan)
- [ ] Nilai awal konservatif: marketing 10/run, Gmail 5/run (sama seperti sekarang) — jangan langsung dinaikkan

### Task 3.2 — Ramp otomatis berbasis reputasi

File baru: `app/src/lib/server/email-ramp.ts`

**Pola yang sama dengan `seo/ramp-gate.mjs`** (satu filosofi: gate berbasis pengukuran, bukan tebakan).

| Sinyal | Aksi |
|---|---|
| Spam rate < 0.1% **dan** reputasi High/Medium | kalikan `max_per_run` ×2, maksimal tiap 2 hari |
| Spam rate 0.1–0.3% | **tahan** (jangan naik, jangan turun) |
| Spam rate > 0.3% | potong 50% + `notifyAdmins()` + audit log |
| IP reputation Low/Bad | set marketing = 0 (pause total) + alert |

- [ ] Sumber data: Google Postmaster. Kalau tidak ada API, sediakan input manual di `/admin/email/deliverability` + file JSON yang dibaca ramp.
- [ ] Simpan riwayat keputusan (`email_ramp_log`) supaya bisa diaudit
- [ ] **Fail-safe:** kalau data reputasi tidak tersedia > 7 hari → tahan di level terakhir, jangan naikkan

### Task 3.3 — Warmup schedule (WAJIB, tidak boleh dilompati)

File: `app/src/lib/server/email-warmup.ts` + config JSON

| Periode | Volume/hari | Segmen |
|---|---|---|
| Hari 1–3 | 25 | paling engaged: order ≤ 30 hari terakhir |
| Hari 4–7 | 50 | + buka email 60 hari terakhir |
| Minggu 2 | 150 | + aktif 90 hari |
| Minggu 3 | 400 | semua verified yang tidak tersupresi |
| Minggu 4 | 1.000 | penuh |
| Setelahnya | dibuka oleh ramp (3.2) | — |

- [ ] Warmup **hanya** berlaku untuk marketing. Transaksional tidak dibatasi warmup.
- [ ] Status warmup terlihat di admin (`/admin/email/deliverability`)
- [ ] Agent **dilarang** menaikkan volume melewati jadwal ini walaupun user minta — konfirmasi ulang ke user dengan menjelaskan risikonya

### Task 3.4 — Auto-pause campaign

- [ ] Hard bounce > 2% **atau** complaint > 0.1% → `email_campaigns.status = 'paused'`
- [ ] `notifyAdmins()` + `logAudit('campaign_auto_paused', …)`
- [ ] Tampilkan alasan pause di admin

### Task 3.5 — Routing provider terpisah (KRITIS)

File: `app/src/lib/server/email.ts`, `packages/db/src/schema/marketing.ts`

- [ ] `sendEmail()` terima opsi `via?: 'resend' | 'smtp'`
- [ ] Tambah kolom `email_queue.provider enum('resend','smtp')`
- [ ] **Transaksional tetap `resend`** sampai Fase 0 stabil ≥ 2 minggu. Marketing → `smtp`.
- [ ] **DILARANG flip global ke SMTP.** Alasan: insiden Sep-2026 — IP VPS diblokir Gmail
      (`550 5.7.25` + `421 4.7.28`) sehingga email verifikasi & reset password user hilang tanpa kabar.
- [ ] Kalau Resend gagal **dan** SMTP gagal → email tetap `pending` + retry (jangan di-drop)

### Task 3.6 — Fail-closed DKIM

- [ ] Di `sendEmail()`: kalau `via='smtp'` dan `SOCIO_DKIM_PRIVATE_KEY` kosong → **tolak** kirim marketing dan lempar error jelas
- [ ] Alasan: DMARC `p=reject` + `adkim=s` berarti email tak ditandatangani **dibuang**, bukan masuk spam
- [ ] Karena MTA tidak signing (`KeyTable`/`SigningTable` 0 baris), signing di nodemailer adalah satu-satunya — jangan sampai diam-diam hilang
- [ ] Health check: `app/src/lib/server/health-metrics.ts` laporkan status DKIM

### Task 3.7 — HELO & egress

- [ ] Postfix `myhostname = mta1.socio.id`
- [ ] Egress IPv4 saja bila PTR IPv6 belum beres (lihat Task 0.1)
- [ ] Verifikasi header `Received:` menunjukkan hostname yang cocok dengan PTR

### Acceptance Criteria Fase 3

1. Kirim 100 email ke seed milik sendiri (Gmail/Yahoo/Outlook) → **≥ 95% masuk Inbox**
2. Log throttle menunjukkan cap per-domain benar-benar diterapkan
3. Uji bounce sintetis → campaign auto-pause + admin dapat notifikasi
4. Matikan `SOCIO_DKIM_PRIVATE_KEY` di staging → kirim marketing **ditolak** (bukan terkirim tanpa tanda tangan)
5. Reset password ke user yang sudah opt-out tetap terkirim via Resend
6. Tidak ada email transaksional yang ikut kena throttle marketing

---

# FASE 4 — Tracking nyata

> Sekarang `openRate`/`clickRate` di admin **selalu 0.00** karena tidak ada yang menulis
> `emailOpened`/`linkClicked`. Fase ini mengisi angka itu.

### Task 4.1 — Open pixel

File baru: `app/src/routes/api/e/o/[token]/+server.ts`
- [ ] Balas GIF 1×1 (`Content-Type: image/gif`, `Cache-Control: no-store`)
- [ ] Tulis `emailCampaignTracking.emailOpened` **hanya first-open** (jangan overwrite)
- [ ] Hitung ulang `email_campaigns.openRate`
- [ ] Token signed; tolak token tidak valid tanpa membocorkan info
- [ ] Suntikkan pixel saat render — **hanya untuk email marketing**

### Task 4.2 — Click redirect

File baru: `app/src/routes/api/e/c/[token]/+server.ts`
- [ ] Tulis `linkClicked`, lalu **302** ke URL tujuan
- [ ] URL tujuan disimpan di DB/dirujuk by-id — **jangan** terima `?u=` mentah dari query (open redirect + bocor daftar user)
- [ ] Rate-limit

### Task 4.3 — Link rewriting

File: `app/src/lib/server/email/render.ts` (+ `tracking.ts`)
- [ ] Rewrite `<a href>` marketing → `/api/e/c/<token>`
- [ ] **DILARANG KERAS** me-rewrite link email transaksional (reset password, konfirmasi deposit).
      Kalau link reset password lewat redirect tracking dan tracking error, user terkunci dari akunnya.
- [ ] Parameter `tracked: boolean` eksplisit di `emailShell`, default `false` (aman)

### Task 4.4 — Konversi

File baru: `app/src/cron/email-conversion.ts` (+ daftar di `jobs.ts`, tiap jam)
- [ ] Bila user order/deposit ≤ 7 hari setelah klik → `emailCampaignTracking.converted = 1` + `conversionValue`
- [ ] Sumber: `orders`, `deposits`
- [ ] Update `email_campaigns.conversionRate`

### Task 4.5 — UTM

- [ ] Semua link marketing: `?utm_source=email&utm_medium=promo&utm_campaign=<slug>`
- [ ] Jangan tambahkan UTM ke link transaksional

### Task 4.6 — Panel di admin

- [ ] `openRate`, `clickRate`, `conversionRate` per campaign (kolomnya sudah ada di skema)
- [ ] Breakdown per segmen
- [ ] Grafik 7/30 hari

### Acceptance Criteria Fase 4

1. Buka email tes → `emailOpened` terisi, `openRate` di admin bukan `0.00`
2. Klik CTA → `linkClicked` terisi **dan** redirect ke halaman yang benar
3. Link reset password di email transaksional **tidak** di-rewrite (verifikasi manual)
4. Order setelah klik → `converted = 1` + nilai tercatat
5. Ukuran token tidak membocorkan email/user id mentah

---

# FASE 5 — Personalisasi & segmentasi

### Task 5.1 — Resolver merge tag (lihat Task 2.3)
- [ ] Ambil dari `users`, `orders`, `services`, `coupons`, `balance_logs`
- [ ] **Batch**, bukan N+1: satu query `inArray()` untuk semua penerima
- [ ] Target: resolve 3.338 penerima < 2 detik

### Task 5.2 — Segmen baru

Selain yang sudah ada di action `send` (`active`, `inactive`, `new_user`, `high_spender`, `churn_risk`):

| Segmen | Definisi |
|---|---|
| `balance_low` | saldo < Rp20.000 **dan** ada order 30 hari terakhir |
| `reseller_prospect` | level Member dengan volume order tinggi → tawaran upgrade Reseller |
| `dormant_90` | tidak order 90 hari |
| `engaged_opener` | buka ≥ 2 email dalam 30 hari (butuh Fase 4) |

- [ ] Tambah ke enum DB — **enum MySQL perlu `ALTER` manual** bila menambah nilai (`docs/AGENT_MEMORY.md` §6)
- [ ] Tampilkan jumlah penerima per segmen di UI **sebelum** kirim (biar admin tahu skalanya)

### Task 5.3 — Sunset policy
- [ ] Tidak buka email 90 hari → keluar otomatis dari semua segmen promo (transaksional tetap)
- [ ] Tandai di `email_suppressions(reason='manual')`? **Jangan** — buat flag terpisah `marketing_suppressed` di prefs, supaya bisa dipulihkan kalau user aktif lagi

### Task 5.4 — Frequency guard
- [ ] Maks **2 email promo per user per minggu**
- [ ] Hormati `users.email_prefs.frequency`
- [ ] Implementasi: hitung dari `email_queue` 7 hari terakhir (template `campaign-*`/`marketing-*`) sebelum enqueue

### Acceptance Criteria Fase 5
1. Tiga segmen berbeda menghasilkan copy berbeda (buktikan dengan screenshot preview)
2. Tidak ada merge tag mentah yang bocor (unit test)
3. Resolve 3.338 penerima < 2 detik (ukur dan catat)
4. User yang sudah dapat 2 promo minggu ini tidak dapat yang ketiga

---

# FASE 6 — Otomasi promo (trigger, bukan blast)

> **Prinsip:** email otomatis berbasis perilaku jauh lebih masuk inbox dan lebih konversi
> daripada blast ke semua orang. Blast besar = yang bikin domain ke-throttle Sep-2026.

### Task 6.1 — Job baru di `app/src/cron/jobs.ts`

Menambah 1 entry di `jobs.ts` = otomatis terjadwal **dan** muncul di UI admin (pola repo).

| Key | Jadwal | Isi |
|---|---|---|
| `email-lifecycle` | harian 09:00 | day-3 welcome + tutorial · day-7 first-order nudge + kupon kecil · day-12 upsell |
| `email-balance-low` | harian 10:00 | saldo < Rp20k & aktif 30 hari → CTA top-up |
| `email-price-drop` | tiap jam | event dari `serviceChangelog`: harga layanan favorit user turun |
| `email-reseller-upsell` | Senin 10:00 | Member volume tinggi → tawaran Reseller. **270 Reseller eksisting dapat materi berbeda** (retensi, bukan akuisisi) |
| `email-winback` | Rabu 10:00 | 30/60/90 hari tidak order, eskalasi insentif |
| `email-weekly-digest` | Jumat 16:00 | layanan terlaris + 2 artikel blog terbaru ← **menyambungkan SEO ↔ email** |

### Task 6.2 — Idempoten
- [ ] Unique key `(user_id, trigger_key, period)` — satu user tidak boleh dapat trigger yang sama dua kali dalam satu periode
- [ ] Tabel baru `email_triggers_sent` atau kolom di `email_campaign_log`
- [ ] Uji: jalankan job 2× berturut-turut → kirim hanya sekali

### Task 6.3 — Kupon
- [ ] Pakai tabel `coupons` yang **sudah ada** di skema
- [ ] Kode unik per user, expiry, single-use
- [ ] Tercatat di `balance_logs` saat dipakai
- [ ] Render via `emailPriceCard` / `emailHero`

### Task 6.4 — A/B subject line
- [ ] Kolom `ab_variant_a`, `ab_variant_b`, `ab_winner` di `email_campaigns`
- [ ] Kirim 10% sampel acak → tunggu 4 jam → pemenang ke sisa 90%
- [ ] Butuh Fase 4 (open tracking) untuk menentukan pemenang

### Task 6.5 — Send-time optimization
- [ ] Jam kirim per user dari pola `orders.created_at` (jam paling sering order)
- [ ] Default fallback: 10:00 dan 19:00 WIB (`TZ=Asia/Jakarta` sudah diset di server)
- [ ] Jangan kirim 00:00–06:00 waktu lokal user

### Task 6.6 — Kontrol admin
- [ ] Tiap trigger bisa di-pause/enable sendiri dari UI
- [ ] Lihat volume terkirim per trigger 7 hari terakhir
- [ ] Semua aksi `logAudit()`

### Acceptance Criteria Fase 6
1. Tiap trigger menghasilkan **≤ 1 email per user per periode** (uji jalankan 2×)
2. Semua trigger bisa di-pause dari admin
3. Kill switch (Task 7.3) mematikan semua trigger sekaligus
4. Tidak ada trigger yang menembus frequency guard (maks 2 promo/minggu)
5. `email-weekly-digest` benar-benar memuat artikel blog yang live (`draft:false`)

---

# FASE 7 — Monitoring, kill switch, runbook

### Task 7.1 — Halaman `/admin/email/deliverability`
- [ ] Spam rate, bounce rate, complaint rate, unsubscribe rate (7 & 30 hari)
- [ ] Domain & IP reputation dari Postmaster (manual input bila tanpa API)
- [ ] Volume terkirim per hari per provider
- [ ] Status warmup + level throttle saat ini
- [ ] Hasil inbox-placement test terakhir
- [ ] Ukuran maildir bounce (peringatan bila > 500 MB — insiden Sep-2026 mencapai 113 MB / 12k file)

### Task 7.2 — Alert `notifyAdmins()`
Pemicu: spam rate > 0.1% · hard bounce > 2% · unsubscribe > 0.5% per campaign ·
throttle turun 2 hari berturut · maildir bounce > 500 MB · DKIM key hilang.

- [ ] **Wajib** juga menulis ke `admin_notifications` (in-app) — email admin semuanya Gmail
      dan bisa ikut ter-throttle (`docs/AGENT_MEMORY.md` §6)

### Task 7.3 — Kill switch global
- [ ] Flag `EMAIL_MARKETING_ENABLED` (env + override di DB lewat admin)
- [ ] `false` → semua job marketing **no-op**, transaksional **tetap jalan**
- [ ] Uji: matikan → cron marketing berhenti, reset password masih terkirim

### Task 7.4 — Runbook insiden
File baru: `docs/EMAIL_DELIVERABILITY_RUNBOOK.md`
- [ ] Gejala `421-4.7.28` / `550 5.7.25` → langkah diagnosis
- [ ] Flush antrean basi: `postsuper -d <ID>` **satu-per-satu** — batch multi-ID **GAGAL**
- [ ] Bersihkan maildir bounce: `doveadm expunge` — **JANGAN** grep manual 12k file
- [ ] Cara turunkan throttle darurat + cara naikkan lagi setelah reputasi pulih
- [ ] Cara cek header `.eml` mentah untuk membuktikan DKIM/SPF/DMARC

### Task 7.5 — Update dokumentasi
- [ ] `docs/AGENT_MEMORY.md` §6 (Email): tambahkan arsitektur baru, keputusan Fase 0, tabel suppression
- [ ] `REBUILD_PLAN.md` §9: tandai item M6 (Email + polish) yang selesai
- [ ] `.env.example`: tambah env baru (`EMAIL_MARKETING_ENABLED`, dll)
- [ ] **Koreksi `AGENTS.md` §2 dan §0.13**: tertulis "VPS TNA Hosting (hybrid, **infra Hostinger SG**)".
      User menegaskan socio.id **tidak memakai Hostinger** — hanya TNA Hosting + Coolify + Cloudflare.
      Tanya user sebelum mengubah, lalu perbaiki agar agent berikutnya tidak salah jalur.

### Acceptance Criteria Fase 7
1. Kill switch terbukti menghentikan marketing tanpa mematikan transaksional
2. Runbook teruji minimal sekali (simulasi bounce menumpuk)
3. Alert masuk ke in-app **dan** email admin
4. Dokumentasi sinkron dengan kode

---

## Urutan pengerjaan & dependensi

```
FASE 0 (user: tiket PTR ke TNA Hosting)  ──┐
FASE 1 (kepatuhan)  ← bisa jalan paralel   │
FASE 2 (template DNA) ← bisa jalan paralel ┘
        │
        ▼  (Fase 0 acceptance lolos + stabil 2 minggu)
FASE 3 (throttle/ramp/warmup)
        │
        ▼
FASE 4 (tracking) ──→ FASE 5 (personalisasi) ──→ FASE 6 (otomasi trigger)
        │
        ▼
FASE 7 (monitoring & runbook)  ← sebenarnya bisa dicicil sejak Fase 3
```

**Fase 1 dan 2 tidak butuh Fase 0.** Kerjakan itu dulu sambil menunggu PTR.

## Perintah verifikasi standar (tiap fase)

```bash
pnpm --filter app lint
pnpm --filter app typecheck
pnpm --filter app test
pnpm --filter app build
```

Deploy app **manual** (webhook GitHub tidak terpasang di Coolify — `is_webhook = 0`):
```
POST /api/v1/deploy    # prosedur lengkap: docs/AGENT_MEMORY.md §2
```
Push > 20 commit sekaligus bisa terlewat deploy — cek status setelah push besar.

## Aturan keras untuk agent (ringkasan)

1. **Jangan** kirim email tes ke user asli. Hanya ke email admin.
2. **Jangan** flip transaksional ke SMTP sendiri sebelum Fase 0 stabil 2 minggu.
3. **Jangan** naikkan volume melewati jadwal warmup (Task 3.3) tanpa konfirmasi user.
4. **Jangan** ubah DMARC `p=reject` menjadi longgar demi "biar lolos".
5. **Jangan** pakai audience `xls_list` / list email eksternal.
6. **Jangan** rewrite link email transaksional untuk tracking.
7. **Jangan** grep manual maildir bounce — pakai `doveadm expunge`.
8. **Jangan** flush antrean dengan `postsuper -d` multi-ID — satu-per-satu.
9. **Jangan** sentuh proyek lain di VPS (beriklan, `/opt/seo-pipeline`, searxng).
10. **Jangan** pakai `sql` template untuk `IN (...)` — selalu `inArray()`.
11. **Jangan** hardcode secret. Semua lewat env.
12. **Jangan** bilang "selesai" tanpa acceptance criteria terpenuhi + output perintah nyata.

## Catatan operasi 6 Okt 2026 — mailserver diperingan (tanpa install apa pun)

- Temuan: `/var/log/mail/mail.log` di dalam container `mailserver` membengkak **45 GB**
  (sisa badai bounce Sep-2026). `fail2ban-server` mengekor file itu → **93-104% CPU
  nonstop** + disk host 53%.
- Tindakan: truncate `mail.log` + restart container `mailserver`
  (queue kosong — `postqueue -p` kosong; config di volume; aman).
- Hasil: CPU 104% → **1.25%**, RAM 382MB → **248MB**, disk 53% → **22%**, load turun terus.
- Pelajaran: **jangan install mail stack baru** (Mailcow/Mautic butuh 1-2 GB+ RAM =
  mengulang OOM kemarin). `docker-mailserver` yang ada SUDAH yang paling ringan.
  Untuk kampanye, tambah **Listmonk** (±50 MB, single binary, pakai MySQL yang ada).
- Pencegahan: badai bounce tidak boleh terulang (throttle + suppression Fase 1/3).
  Kalau `mail.log` tumbuh >1 GB lagi = tanda ada yang salah, cek segera.

## Update 6 Okt 2026 (malam) — Fase 2 SELESAI (kecuali preview admin)

Inventarisasi produksi nyata (dari DB `socio_smm.email_queue`):
transaksional 9 template (verification, reset-password, deposit-instruction/
reminder/expired/success, admin-deposit-pending, admin-alert, admin-refund-request,
aktivasi + welcome reseller) · lifecycle 6 template lawas TANPA kode pengirim di repo
(marketing-upsell 10.183, acquisition_3d/7d/12d, new-user-day3/7/12 — skrip ad-hoc hilang,
JANGAN dipakai ulang tanpa rewrite) · campaign-* (kode ada, `email_campaigns`=0).

Yang dikerjakan:
- `app/src/lib/server/email/tokens.ts` — DNA hex + assertContrast (rasio dihitung,
  bukan klaim: CTA 6.29, body 7.58, sekunder 4.76 — semua AA).
- `app/src/lib/server/email/render.ts` — shell + 10 komponen, footer
  transaksional (help/security/bare) + marketing (unsubscribe + alamat wajib).
- `app/src/lib/server/email/merge.ts` — 10 merge tags + guard anti-bocor (throw).
- Refactor 3 layout lama → render.ts. Copy transaksional IDENTIK; yang berubah hanya
  warna sub-AA `#94a3b8`→`#64748b` di permukaan terang + dark-mode + MSO di semua CTA.
- `app/scripts/email-selftest.mjs` — 25 cek (transpile tsc + assert runtime).
- Verifikasi: self-test 25/25 · eslint 0 error (2 warning pre-existing) ·
  svelte-check 0 error · `pnpm --filter app build` sukses.
- Sisa Fase 2: preview admin desktop+mobile (Task 2.6) — belum dikerjakan.

## Update 7 Okt 2026 — Sparko masuk email + preview galeri

- Temuan user: template belum pakai DNA + Sparko. Benar — warna/font sudah DNA
  (`tokens.css`), tapi maskot belum ada.
- Aset: 4 pose (idle/wave/celebrate/sad) PNG @2x transparan ±12-14KB, di-raster
  dari SVG preview resmi (SMIL dibuang). Live di `https://socio.id/email/`.
  SVG sumber ikut di-commit di runner repo.
- Komponen `emailMascot(pose)` (alt + dimensi wajib, pose tak dikenal melempar).
- Penempatan: verification/wave, welcome+success+coupon/celebrate,
  instruction/reminder/reset/digest/idle, canceled/sad, aktivasi/wave.
- Keputusan user: header welcome disamakan indigo (hijau dihapus), emoji 🎉 tetap,
  footer © ditambah ke 2 email reseller, alamat marketing = domain+kota.
- Preview: `/Volumes/miniex/Users/maabook/email-preview/galeri.html` (10 template,
  mobile 360px) + `GALERI-SEMUA.png`. Generator: `app/scripts/email-preview.mjs`.
- Self-test: 30 cek (termasuk maskot valid + pose tak dikenal melempar).

## Update 7 Okt 2026 — Retheme ke tema socio.id asli (landing tokens)

- Kritik user benar: versi indigo + Sparko 120px tidak selaras situs.
- Sumber kebenaran diganti: `packages/ui/tokens.css` → **`landing/src/styles/tokens.css`**
  (cyan-teal + mango; hex = konversi oklch TERVERIFIKASI: putih/hitam/merah tepat).
- Perubahan: header PUTIH + wordmark (gradient blok dibuang), CTA `#005f7c`
  (satu-satunya fill CTA per kontrak landing, 7.17:1), eyebrow mango `#f7c243`,
  Sparko 120px → 72px, urgency `#c01242` (6.16:1), font display Sora untuk judul.
- Self-test: 34 cek (termasuk larangan indigo `#4f46e5`/`#06b6d4` +
  10 pasangan kontras, terendah 6.16:1).
- Galeri baru dibuka di browser user. Typecheck 0 error, build sukses.
