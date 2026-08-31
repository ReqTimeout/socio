<script lang="ts">
  import { Icon, Button, toast, revealDelay, EmptyNotifArt } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
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
    if (!isRead(item)) {
      readIds = new Set(readIds).add(item.id);
      const fd = new FormData();
      fd.append("id", String(item.id));
      fetch("?/read", { method: "POST", body: fd }).catch(() => {});
    }
    if (item.actionUrl) goto(item.actionUrl);
  }

  let markAllBusy = $state(false);
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
      </Button>
    {/if}
  </div>

  <!-- Filter chips — min-h 44 for thumb -->
  <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
    {#each filters as f}
      <button
        onclick={() => selectType(f.v)}
        class="min-h-[44px] shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95
          {data.type === f.v
          ? 'bg-primary text-white shadow-sm'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
      >
        {f.label}
      </button>
    {/each}
  </div>

  {#if data.items.length === 0}
    <div
      class="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center lg:p-10"
    >
      <div
        class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
      ></div>
      <EmptyNotifArt size={112} class="relative mx-auto mb-3 text-ink-300" />
      <p class="relative text-sm font-bold text-ink-800">{copy.empty.notif.title}</p>
      <p class="relative mt-1 text-xs leading-relaxed text-ink-500">{copy.empty.notif.desc}</p>
    </div>
  {:else}
    <ul class="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {#each items as n, i (n.id)}
        {@const nRead = isRead(n)}
        <li class="reveal" style={revealDelay(i, 0, 30)}>
          <button
            onclick={() => open(n)}
            class="card-lift flex min-h-[56px] w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors duration-300
              {nRead ? 'border-ink-100 bg-surface' : 'border-primary/30 bg-primary/5'}"
          >
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-300
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
  @media (prefers-reduced-motion: reduce) {
    .dot-unread {
      animation: none;
    }
  }
</style>
