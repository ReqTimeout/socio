<script lang="ts">
  import { page } from "$app/stores";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  type Item = { href: string; label: string; icon: string; badge?: number };

  let { items }: { items: Item[] } = $props();

  function isActive(href: string): boolean {
    if (href === "/") return $page.url.pathname === "/";
    return $page.url.pathname.startsWith(href);
  }
</script>

<nav
  class="fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-ink-100 safe-bottom
    grid max-w-2xl mx-auto shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.08)]"
  style="grid-template-columns: repeat({items.length}, 1fr);"
  aria-label="Navigasi utama"
>
  {#each items as item (item.href)}
    <a
      href={item.href}
      aria-current={isActive(item.href) ? "page" : undefined}
      onclick={() => haptic(8)}
      class="group relative flex flex-col items-center justify-center gap-0.5 py-2 transition-colors
        {isActive(item.href) ? 'text-primary' : 'text-ink-400'}"
    >
      {#if isActive(item.href)}
        <span
          class="absolute top-0 h-1 w-8 rounded-b-full bg-primary transition-all duration-300"
        ></span>
      {/if}
      <span class="relative transition-transform duration-200 {isActive(item.href) ? '-translate-y-0.5' : ''}">
        <Icon name={item.icon} size={22} stroke={isActive(item.href) ? 2.25 : 1.75} />
        {#if item.badge}
          <span
            class="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-danger text-white text-[9px] font-bold"
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        {/if}
      </span>
      <span
        class="text-[10px] font-bold tracking-tight transition-opacity
          {isActive(item.href) ? 'opacity-100' : 'opacity-70'}"
      >
        {item.label}
      </span>
    </a>
  {/each}
</nav>
