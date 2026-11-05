# Spec Duplikasi Flow `/pesan` — Refill Sort + Non-Refill Notice + Auto-Switch Kategori

> Tujuan: dokumen ini adalah **reference lengkap** supaya coding agent bisa menduplikasi
> seluruh perubahan flow `/pesan` socio.id ke **app.socio.my**. Semua snippet diambil dari
> kode aktual branch `deploy/refill-only` HEAD `778b744` (semua commit sudah live di `origin/main`).
>
> Commit terkait (berurutan):
> - `eac65f8` feat: badge Non-Refill + sort refill-duluan
> - `5b45547` fix: pesanan mobile bisa buka Detail (akses Refill/Cancel)
> - `0f273d6` fix: refill-sort pindah ke client saja (IG tak ke-desot dari slice 1000) + badge Termurah ikut harga asli
> - `c6a68d0` fix: non-refill dari popup jadi notice highlighted di form + chip saran refill
> - `778b744` fix: klik ikon platform auto-switch kategori bila tak cocok (daftar tak kosong lagi)

---

## 0. Prinsip dasar yang JANGAN berubah

1. **Anti-kebocoran harga**: client **tidak pernah** menerima `price`, `price_api` (modal),
   `price_reseller`, atau % markup. Server hanya mengirim `pricePer1k` = **harga efektif
   per-1000 untuk level user ini** (sudah kena markup). Invariant arsitektur — duplikasi
   harus tetap begini.
2. **Sorting refill = murni di CLIENT**, bukan server (alasan teknis di §3.4).
3. **Non-refill tetap bisa dibeli** — tidak diblokir popup; hanya diberi warning + saran.

---

## 1. File yang disentuh

| File | Peran | Perubahan |
|---|---|---|
| `packages/core/src/catalog.ts` | Single source-of-truth deteksi platform/jenis | Dipakai (bukan diubah) — server + client wajib pakai fungsi sama |
| `app/src/routes/(app)/pesan/+page.server.ts` | `load()` daftar kategori + platform | Urutan kategori (latest-first) + hitung platform/kind per kategori |
| `app/src/routes/(app)/pesan/services/+server.ts` | Endpoint JSON katalog layanan | Server sort **price-asc** saja + `.slice(0,1000)` |
| `app/src/routes/(app)/pesan/+page.svelte` | UI /pesan | Refill-first client, badge Termurah, notice highlighted + chip saran, auto-switch kategori |
| `packages/ui/src/components/ServiceCard.svelte` | Kartu layanan (dipakai /layanan) | Badge teks "Non-Refill" |
| `app/src/routes/(app)/pesanan/+page.svelte` | Daftar pesanan | Aksi mobile (Detail/Pesan lagi) — akses tombol Refill di HP |

> **Catatan app.socio.my**: `catalog.ts` adalah dependensi besar (regex deteksi
> platform/jenis + `KIND_ORDER` + alias search). Kalau `.my` belum punya, **salin utuh**
> file itu — semua sorting/detection di bawah bergantung padanya, dan wajib fungsi yang
> sama di server & client agar grouping konsisten.

---

## 2. Deteksi platform & jenis (dari `catalog.ts`)

- `detectPlatform(serviceName, categoryName?)` → `PlatformId`. **Urutan regex penting**:
  platform spesifik/niche dulu (xiaohongshu, snapchat, quora, bluesky, threads, reddit,
  twitch, kick, pinterest, linkedin, discord, trustpilot, marketplace, seo) **sebelum** yang
  umum (instagram, tiktok, youtube, facebook, x, telegram, whatsapp, spotify, musik, kwai).
  Fallback `"other"` (tidak hilang, masuk bucket "Lainnya").
- `detectKind(serviceName)` → `KindId`. `live` sebelum `views`; `watchtime` sendiri;
  `subscrib` → `subscribers` bukan `followers`.
- `KIND_ORDER` = urutan tetap chip jenis (followers, likes, views, live, …).
- **Sumber deteksi = NAMA layanan aktif (`status=1`)**, dihitung **live saat request**. Jadi
  kategori/layanan yang dinonaktifkan hilang otomatis tanpa migrasi.

---

## 3. Aturan SORT (4 lapis) — inti "sort kategori yang sekarang"

### 3.1 Urutan KATEGORI (dropdown PRIMARY) — `+page.server.ts`

```ts
const catRows = await db
  .select({
    id: categories.id,
    name: categories.name,
    svcCount: sql<number>`COUNT(${services.id})`,
    latestAt: sql<string | null>`MAX(${services.createdAt})`,
  })
  .from(categories)
  .leftJoin(services, sql`${services.categoryId} = ${categories.id} AND ${services.status} = 1`)
  .groupBy(categories.id, categories.name)
  .having(sql`COUNT(${services.id}) > 0`)            // hanya kategori dgn layanan AKTIF
  .orderBy(
    sql`COALESCE(MAX(${services.createdAt}), '1970-01-01') DESC`,  // layanan TERBARU dulu
    asc(categories.name),                                            // tiebreak alfabetis
  );
```

**Aturan**: kategori diurut **berdasarkan `MAX(services.created_at)` terbaru → lama**, lalu
nama A→Z. `COALESCE` ke `'1970-01-01'` supaya kategori legacy tanpa `created_at` jatuh ke
**bawah** (bukan atas). Hasil: kategori berisi layanan baru muncul paling atas.

### 3.2 Urutan CHIP PLATFORM — `+page.server.ts`

```ts
const platforms = PLATFORMS.filter((p) => (counts.get(p.id) ?? 0) > 0)
  .map((p) => ({ ...p, count: counts.get(p.id) ?? 0 }))
  .sort((a, b) => b.count - a.count);   // paling banyak layanan aktif duluan
```

`counts` diisi dari `detectPlatform` tiap layanan `status=1`. Instagram (ribuan layanan)
di depan, platform sepi di belakang.

### 3.3 Urutan CHIP JENIS (kind)

Mengikuti `KIND_ORDER` fixed (bukan hitungan), difilter hanya yang ada:

```ts
KIND_ORDER.filter((k) => (counts.get(k) ?? 0) > 0)   // di mode agregasi `kinds=1`
```

### 3.4 Urutan KARTU LAYANAN (paling penting)

**Server** (`services/+server.ts`) — HANYA ascending harga efektif, **JANGAN refill-first
di sini**:

```ts
// query DB pakai .orderBy(asc(services.price)) (proxy murah), lalu di-refix JS by pricePer1k
mapped.sort((a, b) => a.pricePer1k - b.pricePer1k);
return json(await attachEventBadges(filtered.slice(0, 1000)));
```

**Client** (`+page.svelte`) — refill-duluan **setelah** filter platform/kind:

```ts
const visibleServices = $derived(
  serviceList
    .filter(
      (s) =>
        (!selectedPlatform || s.platform === selectedPlatform) &&
        (!selectedKind || s.kind === selectedKind),
    )
    .sort((a, b) => (b.isRefill ? 1 : 0) - (a.isRefill ? 1 : 0) || a.pricePer1k - b.pricePer1k),
);
```

**KENAPA refill-first TIDAK boleh di server (bug yang sudah terjadi):** respons dipotong
`.slice(0, 1000)`. Kalau server sort refill-first dulu, layanan refill platform lain naik ke
pucuk dan **mendesot** layanan non-refill (mis. Instagram yang ~93% non-refill) keluar dari
1000 → chip platform jadi **kosong**. Harga-asc di server menjaga keragaman lintas platform;
refill-first dilakukan client **setelah** per kategori + filter platform, jadi tidak ada yang
kepotong.

> **Aturan duplikasi: server = price-asc; refill-first = client-side saja.**

---

## 4. Badge Non-Refill (`ServiceCard.svelte`)

Prop `refill?: boolean` (dari `isRefill`). Kalau **bukan** refill, tampil badge:

```svelte
{#if refill}
  <!-- ... badge Refill hijau ... -->
{:else}
  <span title="Non-Refill — sistem tidak auto-refill; hasil bisa menurun/drop, tanpa refund"
    >Non-Refill</span>
{/if}
```

- **Teks final = "Non-Refill"** (bukan "Tanpa Refill"). Keputusan: flag `is_refill` dari API
  provider yang jadi acuan, **bukan** apakah nama layanan menulis kata "Refill" (banyak nama
  bilang Refill tapi flag=0 — 686 kasus). Badge tetap muncul walau nama klaim refill, supaya
  user terlindung dari rugi.

---

## 5. Badge "Termurah" (koreksi karena refill-first)

Karena urutan display tidak lagi = urutan harga (refill didahulukan), "Termurah" **tidak
boleh** nempel di indeks 0. Pakai derived:

```ts
const cheapestServiceId = $derived(
  visibleServices.length
    ? visibleServices.reduce((m, s) => (s.pricePer1k < m.pricePer1k ? s : m)).id
    : -1,
);
```

Di kartu (loop `visibleServices`):

```svelte
{#each visibleServices as svc (svc.id)}   <!-- tanpa `, i` — i tak dipakai -->
  ...
  {#if svc.id === cheapestServiceId && visibleServices.length > 1}
    <span class="rounded-full bg-mango-500/15 …">Termurah</span>
  {/if}
```

---

## 6. Non-Refill: notice highlighted di form (BUKAN popup)

Popup konfirmasi **dihapus total** (owner: popup mengganggu, user asal klik "lanjut" tanpa
baca). Alur baru:

### a. Klik kartu langsung pilih (`pickService` → `applyPick`, tanpa gate)

```ts
async function pickService(svc: Svc) {
  haptic(10);
  await applyPick(svc);   // non-refill tidak dipagari popup lagi
}
async function applyPick(svc: Svc) {
  selectedService = svc;
  quantity = svc.min || 1000;
  komen = "";
}
```

State `showNoRefill` / `pendingNoRefill` dan `import { ConfirmDialog }` **dihapus**.

### b. Derived saran (keyed pada `selectedService`, bukan popup)

```ts
const refillAlternatives = $derived.by((): Svc[] => {
  const p = selectedService;
  if (!p || p.isRefill) return [];                 // hanya saat non-refill terpilih
  const sameKind = serviceList
    .filter((s) => s.isRefill && s.id !== p.id && s.platform === p.platform && s.kind === p.kind)
    .sort((a, b) => a.pricePer1k - b.pricePer1k);
  const pool = sameKind.length
    ? sameKind
    : serviceList
        .filter((s) => s.isRefill && s.id !== p.id && s.platform === p.platform)
        .sort((a, b) => a.pricePer1k - b.pricePer1k);
  return pool.slice(0, 3);                          // maks 3, termurah dulu
});
```

Prioritas: **platform+jenis sama** → fallback **platform sama**. `s.id !== p.id` mencegah
menyarankan dirinya sendiri.

### c. Banner di pucuk form (`<form id="pesan-form">`, tepat setelah `<input hidden serviceId/quantity>`)

```svelte
{#if selectedService && !selectedService.isRefill}
  <div class="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3.5
              shadow-[0_0_0_3px_rgba(251,191,36,0.15)]">
    <p class="flex items-start gap-2 text-xs font-semibold text-amber-900">
      <Icon name="alert" size={16} class="mt-0.5 shrink-0 text-amber-600" />
      <span><strong>Non-Refill.</strong> Jumlah bisa berkurang (drop) setelah proses
        selesai, dan TIDAK ada refund.</span>
    </p>
    {#if refillAlternatives.length > 0}
      <p class="mb-2 mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase
                 tracking-wide text-amber-700">
        <Icon name="info" size={12} /> Lebih aman — coba versi Refill
      </p>
      <div class="flex flex-col gap-1.5">
        {#each refillAlternatives as alt (alt.id)}
          <button type="button"
            onclick={() => { haptic(12); applyPick(alt); }}
            title={whitelabel(alt.serviceName)}
            class="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl
                   border border-amber-300 bg-white px-3 py-2 text-left transition
                   active:scale-[0.99] hover:border-amber-500 hover:bg-amber-100/60">
            <span class="min-w-0 flex-1 truncate text-xs font-bold text-ink-900">
              {whitelabel(alt.serviceName)}</span>
            <span class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px]
                         font-extrabold tabular-nums text-emerald-700">
              {formatRupiah(alt.pricePer1k)}/rb</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
```

- Tap chip → `applyPick(alt)` → ganti ke layanan refill, banner otomatis hilang (karena
  `selectedService.isRefill` jadi true).
- **Mobile-safe**: `min-h-[44px]`, `truncate` nama, harga `shrink-0`. Grid/flex child
  ber-truncate wajib `min-w-0` (aturan proyek) — sudah diterapkan (`min-w-0 flex-1`).
- Kalau tidak ada refill di kategori itu → cuma warning, tanpa chip.

---

## 7. Auto-switch kategori saat klik chip platform (fix daftar kosong)

**Bug**: kategori & filter platform itu dua lapis. User di kategori **TikTok** klik ikon
**Instagram** → filter client menyaring daftar TikTok dengan "instagram" → **0 hasil**.
Membingungkan.

**Fix** di `setPlatformFilter`:

```ts
function setPlatformFilter(p: PlatformId | "") {
  haptic(8);
  selectedPlatform = p === selectedPlatform ? "" : p;
  selectedService = null;
  if (selectedPlatform) {
    const plat = selectedPlatform;                 // kunci narrowing TS (PlatformId, bukan "")
    const cur = data.cats.find((c) => c.id === selectedCat);
    if (!cur || !(cur.platforms ?? []).includes(plat)) {
      const matches = data.cats.filter((c) => (c.platforms ?? []).includes(plat));
      const match =
        (selectedKind && matches.find((c) => (c.kinds ?? []).includes(selectedKind))) ||
        matches[0];
      if (match) void selectCategory(match.id);     // lompat ke kategori yg punya platform itu
    }
  }
}
```

- Butuh tiap kategori carry field `platforms` & `kinds` (array `PlatformId`/`KindId`) —
  dihitung di `load()` (§8).
- Prioritas kategori tujuan yang juga cocok `selectedKind` (mis. followers), else kategori
  pertama yang punya platform itu.
- Kalau kategori aktif memang cross-platform (sudah punya Instagram) → **tidak** lompat,
  cukup persempit seperti dulu.
- **Jebakan TS**: `selectedPlatform` bertipe `"" | PlatformId`; narrowing `if
  (selectedPlatform)` hilang di dalam closure `.filter/.includes` → wajib
  `const plat = selectedPlatform;` (tipe `PlatformId`) lalu pakai `plat`. Tanpa ini
  svelte-check error `"" not assignable to PlatformId`.

---

## 8. Payload `load()` yang dibutuhkan client (shape `cats`)

```ts
const cats = catRows.map((c) => ({
  id: c.id,
  name: whitelabel(c.name),                 // brand hulu di-strip SERVER-SIDE
  count: Number(c.svcCount) || 0,
  latestAt: c.latestAt ? new Date(c.latestAt).toISOString() : null,
  platforms: Array.from(catPlatforms.get(c.id) ?? []),   // utk §7 + filter dropdown
  kinds: Array.from(catKinds.get(c.id) ?? []),
}));
```

`catPlatforms`/`catKinds` = Map `categoryId → Set<platform/kind>` yang diisi di loop yang
sama dengan `counts` (dari nama layanan aktif). Dropdown kategori juga di-narrow via
`catsOptions` memakai dua array ini:

```ts
const catsOptions = $derived(
  data.cats.filter((c) => {
    if (selectedPlatform && !(c.platforms ?? []).includes(selectedPlatform)) return false;
    if (selectedKind && !(c.kinds ?? []).includes(selectedKind)) return false;
    return true;
  }),
);
```

---

## 9. Pesanan mobile (berkaitan, commit `5b45547`)

Tombol **Refill** user hanya ada di **Detail Sheet**. Kartu mobile (`SwipeRow`, `lg:hidden`)
belum punya pemicu buka detail → di HP user tak bisa Refill/Cancel. Fix: tambah baris aksi
mobile (Detail + Pesan lagi, atau Pilih saat selectMode) yang memanggil `openDetail(o.id)`.

```svelte
<!-- Mobile action row — buka Detail (Refill/Cancel hidup di sini) + Pilih utk selectMode -->
<div class="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
  {#if selectMode}
    <button type="button" onclick={() => toggleCheck(o.id)} class="…">Pilih</button>
  {:else}
    <button onclick={() => openDetail(o.id)} class="…"><Icon name="eye" size={14} /> Detail</button>
    <button onclick={() => repeatOrder(o)} class="…"><Icon name="refresh" size={14} /> Pesan lagi</button>
  {/if}
</div>
```

Guard Refill di server (`pesanan/+page.server.ts`): refill hanya boleh kalau
`svc.isRefill && order.status === "Success" && providerOrderId !== "0"`. Duplikasi bila
`.my` juga pakai layout `SwipeRow`.

---

## 10. Checklist verifikasi per-file (wajib sebelum klaim selesai)

```bash
pnpm --filter app exec eslint "src/routes/(app)/pesan/+page.svelte"   # 0 error
pnpm --filter app run check                                           # 0 error (otoritatif)
pnpm --filter app run build                                           # ✓
```

> **Jebakan IDE**: Problems panel / Language Server sering **stale** (cache types
> `.svelte-kit`/`$types` basi setelah pindah branch) → muncul error palsu
> `not assignable to never` / nama yang sudah dihapus. **Percayai `svelte-check` CLI +
> build**, bukan LS IDE. Solusi kalau IDE merah: `pnpm --filter app exec svelte-kit sync`
> + reload window.

---

## 11. Rangkuman aturan untuk agent app.socio.my

1. Salin `catalog.ts` utuh (deteksi platform/jenis + `KIND_ORDER` + alias).
2. Server: kategori = `MAX(created_at) DESC, name ASC`; layanan = **price-asc saja**;
   `.slice(0,1000)`.
3. Client: refill-first **setelah** filter platform/kind; "Termurah" via `cheapestServiceId`
   (bukan indeks 0).
4. Badge = "Non-Refill" (flag `is_refill` acuan, bukan nama).
5. Non-refill **tanpa popup**; warning amber **di form** + chip `refillAlternatives`
   (platform+kind → platform, termurah, maks 3, eksklusi diri).
6. Klik chip platform tak cocok kategori → **auto-switch kategori** via
   `data.cats[].platforms` (+ kunci narrowing TS).
7. Jangan pernah kirim harga base/markup ke client.

---

## 12. Kolom DB yang relevan (kompatibel dump lama)

Tabel `services`: `id`, `service_name`, `type`, `price` (base), `price_api` (modal provider
IDR/1k), `price_reseller`, `min`, `max`, `is_refill` (0/1), `note`, `waktu`, `category_id`,
`status` (1=aktif), `created_at`, `provider_id`, `provider_service_id`.
Tabel `categories`: `id`, `name`. Tabel `service_changelog`: `service_id`, `event`
(`created`/`price_down`/`price_up`), `detected_at` — untuk badge event 14 hari.
