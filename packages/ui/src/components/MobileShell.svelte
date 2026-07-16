<script lang="ts">
  import type { Snippet } from 'svelte';

  type Item = { href: string; label: string; icon: string; active?: boolean };

  let {
    items,
    children,
  }: {
    items: Item[];
    children: Snippet;
  } = $props();
</script>

<div class="min-h-screen bg-ink-50 flex flex-col">
  <main class="flex-1 pb-24 max-w-2xl w-full mx-auto px-4 py-4">
    {@render children()}
  </main>

  <nav
    class="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-ink-100 max-w-2xl mx-auto grid"
    style="grid-template-columns: repeat({items.length}, 1fr);"
  >
    {#each items as item}
      <a
        href={item.href}
        class="flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold transition-colors
          {item.active ? 'text-primary' : 'text-ink-400 hover:text-ink-600'}"
      >
        <span class="text-xl leading-none">{item.icon}</span>
        {item.label}
      </a>
    {/each}
  </nav>
</div>
