<script lang="ts">
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  type Item = { href: string; label: string; icon: string; accent?: boolean; badge?: number };

  let { items }: { items: Item[] } = $props();
</script>

<div class="grid grid-cols-4 gap-3">
  {#each items as item (item.href)}
    <a
      href={item.href}
      onclick={() => haptic(8)}
      class="group flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-surface p-3
        shadow-card transition-all duration-200
        active:scale-95 active:shadow-sm
        hover:shadow-card-hover hover:-translate-y-0.5 focus-ring"
    >
      <span
        class="relative grid h-11 w-11 place-items-center rounded-xl transition-all duration-200
          group-hover:scale-110
          {item.accent ? 'bg-primary/10 text-primary' : 'bg-ink-100 text-ink-600'}"
      >
        <Icon name={item.icon} size={20} stroke={1.75} />
        {#if item.badge}
          <span
            class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-danger text-white text-[9px] font-bold"
          >
            {item.badge}
          </span>
        {/if}
      </span>
      <span class="text-[11px] font-semibold text-ink-700 text-center leading-tight">{item.label}</span>
    </a>
  {/each}
</div>
