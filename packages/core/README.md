# packages/core — Business logic shared

- `src/pricing.ts` — pricing engine (markup per level + USD→IDR konversi SMMturk)
- `src/smmturk.ts` — SMMturk API client (services, balance, add order, status, refill, cancel)
- `src/format.ts` — formatIDR, tanggal WIB, formatUSD
- `src/email-templates/` — svelte-email templates (welcome, verify, deposit, order status, ticket, affiliate, marketing)
- `src/index.ts` — exports

## SMMturk client

```ts
import { smmturk } from '@socio/core';

const balance = await smmturk.balance();
const services = await smmturk.services();      // 8185 layanan
const order = await smmturk.add({ service, link, quantity });
const status = await smmturk.status(orderId);
```

## Pricing

```ts
import { effectivePrice } from '@socio/core';

const price = effectivePrice({
  rateUsd: 0.009,        // SMMturk rate
  usdToIdr: 15800,
  markupPercent: 20,     // level Reseller
  flatPer1k: 500,
  minProfitPer1k: 100,
  quantity: 1000,
});
// → IDR total untuk quantity
```
