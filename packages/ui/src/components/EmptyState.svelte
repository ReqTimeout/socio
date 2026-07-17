<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    icon = "📭",
    title,
    description,
    children,
  }: { icon?: string; title: string; description?: string; children?: Snippet } = $props();
</script>

<div class="flex flex-col items-center justify-center text-center py-12 px-6">
  <div class="text-5xl mb-4" aria-hidden="true">{icon}</div>
  <h3 class="font-display font-bold text-ink-900 text-lg">{title}</h3>
  {#if description}
    <p class="mt-1.5 text-sm text-ink-500 max-w-xs">{description}</p>
  {/if}
  {#if children}
    <div class="mt-5">{@render children()}</div>
  {/if}
</div>
