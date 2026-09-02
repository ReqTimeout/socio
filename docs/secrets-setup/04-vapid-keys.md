# Setup VAPID Keys — Web Push Notification

> Tujuan: kirim push ke browser user (Chrome/Firefox/Edge) tanpa app store.
> Dipakai untuk notif order, deposit, dll — meskipun tab browser tertutup (kalau OS support).

## Kenapa VAPID?

- Free selamanya, no server cost
- User subscribe sekali di `/akun`, push sampai selama endpoint valid
- Aman: pakai standard Web Push Protocol (RFC 8030), bukan proprietary push
- Cocok untuk notif real-time dari socio.id ke member/user/admin

## Generate keypair (sekali, di lokal)

VAPID keypair = 1 pasang ECDSA P-256 (curve). Generate sekali, JANGAN pernah re-generate
(setiap re-generate = invalidasi semua subscription user).

### Opsi 1: web-push CLI (recommended)

```bash
cd /Users/maabook/Desktop/socio.id/app

# Install web-push kalau belum ada di dev deps
pnpm add -D web-push

# Generate
node -e "const w=require('web-push');console.log(JSON.stringify(w.generateVAPIDKeys()))"
```

Output (format base64 url-safe tanpa padding):

```json
{"publicKey":"BPd8x...","privateKey":"kTYx..."}
```

### Opsi 2: Python cryptography

```bash
pip install cryptography
python3 << 'EOF'
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

priv = ec.generate_private_key(ec.SECP256R1())
pub = priv.public_key()

priv_b = priv.private_bytes(
    serialization.Encoding.DER,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
)
pub_b = pub.public_bytes(
    serialization.Encoding.X962,
    serialization.PublicFormat.UncompressedPoint,
)

def b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()

print('VAPID_PUBLIC_KEY=' + b64(pub_b))
print('VAPID_PRIVATE_KEY=' + b64(priv_b))
EOF
```

### Opsi 3: OpenSSL manual (advanced, kalau package lain ga available)

Lihat <https://github.com/web-push-libs/vapid-py> untuk referensi encode base64url yang benar.

## Paste ke Coolify

| Key | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `<publicKey dari step di atas>` |
| `VAPID_PRIVATE_KEY` | `<privateKey dari step di atas>` |
| `VAPID_SUBJECT` | `mailto:support@socio.id` (sudah ke-set) |

⚠️ Set `is_buildtime=false` untuk semua key (jangan ada yg baked ke image).

## Verifikasi

Setelah restart, dari browser:

1. Login di <https://app.socio.id/akun>
2. Tab/section "Notifikasi" → klik **Subscribe** (atau link "Aktifkan notifikasi browser")
3. Browser native prompt "Allow notifications" → klik **Allow**
4. Cek log: `[push] subscribed: user=929658 endpoint=https://fcm.googleapis.com/...`
5. Cek DB:
   ```bash
   ssh root@130.254.47.93
   docker exec rebicrj57r3afbg9knieq9ks \
     mysql -usocio -p<pw> socio_smm \
     -e "SELECT id, user_id, left(endpoint, 60) FROM web_push_subscriptions LIMIT 5"
   ```
   Row baru muncul

Test kirim push (admin via app, atau programmatic):

```bash
# Trigger cron job push pending
docker exec <container> node -e "
process.env.SOCIO_CRON_ENABLED='0';
const {sendPendingPushes} = await import('./build/server/chunks/push.js');
await sendPendingPushes();
"
```

Atau dari UI: admin approve deposit → otomatis kirim push ke user.

## Troubleshooting

| Gejala | Fix |
|---|---|
| Browser ga nampilin prompt notification | HTTPS required (kita udah). Cek console JS: error di `app/src/lib/components/PushSubscribe.svelte`. |
| Push ga sampai user | cek DB `web_push_subscriptions` row ada. Cek endpoint masih valid (FCM rotasi endpoint setelah ~6 bulan — perlu auto-retry). |
| Invalid key error | key bukan format base64 url-safe (bandingkan contoh `BPd8x...` vs `BPd8x+...` — pakai `-` bukan `+`). |
| 410 Gone saat kirim | user unsubscribe / uninstalled. Delete row dari DB. |

## Backup wajib

VAPID key **PERSISTENT** — kalau hilang, semua subscription user invalid sampai di-re-subscribe.
Backup ke:

- 1Password / Bitwarden (`Secure Note` type)
- Cloudflare R2 (private folder `secrets/vapid.txt`)
- **JANGAN** cuma simpan di Coolify env (kalau perlu reset cluster, key hilang)

## Catatan lanjutan (M6+)

- **Subscription rotation**: FCM/Mozilla boleh rotasi endpoint. Tambah retry-on-410 di worker push (`web_push_subscriptions` DELETE row → re-subscribe on next login).
- **Admin push**: tabel beda `/admin/notifications` — pakai key VAPID yang sama (no extra setup).
- **iOS Safari**: support web push sejak iOS 16.4 — perlu home-screen PWA install + push permission.
