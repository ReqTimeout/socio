<script lang="ts">
  import { fly } from "svelte/transition";
  import { ServiceCard, EmptyState, Icon, Select, staggerIn, hoverLift } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  let { data } = $props();

  let q = $state(data.params.q ?? "");
  let pending = $state(false);
  let favState = $state<Record<number, boolean>>(
    Object.fromEntries(data.services.filter((s) => s.fav).map((s) => [s.id, true])),
  );

  function buildParams(extra: Record<string, string> = {}) {
    const p = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(extra)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/layanan?${p.toString()}`;
  }

  function onSearch() {
    haptic();
    goto(buildParams({ q, page: "" }));
  }

  function selectCat(id: number) {
    haptic();
    goto(buildParams({ cat: id ? String(id) : "", page: "" }));
  }

  function selectSort(s: string) {
    haptic();
    goto(buildParams({ sort: s, page: "" }));
  }

  function toggleFavTab() {
    haptic();
    goto(buildParams({ fav: data.params.fav ? "" : "1", page: "" }));
  }

  async function toggleFav(id: number) {
    haptic(10);
    const wasFav = favState[id];
    favState[id] = !wasFav;
    const fd = new FormData();
    fd.append("serviceId", String(id));
    try {
      await fetch("?/toggleFav", { method: "POST", body: fd });
    } catch {
      favState[id] = wasFav; // revert on error
    }
  }

  async function loadMore() {
    if (!data.hasMore || pending) return;
    pending = true;
    const next = `/layanan?${new URLSearchParams({
      ...Object.fromEntries($page.url.searchParams),
      page: String(data.page + 1),
    })}`;
    await fetch(next);
    pending = false;
    // SvelteKit will re-run load on navigation; we use goto for simplicity
    goto(next);
  }

  const catOptions = $derived([
    { value: 0, label: "Semua kategori" },
    ...data.categories.map((c) => ({ value: c.id, label: c.name })),
  ]);
  const sortOptions = [
    { value: "termurah", label: "Harga termurah" },
    { value: "termahal", label: "Harga termahal" },
    { value: "terlaris", label: "Paling laris" },
  ];
</script>

<svelte:head>
  <title>Layanan — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Temukan layanan SMM terbaik untuk Instagram, TikTok, YouTube, dan media sosial lainnya. Harga termurah, proses otomatis."
  />
</svelte:head>

<section class="space-y-3 lg:space-y-5">
  <!-- Intro header (desktop) -->
  <div class="hidden lg:block">
    <h1 class="font-display text-2xl font-extrabold tracking-tight">Katalog Layanan</h1>
    <p class="mt-1 text-sm text-ink-500">Pilih kategori, atur jumlah, langsung gas.</p>
  </div>

  <!-- Search -->
  <form
    onsubmit={(e) => {
      e.preventDefault();
      onSearch();
    }}
    class="sticky top-14 z-30 -mx-4 border-b border-ink-100 bg-surface/95 px-4 py-2 backdrop-blur
      lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
  >
    <div class="flex gap-2">
      <input
        bind:value={q}
        placeholder="Cari layanan… (mis. followers instagram)"
        class="h-11 flex-1 rounded-xl border border-ink-200 bg-surface px-4 text-sm outline-none transition focus:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent-500/30"
      />
      <button
        type="submit"
        class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-ink text-white transition active:scale-95 hover:opacity-90"
        aria-label="Cari"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" stroke-linecap="round" /></svg
        >
      </button>
    </div>
  </form>

  <!-- Filter: kategori (dropdown) + sort (dropdown) + favorit -->
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="flex-1">
      <Select
        value={data.params.fav ? 0 : Number(data.params.cat) || 0}
        options={catOptions}
        placeholder="Semua kategori"
        searchPlaceholder="Cari kategori…"
        onChange={(v) => selectCat(Number(v))}
      />
    </div>
    <div class="flex gap-2">
      <div class="w-40 shrink-0">
        <Select
          value={data.params.sort ?? "termurah"}
          options={sortOptions}
          searchable={false}
          onChange={(v) => selectSort(String(v))}
        />
      </div>
      <button
        type="button"
        onclick={toggleFavTab}
        aria-pressed={!!data.params.fav}
        class="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition active:scale-95
          {data.params.fav
          ? 'border-primary bg-primary text-white'
          : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300'}"
      >
        <Icon name="star" size={16} stroke={2.5} class={data.params.fav ? "fill-white" : ""} />
        <span class="hidden sm:inline">Favorit</span>{data.favCount ? ` ${data.favCount}` : ""}
      </button>
    </div>
  </div>

  <!-- Result count -->
  <p class="text-xs text-ink-500">{data.total.toLocaleString("id-ID")} layanan ditemukan</p>

  <!-- List -->
  {#if data.services.length === 0}
    <EmptyState
      title="Layanan tidak ditemukan"
      description="Coba kata kunci lain atau ganti kategori."
    />
  {:else}
    <ul class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {#each data.services as s, i (s.id)}
        <li in:fly={staggerIn(i, { y: 8, duration: 220, step: 30 })} class="relative {hoverLift}">
          <ServiceCard
            name={s.serviceName}
            category={s.type}
            platform={s.categoryName ?? s.serviceName}
            pricePer1k={s.price}
            min={s.min}
            max={s.max}
            refill={s.isRefill === 1}
            href={`/pesan?service=${s.id}`}
          />
          <button
            type="button"
            onclick={() => toggleFav(s.id)}
            aria-label={favState[s.id] ? "Hapus dari favorit" : "Tambah ke favorit"}
            class="group absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-full
              transition active:scale-90"
          >
            <span
              class="grid h-8 w-8 place-items-center rounded-full bg-surface/80 backdrop-blur transition group-hover:bg-surface"
            >
              <Icon
                name="star"
                size={18}
                stroke={2.5}
                class={favState[s.id] ? "fill-amber-400 text-amber-400" : "text-ink-400"}
              />
            </span>
          </button>
        </li>
      {/each}
    </ul>
    {#if data.hasMore}
      <button
        onclick={loadMore}
        disabled={pending}
        class="w-full rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-600 hover:bg-ink-50"
      >
        {pending ? "Memuat…" : "Muat lebih banyak"}
      </button>
    {/if}
  {/if}
</section>
