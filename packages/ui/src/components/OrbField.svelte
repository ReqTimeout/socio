<script lang="ts">
  // OrbField — animated premium backdrop untuk hero/empty states.
  // 3 blob orbs yang drift pelan (motion-reduce = static).
  // Pakai radial-gradient + blur + transform; GPU-safe.
  // Usage:
  //   <OrbField palette="primary" intensity="soft" />
  // palette: 'primary' | 'emerald' | 'violet' | 'dawn' | 'night'
  // intensity: 'soft' | 'normal' | 'bold'

  type Palette = "primary" | "emerald" | "violet" | "dawn" | "night";

  let {
    palette = "primary",
    intensity = "soft",
    class: className = "",
  }: { palette?: Palette; intensity?: "soft" | "bold"; class?: string } = $props();

  const palettes: Record<
    Palette,
    { a: string; b: string; c: string; opacity: number }
  > = {
    primary: {
      a: "oklch(0.62 0.18 270)", // violet
      b: "oklch(0.70 0.16 220)", // cyan
      c: "oklch(0.72 0.15 320)", // magenta
      opacity: 0.28,
    },
    emerald: {
      a: "oklch(0.65 0.18 160)",
      b: "oklch(0.70 0.15 200)",
      c: "oklch(0.78 0.13 90)",
      opacity: 0.32,
    },
    violet: {
      a: "oklch(0.58 0.20 295)",
      b: "oklch(0.65 0.18 250)",
      c: "oklch(0.75 0.15 340)",
      opacity: 0.30,
    },
    dawn: {
      a: "oklch(0.80 0.15 50)", // amber
      b: "oklch(0.82 0.12 90)", // gold
      c: "oklch(0.74 0.14 25)", // coral
      opacity: 0.26,
    },
    night: {
      a: "oklch(0.42 0.18 270)",
      b: "oklch(0.48 0.20 250)",
      c: "oklch(0.62 0.18 220)",
      opacity: 0.40,
    },
  };
  const p = $derived(palettes[palette]);
  const op = $derived(intensity === "bold" ? p.opacity * 1.4 : p.opacity);
</script>

<div
  aria-hidden="true"
  class="pointer-events-none absolute inset-0 overflow-hidden {className}"
  style="contain: paint;"
>
  <div
    class="absolute -top-24 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl motion-safe:animate-[orb-drift-a_18s_ease-in-out_infinite]"
    style="background: radial-gradient(circle at 30% 30%, {p.a}, transparent 70%); opacity: {op};"
  ></div>
  <div
    class="absolute top-1/2 -left-32 h-[24rem] w-[24rem] rounded-full blur-3xl motion-safe:animate-[orb-drift-b_22s_ease-in-out_infinite]"
    style="background: radial-gradient(circle at 50% 50%, {p.b}, transparent 70%); opacity: {op *
      0.85};"
  ></div>
  <div
    class="absolute -bottom-20 right-1/3 h-[20rem] w-[20rem] rounded-full blur-3xl motion-safe:animate-[orb-drift-c_26s_ease-in-out_infinite]"
    style="background: radial-gradient(circle at 60% 40%, {p.c}, transparent 70%); opacity: {op *
      0.7};"
  ></div>
  <!-- Subtle grain texture for premium feel -->
  <div
    class="absolute inset-0 opacity-[0.015] mix-blend-overlay"
    style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>');"
  ></div>
</div>

<style>
  @keyframes orb-drift-a {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-30px, 25px) scale(1.06); }
    66% { transform: translate(20px, -15px) scale(0.96); }
  }
  @keyframes orb-drift-b {
    0%, 100% { transform: translate(0, 0) scale(1); }
    40% { transform: translate(35px, -20px) scale(1.08); }
    70% { transform: translate(-20px, 30px) scale(0.94); }
  }
  @keyframes orb-drift-c {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-25px, -25px) scale(1.1); }
  }
  @media (prefers-reduced-motion: reduce) {
    [class*="motion-safe:animate-[orb-drift"] {
      animation: none !important;
    }
  }
</style>
