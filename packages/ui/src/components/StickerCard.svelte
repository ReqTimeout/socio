<script lang="ts">
  // StickerCard (APP V2 C3) — wrapper chrome sticker: border tinta 2px +
  // hard shadow + radius sticker + tilt opsional ±2°.
  // Budget: ≤2 elemen besar per layar. Dark mode ikut remap token
  // (--sticker-*: border paper/24-ish + shadow dalam, bukan tinta penuh).
  // BUKAN pengganti Card interaktif — untuk momen utama per layar saja.
  import type { Snippet } from "svelte";

  let {
    tone = "paper",
    tilt = 0,
    class: className = "",
    children,
  }: {
    tone?: "paper" | "dark";
    tilt?: -2 | -1 | 0 | 1 | 2;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div
  class="sticker-card sticker-card--{tone} {className}"
  style={tilt ? `rotate: ${tilt}deg;` : undefined}
>
  {@render children()}
</div>

<style>
  .sticker-card {
    border: var(--sticker-border);
    border-radius: var(--radius-sticker);
    box-shadow: var(--sticker-shadow);
  }
  .sticker-card--paper {
    background: var(--color-surface);
    color: var(--color-ink-800);
  }
  .sticker-card--dark {
    background: var(--color-ink-900);
    color: var(--color-ink-50);
    border-color: var(--color-ink-900);
  }
</style>
