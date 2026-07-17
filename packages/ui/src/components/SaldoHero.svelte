<script lang="ts">
  import { onMount } from "svelte";
  import { haptic } from "../haptic.js";

  let {
    balance = 0,
    label = "Saldo Anda",
    ctaLabel = "Top Up",
    ctaHref = "/saldo/top-up",
  }: { balance?: number; label?: string; ctaLabel?: string; ctaHref?: string } = $props();

  // Tweened counter (emil: number IS the story -> allowed)
  let display = $state(0);
  onMount(() => {
    const start = performance.now();
    const from = 0;
    const dur = 600;
    function tick(t: number) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      display = Math.round(from + (balance - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  const fmt = (n: number) =>
    "Rp" + n.toLocaleString("id-ID");
</script>

<section class="bg-gradient-to-br from-primary to-primary-800 rounded-card shadow-card text-white p-6 safe-top">
  <p class="text-sm/relaxed text-white/70 font-medium">{label}</p>
  <p class="font-display font-extrabold text-4xl tabular-nums tracking-tight mt-1">
    {fmt(display)}
  </p>
  <a
    href={ctaHref}
    onclick={() => haptic()}
    class="inline-flex items-center gap-1.5 mt-4 rounded-full bg-white text-primary font-bold px-5 py-2.5 text-sm
      transition-transform duration-150 active:scale-95 hover:bg-white/90 focus-ring-on-accent"
  >
    {ctaLabel}
  </a>
</section>
