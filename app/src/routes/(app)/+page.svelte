<script lang="ts">
  import { SaldoHero, QuickGrid, StatusBadge, EmptyState, Icon } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data } = $props();

  const quick = [
    { href: "/pesan", label: "Pesan", icon: "plus", accent: true },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/tiket", label: "Tiket", icon: "ticket" },
    { href: "/affiliate", label: "Affiliate", icon: "gift" },
  ];

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
  }
</script>

<section class="space-y-5">
  <!-- Saldo Hero -->
  <SaldoHero balance={data.user?.balance ?? 0} ctaHref="/saldo/top-up" ctaLabel="Top Up" />

  <!-- Quick Grid 4 items -->
  <QuickGrid items={quick} />

  <!-- Recent orders -->
  <div>
    <div class="mb-2.5 flex items-center justify-between">
      <h2 class="font-display text-base font-bold tracking-tight">Pesanan Terbaru</h2>
      <a
        href="/pesanan"
        class="flex items-center gap-0.5 text-xs font-bold text-primary hover:text-primary-800"
      >
        Lihat semua
        <Icon name="chevron_right" size={14} />
      </a>
    </div>

    {#if data.recent.length === 0}
      <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center">
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400">
          <Icon name="receipt" size={24} />
        </div>
        <p class="text-sm font-semibold text-ink-700">Belum ada pesanan</p>
        <p class="mt-1 text-xs text-ink-500">Buat pesanan pertama kamu sekarang.</p>
        <a
          href="/pesan"
          onclick={() => haptic(10)}
          class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white
            transition-all active:scale-95 hover:bg-primary-800"
        >
          <Icon name="plus" size={16} stroke={2.5} />
          Pesan Sekarang
        </a>
      </div>
    {:else}
      <ul class="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-surface">
        {#each data.recent as o (o.id)}
          <li>
            <a
              href="/pesanan"
              class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50 active:bg-ink-100"
            >
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon name="receipt" size={18} />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{o.serviceName}</div>
                <div class="truncate text-xs text-ink-500">
                  {o.quantity} qty · {formatRupiah(o.price)}
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <StatusBadge status={o.status} />
                <span class="text-[10px] text-ink-400">{timeAgo(o.createdAt)}</span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Trust line -->
  <div class="flex items-center justify-center gap-1.5 py-2 text-xs text-ink-400">
    <Icon name="shield" size={14} class="text-success" />
    <span>{data.serviceCount?.toLocaleString("id-ID") ?? "8.153"}+ layanan aktif</span>
    <span class="mx-1">·</span>
    <span>Sync tiap jam</span>
  </div>
</section>
