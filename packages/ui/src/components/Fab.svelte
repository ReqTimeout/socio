<script lang="ts">
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";
  import type { Snippet } from "svelte";

  let {
    onclick,
    children,
    label = "Aksi cepat",
    icon = "plus",
  }: { onclick?: () => void; children?: Snippet; label?: string; icon?: string } = $props();
</script>

<button
  onclick={() => {
    haptic(12);
    onclick?.();
  }}
  aria-label={label}
  class="fixed bottom-[88px] right-4 z-50 h-14 w-14 rounded-full
    bg-gradient-to-br from-primary to-primary-800 text-white
    shadow-[0_8px_24px_-6px_rgba(79,70,229,0.5)]
    grid place-items-center transition-all duration-200
    active:scale-90 active:shadow-[0_4px_12px_-4px_rgba(79,70,229,0.4)]
    hover:scale-105 hover:shadow-[0_12px_28px_-6px_rgba(79,70,229,0.6)]
    focus-ring-on-accent
    motion-safe:animate-[fab-pop_400ms_cubic-bezier(0.25,1,0.5,1)]"
>
  {#if children}
    {@render children()}
  {:else}
    <Icon name={icon} size={26} stroke={2.5} />
  {/if}
</button>

<style>
  @keyframes fab-pop {
    0% { transform: scale(0) rotate(-90deg); }
    60% { transform: scale(1.08) rotate(0); }
    100% { transform: scale(1) rotate(0); }
  }
</style>
