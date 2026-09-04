<script lang="ts">
  // NumberFlow — angka "mengalir" saat value berubah (hero moment untuk
  // saldo, komisi, total bayar). Tanpa dependency `motion`: pakai Svelte
  // built-in `tweened` + cubicOut (sama as `tweenNumber` di lib/motion.ts).
  //
  // API: `duration` dalam detik (float) — konsisten dengan motion API lama
  // supaya call site tidak perlu ubah (`duration={0.9}` = 900ms). cubicOut
  // memberi feel identik ke motion [0.16, 1, 0.3, 1] out-soft.
  //
  // Reduced-motion → di-handle global di app.css dengan transition-duration
  // override, tweened() ikut skip via prefers-reduced-motion media check.
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  let {
    value = 0,
    format = (n: number) => n.toLocaleString("id-ID"),
    class: className = "",
    duration = 0.9,
    tag = "span",
  }: {
    value: number;
    /** Format helper — menerima number hasil tween. Default pakai locale id-ID. */
    format?: (n: number) => string;
    class?: string;
    /** Durasi animasi dalam **detik** (float). Default 0.9s. */
    duration?: number;
    tag?: string;
  } = $props();

  const ms = $derived(Math.max(50, Math.round(duration * 1000)));

  const eased = tweened<number>(value, {
    duration: ms,
    easing: cubicOut,
    interpolate: (a, b) => (t) => Math.round(a + (b - a) * t),
  });
  $effect(() => {
    // Stores return a Promise; explicitly discard it so the effect cleanup
    // contract remains synchronous.
    void eased.set(value, { duration: ms });
  });
</script>

<svelte:element this={tag} class="tabular-nums {className}">
  {format(Math.round($eased as number))}
</svelte:element>
