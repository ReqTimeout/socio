<script lang="ts">
  import { Icon, Button, toast, revealDelay, EmptyNotifArt, Mascot, SwipeRow } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const filters = [
    { v: "", label: "Semua" },
    { v: "order", label: "Order" },
    { v: "deposit", label: "Deposit" },
    { v: "ticket", label: "Tiket" },
    { v: "news", label: "Info" },
    { v: "promo", label: "Promo" },
  ];

  const icons: Record<string, string> = {
    order: "receipt",
    deposit: "wallet",
    ticket: "ticket",
    news: "info",
    promo: "gift",
  };

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  function selectType(v: string) {
    haptic(8);
    const p = new URLSearchParams($page.url.searchParams);
    if (v) p.set("type", v);
    else p.delete("type");
    goto(`/notif?${p.toString()}`, { noScroll: true });
  }

  // Optimistic mark-read: update state lokal dulu, server follow-up (no await)
  // Init dari server payload — SSR render list penuh (hindari CLS flash).
  let items = $state(data.items);
  $effect(() => {
    items = data.items;
  });
  let readIds = $state<Set<number>>(new Set());
  const isRead = (n: (typeof data.items)[0]) => n.read || readIds.has(n.id);

  function open(item: any) {
    haptic(10);
    markRead(item.id, true);
    if (item.actionUrl) goto(item.actionUrl);
  }

  // Tandai dibaca saja (aksi swipe mobile) — tanpa navigasi.
  // quiet=true saat dipanggil dari open() (haptic sudah bunyi 1× — anti-ganda).
  function markRead(id: number, quiet = false) {
    if (!quiet) haptic(8);
    readIds = new Set(readIds).add(id);
    const fd = new FormData();
    fd.append("id", String(id));
    fetch("?/read", { method: "POST", body: fd }).catch(() => {});
  }

  let markAllBusy = $state(false);

  // M12 — indicator mango di bawah chip filter aktif (diukur DOM, ikut filter/resize)
  let chipRow: HTMLElement | null = $state(null);
  let chipInd = $state({ left: 0, width: 0, show: false });
  function placeChipInd() {
    if (!chipRow) return;
    const active = chipRow.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) {
      chipInd.show = false;
      return;
    }
    chipInd = { left: active.offsetLeft, width: active.offsetWidth, show: true };
  }
  onMount(() => {
    placeChipInd();
    const t = setTimeout(placeChipInd, 300);
    const onRs = () => placeChipInd();
    addEventListener("resize", onRs);
    return () => {
      clearTimeout(t);
      removeEventListener("resize", onRs);
    };
  });
  $effect(() => {
    data.type; // track → reposisi tiap ganti filter
    const t = setTimeout(placeChipInd, 60);
    return () => clearTimeout(t);
  });

  function markAll() {
    markAllBusy = true;
    // optimistic: semua tandai read
    readIds = new Set(items.filter((n) => !n.read).map((n) => n.id));
    const fd = new FormData();
    fetch("?/readAll", { method: "POST", body: fd })
      .then(() => toast("Semua dibaca", "success"))
      .finally(() => (markAllBusy = false));
  }
</script>

<svelte:head>
  <title>Notifikasi — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Lihat notifikasi terbaru tentang pesanan, deposit, tiket, dan promo dari Socio.id."
  />
</svelte:head>

<section class="space-y-3 lg:space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="font-display text-lg font-bold tracking-tight lg:text-[1.55rem]">Notifikasi</h1>
    {#if data.unread > 0}
      <Button size="sm" variant="ghost" onclick={markAll} disabled={markAllBusy}>
        Tandai dibaca
        {#key data.unread}
          <span class="count-pill" aria-label={`${data.unread} belum dibaca`}>{data.unread}</span>
        {/key}
      </Button>
    {/if}
  </div>

  <!-- Filter chips — min-h 44 for thumb; indicator mango M12 -->
  <div class="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
    <div class="relative flex w-fit gap-2" bind:this={chipRow}>
      {#each filters as f}
        <button
          onclick={() => selectType(f.v)}
          data-active={data.type === f.v ? "true" : undefined}
          class="min-h-[44px] shrink-0 rounded-full px-3.5 py-2 pb-3 text-xs font-bold transition-all duration-200 active:scale-95
            {data.type === f.v
            ? 'bg-primary text-white shadow-sm'
            : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
        >
          {f.label}
        </button>
      {/each}
      <span
        class="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full motion-safe:transition-all motion-safe:duration-200"
        style="transform: translateX({chipInd.left}px); width: {chipInd.width}px; opacity: {chipInd.show
          ? 1
          : 0}; background: var(--color-mango-500);"
        aria-hidden="true"
      ></span>
    </div>
  </div>

  {#if data.items.length === 0}
    <div
      class="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center lg:p-10"
    >
      <div
        class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
      ></div>
      <EmptyNotifArt size={112} class="relative mx-auto mb-3 text-ink-300" />
      <div
        class="relative mx-auto -mt-8 mb-2 flex w-fit translate-x-10 justify-end"
        aria-hidden="true"
      >
        <Mascot pose="fly" size={40} class="float-slow -rotate-12 text-mango-500" />
      </div>
      <p class="relative text-sm font-bold text-ink-800">{copy.empty.notif.title}</p>
      <p class="relative mt-1 text-xs leading-relaxed text-ink-500">{copy.empty.notif.desc}</p>
    </div>
  {:else}
    {#snippet notifRow(n: (typeof items)[0], nRead: boolean)}
      <button
        onclick={() => open(n)}
        class="card-lift flex min-h-[56px] w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors duration-300
          {nRead ? 'border-ink-100 bg-surface' : 'border-primary/30 bg-primary/5'}"
      >
        <span
          class="icon-pop grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-300
            {nRead ? 'bg-ink-100 text-ink-500' : 'bg-primary/10 text-primary'}"
        >
          <Icon name={icons[n.type] ?? "info"} size={18} />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p
              class="min-w-0 truncate text-sm font-semibold {nRead
                ? 'text-ink-700'
                : 'text-ink-900'}"
            >
              {n.title}
            </p>
            {#if !nRead}
              <span class="dot-unread h-2 w-2 shrink-0 rounded-full bg-primary"></span>
            {/if}
          </div>
          {#if n.message}
            <p class="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.message}</p>
          {/if}
          <p class="mt-1 text-[10px] text-ink-500">{timeAgo(n.createdAt)}</p>
        </div>
      </button>
    {/snippet}
    <ul class="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {#each items as n, i (n.id)}
        {@const nRead = isRead(n)}
        <li class="reveal" style={revealDelay(i, 0, 30)}>
          <!-- Mobile: geser untuk tandai dibaca (simetri Pesanan) -->
          <div class="lg:hidden">
            <SwipeRow
              threshold={80}
              actionLabel="Tandai dibaca"
              actionIcon="check"
              onAction={() => markRead(n.id)}
            >
              {@render notifRow(n, nRead)}
            </SwipeRow>
          </div>
          <div class="hidden lg:block">
            {@render notifRow(n, nRead)}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  /* Mark-read optimistic: ikon/dot fade + row opacity settle */
  .dot-unread {
    animation: dot-settle 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes dot-settle {
    from {
      transform: scale(1.6);
      opacity: 0.4;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  /* F5 playful: ikon pop tiap render + counter mango */
  .icon-pop {
    animation: icon-pop 350ms var(--ease-spring) both;
  }
  @keyframes icon-pop {
    0% {
      transform: scale(0.6);
    }
    60% {
      transform: scale(1.12);
    }
    100% {
      transform: scale(1);
    }
  }
  .count-pill {
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 9999px;
    background: var(--color-mango-soft);
    color: var(--color-mango-ink);
    border: 1.5px solid var(--color-mango-ink);
    font-size: 11px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    animation: icon-pop 350ms var(--ease-spring) both;
  }
  @media (prefers-reduced-motion: reduce) {
    .dot-unread {
      animation: none;
    }
    .icon-pop,
    .count-pill {
      animation: none;
    }
  }
</style>
