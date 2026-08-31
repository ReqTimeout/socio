<script lang="ts">
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";
  import Icon from "./Icon.svelte";
  import { haptic } from "../haptic.js";

  type Item = {
    id: number;
    type: string;
    title: string;
    message: string | null;
    actionUrl: string | null;
    read: boolean;
    createdAt: string | Date;
  };

  let {
    count = 0,
    items: initial = [] as Item[],
    href = "/notif",
  }: { count?: number; items?: Item[]; href?: string } = $props();

  let open = $state(false);
  let items = $state<Item[]>([]);
  let unread = $state(0);
  let loading = $state(false);
  let root = $state<HTMLDivElement | null>(null);

  // sinkronkan props reaktif ke state lokal (props initial/count bisa berubah saat nav)
  $effect(() => {
    items = initial;
  });
  $effect(() => {
    unread = count;
  });

  const hasUnread = $derived(unread > 0);
  const label = $derived(unread > 99 ? "99+" : String(unread));

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

  async function fetchItems() {
    loading = true;
    try {
      const res = await fetch("/api/notifications?limit=7");
      if (res.ok) {
        const j = await res.json();
        items = j.items ?? [];
        unread = j.unread ?? 0;
      }
    } catch {
      // silent
    } finally {
      loading = false;
    }
  }

  function toggle() {
    haptic(8);
    open = !open;
    if (open) fetchItems();
  }

  async function markOne(id: number, actionUrl?: string | null) {
    haptic(8);
    // optimistic
    items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    unread = Math.max(0, unread - 1);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {}
    if (actionUrl) window.location.href = actionUrl;
  }

  async function markAll() {
    if (!hasUnread) return;
    haptic(10);
    const prevUnread = unread;
    items = items.map((n) => ({ ...n, read: true }));
    unread = 0;
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      unread = prevUnread;
    }
  }

  function onWindowClick(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) open = false;
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div bind:this={root} class="relative">
  <button
    type="button"
    onclick={toggle}
    aria-label="Notifikasi"
    aria-haspopup="dialog"
    aria-expanded={open}
    class="relative grid h-9 w-9 place-items-center rounded-full bg-surface text-ink-700 shadow-sm ring-1 ring-ink-100 transition active:scale-90 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
  >
    <Icon name="bell" size={18} />
    {#if hasUnread}
      <span
        class="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_2px_8px_rgba(220,38,38,0.45)] motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]"
        aria-live="polite"
      >
        {label}
      </span>
    {/if}
  </button>

  {#if open}
    <!-- backdrop mobile -->
    <button
      type="button"
      aria-label="Tutup notifikasi"
      class="fixed inset-0 z-40 bg-ink-900/10 backdrop-blur-[1px] lg:hidden"
      onclick={() => (open = false)}
      tabindex="-1"
    ></button>

    <div
      role="dialog"
      aria-modal="false"
      aria-label="Notifikasi"
      in:fly={{ y: 8, duration: 180 }}
      out:fade={{ duration: 120 }}
      class="absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-[0_16px_40px_-12px_rgba(15,23,42,0.28)] lg:right-0 lg:origin-top-right max-sm:fixed max-sm:inset-x-3 max-sm:top-14 max-sm:w-auto"
    >
      <div class="flex items-center justify-between gap-3 border-b border-ink-100 px-3 py-2.5">
        <div class="flex items-center gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600">
            <Icon name="bell" size={14} />
          </span>
          <h2 class="text-sm font-bold tracking-tight">Notifikasi</h2>
          {#if hasUnread}
            <span class="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-extrabold text-white"
              >{label}</span
            >
          {/if}
        </div>
        <div class="flex items-center gap-1">
          {#if hasUnread}
            <button
              type="button"
              onclick={markAll}
              class="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-95 hover:bg-ink-800"
            >
              Tandai dibaca
            </button>
          {/if}
          <a
            href={href}
            onclick={() => (open = false)}
            class="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-700 transition hover:bg-ink-200"
          >
            Lihat semua
          </a>
        </div>
      </div>

      <div class="max-h-[min(60vh,380px)] overflow-auto p-2 [scrollbar-width:thin]">
        {#if loading}
          <div class="space-y-2 p-2">
            {#each Array(3) as _, i}
              <div class="animate-pulse rounded-xl border border-ink-100 bg-ink-50 p-3">
                <div class="h-3 w-3/4 rounded bg-ink-200"></div>
                <div class="mt-2 h-2 w-full rounded bg-ink-200"></div>
              </div>
            {/each}
          </div>
        {:else if items.length === 0}
          <div class="p-6 text-center">
            <div class="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-ink-500">
              <Icon name="bell" size={18} />
            </div>
            <p class="mt-2 text-sm font-bold">Belum ada notifikasi</p>
            <p class="mt-1 text-xs text-ink-500">Pesanan, deposit, dan info akan muncul di sini.</p>
          </div>
        {:else}
          <ul class="space-y-1.5">
            {#each items as n (n.id)}
              <li>
                <button
                  type="button"
                  onclick={() => markOne(n.id, n.actionUrl)}
                  class="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:shadow-sm active:scale-[0.99]
                    {n.read ? 'border-ink-100 bg-surface' : 'border-primary/20 bg-primary/[0.06]'}"
                >
                  <span
                    class="grid h-8 w-8 shrink-0 place-items-center rounded-lg {n.read
                      ? 'bg-ink-100 text-ink-500'
                      : 'bg-primary text-white shadow-sm'}"
                  >
                    <Icon name={icons[n.type] ?? 'info'} size={16} />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-1.5">
                      <span class="truncate text-sm font-semibold {n.read ? 'text-ink-700' : 'text-ink-900'}"
                        >{n.title}</span
                      >
                      {#if !n.read}
                        <span class="h-2 w-2 shrink-0 rounded-full bg-primary"></span>
                      {/if}
                    </span>
                    {#if n.message}
                      <span class="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-500"
                        >{n.message}</span
                      >
                    {/if}
                    <span class="mt-1 block text-[10px] text-ink-500">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="flex items-center justify-between border-t border-ink-100 bg-ink-50/60 px-3 py-2">
        <span class="text-[11px] font-medium text-ink-500">
          {items.length ? `${items.length} terbaru` : "—"}
          {#if hasUnread}
            · <span class="font-bold text-danger">{unread} belum dibaca</span>
          {/if}
        </span>
        <a
          href={href}
          onclick={() => (open = false)}
          class="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-700"
        >
          Buka halaman
          <Icon name="chevron_right" size={14} />
        </a>
      </div>
    </div>
  {/if}
</div>
