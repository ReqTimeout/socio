<script lang="ts">
  import { haptic } from "../haptic.js";

  let {
    name,
    category,
    pricePer1k,
    min,
    max,
    onSelect,
  }: {
    name: string;
    category: string;
    pricePer1k: number;
    min: number;
    max: number;
    onSelect?: () => void;
  } = $props();

  const fmt = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
</script>

<button
  onclick={() => {
    haptic();
    onSelect?.();
  }}
  class="w-full text-left rounded-2xl border border-ink-100 bg-white p-4 shadow-card
    transition-transform duration-150 active:scale-[0.98] hover:shadow-card-hover focus-ring"
>
  <div class="flex items-start justify-between gap-2">
    <div>
      <p class="font-semibold text-ink-900 text-sm leading-snug">{name}</p>
      <p class="text-xs text-ink-400 mt-0.5">{category}</p>
    </div>
    <span class="shrink-0 rounded-full bg-accent-50 text-accent-700 px-2.5 py-1 text-xs font-bold tabular-nums">
      {fmt(pricePer1k)}/1k
    </span>
  </div>
  <p class="text-xs text-ink-500 mt-2">Min {min.toLocaleString("id-ID")} · Max {max.toLocaleString("id-ID")}</p>
</button>
