# Setup Cloudflare Turnstile — Anti-Bot Signup/Login

> Tujuan: blok signup bot / spam dengan CAPTCHA privacy-friendly.
> Tanpa ini, attacker bisa mass-create akun pakai script dan spam DB.

## Kenapa Turnstile (bukan reCAPTCHA/hCaptcha)?

- **Free selamanya**, no limit
- Privacy-friendly (no tracking, no cross-site cookies)
- Native Cloudflare — same account, no extra integration
- Invisible mode available (zero UI impact)

## Langkah

### 1. Login Cloudflare dashboard

Akun `socio.id` (Account ID `0298214d1069f75436f490b51ea4763e` di `accountcf.md`)

### 2. Buka Turnstile

- Sidebar kiri → **Turnstile**
- Klik **Add widget**

### 3. Konfigurasi

| Field | Value |
|---|---|
| **Widget name** | `socio-signup-prod` |
| **Domains** | klik **Add domains** lalu tambah 2 entry: |
| | `app.socio.id` (production) |
| | `localhost` (opsional — biar dev test ga error) |
| **Widget Mode** | pilih salah satu: |

#### Managed (recommended untuk balanced)

- Forced challenge kalau traffic suspicious
- Smooth UX untuk legit user (auto-solve kalau browser reputation tinggi)

#### Invisible (kalau mau zero UI)

- Pure no-interaction — ga nampilin apa-apa
- Risk: low-confidence bot kadang lolos (lebih permisif)

#### Non-Interactive (kalau mau custom UI)

- Tampil checkbox manual (kayak reCAPTCHA v2)
- Paling predictable UX, paling mudah debug

Pilih **Managed** untuk production. Klik **Create**.

### 4. Get keys

Setelah create muncul 2 keys di halaman widget:

| Key | Format | Simpan jadi env |
|---|---|---|
| **Site Key** | ~33 char mulai `0x4AAA...` | `SOCIO_TURNSTILE_SITEKEY` |
| **Secret Key** | ~33 char mulai `0x4AAA...` | `SOCIO_TURNSTILE_SECRET` |

⚠️ Site key publik (safe di frontend). Secret key **JANGAN** di-paste ke frontend — itu server-side only.

### 5. Enable di Coolify

Di tab Environment:

| Key | Ganti dari | Ke |
|---|---|---|
| `SOCIO_TURNSTILE_ENABLED` | `0` | `1` |
| `SOCIO_TURNSTILE_SITEKEY` | `0x4AAAAAAD3RtU-MhZPHl3Fw` (test key lama) | `<sitekey baru>` |
| `SOCIO_TURNSTILE_SECRET` | `0x4AAAAAAD3RtROl7v2XEf5BAD5o5cQPxx4` (test key lama) | `<secret baru>` |

Klik **Save**. Karena `SOCIO_TURNSTILE_ENABLED=1` mengubah label `traefik.http.middlewares.turnstile`,
Coolify trigger **rebuild image** (~3-10 menit karena pnpm multi-stage build).

## Verifikasi

Setelah deploy ulang:

1. Buka **incognito** <https://app.socio.id/signup>
2. Turnstile badge muncul di bawah form (kalau Managed mode)
3. Submit form kosong → harus reject "Captcha tidak valid"
4. Complete challenge (auto-solve Managed, atau klik checkbox Non-Interactive) → submit sukses

Dari log:
```bash
docker logs <container-app> 2>&1 | grep -i turnstile
```

Expected: `[turnstile] verified: success` setelah form submit valid.

## Troubleshooting

| Gejala | Fix |
|---|---|
| Badge ga muncul di browser | sitekey salah / domain belum di-add ke Turnstile widget config. |
| `Invalid site key` dari API | sitekey vs domain di Turnstile widget ga match. Tambah `app.socio.id` di step 3. |
| `Invalid secret` saat submit | secret key salah (`is_buildtime=false` penting!). Paste ulang dari dashboard. |
| Bot masih lolos | pilih mode **Non-Interactive** atau tambah custom rule (`cf-turnstile-...` headers). |
| Test key masih aktif setelah save | restart Coolify: Settings → **Force Rebuild**, atau cek nilai via CLI: <br>`docker exec coolify php artisan tinker --execute="echo App\\\Models\\\InstanceSetting::first()->is_api_enabled;"` |

## Security checklist

- [ ] Secret key **is_buildtime=false**
- [ ] Site key di-allowlist eksplisit ke `app.socio.id` (jangan pakai `*` di production)
- [ ] Monitor Cloudflare Turnstile dashboard → **Analytics** untuk failure rate spike
- [ ] Test key lama (`0x4AAAAAAD3Rt...`) **delete** sebelum launch — kalau ga, attacker bisa pakai test key buat bypass di mana domain match (dimana-mana match karena wildcard default)

## Lanjutan (M6+)

- **Custom branding** Turnstile widget (logo socio.id mini + palette gelap) via dashboard widget settings
- **Pre-clearance cookie** untuk legit users (skip challenge di kunjungan berikutnya via CF bot management)
- **Action-specific sensitivity**: stricter untuk `/signup`, lax untuk `/login` — set per-widget kalau perlu (saat ini 1 widget dipakai keduanya)
