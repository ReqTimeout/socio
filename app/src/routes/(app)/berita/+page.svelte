<script lang="ts">
  import { Icon, revealDelay, EmptyNotifArt, Sparko, haptic } from "@socio/ui";
  import {
    newsMeta,
    newsTimeAgo,
    NEWS_EVENT_FILTERS,
    isOrderableEvent,
    cleanNewsText,
    newsPriceSegments,
  } from "$lib/news-meta";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  function pageHref(p: number): string {
    const q = new URLSearchParams();
    q.set("page", String(p));
    if (data.t) q.set("t", data.t);
    return `/berita?${q.toString()}`;
  }
</script>

<svelte:head>
  <title>Berita & Update Layanan — Socio.id</title>
  <meta
    name="description"
    content="Kabar terbaru seputar layanan Socio.id: layanan baru, perubahan harga, dan layanan yang dihentikan."
  />
</svelte:head>

<section class="space-y-3 lg:space-y-4">
  <div>
    <h1 class="font-display text-lg font-bold tracking-tight lg:text-[1.55rem]">
      Berita &amp; Update Layanan
    </h1>
    <p class="mt-0.5 text-xs leading-relaxed text-ink-500 lg:text-sm">
      Kabar otomatis dari pembaruan katalog layanan Socio — layanan baru, harga naik/turun, dan yang
      dihentikan. Tap baris untuk langsung pesan layanannya.
    </p>
  </div>

  <!-- Filter chips pop/neo-brutalist — compact + titik warna sesuai event -->
  <div class="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
    <div class="flex w-fit gap-1.5">
      {#each NEWS_EVENT_FILTERS as f (f.v)}
        {@const fm = f.v ? newsMeta(f.v) : null}
        {@const active = data.t === f.v}
        <a
          href={f.v ? `/berita?t=${f.v}` : "/berita"}
          aria-current={active ? "page" : undefined}
          onclick={() => haptic(6)}
          class="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border-2 border-ink-900 px-3 py-1 text-[11px] font-bold shadow-[2px_2px_0_var(--color-ink-900)] transition-all duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
            {active
            ? fm
              ? `${fm.chipBg} ${fm.chipInk} font-extrabold`
              : 'bg-primary text-white'
            : 'bg-surface text-ink-700 hover:bg-ink-50'}"
        >
          {#if fm}
            <span class="h-2 w-2 shrink-0 rounded-full ring-1 ring-ink-900/20 {fm.dot}"></span>
          {/if}
          {f.label}</a
        >
      {/each}
    </div>
  </div>

  {#if data.items.length === 0}
    <div
      class="relative overflow-hidden rounded-2xl border-2 border-dashed border-ink-200 bg-surface p-8 text-center lg:p-10"
    >
      <div
        class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
      ></div>
      <EmptyNotifArt size={112} class="relative mx-auto mb-3 text-ink-300" />
      <div
        class="relative mx-auto -mt-8 mb-2 flex w-fit translate-x-10 justify-end"
        aria-hidden="true"
      >
        <Sparko pose="idle" size={44} />
      </div>
      <p class="relative text-sm font-bold text-ink-800">Belum ada update</p>
      <p class="relative mt-1 text-xs leading-relaxed text-ink-500">
        {data.t
          ? "Belum ada berita untuk kategori ini. Coba pilih kategori lain."
          : "Kalau ada layanan baru atau perubahan harga dari provider, otomatis muncul di sini."}
      </p>
    </div>
  {:else}
    <ul class="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {#each data.items as n, i (n.id)}
        {@const meta = newsMeta(n.eventType)}
        {@const title = cleanNewsText(n.kategori) || meta.label}
        {@const segs = newsPriceSegments(n.content)}
        {@const href =
          n.serviceId > 0 && isOrderableEvent(n.eventType) ? `/pesan?service=${n.serviceId}` : null}
        {@const showBadge = title.toLowerCase() !== meta.label.toLowerCase()}
        <li class="reveal" style={revealDelay(i, 0, 30)}>
          <svelte:element
            this={href ? "a" : "div"}
            {...href ? { href } : {}}
            onclick={() => haptic(8)}
            class="group flex items-start gap-3 rounded-2xl border-2 border-ink-900 bg-surface p-3.5 text-left shadow-[2px_2px_0_var(--color-ink-900)] transition-all duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              {href ? 'hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-ink-900)]' : ''}"
          >
            <span
              class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink-900 {meta.chipBg} {meta.chipInk} transition-transform group-hover:scale-105"
            >
              <Icon name={meta.icon} size={18} stroke={2} />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="min-w-0 truncate text-sm font-extrabold text-ink-900">{title}</span>
                {#if showBadge}
                  <span
                    class="shrink-0 rounded-full border-2 border-ink-900 px-2 py-0.5 text-[10px] font-extrabold {meta.chipBg} {meta.chipInk}"
                  >
                    {meta.label}
                  </span>
                {/if}
              </span>
              <span class="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-600 lg:line-clamp-3">
                {#each segs as seg, si (si)}
                  {#if seg.price}
                    <span class="font-extrabold text-ink-900">{seg.t}</span>
                  {:else}
                    {seg.t}
                  {/if}
                {/each}
              </span>
              <span class="mt-1.5 flex items-center gap-1 text-[11px] text-ink-400">
                <Icon name="clock" size={11} />
                {newsTimeAgo(n.createdAt)}
                {#if href}
                  <span
                    class="ml-auto inline-flex items-center rounded-full border-2 border-ink-900 bg-primary px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-[1.5px_1.5px_0_var(--color-ink-900)] transition-transform group-hover:-translate-y-px"
                  >
                    Pesan sekarang
                  </span>
                {/if}
              </span>
            </span>
          </svelte:element>
        </li>
      {/each}
    </ul>

    {#if data.pages > 1}
      <nav
        class="mt-4 flex items-center justify-center gap-2.5"
        aria-label="Navigasi halaman berita"
      >
        {#if data.page > 1}
          <a
            href={pageHref(data.page - 1)}
            class="inline-flex min-h-[44px] items-center gap-1 rounded-full border-2 border-ink-900 bg-surface px-4 py-2 text-xs font-bold text-ink-900 shadow-[2px_2px_0_var(--color-ink-900)] transition-all hover:bg-ink-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >‹ Sebelumnya</a
          >
        {/if}
        <span
          class="inline-flex min-h-[44px] items-center px-2 text-xs font-bold tabular-nums text-ink-500"
        >
          Halaman {data.page} dari {data.pages}
        </span>
        {#if data.page < data.pages}
          <a
            href={pageHref(data.page + 1)}
            class="inline-flex min-h-[44px] items-center gap-1 rounded-full border-2 border-ink-900 bg-surface px-4 py-2 text-xs font-bold text-ink-900 shadow-[2px_2px_0_var(--color-ink-900)] transition-all hover:bg-ink-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >Selanjutnya ›</a
          >
        {/if}
      </nav>
    {/if}
  {/if}
</section>
