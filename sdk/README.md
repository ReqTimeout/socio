# Socio Reseller API — SDK Resmi

Library client untuk **Socio Reseller API** (`https://app.socio.id/api/v1`).
API ini drop-in kompatibel dengan format API panel SMM v2 populer, jadi panel
dan bot yang sudah ada bisa diarahkan ke Socio dengan perubahan minimal.

- **Akses:** khusus akun Reseller & Agen (API key dari dashboard).
- **Mata uang:** IDR. `charge` / `balance` dikembalikan sebagai string rupiah.
- **Transport:** `POST` form-encoded (atau JSON) dengan `key` + `action`.
- **Rate limit:** 60 request / menit / IP. Endpoint batch menerima hingga 100 id.

## Layout

| Path                       | Bahasa      | Dependensi            |
| -------------------------- | ----------- | --------------------- |
| `python/socio_api.py`      | Python 3.9+ | standard library saja |
| `php/SocioApi.php`         | PHP 8.0+    | ext-curl, ext-json    |
| `node/socio-api.mjs`       | Node 18+    | tanpa (fetch native)  |
| `examples/telegram-bot.py` | Python      | python-telegram-bot   |

## Quick start

```python
from socio_api import SocioApi
api = SocioApi("API_KEY_KAMU")
print(api.balance())                       # {'balance': '100840', 'currency': 'IDR'}
svc = api.services()[0]
order = api.add(service=svc["service"], link="https://instagram.com/p/xxx", quantity=1000)
print(api.status(order["order"]))          # {'charge': '...', 'status': 'Pending', ...}
print(api.orders(limit=10))                # riwayat order
```

## Action

| Method                                       | Action           | Return                                                                                                |
| -------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `services()`                                 | `services`       | `[{service,name,type,category,rate,min,max,refill,cancel}]`                                           |
| `add(params, idempotency_key?)`              | `add`            | `{order}`                                                                                             |
| `bulk_add(orders[])`                         | `bulk_add`       | `[{order}\|{error}]` (≤100, atomik per item)                                                          |
| `status(order)` / `status(orders=[...])`     | `status`         | `{charge,start_count,status,remains,currency}` / `{id:{...}}`                                         |
| `orders(status?, service?, limit?, offset?)` | `orders`         | `[{order,service,name,link,quantity,charge,status,remains,start_count,created_at,currency}]`          |
| `refill(order)` / `refill(orders=[...])`     | `refill`         | `{refill}` / `[{order,refill}]`                                                                       |
| `refill_status(refill)`                      | `refill_status`  | `{status}` / `[{refill,status}]`                                                                      |
| `cancel(orders=[...])`                       | `cancel`         | `[{order,cancel:1\|{error}}]`                                                                         |
| `balance()`                                  | `balance`        | `{balance,currency}`                                                                                  |
| `profile()`                                  | `profile`        | `{balance,currency,username,full_name,level}`                                                         |
| `set_webhook(url, regenerate_secret?)`       | `set_webhook`    | `{webhook_url,webhook_secret,enabled}`                                                                |
| `set_api_secret(require_signature?)`         | `set_api_secret` | `{api_secret,sign_required}`                                                                          |
| `deposit(amount)`                            | `deposit`        | `{invoice,transfer_amount,credited,bonus,suffix,method,status,expire,bank_number,bank_name,currency}` |
| `deposits(limit?, offset?)`                  | `deposits`       | `[{invoice,amount,transfer_amount,method,status,created,expire,currency}]`                            |
| `affiliate()`                                | `affiliate`      | `{commission,withdrawn,requested,downline,can_withdraw,min_withdraw,ref_code,ref_link,currency}`      |

Error dikembalikan sebagai `{error: "..."}`; SDK melempar `SocioApiError` /
`SocioApiException` / `SocioApiError` sesuai bahasanya.

## Idempotency (retry aman)

Teruskan `idempotency_key` ke `add`. Kalau request dengan key sama sudah pernah
sukses, API mengembalikan **order id yang sama** tanpa charge lagi atau bikin
order duplikat. Pakai key stabil per order logis (mis. hash dari order id
internal kamu). Key di-scope per akun dan maksimal 100 karakter.

```python
api.add(service=1234, link="https://...", quantity=1000, idempotency_key="order-saya-0001")
```

## Filter riwayat order

`orders(status=...)` pakai enum status publik: `Pending`, `Processing`,
`In progress`, `Completed`, `Partial`, `Canceled`, `Error`. `limit` default
50 (maks 100); `offset` untuk paginasi. Hasil urut terbaru dulu.

## Bulk order

`bulk_add` membuat hingga 100 order dalam 1 request. Setiap item diproses
atomik (deduct → provider → insert) berurutan; item gagal di-refund sendiri
dan tidak menghentikan yang lain. Respons berupa list `{order}` atau
`{error}` selaras urutan input kamu. `idempotency_key` per item didukung.

```python
res = api.bulk_add([
    {"service": 1234, "link": "https://...", "quantity": 1000},
    {"service": 5678, "link": "https://...", "quantity": 500, "idempotency_key": "b-2"},
])
# [{'order': '...'}, {'order': '...'}]  (atau {'error': '...'} per item gagal)
```

## Callback webhook

Daftarkan URL callback **https** publik dengan `set_webhook`. Saat order
mencapai status final (Completed / Partial / Canceled / Error), Socio POST
payload JSON ke URL kamu, ditandatangani dengan secret per akun:

```python
cfg = api.set_webhook("https://panel-kamu.com/socio/hook")
secret = cfg["webhook_secret"]   # simpan ini; regenerate dengan regenerate_secret=True
```

Payload: `{event:"order.status", order, status, charge, remains, start_count, currency, timestamp}`.
Header: `X-Socio-Signature` (HMAC-SHA256 hex dari raw body) dan `X-Socio-Event`.
Verifikasi sebelum percaya:

```python
import hmac, hashlib
expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
assert hmac.compare_digest(expected, request.headers["X-Socio-Signature"])
```

Pengiriman di-retry dengan backoff (1m → 5m → 30m → 2j → 6j, maks 5 percobaan).
URL private/loopback ditolak (guard SSRF); hanya https publik yang diizinkan.

## Request signing (HMAC, opsional)

Untuk keamanan ekstra kamu bisa menandatangani setiap request dengan secret
per akun. Buat satu dengan `set_api_secret`, lalu teruskan ke client — SDK
menambahkan `timestamp` dan `signature` HMAC-SHA256 otomatis:

```python
cfg = api.set_api_secret(require_signature=True)   # {'api_secret': '...', 'sign_required': True}
signed = SocioApi("KEY_KAMU", api_secret=cfg["api_secret"])
signed.balance()                                    # auto-signed
```

Signature adalah HMAC-SHA256 atas canonical string: semua param kecuali
`signature`, urut key, digabung `key=value` dengan `&`. Server menolak
timestamp lebih tua dari 5 menit (proteksi replay). Tanpa secret yang
dikonfigurasi, auth key polos tetap jalan (backward compatible).

## Sandbox (uji dry-run)

Teruskan `sandbox=1` (atau `sandbox=True` di helper SDK) untuk menguji
integrasi kamu tanpa menghabiskan saldo atau menghubungi provider:

- `add` / `bulk_add` memvalidasi param dan menghitung pricing, lalu mengembalikan
  order id palsu `SBX-...` dan charge yang seharusnya terjadi — **tanpa deduct,
  tanpa panggilan provider, tanpa tulis database**.
- `status` untuk id `SBX-...` mengembalikan `Completed` simulasi.
- `balance(sandbox=True)` mengembalikan saldo uji `1000`.

```python
api.add(service=1234, link="https://...", quantity=1000, sandbox="1")
# {'order': 'SBX-...', 'sandbox': True, 'charge': '12500'}
```

## Whitelabel starter kit

`whitelabel/panel.mjs` adalah panel reseller Node.js single-file (tanpa dependensi)
yang bisa kamu brand sendiri. Panel ini mem-proxy API Socio dari sisi server jadi
key kamu tidak pernah sampai ke browser: saldo, katalog layanan, buat order,
status, dan riwayat order.

```bash
SOCIO_API_KEY=key_kamu PANEL_NAME="Brand Saya" PANEL_ACCENT="#0ea5e9" node whitelabel/panel.mjs
```

Lihat `whitelabel/README.md` untuk checklist white-label dan catatan keamanan
(starter ini tidak punya auth user — taruh login kamu sendiri di depan sebelum diekspos).

## Dokumentasi lengkap

- Referensi teknis: https://app.socio.id/api-docs
