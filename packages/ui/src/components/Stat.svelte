<script lang="ts">
  // Stat — typographic inline-stat strip (P3-04). Tidak ada card chrome.
  // Untuk grid of 3-4 stats dengan border-divider (variation dari card stack).
  // Usage:
  //   <Stat items={[
  //     { label: 'Pesanan', value: '168', icon: 'receipt' },
  //     { label: 'Deposit', value: 'Rp 11jt', icon: 'wallet', highlight: true },
  //   ]} />

  import Icon from "./Icon.svelte";

  type Item = {
    label: string;
    value: string;
    delta?: string;
    icon?: string;
    highlight?: boolean;
  };

  let {
    items,
    columns = 3,
  }: { items: Item[]; columns?: 2 | 3 | 4 } = $props();

  const colsClass = $derived(
    {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-2 sm:grid-cols-4",
    }[columns],
  );
</script>

<div
  class="grid {colsClass} divide-x divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-surface overflow-hidden sm:divide-y-0"
>
  {#each items as item, i (item.label)}
    <div
      class="flex flex-col gap-1 px-4 py-3.5 sm:px-5 sm:py-4 {item.highlight
        ? 'bg-gradient-to-br from-white via-amber-50/40 to-white'
        : ''}"
    >
      <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
        {#if item.icon}
          <Icon
            name={item.icon}
            size={12}
            stroke={2}
            class={item.highlight ? "text-amber-500" : "text-ink-400"}
          />
        {/if}
        {item.label}
      </span>
      <span
        class="font-display text-lg font-extrabold tabular-nums sm:text-xl lg:text-2xl {item.highlight
          ? 'text-amber-700'
          : 'text-ink-900'}"
      >
        {item.value}
      </span>
      {#if item.delta}
        <span
          class="inline-flex w-fit items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-success"
        >
          {item.delta}
        </span>
      {/if}
    </div>
  {/each}
</div>
