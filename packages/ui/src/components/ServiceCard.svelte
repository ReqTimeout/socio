<script lang="ts">
  import { haptic } from "../haptic.js";

  let {
    name,
    category,
    pricePer1k,
    min,
    max,
    refill = false,
    href,
    onSelect,
  }: {
    name: string;
    category: string;
    pricePer1k: number;
    min: number;
    max: number;
    refill?: boolean;
    href?: string;
    onSelect?: () => void;
  } = $props();

  const fmt = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

  const handle = () => {
    haptic();
    onSelect?.();
  };
</script>

<svelte:element
  this={href ? "a" : "button"}
  href={href}
  onclick={handle}
  class="block w-full text-left rounded-2xl border border-ink-100 bg-white p-4 shadow-card
    transition-transform duration-150 active:scale-[0.98] hover:shadow-card-hover focus-ring"
>
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <p class="truncate font-semibold text-ink-900 text-sm leading-snug">{name}</p>
      <p class="text-xs text-ink-400 mt-0.5">{category}</p>
    </div>
    <span class="shrink-0 rounded-full bg-accent-50 text-accent-700 px-2.5 py-1 text-xs font-bold tabular-nums">
      {fmt(pricePer1k)}/1k
    </span>
  </div>
  <div class="mt-2 flex items-center gap-2 text-xs text-ink-500">
    <span>Min {min.toLocaleString("id-ID")} · Max {max.toLocaleString("id-ID")}</span>
    {#if refill}
      <span class="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">Refill</span>
    {/if}
  </div>
</svelte:element>
