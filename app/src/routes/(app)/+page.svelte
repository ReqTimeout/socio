<script lang="ts">
  import { SaldoHero, QuickGrid, StatusBadge, EmptyState } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data } = $props();

  const quick = [
    { href: "/saldo/top-up", label: "Top Up", icon: "wallet" },
    { href: "/pesan", label: "Pesan", icon: "plus" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/affiliate", label: "Affiliate", icon: "gift" },
  ];

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
    return `${Math.floor(diff / 86400)}h`;
  }
</script>

<section class="space-y-5">
  <SaldoHero balance={data.user?.balance ?? 0} ctaHref="/saldo/top-up" ctaLabel="Top Up Saldo" />

  <QuickGrid items={quick} />

  <!-- Recent orders -->
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-display text-base font-bold">Pesanan Terbaru</h2>
      <a href="/pesanan" class="text-xs font-semibold text-accent-ink">Lihat semua</a>
    </div>

    {#if data.recent.length === 0}
      <EmptyState title="Belum ada pesanan" description="Buat pesanan pertama kamu sekarang.">
        <a
          href="/pesan"
          class="mt-3 inline-block rounded-full bg-accent-ink px-4 py-2 text-sm font-bold text-white"
          >Pesan Sekarang</a
        >
      </EmptyState>
    {:else}
      <ul
        class="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-surface"
      >
        {#each data.recent as o (o.id)}
          <li class="flex items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold">{o.serviceName}</div>
              <div class="truncate text-xs text-ink-500">{o.data} · {formatRupiah(o.price)}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <StatusBadge status={o.status} />
              <span class="text-[10px] text-ink-400">{timeAgo(o.createdAt)}</span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <p class="text-center text-xs text-ink-400">
    {data.serviceCount}+ layanan tersedia · Sync otomatis tiap jam
  </p>
</section>
