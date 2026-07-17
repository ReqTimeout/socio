<script lang="ts">
  import { haptic } from "../haptic.js";
  import type { Snippet } from "svelte";

  let {
    onclick,
    children,
    label = "Aksi cepat",
  }: { onclick?: () => void; children?: Snippet; label?: string } = $props();
</script>

<button
  onclick={() => {
    haptic();
    onclick?.();
  }}
  aria-label={label}
  class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 h-14 w-14 rounded-full bg-primary text-white shadow-card-hover
    grid place-items-center text-2xl transition-transform duration-150 active:scale-90 hover:bg-primary-700
    focus-ring-on-accent"
>
  {#if children}
    {@render children()}
  {:else}
    +
  {/if}
</button>
