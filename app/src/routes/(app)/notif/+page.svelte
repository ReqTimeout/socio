<script lang="ts">
  import { Icon, EmptyState, Button, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

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

  function open(item: any) {
    haptic(10);
    if (!item.read) {
      const fd = new FormData();
      fd.append("id", String(item.id));
      fetch("?/read", { method: "POST", body: fd }).catch(() => {});
    }
    if (item.actionUrl) goto(item.actionUrl);
  }

  let markAllBusy = $state(false);
  function markAll() {
    markAllBusy = true;
    const fd = new FormData();
    fetch("?/readAll", { method: "POST", body: fd })
      .then(() => toast("Semua dibaca", "success"))
      .finally(() => (markAllBusy = false));
  }
</script>

<section class="space-y-3">
  <div class="flex items-center justify-between">
    <h1 class="font-display text-lg font-bold tracking-tight">Notifikasi</h1>
    {#if data.unread > 0}
      <Button size="sm" variant="ghost" onclick={markAll} disabled={markAllBusy}>
        Tandai dibaca
      </Button>
    {/if}
  </div>

  <!-- Filter chips -->
  <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
    {#each filters as f}
      <button
        onclick={() => selectType(f.v)}
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
          {data.type === f.v
          ? 'bg-primary text-white shadow-sm'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
      >
        {f.label}
      </button>
    {/each}
  </div>

  {#if data.items.length === 0}
    <EmptyState icon="🔔" title="Belum ada notifikasi" description="Notifikasi pesanan, deposit, dan info akan muncul di sini." />
  {:else}
    <ul class="space-y-2">
      {#each data.items as n (n.id)}
        <li>
          <button
            onclick={() => open(n)}
            class="flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]
              {n.read ? 'border-ink-100 bg-surface' : 'border-primary/30 bg-primary/5'}"
          >
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-xl
                {n.read ? 'bg-ink-100 text-ink-500' : 'bg-primary/10 text-primary'}"
            >
              <Icon name={icons[n.type] ?? "info"} size={18} />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-semibold {n.read ? 'text-ink-700' : 'text-ink-900'}">
                  {n.title}
                </p>
                {#if !n.read}
                  <span class="h-2 w-2 shrink-0 rounded-full bg-primary"></span>
                {/if}
              </div>
              {#if n.message}
                <p class="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.message}</p>
              {/if}
              <p class="mt-1 text-[10px] text-ink-400">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
