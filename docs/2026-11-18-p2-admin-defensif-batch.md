# Jurnal — Batch defensif admin P2.1–P2.4 (18 Nov 2026)

> Status: **SELESAI — LIVE** image `259f8662d97633395051f520fd6484fcca2a9990`.
> GO owner: AskUserQuestion → "Lanjut backlog P2.1–P2.4 (Recommended)" — rantai penuh
> gates → commit granular → L3 → push → deploy → verify → docs; **nol email ke user**
> (lane WP7 tetap OFF, bukan aktivasi lane). L3 pre-push: gate fresh AskUserQuestion →
> "Run L3 deep security review" → **0 findings**.
> Tracker: `docs/2026-11-17-my-to-id-gap-plan.md` — baris P2.1–P2.4 ditandai SELESAI,
> §7 butir 4 dijawab GO (port defensif sekarang).

## 1. Latar belakang + scope

- Lanjutan gap-plan `.my → .id` setelah batch email P2.5–P2.8 + P3 kosmetik (live `54c8615`).
- Batch ini: **P2.1** W1 toggle kategori provider-gated, **P2.2** F13 katalog
  provider-aware, **P2.3** F10 deleteCategory jujur, **P2.4** guard kind-claim
  service-sync CREATE (MOOT routing=0, defensif).
- **Nol DB write** (tanpa migration/DDL) → rollback = revert + redeploy. **Nol email.**
- Port per-fitur dari orphan fork `.my`: `82b52f11` (P2.1), `083d0271` (P2.2+P2.3),
  `899a5b2b` (P2.4). Modul core `.my` di `app/src/lib/server/` → `.id` di
  `packages/core/src/` (export `@socio/core/kind-signature` + `./routing-policy` sudah ada).
- Copy Indonesia F13 diambil dari katalog i18n `.my` sendiri
  (`packages/core/src/i18n/id.ts` @ `083d0271`, blok scope/health/catBand/catToggle)
  → diadaptasi inline (admin `.id` tanpa i18n); bukan terjemahan tebak-tebakan.

## 2. P2.1 — W1 planCategoryToggle (pure, baru)

- `app/src/lib/server/category-toggle-policy.ts` (94 baris): keputusan toggle dipisah
  dari tulis DB. OFF (blind: ada status=1, atau mode="off") → semua provider + tag,
  **TIDAK PERNAH refuse** (provider rusak tidak boleh menjebak admin); affected =
  jumlah baris AKTIF (adaptasi `.id`). ON → hanya status=0 + bertag [manual-off] dari
  provider sah (`allowedProvider = routed ?? active`, routing menang); refuse
  `no_active_provider` / `no_serving_services` tanpa tulis DB.
- Invariant terkunci: `refuse ≠ null ⇒ affected = 0`.
- Integrasi konsumen `category-admin.ts` menyusul di commit F13 (`259f866`) —
  toggle kategori sekarang lewat planner, bukan UPDATE buta.
- Selftest `category-toggle-policy.test.ts`: **21 cek** (18 named + matriks 192
  kombinasi + 96 explicit-off).

## 3. P2.2 — F13 katalog provider-aware

- `app/src/lib/catalog-counts.ts` (pure di `$lib/`, client-facing): SATU
  `categoryHealth` dipakai rail `/admin/services`, tabel `/admin/categories`, dan
  band konteks. serving = routing target menang else provider aktif global; legacy =
  baris provider lain (pid=0 → legacy). Urutan health: empty → archived → off →
  partial → on; `hasLegacyLeak` = legacyActive > 0.
- Adaptasi `.id`: agregat bawa `manualOff`; `toggleWillTurnOff = active > 0`;
  `toggleAffected` OFF=active ON=servingManualOff; `canToggleCategory = willOff ||
  servingManualOff > 0` (lebih ketat dari `.my`). Invariant terkunci:
  `canToggleCategory === (planCategoryToggle.refuse === null)` — dibuktikan matriks
  192 kombinasi di selftest.
- `category-admin.ts`: `listCategoryRows` GROUP BY (category_id, provider_id) + fold
  in-memory (buang Lite/GROUP_CONCAT/dormantProviderIds); `servingCatalogWhere`
  untuk scope=serving; `CategoryStatusResult` + `name?`.
- `CategoryHealthBadge.svelte` (baru): compact (rail) + full (tabel/band), chip
  arsip + peringatan bocor, copy Indonesia inline.
- `/admin/services`: `?scope=serving` (default) vs `all`; `href(patch)` tunggal
  (chipHref/statusChipHref/scopeHref/pageHref — drift chipHref lupa status dibuang);
  KPI + rail + band scope-aware; 4 chip kesehatan rail (Semua/Aktif/Mati/Arsip);
  banner arsip + peringatan tanpa-provider-aktif; band kategori terpilih (provider
  serving, catatan legacy, toggle gated, link kelola).
- `/admin/categories`: chip kesehatan per kategori, kolom Katalog Serving + Provider,
  switch hanya bila `canToggleCategory`.
- Quick-links ContextFab (`?q`/`?cat`/`?status`) sengaja tidak diubah — `.my`
  `083d0271` juga tidak mengubahnya (di luar scope F13).
- Selftest `catalog-counts.test.ts`: **19 cek** (18 named + matriks 192 kombinasi
  agregat UI === keputusan planner).

## 4. P2.3 — F10 deleteCategory jujur

- Fetch kategori dulu → **404 jujur** bila tidak ada (dulu delete 0 baris tetap
  lapor "Kategori dihapus." — sukses palsu di UI + audit log).
- Nama kategori disebut di pesan error/audit/sukses; message key toggle terbalik
  diperbaiki (satu commit dengan F13 karena berbagi `category-admin.ts`).

## 5. P2.4 — guard kind-claim service-sync CREATE (MOOT routing=0)

- `kind-signature.ts` (+47): PLATFORMS (19), `platformOf`, `kindSignature`
  ("platform|kind"; null untuk kind generic / platform asing — Coins/Ads/Emergency
  Server tidak pernah tersapu).
- `routing-policy.ts` (+32): `coveredByOtherProviderRouting` murni & konservatif
  (kind yang juga milik provider ini → jangan suppress).
- `service-sync.ts` CREATE: `routedSignatures` dibangun dari kategori yang diroute
  ke provider LAIN (inArray, hanya bila ada); `bornOff = allowedCreate &&
  kindClaimedElsewhere` → status=0 + tag [manual-off], tanpa berita new_service
  (changelog tetap); tag menahan auto-reaktivasi sync berikutnya (cabang ENABLE
  `!isManualOff && allowed` — layanan bornOff tidak pernah hidup sendiri).
- **MOOT**: routing=0 → routingMap kosong → routedSignatures kosong → bornOff selalu
  false → **nol perubahan perilaku produksi**. Guard baru aktif bila owner hidupkan
  multi-provider nanti. Selftest routing-policy **15 → 22** (7 cek baru).

## 6. Gates (semua lulus sebelum commit)

- prettier `app --check` exit 0 (konvergensi 2 pass; file core diformat via config
  app — tidak ada config root; pelajaran non-idempoten batch sebelumnya diterapkan).
- eslint **32 error / 1005 warning = baseline pre-existing persis**, 0 di file batch
  (diukur `-f json` + parse, bukan exit code).
- svelte-check **0 error / 53 warning baseline** (2 warning categories svelte =
  pola `state_referenced_locally` pre-existing fq/fst, sama seperti halaman health).
- `pnpm --filter app build` exit 0; rantai test core exit 0 — **di-run ulang setelah
  prettier** (routing 22 + toggle 21 + catalog 19 lulus).
- Scan CJK/Malay file batch + 3 pesan commit: nol CJK; hit "boleh" semuanya
  "tidak boleh" (larangan sah) atau komentar pre-existing — nol boleh afirmatif baru.
- `typecheck` core (tsc) tidak tersedia di env ini (pre-existing, tsc tidak
  terpasang) — modul pure tercakup svelte-check app yang mengimpornya.
- L3 qodersec pre-push: **0 findings**.

## 7. Commit, push, deploy, verifikasi

| Commit | Isi | File |
|---|---|---|
| `69cdcde` | fix(M4) P2.4 guard kind-claim (kind-signature/routing-policy/service-sync + test) | 4 |
| `d50d245` | fix(M3) P2.1 W1 planCategoryToggle pure + selftest | 2 |
| `259f866` | fix(M3) P2.2+P2.3 F13 katalog provider-aware + F10 deleteCategory jujur | 9 |

- Granularitas by-buildability: P2.4 independen; P2.1 modul+test tanpa wiring
  (package.json masuk commit 3); P2.3 digabung P2.2 karena berbagi
  `category-admin.ts` + categories server — memisah = commit antara tidak build.
  Tiap commit build sendiri; union = 15 file batch persis.
- Push FF `28c4422..259f866` → main (SSH). Deploy Coolify
  `hwaykayjez74mcka4q5xqrch` **finished** (~4 menit); container
  `nqsjafrei6k8dkup1pxkcuwf-20261118T114224`, **IMAGE tag = SHA push** (`259f866…`),
  STARTED 11:45:26Z.
- Verifikasi prod (read-only, `vp2.mjs` + `vp2.sql` via file):
  - Marker server: "lahir MATI" (chunk service-sync) ✓, "Katalog Serving" (chunk
    categories page) ✓. Marker client: "Cakupan katalog" (node 29) ✓.
  - Boot: 12 cron terdaftar, listening :3000, **ALTER_COUNT=0**.
  - Route unauth: `/` → 303 `/login?redirect=%2F`; `/admin/services`,
    `/admin/categories`, `/admin/services?scope=all` → 303 `/login` ✓ (bukan 500).
  - Processlist bersih (pool Sleep, tanpa query nyangkut).
  - 404 `/cron/status.php` di log = probe PHP lama dari luar (noise pre-existing).
- Push docs **tanpa redeploy**: runtime identik dengan image `259f866` (preseden
  docs batch sebelumnya); gate L3 fresh terpisah sebelum push docs.

## 8. Keputusan aman + sisa

- P2.4 MOOT — nol efek prod sampai owner hidupkan routing; tanpa order uang nyata.
- Nol DB write → rollback = revert + redeploy, tanpa migration balik.
- Nol email ke user; lane WP7 `reseller_unpaid`/`deposit_canceled` tetap OFF
  menunggu GO aktivasi terpisah.
- Sisa gap-plan: **P4** (dormant, butuh setup eksternal + DDL), tracker lama
  E8/H2/H3 masih CONFIRM. Baseline eslint 32 error = kandidat cleanup terpisah
  (butuh GO).
