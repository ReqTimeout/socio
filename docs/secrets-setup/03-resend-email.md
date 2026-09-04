# Setup Resend — Email Verifikasi + Notifikasi

> **Status 2026-09-02: OPSIONAL (fallback only).** Primary email sekarang self-hosted SMTP
> `mail.socio.id` (nodemailer, STARTTLS 587) — sudah live & verified.
> Resend hanya dipakai kalau `RESEND_API_KEY` di-set di Coolify (fallback otomatis di
> `app/src/lib/server/email.ts`). Ikuti guide ini hanya kalau mau redundancy provider.
> Deliverability self-hosted SMTP masih menunggu PTR record (manual Tencent Cloud console).

> Tujuan: kirim email signup verification, notifikasi deposit, notif order, dll via Resend.
> Dipakai `app/src/lib/server/email.ts:27` (lazy-import resend).

## ⚠️ ROTATE KEY LAMA DULU (B-01 dari VULN_CHECKLIST.md)

Sebelum bikin key baru, **cek apakah key Resend pernah ke-commit**:

```bash
cd /Users/maabook/Desktop/socio.id
git log --all -p | grep -E "RESEND_API_KEY|re_[A-Za-z0-9]" | head -5
```

Kalau nemu (format `re_xxx`), **REVOKE** key lama:

1. <https://resend.com/api-keys>
2. Cari key yang ada di output git log
3. Klik → **Delete**
4. Lanjut bikin key baru di step 3 di bawah

Selesai wajib sebelum move on — pakai key leaked = spammable.

## Kenapa Resend (bukan SendGrid/Mailgun)?

- Free 3000 email/bulan, 100/hari
- API modern (REST), SDK TypeScript bersih
- Domain verification built-in dengan Cloudflare integration (auto-DNS)
- Tanpa biaya kalau traffic masih kecil

## Langkah

### 1. Register Resend

- <https://resend.com> → **Sign Up** (pakai Google/GitHub OAuth biar cepet)
- Verifikasi email

### 2. ⚠️ Selesai rotate key lama (di atas) sebelum lanjut

### 3. Generate API key baru

- Dashboard <https://resend.com/api-keys>
- **Create API Key**
- Name: `socio-app-prod-2026-09-02`
- Permission: **Full access** (kalau paranoid, scope: Sending access only)
- Domain: **socio.id** (default — only allow sending from this domain)
- Klik **Add** → copy key (format `re_xxx`)

### 4. Verify domain `socio.id`

- Dashboard Resend → **Domains** → **Add Domain** → `socio.id`
- Resend kasih daftar DNS record untuk di-add ke Cloudflare:

| Type | Name | Value (contoh) |
|---|---|---|
| TXT | `send` | Resend verification token |
| TXT | `resend._domainkey` | DKIM public key value |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hi@resend.com` |
| MX | `send` | (optional) inbound mail |

#### CARA 1 (recommended): Cloudflare auto-integrate

Kalau Resend kasih opsi "Add via Cloudflare" atau "Verify with Cloudflare":
- Klik — otomatis add DNS record ke zone `socio.id`
- Tunggu 1-5 menit propagasi
- Balik ke Resend → **Verify** → harus hijau

#### CARA 2: Manual di Cloudflare

- <https://dash.cloudflare.com> → klik zone `socio.id` → **DNS → Records**
- Tambah setiap TXT / MX record di atas
- Balik ke Resend → **Verify**

### 5. Test kirim email

- Di Resend dashboard: **Send Test Email**
  - From: `noreply@socio.id`
  - To: email pribadi user
- Cek inbox + spam

## Paste ke Coolify

| Key | Value |
|---|---|
| `RESEND_API_KEY` | `re_xxx` dari step 3 |
| `SOCIO_MAIL_FROM` | `Socio ID <noreply@socio.id>` (sudah ke-set) |
| `SOCIO_MAIL_FROM_NAME` | `Socio ID` (sudah ke-set) |
| `SOCIO_MAIL_SUPPORT` | `support@socio.id` (sudah ke-set) |
| `SOCIO_MAIL_MAX_PER_RUN` | `100` (sudah ke-set — max email per cron run) |

⚠️ `RESEND_API_KEY` **jangan** set `is_buildtime=true` — kalau true, key baked ke image Docker.

## Verifikasi

```bash
docker logs <container-app> 2>&1 | grep -i "email\|resend"
```

Cron tiap 5 menit flush `email_queue` table:
- Kalau ada pending: log `[cron] email-queue: sent=N failed=0`
- Cek inbox user yang baru signup

Test dari UI:
1. Login → /pesan → submit order → harus ada email notif
2. Atau create user baru → cek inbox verification

## Troubleshooting

| Gejala | Fix |
|---|---|
| `403 Forbidden` saat kirim | API key salah / di-revoke. Cek Resend dashboard. |
| `Domain not verified` | DNS record belum propagate. Tunggu 5 menit, retry. Cek `dig send.socio.id TXT` di terminal. |
| Email masuk spam | DKIM/DMARC belum propagate atau SPF salah. Test via <https://www.mail-tester.com>. |
| Quota 3000 habis | naik plan di Resend ($20/bulan untuk 50k emails). |
| `rate limit` di log | `SOCIO_MAIL_MAX_PER_RUN` terlalu tinggi atau ada spike traffic. Turunin ke 50. |

## Lanjutan (M6+)

- **Inbound email**: setup MX record untuk terima email di support@socio.id → webhook ke app
- **Webhook event**: Resend bisa kirim `delivered`/`bounced` event ke webhook (route belum ada — M6+)
- **Multiple sender identities**: pakai alias `noreply@`, `support@`, `billing@` — masing-masing perlu DKIM sendiri
