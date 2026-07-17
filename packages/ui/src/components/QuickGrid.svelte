<script lang="ts">
  import { haptic } from "../haptic.js";

  type Item = { href: string; label: string; icon: string; accent?: boolean };

  let { items }: { items: Item[] } = $props();
</script>

<div class="grid grid-cols-2 gap-3">
  {#each items as item}
    <a
      href={item.href}
      onclick={() => haptic()}
      class="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card
        transition-transform duration-150 active:scale-[0.98] hover:shadow-card-hover focus-ring"
    >
      <span
        class="grid h-10 w-10 place-items-center rounded-xl text-lg
          {item.accent ? 'bg-primary/10 text-primary' : 'bg-ink-100 text-ink-600'}"
        aria-hidden="true">{item.icon}</span
      >
      <span class="text-sm font-semibold text-ink-800">{item.label}</span>
    </a>
  {/each}
</div>
