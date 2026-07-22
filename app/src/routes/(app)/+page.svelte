<script lang="ts">
  import { SaldoHero, StatusBadge, EmptyState, Icon } from "@socio/ui";
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

<svelte:head>
  <title>Dashboard — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Kelola pesanan SMM, cek saldo, dan lihat status order secara real-time di dashboard Socio.id."
  />
  <meta property="og:title" content="Dashboard — Socio.id" />
  <meta
    property="og:description"
    content="Kelola pesanan SMM, cek saldo, dan lihat status order secara real-time."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<section class="space-y-6">
  <!-- Desktop: 2-col hero + quick actions -->
  <div class="grid gap-4 lg:grid-cols-3">
    <!-- Saldo Hero -->
    <div class="lg:col-span-2">
      <SaldoHero balance={data.user?.balance ?? 0} ctaHref="/saldo/top-up" ctaLabel="Top Up" />
    </div>

    <!-- Quick Grid (desktop: vertical stack in 1 col) -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
      {#each quick as item}
        <a
          href={item.href}
          onclick={() => haptic(8)}
          class="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-3.5
            shadow-card transition-all duration-200 active:scale-[0.97] hover:shadow-card-hover hover:-translate-y-0.5"
        >
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-200
            group-hover:scale-110 {item.accent
              ? 'bg-primary/10 text-primary'
              : 'bg-ink-100 text-ink-600'}"
          >
            <Icon name={item.icon} size={20} />
          </span>
          <span class="text-sm font-semibold text-ink-700">{item.label}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- Recent orders -->
  <div>
    <div class="mb-3 flex items-center justify-between">
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
      <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center">
        <div
          class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400"
        >
          <Icon name="receipt" size={24} />
        </div>
        <p class="text-sm font-semibold text-ink-700">Belum ada pesanan</p>
        <p class="mt-1 text-xs text-ink-500">Buat pesanan pertama kamu sekarang.</p>
        <a
          href="/pesan"
          onclick={() => haptic(10)}
          class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white
            transition-all active:scale-95 hover:bg-primary-800 shadow-sm"
        >
          <Icon name="plus" size={16} stroke={2.5} />
          Pesan Sekarang
        </a>
      </div>
    {:else}
      <ul
        class="grid gap-3 overflow-hidden rounded-2xl border border-ink-100 bg-surface divide-y divide-ink-100 lg:grid-cols-2 lg:divide-y-0"
      >
        {#each data.recent as o (o.id)}
          <li>
            <a
              href="/pesanan"
              class="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50 active:bg-ink-100"
            >
              <div
                class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
              >
                <Icon name="receipt" size={18} />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{o.serviceName}</div>
                <div class="truncate text-xs text-ink-500">
                  {o.quantity.toLocaleString("id-ID")} qty · {formatRupiah(o.price)}
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
    <span class="mx-1">&middot;</span>
    <span>Sync tiap jam</span>
  </div>
</section>
