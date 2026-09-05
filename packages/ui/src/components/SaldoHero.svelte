<script lang="ts">
  import { haptic } from "../haptic.js";
  import NumberFlow from "./NumberFlow.svelte";
  import Icon from "./Icon.svelte";
  import Sparkline from "./Sparkline.svelte";

  let {
    balance = 0,
    label = "Saldo Anda",
    ctaLabel = "Top Up",
    ctaHref = "/saldo/top-up",
    historyHref = "/saldo/riwayat",
    trend,
    insight,
  }: {
    balance?: number;
    label?: string;
    ctaLabel?: string;
    ctaHref?: string;
    historyHref?: string;
    /** tren mini (mis. deposit 7 hari) — sparkline dekoratif di kartu */
    trend?: number[];
    insight?: { spend7: number; deposit7: number } | null;
  } = $props();

  const fmt = (n: number) => "Rp" + n.toLocaleString("id-ID");

  // UX2: insight collapsible di mobile, always expanded di desktop (lg+).
  // Default mobile closed — supaya tidak dorong saldo keluar fold pertama.
  let insightOpen = $state(false);
  const hasInsight = $derived(
    insight != null && (insight.deposit7 > 0 || insight.spend7 > 0),
  );
</script>

<section
  class="saldo-hero group relative overflow-hidden rounded-2xl bg-emerald-gradient text-white px-5 py-3 lg:px-6 lg:py-6 safe-top"
>
  <!-- static emerald — no animation (requested) -->
  <div class="saldo-grad pointer-events-none absolute inset-0" aria-hidden="true"></div>
  <div class="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/12 blur-2xl"></div>
  <div class="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-emerald-300/18 blur-3xl"></div>
  <svg class="absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
    <defs>
      <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
  </svg>

  <!-- trend sparkline dekoratif (bawah kanan) -->
  {#if trend && trend.length > 1}
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-30">
      <Sparkline data={trend} color="#ffffff" height={64} strokeWidth={2} fill={false} />
    </div>
  {/if}

  <div class="relative">
    <div class="flex items-center justify-between">
      <p class="flex items-center gap-1.5 text-sm font-medium text-white/80">
        <span class="grid h-6 w-6 place-items-center rounded-lg bg-white/18 backdrop-blur-sm ring-1 ring-white/20">
          <Icon name="wallet" size={14} stroke={2} />
        </span>
        {label}
      </p>
      <a href={historyHref} class="text-white/60 hover:text-white transition" aria-label="Riwayat">
        <Icon name="list" size={18} />
      </a>
    </div>

    <p class="font-display font-extrabold text-[2rem] lg:text-[2.45rem] leading-tight tabular-nums tracking-tight mt-2 drop-shadow-[0_1px_0_rgba(0,0,0,0.12)]">
      <NumberFlow value={balance} format={fmt} duration={0.9} />
    </p>
    {#if hasInsight}
      <!-- Mobile (lg:hidden): chevron toggle — compact by default, expand on tap.
           Desktop (lg:block): always visible inline. -->
      <button
        type="button"
        onclick={() => {
          insightOpen = !insightOpen;
          haptic(insightOpen ? 8 : 6);
        }}
        aria-expanded={insightOpen}
        aria-controls="saldo-insight-detail"
        class="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur
          transition-colors hover:bg-white/18 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Icon name="activity" size={12} />
        7 hari: {fmt((insight?.deposit7 ?? 0) - (insight?.spend7 ?? 0))}
        <Icon
          name="chevron_down"
          size={12}
          stroke={2.5}
          class="transition-transform duration-240 {insightOpen ? 'rotate-180' : 'rotate-0'}"
        />
      </button>
      <div
        id="saldo-insight-detail"
        aria-hidden={!insightOpen}
        class="grid lg:!grid-rows-[1fr] transition-[grid-template-rows] duration-240 ease-out lg:!opacity-100
          {insightOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} lg:opacity-100"
      >
        <div class="overflow-hidden">
          <p class="mt-1 text-[11px] font-medium text-white/70 lg:hidden">
            Pengeluaran 7 hari: {fmt(insight?.spend7 ?? 0)} · Top up {fmt(insight?.deposit7 ?? 0)}
          </p>
        </div>
      </div>
      <!-- Desktop: inline narrative chip, no chevron -->
      <p
        class="mt-1 hidden lg:inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur"
      >
        <Icon name="activity" size={12} />
        7 hari: masuk {fmt(insight?.deposit7 ?? 0)} · keluar {fmt(insight?.spend7 ?? 0)}
      </p>
    {:else}
      <p class="mt-1 text-[11px] font-medium text-white/60">
        Mutasi 7 hari terakhir ada di <span class="font-semibold text-white/85">Riwayat</span>
      </p>
    {/if}

    <div class="mt-4 flex items-center gap-2">
      <a
        href={ctaHref}
        onclick={() => haptic(10)}
        class="inline-flex items-center gap-1.5 rounded-full bg-white text-emerald-700 font-bold px-5 py-2.5 text-sm
          transition-all duration-150 active:scale-95 hover:bg-white/95 focus-ring-on-accent
          shadow-[0_6px_18px_-4px_rgba(0,0,0,0.25)]"
      >
        <Icon name="plus" size={16} stroke={2.5} />
        {ctaLabel}
      </a>
      <a
        href={historyHref}
        onclick={() => haptic(8)}
        class="inline-flex items-center gap-1.5 rounded-full bg-white/16 backdrop-blur-sm text-white font-semibold px-4 py-2.5 text-sm
          ring-1 ring-white/15 transition-all duration-150 active:scale-95 hover:bg-white/25"
      >
        <Icon name="clock" size={15} stroke={2} />
        Riwayat
      </a>
    </div>
  </div>
</section>

<style>
  /* Emerald "money" — static premium, no drift (requested) */
  .saldo-hero {
    box-shadow:
      0 18px 48px -14px rgba(16, 122, 78, 0.42),
      0 6px 16px -4px rgba(16, 122, 78, 0.18);
  }
  .saldo-grad {
    background: linear-gradient(110deg, #0f7a4e 0%, #16a34a 35%, #10b981 55%, #059669 75%, #047857 100%);
  }
  @keyframes emeraldDrift {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  .shimmer {
    display: none;
  }
  @keyframes sweep {
    0%   { background-position: 140% 0; }
    55%  { background-position: -140% 0; }
    100% { background-position: -140% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    /* keep alive but softer when user prefers reduced motion */
    .saldo-grad { animation-duration: 14s; opacity: 0.9; }
    .shimmer { animation-duration: 7s; opacity: 0.7; }
  }
</style>
