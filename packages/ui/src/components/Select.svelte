<script lang="ts">
  import Icon from "./Icon.svelte";
  import { haptic } from "../haptic.js";

  export type SelectOption = {
    value: string | number;
    label: string;
    hint?: string;
    icon?: string;
  };

  let {
    value = $bindable<string | number>(""),
    options,
    placeholder = "Pilih…",
    searchPlaceholder = "Cari…",
    searchable,
    disabled = false,
    size = "md",
    onChange,
  }: {
    value?: string | number;
    options: SelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    size?: "sm" | "md";
    onChange?: (v: string | number) => void;
  } = $props();

  let open = $state(false);
  let query = $state("");
  let root = $state<HTMLDivElement | null>(null);
  let searchEl = $state<HTMLInputElement | null>(null);

  const showSearch = $derived(searchable ?? options.length > 8);
  const selected = $derived(options.find((o) => String(o.value) === String(value)) ?? null);
  const filtered = $derived(
    query.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options,
  );

  const trigger = $derived(
    size === "sm"
      ? "h-9 rounded-lg px-3 text-xs"
      : "h-11 rounded-xl px-4 text-sm",
  );

  function toggle() {
    if (disabled) return;
    haptic(8);
    open = !open;
    if (open) {
      query = "";
      queueMicrotask(() => searchEl?.focus());
    }
  }

  function choose(o: SelectOption) {
    haptic(10);
    value = o.value;
    onChange?.(o.value);
    open = false;
  }

  function onWindowClick(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      open = false;
      e.stopPropagation();
    }
  }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKey} />

<div bind:this={root} class="relative">
  <button
    type="button"
    {disabled}
    onclick={toggle}
    aria-haspopup="listbox"
    aria-expanded={open}
    class="flex w-full items-center gap-2 border border-ink-200 bg-surface text-left font-medium
      text-ink-800 outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30
      disabled:opacity-50 hover:border-ink-300 {trigger} {open ? 'border-primary ring-2 ring-primary/20' : ''}"
  >
    {#if selected?.icon}
      <Icon name={selected.icon} size={size === "sm" ? 15 : 17} stroke={2} class="shrink-0 text-ink-500" />
    {/if}
    <span class="min-w-0 flex-1 truncate {selected ? '' : 'text-ink-500'}">
      {selected ? selected.label : placeholder}
    </span>
    <Icon
      name="chevron_right"
      size={size === "sm" ? 15 : 17}
      stroke={2.5}
      class="shrink-0 text-ink-500 transition-transform duration-200 {open ? 'rotate-90' : ''}"
    />
  </button>

  {#if open}
    <div
      class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-ink-100
        bg-surface shadow-card-hover"
      role="listbox"
    >
      {#if showSearch}
        <div class="border-b border-ink-100 p-2">
          <div class="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5">
            <Icon name="search" size={15} stroke={2} class="shrink-0 text-ink-500" />
            <input
              bind:this={searchEl}
              bind:value={query}
              placeholder={searchPlaceholder}
              class="h-9 w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
            />
          </div>
        </div>
      {/if}
      <ul class="max-h-64 overflow-y-auto py-1 [scrollbar-width:thin]">
        {#if filtered.length === 0}
          <li class="px-3 py-4 text-center text-xs text-ink-500">Tidak ada hasil</li>
        {:else}
          {#each filtered as o (o.value)}
            {@const active = String(o.value) === String(value)}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onclick={() => choose(o)}
                class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition
                  {active ? 'bg-primary/8 font-semibold text-primary' : 'text-ink-700 hover:bg-ink-50'}"
              >
                {#if o.icon}
                  <Icon name={o.icon} size={16} stroke={2} class="shrink-0 {active ? 'text-primary' : 'text-ink-500'}" />
                {/if}
                <span class="min-w-0 flex-1 truncate">{o.label}</span>
                {#if o.hint}
                  <span class="shrink-0 text-xs tabular-nums {active ? 'text-primary/70' : 'text-ink-500'}">{o.hint}</span>
                {/if}
                {#if active}
                  <Icon name="check" size={15} stroke={2.5} class="shrink-0 text-primary" />
                {/if}
              </button>
            </li>
          {/each}
        {/if}
      </ul>
    </div>
  {/if}
</div>
