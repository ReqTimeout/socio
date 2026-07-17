<script lang="ts">
  import { EmptyState } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data } = $props();

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
</script>

<section class="space-y-3">
  <h1 class="font-display text-lg font-bold">Riwayat Saldo</h1>

  {#if data.logs.length === 0}
    <EmptyState title="Belum ada riwayat" description="Pergerakan saldo akan muncul di sini." />
  {:else}
    <ul class="space-y-2">
      {#each data.logs as l (l.id)}
        <li class="flex items-center justify-between rounded-xl border border-ink-100 bg-surface px-4 py-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{l.note}</div>
            <div class="text-xs text-ink-400">{timeAgo(l.createdAt)}</div>
          </div>
          <span class="shrink-0 font-semibold tabular-nums {Number(l.amount) < 0 ? 'text-danger' : 'text-success'}">
            {Number(l.amount) < 0 ? "-" : "+"}{formatRupiah(Math.abs(Number(l.amount)))}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>
