# packages/db — Drizzle ORM (MySQL)

Shared Drizzle schema untuk app + landing. Schema reverse-engineered dari dump `socio_smm` lama + tabel baru untuk rebuild.

## Struktur

- `src/schema/` — definisi tabel Drizzle
  - `users.ts`, `orders.ts`, `deposits.ts`, `services.ts`, `provider.ts`, `affiliate.ts`, `tickets.ts`, `pricing.ts`, `banners.ts`, `notifications.ts`, `audit-log.ts`, `job-queue.ts`, `web-push.ts`, `saved-links.ts`, ...
- `src/db.ts` — connection pool (mysql2)
- `src/index.ts` — exports
- `drizzle.config.ts` — config introspect/migrate
- `migrations/` — SQL migration files

## Tabel BARU (rebuild)

- `audit_log` — log admin action (G1)
- `job_queue` — DB-backed queue untuk cron berat (SMMturk sync)
- `web_push_subscriptions` — Web Push VAPID
- `saved_links` — repeat order
- `coupons` — voucher diskon (G18)
- `loyalty_points` — tier/point (G19)
- `service_mapping` — service ↔ provider mapping (G16)
- `api_usage` — rate-limit log API publik (G20)

## Cara pakai

```ts
import { db, users, orders } from '@socio/db';
import { eq } from 'drizzle-orm';

const u = await db.select().from(users).where(eq(users.id, 1));
```
