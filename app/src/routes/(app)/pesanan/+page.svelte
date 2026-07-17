<script lang="ts">
  import { StatusBadge, EmptyState } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { PageData } from "./$types";

  let { data } = $props();

  const tabs = [
    { f: "all", label: "Semua" },
    { f: "pending", label: "Pending" },
    { f: "proses", label: "Proses" },
    { f: "selesai", label: "Selesai" },
  ];

  function select(f: string) {
    haptic();
    const p = new URLSearchParams($page.url.searchParams);
    if (f === "all") p.delete("f");
    else p.set("f", f);
    goto(`/pesanan?${p.toString()}`);
  }

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString("id-ID");
  }
</script>

<section class="space-y-3">
  <div class="flex gap-2 overflow-x-auto [scrollbar-width:none]">
    {#each tabs as t}
      <button onclick={() => select(t.f)} class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold {data.filter === t.f ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'}">{t.label}</button>
    {/each}
  </div>

  {#if data.orders.length === 0}
    <EmptyState title="Belum ada pesanan" description="Pesanan kamu akan muncul di sini.">
      <a href="/pesan" class="mt-3 inline-block rounded-full bg-accent-ink px-4 py-2 text-sm font-bold text-white">Buat Pesanan</a>
    </EmptyState>
  {:else}
    <ul class="space-y-2">
      {#each data.orders as o (o.id)}
        <li class="rounded-2xl border border-ink-100 bg-surface p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{o.serviceName}</p>
              <p class="truncate text-xs text-ink-500">{o.data}</p>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div class="mt-2 flex items-center justify-between text-xs text-ink-500">
            <span>{o.quantity.toLocaleString("id-ID")} · {formatRupiah(o.price)}</span>
            <span>{timeAgo(o.createdAt)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
