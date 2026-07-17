<script lang="ts">
  import { haptic } from "../haptic.js";

  let {
    value = $bindable(1),
    min = 1,
    max = 999999,
    step = 1,
    onchange,
  }: { value?: number; min?: number; max?: number; step?: number; onchange?: (v: number) => void } = $props();

  function set(v: number) {
    const next = Math.max(min, Math.min(max, v));
    if (next === value) return;
    value = next;
    haptic(8);
    onchange?.(value);
  }
</script>

<div class="inline-flex items-center rounded-full border border-ink-200 bg-white">
  <button
    type="button"
    aria-label="Kurangi"
    onclick={() => set(value - step)}
    disabled={value <= min}
    class="h-10 w-10 grid place-items-center rounded-full text-ink-600 text-lg disabled:opacity-30 active:scale-90 focus-ring"
  >
    −
  </button>
  <input
    type="number"
    bind:value
    {min}
    {max}
    {step}
    oninput={() => onchange?.(value)}
    class="w-20 text-center font-display font-bold text-ink-900 tabular-nums bg-transparent focus:outline-none [appearance:textfield]"
    aria-label="Jumlah"
  />
  <button
    type="button"
    aria-label="Tambah"
    onclick={() => set(value + step)}
    disabled={value >= max}
    class="h-10 w-10 grid place-items-center rounded-full text-ink-600 text-lg disabled:opacity-30 active:scale-90 focus-ring"
  >
    +
  </button>
</div>
