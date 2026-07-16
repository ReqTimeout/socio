<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    children,
    padded = true,
  }: {
    title?: string;
    children: Snippet;
    padded?: boolean;
  } = $props();
</script>

<section class="bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
  {#if title}
    <div class="px-5 py-4 border-b border-ink-100">
      <h2 class="font-display font-bold text-ink-900 text-lg">{title}</h2>
    </div>
  {/if}
  <div class={padded ? 'p-5' : ''}>
    {@render children()}
  </div>
</section>
