<script lang="ts">
  import { onMount } from "svelte";
  import { haptic } from "../haptic.js";
  import { tweenNumber } from "../lib/motion.js";
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

  let el: HTMLElement;
  const balanceTween = tweenNumber(0, { duration: 900 });
  $effect(() => {
    balanceTween.set(balance);
  });

  onMount(() => {
    // Tilt on pointer move (desktop)
    function onMove(e: PointerEvent) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${y * -6}deg`);
      el.style.setProperty("--ry", `${x * 6}deg`);
    }
    function onLeave() {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
    el?.addEventListener("pointermove", onMove);
    el?.addEventListener("pointerleave", onLeave);
    return () => {
      el?.removeEventListener("pointermove", onMove);
      el?.removeEventListener("pointerleave", onLeave);
    };
  });

  const fmt = (n: number) => "Rp" + n.toLocaleString("id-ID");
</script>

<section
  bind:this={el}
  class="saldo-hero group relative overflow-hidden rounded-card shadow-[0_18px_48px_-12px_rgba(79,70,229,0.55)]
    bg-gradient-to-br from-primary-600 via-primary to-accent-600 text-white p-6 safe-top
    motion-safe:[transform:perspective(800px)_rotateX(var(--rx,0))_rotateY(var(--ry,0))]
    transition-transform duration-200 ease-out"
>
  <!-- decorative glow -->
  <div class="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-accent-400/40 blur-3xl"></div>
  <div class="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-primary-400/40 blur-3xl"></div>
  <!-- shimmer sweep -->
  <div class="shimmer pointer-events-none absolute inset-0" aria-hidden="true"></div>
  <!-- dot pattern -->
  <svg class="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
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
      <p class="flex items-center gap-1.5 text-sm font-medium text-white/75">
        <span class="grid h-6 w-6 place-items-center rounded-lg bg-white/15 backdrop-blur-sm">
          <Icon name="wallet" size={14} stroke={2} />
        </span>
        {label}
      </p>
      <a href={historyHref} class="text-white/60 hover:text-white transition" aria-label="Riwayat">
        <Icon name="list" size={18} />
      </a>
    </div>

    <p class="font-display font-extrabold text-[2.6rem] leading-tight tabular-nums tracking-tight mt-2">
      {fmt($balanceTween)}
    </p>
    {#if insight && (insight.deposit7 > 0 || insight.spend7 > 0)}
      <p class="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur">
        <Icon name="activity" size={12} />
        7 hari: masuk {fmt(insight.deposit7)} · keluar {fmt(insight.spend7)}
      </p>
    {/if}

    <div class="mt-4 flex items-center gap-2">
      <a
        href={ctaHref}
        onclick={() => haptic(10)}
        class="inline-flex items-center gap-1.5 rounded-full bg-white text-primary-700 font-bold px-5 py-2.5 text-sm
          transition-all duration-150 active:scale-95 hover:bg-white/90 focus-ring-on-accent
          shadow-[0_6px_18px_-4px_rgba(0,0,0,0.25)]"
      >
        <Icon name="plus" size={16} stroke={2.5} />
        {ctaLabel}
      </a>
      <a
        href={historyHref}
        onclick={() => haptic(8)}
        class="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white font-semibold px-4 py-2.5 text-sm
          transition-all duration-150 active:scale-95 hover:bg-white/25"
      >
        <Icon name="clock" size={15} stroke={2} />
        Riwayat
      </a>
    </div>
  </div>
</section>

<style>
  .shimmer {
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgba(255, 255, 255, 0.14) 50%,
      transparent 60%
    );
    background-size: 250% 100%;
    background-position: 150% 0;
    animation: sweep 5.5s ease-in-out infinite;
  }
  @keyframes sweep {
    0%,
    20% {
      background-position: 150% 0;
    }
    60%,
    100% {
      background-position: -150% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
    }
  }
</style>
