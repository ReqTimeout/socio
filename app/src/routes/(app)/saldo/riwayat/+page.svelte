<script lang="ts">
  import { fly } from "svelte/transition";
  import { EmptyState, staggerIn, hoverLift } from "@socio/ui";
  import { formatRupiah } from "$lib/format";

  let { data } = $props();

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<svelte:head>
  <title>Riwayat Saldo — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Lihat riwayat transaksi saldo Socio.id kamu. Top up, order, refund, dan withdraw."
  />
</svelte:head>

<section class="space-y-3">
  <h1 class="font-display text-lg font-bold">Riwayat Saldo</h1>

  {#if data.logs.length === 0}
    <EmptyState title="Belum ada riwayat" description="Pergerakan saldo akan muncul di sini." />
  {:else}
    <ul class="space-y-2">
      {#each data.logs as l, i (l.id)}
        <li
          in:fly={staggerIn(i, { y: 10, duration: 250, step: 40 })}
          class="flex items-center justify-between rounded-xl border border-ink-100 bg-surface px-4 py-3 {hoverLift}"
        >
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{l.note}</div>
            <div class="text-xs text-ink-400">{timeAgo(l.createdAt)}</div>
          </div>
          <span
            class="shrink-0 font-semibold tabular-nums {Number(l.amount) < 0
              ? 'text-danger'
              : 'text-success'}"
          >
            {Number(l.amount) < 0 ? "-" : "+"}{formatRupiah(Math.abs(Number(l.amount)))}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>
