<script lang="ts">
  import { StatusBadge, EmptyState } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data } = $props();

  const filters = [
    "",
    "Pending",
    "Processing",
    "In progress",
    "Completed",
    "Partial",
    "Canceled",
    "Error",
  ];
  let status = $state(data.status);
  let q = $state(data.q);

  function timeAgo(d: Date | string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<section class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h1 class="font-display text-xl font-bold">Orders</h1>
    <form method="GET" class="flex gap-2">
      <input
        name="q"
        bind:value={q}
        placeholder="ID / link…"
        class="h-9 rounded-xl border border-ink-200 px-3 text-sm"
      />
      <button class="h-9 rounded-xl bg-ink-900 px-3 text-sm font-medium text-white">Cari</button>
    </form>
  </div>

  <div class="flex gap-2 overflow-x-auto [scrollbar-width:none]">
    {#each filters as f}
      <a
        href="/admin/orders?status={f}&q={data.q}"
        class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold {data.status === f
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-700'}">{f || "Semua"}</a
      >
    {/each}
  </div>

  {#if data.orders.length === 0}
    <EmptyState title="Belum ada order" />
  {:else}
    <!-- Desktop table -->
    <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
      <table class="w-full text-sm">
        <thead class="border-b border-ink-100 text-left text-xs text-ink-500">
          <tr
            ><th class="p-3">ID</th><th class="p-3">Layanan</th><th class="p-3">Qty</th><th
              class="p-3">Harga</th
            ><th class="p-3">Status</th><th class="p-3">Waktu</th></tr
          >
        </thead>
        <tbody>
          {#each data.orders as o (o.id)}
            <tr class="border-b border-ink-50 last:border-0">
              <td class="p-3 tabular-nums">{o.id}</td>
              <td class="p-3 max-w-xs truncate">{o.serviceName}</td>
              <td class="p-3 tabular-nums">{o.quantity.toLocaleString("id-ID")}</td>
              <td class="p-3 tabular-nums">{formatRupiah(o.price)}</td>
              <td class="p-3"><StatusBadge status={o.status} /></td>
              <td class="p-3 text-xs text-ink-400">{timeAgo(o.createdAt)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <!-- Mobile -->
    <ul class="space-y-2 lg:hidden">
      {#each data.orders as o (o.id)}
        <li class="rounded-2xl border border-ink-100 bg-surface p-3">
          <div class="flex items-center justify-between">
            <span class="font-semibold truncate">#{o.id} {o.serviceName}</span>
            <StatusBadge status={o.status} />
          </div>
          <div class="mt-1 flex justify-between text-xs text-ink-500">
            <span>{o.quantity.toLocaleString("id-ID")} · {formatRupiah(o.price)}</span>
            <span>{timeAgo(o.createdAt)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if data.pages > 1}
    <div class="flex justify-center gap-2">
      {#each Array(data.pages) as _, i}
        <a
          href="/admin/orders?status={data.status}&q={data.q}&p={i + 1}"
          class="rounded-lg px-3 py-1 text-sm {data.page === i + 1
            ? 'bg-ink-900 text-white'
            : 'bg-ink-100'}">{i + 1}</a
        >
      {/each}
    </div>
  {/if}
</section>
