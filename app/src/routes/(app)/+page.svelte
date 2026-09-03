<script lang="ts">
  import {
    SaldoHero,
    StatusBadge,
    Chart,
    Icon,
    PromoBanner,
    revealDelay,
    EmptyOrdersArt,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { onMount } from "svelte";
  import { formatRupiah, serviceDisplayName } from "$lib/format";

  let { data } = $props();

  const firstName = $derived((data.user?.name ?? "Sobat").split(" ")[0]);

  // Time-aware greeting (WIB) — client clock → Asia/Jakarta.
  // Range: pagi 04-10, siang 11-14, sore 15-17, malam 18-03.
  type TimePhase = "dawn" | "day" | "dusk" | "night";
  const phaseMeta: Record<TimePhase, { greeting: string; emoji: string; ambient: string }> = {
    dawn: {
      greeting: copy.greeting.dawn,
      emoji: "🌅",
      ambient: "from-amber-200/40 via-orange-100/20 to-transparent",
    },
    day: {
      greeting: copy.greeting.day,
      emoji: "☀️",
      ambient: "from-sky-200/30 via-cyan-100/20 to-transparent",
    },
    dusk: {
      greeting: copy.greeting.dusk,
      emoji: "🌇",
      ambient: "from-violet-200/40 via-amber-100/25 to-transparent",
    },
    night: {
      greeting: copy.greeting.night,
      emoji: "🌙",
      ambient: "from-indigo-200/30 via-violet-100/15 to-transparent",
    },
  };
  function phaseOf(h: number): TimePhase {
    if (h >= 4 && h < 11) return "dawn";
    if (h >= 11 && h < 15) return "day";
    if (h >= 15 && h < 18) return "dusk";
    return "night";
  }
  function hourWIB(d = new Date()): number {
    // Cheap WIB (UTC+7) via Intl — true Jakarta wall-clock, not browser local
    try {
      const fmt = new Intl.DateTimeFormat("id-ID", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });
      return Number(fmt.format(d));
    } catch {
      return d.getHours();
    }
  }

  let phase = $state<TimePhase>("day");
  let greeting = $state("Halo");
  let greetEmoji = $state("👋");
  let ambient = $state(phaseMeta.day.ambient);

  onMount(() => {
    const h = hourWIB();
    const p = phaseOf(h);
    phase = p;
    greeting = phaseMeta[p].greeting;
    greetEmoji = phaseMeta[p].emoji;
    ambient = phaseMeta[p].ambient;
    // Keep phase fresh if user leaves tab open across the hour
    const id = setInterval(() => {
      const nh = hourWIB();
      const np = phaseOf(nh);
      if (np !== phase) {
        phase = np;
        greeting = phaseMeta[np].greeting;
        greetEmoji = phaseMeta[np].emoji;
        ambient = phaseMeta[np].ambient;
      }
    }, 60_000);
    return () => clearInterval(id);
  });

  // Copy profesional, tenang — satu template konsisten (bergantian tiap menit
  // bikin teks "berubah sendiri" yang membingungkan saat dibaca ulang).
  const subtitle = $derived.by(() => {
    if (data.activeOrders <= 0) return copy.dashboard.subtitleIdle;
    return copy.dashboard.subtitleActive(data.activeOrders);
  });

  // Quick actions — copy hangat + glow brand saat hover (layered dgn card-lift)
  const quick = [
    {
      href: "/pesan",
      label: "Pesan",
      desc: "Followers & likes, proses otomatis",
      icon: "rocket",
      chip: "from-primary-500 to-accent-500",
      glow: "group-hover:shadow-[0_4px_10px_-4px_rgb(15_23_42/0.06),0_16px_36px_-10px_rgba(79,70,229,0.32)]",
    },
    {
      href: "/layanan",
      label: "Katalog",
      desc: "6.000+ layanan, satu dashboard",
      icon: "grid",
      chip: "from-accent-400 to-accent-600",
      glow: "group-hover:shadow-[0_4px_10px_-4px_rgb(15_23_42/0.06),0_16px_36px_-10px_rgba(6,182,212,0.32)]",
    },
    {
      href: "/tiket",
      label: "Bantuan",
      desc: "Tiket dibalas < 5 menit",
      icon: "ticket",
      chip: "from-violet-500 to-primary-600",
      glow: "group-hover:shadow-[0_4px_10px_-4px_rgb(15_23_42/0.06),0_16px_36px_-10px_rgba(124,58,237,0.30)]",
    },
    {
      href: "/affiliate",
      label: "Affiliate",
      desc: "Ajak teman, dapat komisi",
      icon: "gift",
      chip: "from-emerald-400 to-emerald-600",
      glow: "group-hover:shadow-[0_4px_10px_-4px_rgb(15_23_42/0.06),0_16px_36px_-10px_rgba(16,163,74,0.28)]",
    },
  ];

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    const days = Math.floor(diff / 86400);
    if (days < 7) return `${days} hari lalu`;
    if (days < 30) return `${days} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
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

<section class="space-y-5 lg:space-y-6 relative">
  <!-- Ambient time-wash — compact on desktop -->
  <div
    aria-hidden="true"
    class="pointer-events-none absolute -inset-x-4 -top-4 h-[140px] lg:h-[160px] -z-10 overflow-hidden rounded-b-[20px] opacity-60 lg:-inset-x-8"
    style="contain: paint;"
  >
    <div class="absolute inset-0 bg-gradient-to-b {ambient} blur-[18px]"></div>
    <div
      class="absolute inset-0 opacity-[0.04] [background:radial-gradient(circle_at_30%_20%,white,transparent_40%),radial-gradient(circle_at_80%_10%,white,transparent_35%)]"
    ></div>
  </div>

  <!-- Greeting — time-aware (WIB) + dismiss excess motion -->
  <header
    class="reveal flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
  >
    <div class="min-w-0">
      <h1
        class="font-display text-xl font-extrabold tracking-tight lg:text-[1.85rem] lg:leading-none lg:tracking-[-0.015em]"
      >
        {greeting}, {firstName}
        <span class="inline-block motion-safe:animate-[wave_2s_ease-in-out_1]">{greetEmoji}</span>
      </h1>
      <p
        class="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm lg:mt-2 lg:text-[14px] text-ink-500"
      >
        {#if data.activeOrders > 0}
          <span class="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50"
            ></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-xs font-bold text-primary"
            >Aktif</span
          >
        {:else}
          <span
            class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700"
            >Siap</span
          >
        {/if}
        <span class="truncate">{subtitle}</span>
      </p>
    </div>
    <a
      href="/akun"
      class="group flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 to-accent-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(79,70,229,0.7)] transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-8px_rgba(79,70,229,0.6)] motion-safe:animate-[pop_480ms_cubic-bezier(0.16,1,0.3,1)] lg:px-4 lg:py-2 lg:gap-2 lg:text-[13px]"
    >
      <Icon
        name="sparkles"
        size={13}
        stroke={2.25}
        class="transition-transform group-hover:rotate-12"
      />
      {data.user?.level ?? "Member"}
    </a>
  </header>

  <!-- Banner promo (admin-managed, fallback dummy) -->
  {#if data.banners?.length}
    <PromoBanner banners={data.banners} />
  {/if}

  <!-- Hero saldo + quick actions — desktop compact (hero dominant) -->
  <div class="grid gap-3 lg:gap-4 lg:grid-cols-12 lg:items-stretch">
    <div class="lg:col-span-8">
      <SaldoHero
        balance={data.user?.balance ?? 0}
        ctaHref="/saldo/top-up"
        ctaLabel="Top Up"
        trend={data.chart.deposits}
        insight={{
          spend7: data.chart.spend.reduce((a: number, b: number) => a + b, 0),
          deposit7: data.chart.deposits.reduce((a: number, b: number) => a + b, 0),
        }}
      />
    </div>

    <div
      class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 lg:col-span-4 lg:gap-3 lg:self-stretch content-start"
    >
      {#each quick as item, i (item.href)}
        <a
          href={item.href}
          onclick={() => haptic(8)}
          style={revealDelay(i, 0, 60)}
          class="card-lift group flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-3.5
            lg:gap-2.5 lg:py-3 lg:px-3.5 {item.glow}"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br {item.chip}
              text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
          >
            <Icon name={item.icon} size={20} stroke={2} />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-bold text-ink-800 lg:text-[14px]">{item.label}</span>
            <!-- Desktop: deskripsi lengkap -->
            <span class="hidden truncate text-xs text-ink-500 lg:block lg:text-[11.5px]"
              >{item.desc}</span
            >
          </span>
        </a>
      {/each}
    </div>
  </div>

  <!-- Pesan Cepat — repeat flow: layanan yang paling sering di-order, 1 tap langsung ke form -->
  {#if data.quickOrders?.length}
    <div class="reveal" style={revealDelay(0, 80)}>
      <div class="mb-2.5 flex items-center justify-between">
        <h2 class="flex items-center gap-1.5 font-display text-base font-bold tracking-tight">
          <span
            class="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 text-white"
          >
            <Icon name="zap" size={13} stroke={2.25} />
          </span>
          Pesan Cepat
        </h2>
        <span class="hidden text-xs text-ink-500 lg:inline"
          >Sekali sentuh, link terisi otomatis</span
        >
      </div>

      <div
        class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 -mx-4 px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 lg:scroll-px-0"
      >
        {#each data.quickOrders as q, i (q.serviceId)}
          <a
            href="/pesan?service={q.serviceId}{q.lastLink
              ? `&link=${encodeURIComponent(q.lastLink)}`
              : ''}"
            onclick={() => haptic(10)}
            style={revealDelay(i, 0, 50)}
            class="card-lift group relative flex min-h-[64px] w-[78%] max-w-[320px] min-w-[240px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-4
              lg:w-auto lg:min-w-0 lg:max-w-none lg:p-3.5 lg:gap-2.5"
          >
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
            >
              <Icon name="rocket" size={18} stroke={2} />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold leading-tight text-ink-800"
                >{serviceDisplayName(q.serviceName)}</span
              >
              <span
                class="mt-0.5 flex items-center gap-1 truncate text-[11px] leading-snug text-ink-500"
              >
                <span class="rounded-full bg-ink-100 px-1.5 py-0.5 font-bold text-ink-600"
                  >{q.times > 1 ? `${q.times}×` : "Baru"}</span
                >
                <span>sentuh untuk pesan lagi</span>
              </span>
            </span>
            <span
              class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white"
            >
              <Icon name="chevron_right" size={14} stroke={2.5} />
            </span>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- INLINE-STAT: premium — mobile stacked, desktop inline pills -->
  <div
    class="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:gap-3 {(data.stats.totalDeposit ?? 0) >=
    5_000_000
      ? 'rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/40 to-white p-3 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.35)]'
      : 'gap-3'}"
  >
    {#if (data.stats.totalDeposit ?? 0) >= 5_000_000}
      <div
        class="col-span-full flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 px-3 py-2 text-white shadow-sm"
      >
        <span class="flex items-center gap-1.5 text-xs font-bold tracking-wide">
          <span class="grid h-6 w-6 place-items-center rounded-full bg-white/20 backdrop-blur">
            <Icon name="star" size={12} stroke={2.5} />
          </span>
          VIP — Deposit di atas 5 juta
        </span>
        <span class="text-[11px] font-semibold opacity-90"
          >Terima kasih sudah percaya — Sahabat Socio!</span
        >
      </div>
    {/if}
    <div
      class="surface-pop flex items-center justify-between rounded-2xl border border-ink-100 bg-surface px-4 py-3 lg:px-5 lg:py-4 {(data
        .stats.totalDeposit ?? 0) >= 5_000_000
        ? 'ring-1 ring-amber-200/50'
        : ''}"
    >
      <span
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-500"
      >
        <span class="grid h-6 w-6 place-items-center rounded-lg bg-ink-50 text-ink-600">
          <Icon name="receipt" size={12} stroke={2} />
        </span>
        Pesanan
      </span>
      <span
        class="flex items-center gap-1.5 font-display text-sm font-bold tabular-nums text-ink-900 lg:text-base"
      >
        {data.stats.totalOrders.toLocaleString("id-ID")}
        {#if data.stats.deltaOrders !== undefined && data.stats.deltaOrders !== 0}
          <span
            class="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums {data.stats
              .deltaOrders >= 0
              ? 'bg-success/10 text-success'
              : 'bg-danger/10 text-danger'}"
            >{data.stats.deltaOrders >= 0 ? "+" : ""}{data.stats.deltaOrders.toFixed(1)}%</span
          >
        {/if}
      </span>
    </div>
    <div
      class="surface-pop relative flex items-center justify-between rounded-2xl border bg-surface px-4 py-3 lg:px-5 lg:py-4 {(data
        .stats.totalDeposit ?? 0) >= 5_000_000
        ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/50'
        : 'border-ink-100'}"
    >
      <span
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide {(data.stats
          .totalDeposit ?? 0) >= 5_000_000
          ? 'text-amber-600'
          : 'text-ink-500'}"
      >
        <span
          class="grid h-6 w-6 place-items-center rounded-lg {(data.stats.totalDeposit ?? 0) >=
          5_000_000
            ? 'bg-amber-100 text-amber-600'
            : 'bg-ink-50 text-ink-600'}"
        >
          <Icon name="wallet" size={12} stroke={2} />
        </span>
        Deposit
      </span>
      <span
        class="flex items-center gap-1.5 font-display text-sm font-bold tabular-nums lg:text-base {(data
          .stats.totalDeposit ?? 0) >= 5_000_000
          ? 'text-amber-700'
          : 'text-ink-900'}"
      >
        {#if (data.stats.totalDeposit ?? 0) >= 5_000_000}
          <!-- star dekoratif — konteks "VIP" dijelaskan value deposit + judul kartu -->
          <span
            class="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-white shadow-sm"
            ><Icon name="star" size={10} stroke={2.5} /></span
          >
        {/if}
        {formatRupiah(data.stats.totalDeposit)}
      </span>
    </div>
    <div
      class="surface-pop flex items-center justify-between rounded-2xl border border-ink-100 bg-surface px-4 py-3 lg:px-5 lg:py-4"
    >
      <span
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-500"
      >
        <span class="grid h-6 w-6 place-items-center rounded-lg bg-ink-50 text-ink-600">
          <Icon name="banknote" size={12} stroke={2} />
        </span>
        Belanja
      </span>
      <span class="font-display text-sm font-bold tabular-nums text-ink-900 lg:text-base"
        >{formatRupiah(data.stats.totalSpent)}</span
      >
    </div>
  </div>

  <!-- Desktop: chart + pesanan — balanced 7/5 but compact gaps -->
  <div class="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
    <!-- Grafik aktivitas 7 hari -->
    <div class="lg:col-span-7">
      <div class="card-lift rounded-card border border-ink-100 bg-surface p-4 lg:p-6">
        <div class="mb-3 flex items-center justify-between lg:mb-4">
          <div>
            <h2
              class="flex items-center gap-1.5 font-display text-base font-bold tracking-tight lg:text-[17px]"
            >
              <span
                class="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white"
              >
                <Icon name="activity" size={13} stroke={2.25} />
              </span>
              Aktivitas 7 Hari
            </h2>
            <p class="hidden text-xs text-ink-500 lg:block lg:text-[13px]">
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
            height={220}
          />
        {:else if data.stats.totalOrders > 0}
          <div
            class="mx-auto flex w-full max-w-[260px] flex-col items-center gap-1.5 py-4 px-2 text-center sm:max-w-none sm:gap-2 sm:py-10 sm:px-4"
          >
            <div
              class="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm sm:h-12 sm:w-12"
            >
              <Icon name="clock" size={18} stroke={2} class="sm:hidden" />
              <Icon name="clock" size={22} stroke={2} class="hidden sm:inline-block" />
            </div>
            <p class="text-sm font-bold text-ink-700 [text-wrap:balance]">
              Minggu ini belum ada aktivitas
            </p>
            <p class="text-xs text-ink-500 [text-wrap:balance]">
              Total {data.stats.totalOrders.toLocaleString("id-ID")} pesanan kamu aman — mari lanjut:
              Pesan Cepat di atas pakai link terakhirmu.
            </p>
            <a
              href={data.quickOrders?.[0]
                ? `/pesan?service=${data.quickOrders[0].serviceId}${data.quickOrders[0].lastLink ? `&link=${encodeURIComponent(data.quickOrders[0].lastLink)}` : ""}`
                : "/pesan"}
              onclick={() => haptic(10)}
              class="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:opacity-95 sm:mt-2"
            >
              <Icon name="refresh" size={14} stroke={2.5} />
              Pesan lagi
            </a>
          </div>
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
            <p class="text-xs text-ink-500 [text-wrap:balance]">
              Grafik langsung hidup setelah pesanan pertamamu.
            </p>
            <a
              href="/pesan"
              onclick={() => haptic(10)}
              class="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:opacity-95 sm:mt-2"
            >
              <Icon name="plus" size={14} stroke={2.5} />
              <span class="sm:hidden">Mulai Sekarang</span>
              <span class="hidden sm:inline">Mulai Sekarang</span>
            </a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Pesanan terbaru -->
    <div class="lg:col-span-5 lg:sticky lg:top-20 self-start">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-display text-base font-bold tracking-tight lg:text-[17px]">
          Pesanan Terbaru
        </h2>
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
          class="relative overflow-hidden rounded-card border border-dashed border-ink-200 bg-surface p-8 text-center lg:p-10"
        >
          <div
            class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
          ></div>
          <EmptyOrdersArt size={112} class="relative mx-auto mb-3 text-ink-300" />
          <p class="relative text-sm font-bold text-ink-800">Pesanan pertama menunggu</p>
          <p class="relative mt-1 text-xs text-ink-500">
            <span class="lg:hidden">Pilih layanan favorit — proses otomatis.</span>
            <span class="hidden lg:inline"
              >Pilih layanan favoritmu, sistem kami proses otomatis.</span
            >
          </p>
          <a
            href="/pesan"
            onclick={() => haptic(14)}
            class="ctoa-premium relative mt-4 inline-flex items-center gap-2 overflow-hidden rounded-full
              bg-gradient-to-br from-primary-500 via-primary to-primary-700 px-5 py-2.5
              text-sm font-bold text-white
              shadow-[0_10px_24px_-8px_rgba(79,70,229,0.55),0_3px_10px_-4px_rgba(79,70,229,0.3)]
              transition-all duration-200 active:scale-[0.97]
              focus-ring-on-accent"
          >
            <span class="ctoa-shimmer pointer-events-none absolute inset-0" aria-hidden="true"
            ></span>
            <Icon name="rocket" size={16} stroke={2.4} class="ctoa-icon relative" />
            <span class="lg:hidden relative">{copy.order.cta}</span>
            <span class="hidden lg:inline relative">Buat Pesanan Pertama</span>
          </a>
        </div>
      {:else}
        <ul
          class="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card divide-y divide-ink-100 lg:rounded-2xl"
        >
          {#each data.recent as o, i (o.id)}
            {@const p = (() => {
              const n = (o.serviceName || "").toLowerCase();
              if (n.includes("instagram") || n.includes("ig ") || n.includes(" ig "))
                return { icon: "instagram", grad: "from-pink-500 to-fuchsia-600" };
              if (n.includes("tiktok") || n.includes("tik tok"))
                return { icon: "music", grad: "from-slate-800 to-slate-950" };
              if (n.includes("youtube") || n.includes("yt "))
                return { icon: "youtube", grad: "from-red-500 to-red-600" };
              if (n.includes("facebook") || n.includes(" fb"))
                return { icon: "facebook", grad: "from-blue-500 to-blue-700" };
              if (n.includes("twitter") || n.includes("bluesky") || n.includes(" x "))
                return { icon: "twitter", grad: "from-sky-400 to-sky-600" };
              if (n.includes("telegram"))
                return { icon: "telegram", grad: "from-sky-500 to-blue-600" };
              if (n.includes("whatsapp"))
                return { icon: "whatsapp", grad: "from-emerald-500 to-green-600" };
              return { icon: "receipt", grad: "from-primary-500/15 to-accent-500/15" };
            })()}
            <li class="reveal" style={revealDelay(i, 0, 50)}>
              <a
                href="/pesanan"
                title={serviceDisplayName(o.serviceName)}
                class="group flex min-w-0 items-center gap-2.5 px-2.5 py-2.5 transition-colors hover:bg-ink-50 active:bg-ink-100 sm:gap-3 sm:px-4 sm:py-3.5 lg:gap-3 lg:px-4 lg:py-3.5"
              >
                <div
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br {p.grad} text-white transition-transform duration-200 group-hover:scale-110 sm:h-10 sm:w-10"
                >
                  <Icon name={p.icon} size={18} />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold lg:text-[14px]">
                    {serviceDisplayName(o.serviceName)}
                  </div>
                  <div class="truncate text-xs text-ink-500 lg:text-[12.5px]">
                    {o.quantity.toLocaleString("id-ID")} qty · {formatRupiah(o.price)}
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <StatusBadge status={o.status} />
                  <span class="text-[10px] text-ink-500">{timeAgo(o.createdAt)}</span>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <!-- Trust line -->
  <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-xs text-ink-500">
    <span class="inline-flex items-center gap-1">
      <Icon name="shield" size={14} class="text-success" />
      Layanan aktif
    </span>
    <span class="text-ink-300">•</span>
    <span class="inline-flex items-center gap-1">
      <Icon name="zap" size={14} class="text-accent-700" /> Proses otomatis
    </span>
    <span class="text-ink-300">•</span>
    <span class="inline-flex items-center gap-1">
      <Icon name="refresh" size={13} class="text-primary" /> Sinkron otomatis
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

  /* ───── Dashboard CTA premium (shimmer + hover lift + rocket tilt) ───── */
  .ctoa-premium {
    isolation: isolate;
    will-change: transform, box-shadow;
  }
  .ctoa-premium:hover {
    transform: translateY(-1px);
    box-shadow:
      0 16px 32px -10px rgba(79, 70, 229, 0.6),
      0 4px 14px -4px rgba(79, 70, 229, 0.4);
  }
  .ctoa-premium:hover .ctoa-icon {
    transform: rotate(-12deg) scale(1.12);
  }
  .ctoa-icon {
    transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  /* Diagonal shine sweep */
  .ctoa-shimmer::before {
    content: "";
    position: absolute;
    top: 0;
    left: -120%;
    height: 100%;
    width: 55%;
    background: linear-gradient(
      100deg,
      transparent 0%,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.55) 50%,
      rgba(255, 255, 255, 0) 70%,
      transparent 100%
    );
    transform: skewX(-22deg);
    animation: ctoa-shimmer 3.4s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes ctoa-shimmer {
    0% {
      left: -120%;
    }
    60%,
    100% {
      left: 130%;
    }
  }
  /* Inset glass highlight (top edge) */
  .ctoa-premium::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 45%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      inset 0 -1px 0 rgba(0, 0, 0, 0.12);
  }
  @keyframes ambientDrift {
    0%,
    100% {
      transform: translateY(0) scale(1);
      opacity: 0.85;
    }
    50% {
      transform: translateY(-6px) scale(1.02);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ctoa-premium,
    .ctoa-icon,
    .ctoa-shimmer::before {
      animation: none !important;
      transition-duration: 120ms !important;
    }
    .ctoa-shimmer::before {
      display: none;
    }
    [style*="ambientDrift"] {
      animation: none !important;
    }
  }
</style>
