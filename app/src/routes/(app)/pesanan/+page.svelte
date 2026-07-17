<script lang="ts">
  import { StatusBadge, EmptyState, Sheet, Button } from "@socio/ui";
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

  let selected = $state<number | null>(null);
  let sheetOpen = $state(false);
  let startX = 0;
  let dragX = $state(0);
  let draggingId = $state<number | null>(null);

  let orders = $state<typeof data.orders>([]);
  $effect(() => {
    orders = data.orders;
  });

  if (typeof window !== "undefined") {
    const es = new EventSource("/api/sse");
    es.addEventListener("orders", (e) => {
      const incoming = JSON.parse((e as MessageEvent).data);
      orders = orders.map((o) => {
        const u = incoming.find((x: any) => x.id === o.id);
        return u ? { ...o, status: u.status, startCount: u.startCount } : o;
      });
    });
  }

  function select(f: string) {
    haptic();
    const p = new URLSearchParams($page.url.searchParams);
    if (f === "all") p.delete("f");
    else p.set("f", f);
    goto(`/pesanan?${p.toString()}`);
  }

  function openDetail(id: number) {
    haptic();
    selected = id;
    sheetOpen = true;
  }

  function onTouchStart(e: TouchEvent, id: number) {
    startX = e.touches[0].clientX;
    draggingId = id;
    dragX = 0;
  }
  function onTouchMove(e: TouchEvent) {
    if (draggingId === null) return;
    dragX = e.touches[0].clientX - startX;
  }
  function onTouchEnd() {
    if (draggingId !== null && dragX < -80) {
      haptic();
      goto(`/pesan?reorder=${draggingId}`);
    }
    draggingId = null;
    dragX = 0;
  }

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString("id-ID");
  }

  const detail = $derived(orders.find((o) => o.id === selected) ?? null);
</script>

<section class="space-y-3">
  <div class="flex gap-2 overflow-x-auto [scrollbar-width:none]">
    {#each tabs as t}
      <button
        onclick={() => select(t.f)}
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold {data.filter === t.f
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-700'}">{t.label}</button
      >
    {/each}
  </div>

  {#if orders.length === 0}
    <EmptyState title="Belum ada pesanan" description="Pesanan kamu akan muncul di sini.">
      <a
        href="/pesan"
        class="mt-3 inline-block rounded-full bg-accent-ink px-4 py-2 text-sm font-bold text-white"
        >Buat Pesanan</a
      >
    </EmptyState>
  {:else}
    <ul class="space-y-2">
      {#each orders as o (o.id)}
        <li
          class="rounded-2xl border border-ink-100 bg-surface p-4 transition-transform"
          style="transform: translateX({draggingId === o.id ? dragX : 0}px)"
          ontouchstart={(e) => onTouchStart(e, o.id)}
          ontouchmove={onTouchMove}
          ontouchend={onTouchEnd}
        >
          <button onclick={() => openDetail(o.id)} class="block w-full text-left">
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
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<Sheet bind:open={sheetOpen} title="Detail Pesanan">
  {#if detail}
    <div class="space-y-3">
      <div>
        <p class="text-sm font-semibold">{detail.serviceName}</p>
        <p class="text-xs text-ink-500">{detail.data}</p>
      </div>
      <div class="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2">
        <span class="text-xs text-ink-500">Status</span>
        <StatusBadge status={detail.status} />
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-ink-500">Jumlah</span><span class="font-semibold"
          >{detail.quantity.toLocaleString("id-ID")}</span
        >
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-ink-500">Harga</span><span class="font-semibold"
          >{formatRupiah(detail.price)}</span
        >
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-ink-500">Tanggal</span><span>{timeAgo(detail.createdAt)}</span>
      </div>
      <Button
        class="w-full"
        onclick={() => {
          selected = null;
          sheetOpen = false;
          goto(`/pesan?reorder=${detail.id}`);
        }}>Pesan Lagi</Button
      >
    </div>
  {/if}
</Sheet>
