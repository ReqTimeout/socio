<script lang="ts">
  // NumberFlow — angka "mengalir" saat berubah (motion v13 spring).
  // Untuk momen hero (saldo, komisi, total bayar). Reduced-motion → instan.
  import { animate } from "motion";

  let {
    value = 0,
    format = (n: number) => n.toLocaleString("id-ID"),
    class: className = "",
    duration = 0.9,
    tag = "span",
  }: {
    value: number;
    format?: (n: number) => string;
    class?: string;
    duration?: number;
    tag?: string;
  } = $props();

  let el: HTMLElement;
  let current = $state(value);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  $effect(() => {
    const target = value;
    if (reduced || current === target) {
      current = target;
      return;
    }
    const from = current;
    const controls = animate(from, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (current = v),
    });
    return () => controls.stop();
  });
</script>

<svelte:element this={tag} bind:this={el} class="tabular-nums {className}">
  {format(Math.round(current))}
</svelte:element>
