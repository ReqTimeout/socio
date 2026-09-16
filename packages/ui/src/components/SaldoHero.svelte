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

  // Sparkle burst saat saldo NAIK (APP V3 S2-2) — reward visual tiap uang masuk.
  // Skip burst pertama (mount/initial), hanya untuk kenaikan berikutnya.
  let prevBalance = $state<number | null>(null);
  let burstKey = $state(0);
  $effect(() => {
    const b = balance;
    if (prevBalance !== null && b > prevBalance) burstKey++;
    prevBalance = b;
  });
  const sparks = [
    { left: "12%", top: "30%" }, { left: "22%", top: "62%" },
    { left: "48%", top: "18%" }, { left: "68%", top: "55%" },
    { left: "82%", top: "28%" }, { left: "58%", top: "74%" },
  ];
</script>

<section
  class="saldo-hero saldo-sticker group relative overflow-hidden text-white px-5 py-3 lg:px-6 lg:py-6 safe-top"
>
  <!-- static emerald — no animation (requested) -->
  <div
    class="saldo-grad pointer-events-none absolute inset-0"
    aria-hidden="true"
  ></div>
  <!-- M15 breathing glow — opacity layer saja (bukan animasi shadow), 4s halus -->
  <div
    class="pointer-events-none absolute inset-0"
    style="background: radial-gradient(70% 60% at 50% 0%, rgba(255,255,255,0.10), transparent 70%);"
    aria-hidden="true"
  ></div>
  <div
    class="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-sky-400/25 blur-2xl pointer-events-none"
    aria-hidden="true"
  ></div>
  <div
    class="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-amber-400/15 blur-3xl pointer-events-none"
    aria-hidden="true"
  ></div>
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
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-30"
    >
      <Sparkline
        data={trend}
        color="#38bdf8"
        height={64}
        strokeWidth={2}
        fill={false}
      />
    </div>
  {/if}

  <div class="relative">
    <div class="flex items-center justify-between">
      <p class="flex items-center gap-1.5 text-sm font-medium text-white/80">
        <span
          class="grid h-6 w-6 place-items-center rounded-lg bg-white/18 backdrop-blur-sm ring-1 ring-white/20"
        >
          <Icon name="wallet" size={14} stroke={2} />
        </span>
        {label}
      </p>
      <a
        href={historyHref}
        class="-m-2 rounded-full p-2 text-white/60 transition hover:text-white"
        aria-label="Riwayat"
      >
        <Icon name="list" size={18} />
      </a>
    </div>

    <p
      class="font-display font-extrabold text-[2rem] lg:text-[2.45rem] leading-tight tabular-nums tracking-tight mt-2 text-[#fbbf24] drop-shadow-[0_1px_0_rgba(0,0,0,0.3)]"
    >
      <NumberFlow value={balance} format={fmt} duration={0.9} />
    </p>
    {#if burstKey > 0}
      {#key burstKey}
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          {#each sparks as s, i}
            <span
              class="saldo-spark"
              style="left: {s.left}; top: {s.top}; animation-delay: {i * 60}ms; background: var(--sparko-mango);"
            ></span>
          {/each}
        </div>
      {/key}
    {/if}
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
          class="transition-transform duration-240 {insightOpen
            ? 'rotate-180'
            : 'rotate-0'}"
        />
      </button>
      <div
        id="saldo-insight-detail"
        aria-hidden={!insightOpen}
        class="grid lg:!grid-rows-[1fr] transition-[grid-template-rows] duration-240 ease-out lg:!opacity-100
          {insightOpen
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0'} lg:opacity-100"
      >
        <div class="overflow-hidden">
          <p class="mt-1 text-[11px] font-medium text-white/70 lg:hidden">
            Pengeluaran 7 hari: {fmt(insight?.spend7 ?? 0)} · Top up {fmt(
              insight?.deposit7 ?? 0,
            )}
          </p>
        </div>
      </div>
      <!-- Desktop: inline narrative chip, no chevron -->
      <p
        class="mt-1 hidden lg:inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur"
      >
        <Icon name="activity" size={12} />
        7 hari: masuk {fmt(insight?.deposit7 ?? 0)} · keluar {fmt(
          insight?.spend7 ?? 0,
        )}
      </p>
    {:else}
      <p class="mt-1 text-[11px] font-medium text-white/60">
        Mutasi 7 hari terakhir ada di <span class="font-semibold text-white/85"
          >Riwayat</span
        >
      </p>
    {/if}

    <div class="mt-4 flex items-center gap-2">
      <a
        href={ctaHref}
        onclick={() => haptic(10)}
        class="inline-flex items-center gap-1.5 rounded-full bg-[#fbbf24] text-[#1a1a1a] font-extrabold px-5 py-2.5 text-sm border-2 border-[#fbbf24]
          shadow-[2px_2px_0_rgba(0,0,0,0.45)] transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:brightness-105"
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
  /* Panel ink ala preview .usage (APP V3 R5) — SELALU gelap (hex hardcoded,
     bukan token) supaya teks putih + angka mango aman di light & dark mode. */
  .saldo-hero {
    box-shadow: none;
  }
  /* Sticker chrome di panel gelap: border + hard offset SAJA (no blur, §2.2/13). */
  .saldo-sticker {
    border: 2px solid rgb(255 255 255 / 0.28);
    border-radius: var(--radius-sticker);
    box-shadow: 3px 3px 0 rgb(255 255 255 / 0.22);
  }
  /* Sparkle burst saat saldo naik (APP V3 S2-2) — 6 titik mango pop 600ms 1× */
  .saldo-spark {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    transform: scale(0);
    animation: saldo-spark 600ms var(--ease-spring) both;
  }
  @keyframes saldo-spark {
    0% { transform: scale(0); opacity: 1; }
    60% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0); opacity: 0; }
  }
  .saldo-grad {
    background: linear-gradient(
      120deg,
      #141414 0%,
      #232323 40%,
      #1a1a1a 70%,
      #2b2b2b 100%
    );
  }
  @keyframes emeraldDrift {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  .shimmer {
    display: none;
  }
  @keyframes sweep {
    0% {
      background-position: 140% 0;
    }
    55% {
      background-position: -140% 0;
    }
    100% {
      background-position: -140% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .saldo-spark {
      animation: none;
      display: none;
    }
    /* keep alive but softer when user prefers reduced motion */
    .saldo-grad {
      animation-duration: 14s;
      opacity: 0.9;
    }
    .shimmer {
      animation-duration: 7s;
      opacity: 0.7;
    }
  }
</style>
