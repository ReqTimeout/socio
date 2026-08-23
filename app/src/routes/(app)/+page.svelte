<script lang="ts">
  import { SaldoHero, StatusBadge, Chart, Icon, PromoBanner, staggerIn } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";
  import { formatRupiah } from "$lib/format";

  let { data } = $props();

  const firstName = $derived((data.user?.name ?? "Kawan").split(" ")[0]);

  // Sapaan berdasarkan waktu — di-set di client supaya tidak bentrok hydration
  // (zona waktu server vs browser bisa beda).
  let greeting = $state("Halo");
  let greetEmoji = $state("👋");
  onMount(() => {
    const h = new Date().getHours();
    greeting =
      h < 11
        ? "Selamat pagi"
        : h < 15
          ? "Selamat siang"
          : h < 18
            ? "Selamat sore"
            : "Selamat malam";
    greetEmoji = h < 11 ? "☀️" : h < 18 ? "🌤️" : "🌙";
  });

  // Sub-teks dinamis: kalau ada order berjalan, tampilkan status live.
  const subtitle = $derived(
    data.activeOrders > 0
      ? `${data.activeOrders} pesanan lagi diproses — kami pantau sampai kelar.`
      : "Sosmed nggak naik sendiri. Yuk gas hari ini 🚀",
  );

  // Quick actions — chip gradient + glow, copy pendek (mobile) / lengkap (desktop)
  const quick = [
    {
      href: "/pesan",
      label: "Pesan",
      desc: "Gaskan followers & like",
      icon: "rocket",
      chip: "from-primary-500 to-accent-500",
      glow: "group-hover:shadow-[0_12px_28px_-10px_rgba(79,70,229,0.6)]",
    },
    {
      href: "/layanan",
      label: "Layanan",
      desc: "Ribuan layanan siap pakai",
      icon: "grid",
      chip: "from-accent-400 to-accent-600",
      glow: "group-hover:shadow-[0_12px_28px_-10px_rgba(6,182,212,0.6)]",
    },
    {
      href: "/tiket",
      label: "Bantuan",
      desc: "Admin siaga 24 jam",
      icon: "ticket",
      chip: "from-violet-500 to-primary-600",
      glow: "group-hover:shadow-[0_12px_28px_-10px_rgba(124,58,237,0.55)]",
    },
    {
      href: "/affiliate",
      label: "Affiliate",
      desc: "Ajak teman, cuan komisi",
      icon: "gift",
      chip: "from-emerald-400 to-emerald-600",
      glow: "group-hover:shadow-[0_12px_28px_-10px_rgba(16,163,74,0.5)]",
    },
  ];

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
  }

  const hasActivity = $derived(
    data.chart.orders.some((v: number) => v > 0) || data.chart.deposits.some((v: number) => v > 0),
  );
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

<section class="space-y-5 lg:space-y-6">
  <!-- Greeting -->
  <header in:fly={{ y: -8, duration: 300 }} class="flex items-center justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-xl font-extrabold tracking-tight lg:text-2xl">
        {greeting}, {firstName}
        <span class="inline-block motion-safe:animate-[wave_2s_ease-in-out_1]">{greetEmoji}</span>
      </h1>
      <p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
        {#if data.activeOrders > 0}
          <span class="relative flex h-2 w-2 shrink-0">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60"
            ></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
        {/if}
        <span class="truncate">{subtitle}</span>
      </p>
    </div>
    <span
      class="hidden shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 to-accent-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(79,70,229,0.7)] sm:inline-flex"
    >
      <Icon name="star" size={13} stroke={2.25} />
      {data.user?.level ?? "Member"}
    </span>
  </header>

  <!-- Banner promo (admin-managed, fallback dummy) -->
  {#if data.banners?.length}
    <PromoBanner banners={data.banners} />
  {/if}

  <!-- Hero saldo + quick actions -->
  <div class="grid gap-4 lg:grid-cols-3">
    <div class="lg:col-span-2">
      <SaldoHero
        balance={data.user?.balance ?? 0}
        ctaHref="/saldo/top-up"
        ctaLabel="Top Up"
        trend={data.chart.deposits}
      />
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
      {#each quick as item, i (item.href)}
        <a
          href={item.href}
          onclick={() => haptic(8)}
          in:fly={staggerIn(i, { y: 12, duration: 300, step: 60 })}
          class="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-3.5
            shadow-card transition-all duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:border-ink-200 {item.glow}"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br {item.chip}
              text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
          >
            <Icon name={item.icon} size={20} stroke={2} />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-bold text-ink-800">{item.label}</span>
            <!-- Desktop: deskripsi lengkap -->
            <span class="hidden truncate text-xs text-ink-400 lg:block">{item.desc}</span>
          </span>
        </a>
      {/each}
    </div>
  </div>

  <!-- Pesan Cepat — repeat flow: layanan yang paling sering di-order, 1 tap langsung ke form -->
  {#if data.quickOrders?.length}
    <div in:fly={{ y: 10, duration: 300, delay: 80 }}>
      <div class="mb-2.5 flex items-center justify-between">
        <h2 class="flex items-center gap-1.5 font-display text-base font-bold tracking-tight">
          <span
            class="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 text-white"
          >
            <Icon name="zap" size={13} stroke={2.25} />
          </span>
          Pesan Cepat
        </h2>
        <span class="text-xs text-ink-400">Layanan langgananmu</span>
      </div>

      <div
        class="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
      >
        {#each data.quickOrders as q, i (q.serviceId)}
          <a
            href="/pesan?service={q.serviceId}{q.lastLink
              ? `&link=${encodeURIComponent(q.lastLink)}`
              : ''}"
            onclick={() => haptic(10)}
            in:fly={staggerIn(i, { y: 10, duration: 250, step: 50 })}
            class="group relative flex min-h-[56px] min-w-[230px] shrink-0 items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-3.5 shadow-card
              transition-all duration-200 active:scale-[0.97] hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-[0_10px_24px_-12px_rgba(79,70,229,0.45)] lg:min-h-0 lg:min-w-0"
          >
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
            >
              <Icon name="rocket" size={18} stroke={2} />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold text-ink-800">{q.serviceName}</span>
              <span class="block truncate text-xs text-ink-400">
                {q.times > 1 ? `${q.times}× dipesan` : "Baru dipesan"} · tap untuk pesan lagi
              </span>
            </span>
            <span
              class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white"
            >
              <Icon name="chevron_right" size={14} stroke={2.5} />
            </span>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- INLINE-STAT: ringkasan akun — label-value pairs, vertical dividers on sm+ -->
  <div
    class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-ink-100 bg-surface px-5 py-4"
  >
    <div class="flex items-baseline gap-2">
      <span class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Pesanan</span>
      <span class="font-display text-base font-bold tabular-nums text-ink-900"
        >{data.stats.totalOrders.toLocaleString("id-ID")}</span
      >
      {#if data.stats.deltaOrders !== undefined}
        <span
          class="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums {data.stats
            .deltaOrders >= 0
            ? 'bg-success/10 text-success'
            : 'bg-danger/10 text-danger'}"
          >{data.stats.deltaOrders >= 0 ? "+" : ""}{data.stats.deltaOrders.toFixed(1)}%</span
        >
      {/if}
    </div>
    <span class="hidden h-5 w-px bg-ink-200 sm:inline-block" aria-hidden="true"></span>
    <div class="flex items-baseline gap-2">
      <span class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Deposit</span>
      <span class="font-display text-base font-bold tabular-nums text-ink-900"
        >{formatRupiah(data.stats.totalDeposit)}</span
      >
    </div>
    <span class="hidden h-5 w-px bg-ink-200 sm:inline-block" aria-hidden="true"></span>
    <div class="flex items-baseline gap-2">
      <span class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Belanja</span>
      <span class="font-display text-base font-bold tabular-nums text-ink-900"
        >{formatRupiah(data.stats.totalSpent)}</span
      >
    </div>
  </div>

  <!-- Desktop: 2 kolom — chart + pesanan terbaru. Mobile: bertumpuk (grid-cols-1 eksplisit
       supaya track minmax(0,1fr) — tanpa ini nama layanan panjang mengembang implicit column → horizontal overflow) -->
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
    <!-- Grafik aktivitas 7 hari -->
    <div class="lg:col-span-3">
      <div class="rounded-card border border-ink-100 bg-surface p-4 shadow-card lg:p-5">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="flex items-center gap-1.5 font-display text-base font-bold tracking-tight">
              <span
                class="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white"
              >
                <Icon name="activity" size={13} stroke={2.25} />
              </span>
              Aktivitas 7 Hari
            </h2>
            <p class="hidden text-xs text-ink-400 lg:block">
              Ringkasan pesanan dan deposit kamu seminggu terakhir
            </p>
          </div>
          <a
            href="/pesanan"
            class="flex items-center gap-0.5 text-xs font-bold text-primary hover:text-primary-800"
          >
            Detail
            <Icon name="chevron_right" size={14} />
          </a>
        </div>
        {#if hasActivity}
          <Chart
            series={[
              { label: "Pesanan", data: data.chart.orders },
              { label: "Deposit", data: data.chart.deposits },
            ]}
            labels={data.chart.labels}
            height={190}
          />
        {:else}
          <div
            class="mx-auto flex w-full max-w-[260px] flex-col items-center gap-1.5 py-4 px-2 text-center sm:max-w-none sm:gap-2 sm:py-10 sm:px-4"
          >
            <div
              class="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm sm:h-12 sm:w-12"
            >
              <Icon name="rocket" size={18} stroke={2} class="sm:hidden" />
              <Icon name="rocket" size={22} stroke={2} class="hidden sm:inline-block" />
            </div>
            <p class="text-sm font-bold text-ink-700 [text-wrap:balance]">
              Belum ada aktivitas minggu ini
            </p>
            <p class="text-xs text-ink-400 [text-wrap:balance]">
              Grafik langsung hidup setelah pesanan pertamamu.
            </p>
            <a
              href="/pesan"
              onclick={() => haptic(10)}
              class="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:opacity-95 sm:mt-2"
            >
              <Icon name="plus" size={14} stroke={2.5} />
              <span class="sm:hidden">Mulai</span>
              <span class="hidden sm:inline">Mulai Sekarang</span>
            </a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Pesanan terbaru -->
    <div class="lg:col-span-2">
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
        <div
          class="relative overflow-hidden rounded-card border border-dashed border-ink-200 bg-surface p-8 text-center"
        >
          <div
            class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
          ></div>
          <div
            class="relative mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm"
          >
            <Icon name="sparkles" size={26} stroke={2} />
          </div>
          <p class="relative text-sm font-bold text-ink-800">Mulai perjalananmu 🚀</p>
          <p class="relative mt-1 text-xs text-ink-500">
            <span class="lg:hidden">Buat pesanan pertamamu sekarang.</span>
            <span class="hidden lg:inline">Pilih layanan favoritmu dan mulai pesan.</span>
          </p>
          <a
            href="/pesan"
            onclick={() => haptic(10)}
            class="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2.5 text-sm font-bold text-white
              shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)] transition-all active:scale-95 hover:opacity-95"
          >
            <Icon name="plus" size={16} stroke={2.5} />
            <span class="lg:hidden">Pesan Sekarang</span>
            <span class="hidden lg:inline">Buat Pesanan Pertama</span>
          </a>
        </div>
      {:else}
        <ul
          class="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card divide-y divide-ink-100"
        >
          {#each data.recent as o, i (o.id)}
            <li in:fly={{ y: 10, duration: 250, delay: 50 * i }}>
              <a
                href="/pesanan"
                title={o.serviceName}
                class="group flex items-center gap-2.5 px-2.5 py-2.5 transition-colors hover:bg-ink-50 active:bg-ink-100 sm:gap-3 sm:px-4 sm:py-3.5"
              >
                >
                <div
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500/15 to-accent-500/15 text-primary transition-transform duration-200 group-hover:scale-110 sm:h-10 sm:w-10"
                >
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
  </div>

  <!-- Trust line -->
  <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-xs text-ink-400">
    <span class="inline-flex items-center gap-1">
      <Icon name="shield" size={14} class="text-success" />
      Layanan aktif
    </span>
    <span class="text-ink-300">•</span>
    <span class="inline-flex items-center gap-1">
      <Icon name="zap" size={14} class="text-accent-500" /> Proses otomatis
    </span>
    <span class="text-ink-300">•</span>
    <span class="inline-flex items-center gap-1">
      <Icon name="refresh" size={13} class="text-primary" /> Sync tiap jam
    </span>
  </div>
</section>

<style>
  @keyframes wave {
    0%,
    100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(18deg);
    }
    50% {
      transform: rotate(-8deg);
    }
    75% {
      transform: rotate(14deg);
    }
  }
</style>
