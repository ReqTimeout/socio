<script lang="ts">
  import type { PageData } from "./$types";

  let { data } = $props();

  const cards = [
    { label: "Users", value: data.stats.users.toLocaleString("id-ID"), accent: false },
    { label: "Orders", value: data.stats.orders.toLocaleString("id-ID"), accent: false },
    { label: "Deposits", value: data.stats.deposits.toLocaleString("id-ID"), accent: false },
    { label: "Revenue", value: "Rp" + data.stats.revenue.toLocaleString("id-ID"), accent: true },
    {
      label: "Total Saldo User",
      value: "Rp" + data.stats.balance.toLocaleString("id-ID"),
      accent: false,
    },
  ];

  function timeAgo(d: Date | string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<section class="space-y-5">
  <h1 class="font-display text-xl font-bold">Dashboard</h1>

  <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
    {#each cards as c}
      <div
        class="rounded-2xl border border-ink-100 bg-surface p-4 {c.accent
          ? 'bg-ink-900 text-white'
          : ''}"
      >
        <div class="text-xs {c.accent ? 'text-ink-300' : 'text-ink-500'}">{c.label}</div>
        <div class="mt-1 font-display text-lg font-extrabold tabular-nums">{c.value}</div>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <h2 class="mb-3 text-sm font-semibold">Aktivitas Terbaru</h2>
    {#if data.recent.length === 0}
      <p class="text-sm text-ink-400">Belum ada aktivitas admin.</p>
    {:else}
      <ul class="space-y-2">
        {#each data.recent as r (r.id)}
          <li
            class="flex items-center justify-between border-b border-ink-50 pb-2 text-sm last:border-0"
          >
            <span>
              <span class="font-semibold">Admin</span>
              <span class="text-ink-500"> {r.action} {r.entity} #{r.entityId}</span>
            </span>
            <span class="text-xs text-ink-400">{timeAgo(r.createdAt)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
