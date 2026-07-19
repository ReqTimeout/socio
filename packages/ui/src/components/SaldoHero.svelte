<script lang="ts">
  import { onMount } from "svelte";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  let {
    balance = 0,
    label = "Saldo Anda",
    ctaLabel = "Top Up",
    ctaHref = "/saldo/top-up",
    historyHref = "/saldo/riwayat",
  }: {
    balance?: number;
    label?: string;
    ctaLabel?: string;
    ctaHref?: string;
    historyHref?: string;
  } = $props();

  let display = $state(0);
  let el: HTMLElement;

  onMount(() => {
    const start = performance.now();
    const dur = 900;
    function tick(t: number) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      display = Math.round(balance * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

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
  class="relative overflow-hidden rounded-card shadow-[0_12px_32px_-8px_rgba(79,70,229,0.45)]
    bg-gradient-to-br from-primary via-primary to-accent-700 text-white p-6 safe-top
    motion-safe:[transform:perspective(800px)_rotateX(var(--rx,0))_rotateY(var(--ry,0))]
    transition-transform duration-200 ease-out"
>
  <!-- decorative glow -->
  <div class="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/15 blur-2xl"></div>
  <div class="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-accent/30 blur-3xl"></div>
  <!-- dot pattern -->
  <svg class="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
    <defs>
      <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
  </svg>

  <div class="relative">
    <div class="flex items-center justify-between">
      <p class="text-sm text-white/75 font-medium">{label}</p>
      <a href={historyHref} class="text-white/60 hover:text-white transition" aria-label="Riwayat">
        <Icon name="list" size={18} />
      </a>
    </div>

    <p class="font-display font-extrabold text-[2.6rem] leading-tight tabular-nums tracking-tight mt-1">
      {fmt(display)}
    </p>

    <div class="mt-4 flex items-center gap-2">
      <a
        href={ctaHref}
        onclick={() => haptic(10)}
        class="inline-flex items-center gap-1.5 rounded-full bg-white text-primary font-bold px-5 py-2.5 text-sm
          transition-all duration-150 active:scale-95 hover:bg-white/90 focus-ring-on-accent
          shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)]"
      >
        <Icon name="plus" size={16} stroke={2.5} />
        {ctaLabel}
      </a>
      <a
        href={historyHref}
        onclick={() => haptic(8)}
        class="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm text-white font-semibold px-4 py-2.5 text-sm
          transition-all duration-150 active:scale-95 hover:bg-white/25"
      >
        Riwayat
      </a>
    </div>
  </div>
</section>
