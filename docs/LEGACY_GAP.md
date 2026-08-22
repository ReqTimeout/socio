# Legacy PHP → Rebuild: Fitur yang BELUM diimplementasikan

> Audit cepat membandingkan folder PHP lama (`app.socio.id/`, `socio.id/` WordPress)
> dengan route rebuild (`app/src/routes`, `landing/`).
> Status: ✅ ada · 🟡 parsial · ❌ belum.
> Referensi tambahan: `docs/ADMIN_GAP.md`, `REBUILD_PLAN.md` §M-status.

## 1. Payment / Deposit
| Fitur lama | Path lama | Status | Catatan |
|---|---|---|---|
| Midtrans | `api/webhook/midtrans` | ✅ | webhook + credit saldo ada |
| **Tripay** | `app.socio.id/tripay/*` | ❌ | webhook `api/webhook/tripay` **tidak ada** (REBUILD_PLAN klaim ada, tapi route tidak ditemukan). Top-up via Tripay gak bisa konfirm otomatis |
| **Jasamutasi** | `app.socio.id/jasamutasi/*` | ❌ | ditunda (M4) |
| **CekMutasi** (auto cek mutasi bank) | `app.socio.id/cekmutasi/*` | ❌ | deposit hanya bisa dikonfirm manual di admin; verifikasi mutasi otomatis belum |

## 2. Cron (M4)
| Fitur lama | Status | Catatan |
|---|---|---|
| Provider sync | ✅ | `cron/provider-sync.ts` |
| Status polling order | ✅ | `cron/status-polling.ts` |
| Deposit expire + seed | ✅ | `cron/light.ts` |
| **Refill cron** | ❌ | `cron/refill.php` lama belum port → refill manual belum ada flow |
| **Refund cron / flow** | ❌ | G2/G3 — refund gak ada UI/approval |
| **Email queue / bounce** | ❌ | ditunda M6 |

## 3. Admin (M3)
| Fitur lama | Path lama | Status | Catatan |
|---|---|---|---|
| Dashboard | `admin/index.php` | ✅ | |
| Users | `admin/user/*` | ✅ | |
| Orders | `admin/order/*` | 🟡 | list/filter/table ok; refill/refund ditunda |
| Deposits | `admin/deposit/*` | ✅ | |
| Services + CRUD | `admin/services/*` | ✅ | |
| Providers + sync | `admin/provider/*` | ✅ | |
| Pricing rules | — | ✅ | baru dibuat `/admin/pricing` |
| Tickets | `admin/ticket/*` | ✅ | |
| **Affiliate report** | `admin/affiliate/index.php` | ❌ | `/admin/affiliate` belum ada (summary/top referrer/detail) |
| **Banner CMS** | `admin/banner/*` | ❌ | |
| Reporting | `admin/reporting/*` | 🟡 | ada, tapi chart + realtime feed ditunda |
| **News CMS** | `admin/news/*` | ❌ | |
| Settings | `admin/settings/*` | ✅ | |
| Audit log | `admin/audit/*` | ✅ | |
| **Email marketing** | `admin/email/*` | ❌ | kampanye/segment/queue belum |

## 4. User-facing (app)
| Fitur lama | Path lama | Status | Catatan |
|---|---|---|---|
| Auth (login/daftar/lupa/reset/verify) | `auth/*` | ✅ | |
| Saldo / top-up / riwayat | `balance/*` | ✅ | |
| Pesan order | `order/*` | ✅ | refill/refund 🟡 |
| Pesanan | `order/*` | ✅ | |
| Layanan | `services.php` | ✅ | `/layanan` |
| Affiliate | `affiliasi/*` | ✅ | user-side; admin report ❌ (lihat §3) |
| Tiket | `ticket/*` | ✅ | |
| Notif | `notif/*` | ✅ | + SSE |
| API publik v1 | `api/v1/*` | ✅ | |
| **CMS pages statis** (FAQ, syarat, dll) | `faq.html`, `pages/*` | ❌ | tidak ada route `/faq`, `/terms`, dsb |
| **Panel reseller/whitelabel** | `panel/*` | ❌ | (perlu konfirmasi, kemungkinan belum) |
| **Ads module** | `ads/*` | ❌ | modul iklan/monetisasi lama |

## 5. Landing (WordPress `socio.id/` → Astro `landing/`)
| Fitur lama | Status | Catatan |
|---|---|---|
| Homepage | ✅ | Astro |
| **FAQ page** | ❌ | `faq.html` lama |
| **SEO/verify files** | ❌ | `ads.txt`, `BingSiteAuth.xml`, `google…html` (GSC), `health.html` |
| **Blog / News** | ❌ | WordPress `wp-content` → belum ada di Astro |

## 6. Lainnya
- **RBAC** (`admin_roles`): 🟡 table ada, enforcement di layout belum penuh (G6).
- **Email template & Resend**: ✅ `lib/server/email.ts` ada; UI email marketing ❌ (§3).
- **Web Push**: ✅ subscribe + notify ada.

---
### Prioritas saran (sesuai ADMIN_GAP)
1. Tripay webhook (payment gak bisa konfirm) — **blocker bisnis**.
2. Refund workflow (G2/G3) — uang.
3. Affiliate report admin — transparansi.
4. Banner CMS + News CMS — konten marketing.
5. Email marketing — retention.
6. CMS pages statis (FAQ/terms) + SEO files landing.
