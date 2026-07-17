<script lang="ts">
  type Item = { href: string; label: string; icon: string; active?: boolean };

  let { items }: { items: Item[] } = $props();
</script>

<nav
  class="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-ink-100 safe-bottom
    grid max-w-2xl mx-auto"
  style="grid-template-columns: repeat({items.length}, 1fr);"
  aria-label="Navigasi utama"
>
  {#each items as item}
    <a
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      class="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors
        {item.active ? 'text-primary' : 'text-ink-400 hover:text-ink-600'}"
    >
      <span class="text-xl leading-none" aria-hidden="true">{item.icon}</span>
      {item.label}
    </a>
  {/each}
</nav>
