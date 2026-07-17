<script lang="ts">
  import type { Snippet } from "svelte";

  type Tab = { value: string; label: string; icon?: string };

  let {
    tabs,
    value = $bindable(""),
    children,
  }: {
    tabs: Tab[];
    value?: string;
    children?: Snippet<[string]>;
  } = $props();

  if (!value && tabs[0]) value = tabs[0].value;
  $effect(() => {
    if (!value && tabs[0]) value = tabs[0].value;
  });
</script>

<div class="flex gap-1 border-b border-ink-100" role="tablist">
  {#each tabs as tab}
    <button
      role="tab"
      aria-selected={value === tab.value}
      onclick={() => (value = tab.value)}
      class="relative px-4 py-2.5 text-sm font-semibold transition-colors
        {value === tab.value ? 'text-primary' : 'text-ink-400 hover:text-ink-600'}"
    >
      {#if tab.icon}<span class="mr-1">{tab.icon}</span>{/if}{tab.label}
      {#if value === tab.value}
        <span class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"></span>
      {/if}
    </button>
  {/each}
</div>

{#if children}
  <div class="pt-4">{@render children(value)}</div>
{/if}
