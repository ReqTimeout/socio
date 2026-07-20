<script lang="ts">
  import { ServiceCard, EmptyState, Icon } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { haptic } from "@socio/ui";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { PageData } from "./$types";

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
    const res = await fetch(next);
    pending = false;
    // SvelteKit will re-run load on navigation; we use goto for simplicity
    goto(next);
  }
</script>

<section class="space-y-3">
  <!-- Search -->
  <form
    onsubmit={(e) => {
      e.preventDefault();
      onSearch();
    }}
    class="sticky top-14 z-30 -mx-4 border-b border-ink-100 bg-surface/95 px-4 py-2 backdrop-blur"
  >
    <div class="flex gap-2">
      <input
        bind:value={q}
        placeholder="Cari layanan…"
        class="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3 text-sm outline-none focus:border-accent-ink"
      />
      <button
        type="submit"
        class="grid h-10 w-10 place-items-center rounded-xl bg-accent-ink text-white"
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

  <!-- Category chips -->
  <div class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
    <button
      onclick={() => selectCat(0)}
      class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold {!data.params.cat && !data.params.fav
        ? 'bg-ink-900 text-white'
        : 'bg-ink-100 text-ink-700'}">Semua</button
    >
    <button
      onclick={toggleFavTab}
      class="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold
        {data.params.fav ? 'bg-primary text-white' : 'bg-ink-100 text-ink-700'}"
    >
      <Icon name="star" size={13} stroke={2.5} />
      Favorit{data.favCount ? ` (${data.favCount})` : ""}
    </button>
    {#each data.categories as c}
      <button
        onclick={() => selectCat(c.id)}
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold {Number(data.params.cat) ===
        c.id
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-700'}">{c.name}</button
      >
    {/each}
  </div>

  <!-- Sort -->
  <div class="flex items-center justify-between text-xs text-ink-500">
    <span>{data.total} layanan</span>
    <div class="flex gap-1">
      {#each [["termurah", "Termurah"], ["termahal", "Termahal"], ["terlaris", "Terlaris"]] as [val, label]}
        <button
          onclick={() => selectSort(val)}
          class="rounded-full px-2 py-1 font-semibold {data.params.sort === val
            ? 'text-accent-ink'
            : ''}">{label}</button
        >
      {/each}
    </div>
  </div>

  <!-- List -->
  {#if data.services.length === 0}
    <EmptyState
      title="Layanan tidak ditemukan"
      description="Coba kata kunci lain atau ganti kategori."
    />
  {:else}
    <ul class="space-y-2">
      {#each data.services as s (s.id)}
        <li class="relative">
          <ServiceCard
            name={s.serviceName}
            category={s.type}
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
            class="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full
              bg-surface/80 backdrop-blur transition active:scale-90 hover:bg-surface"
          >
            <Icon
              name="star"
              size={18}
              stroke={2.5}
              class={favState[s.id] ? "fill-amber-400 text-amber-400" : "text-ink-400"}
            />
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
