<script lang="ts">
  import Icon from "./Icon.svelte";

  export type FilterOption = {
    value: string;
    label: string;
    icon?: string;
    count?: number;
  };

  export type FilterGroup = {
    key: string;
    label: string;
    type: "single" | "multi";
    options: FilterOption[];
    selected: string[];
  };

  let {
    groups,
    name = "filter",
    formAction = "",
    onApply,
  }: {
    groups: FilterGroup[];
    /** Form input name for selected values (joined with comma). */
    name?: string;
    /** Form action URL (default: current path). */
    formAction?: string;
    /** Optional callback fired when Apply clicked (receives group key → values). */
    onApply?: (state: Record<string, string[]>) => void;
  } = $props();

  let open = $state(false);
  let root = $state<HTMLDivElement | null>(null);

  // Snapshot at open — cancel reverts to this
  let snapshot = $state<Record<string, string[]>>({});

  // Working state — mutated in panel
  let working = $state<Record<string, string[]>>({});

  const totalSelected = $derived(
    Object.values(working).reduce((sum, arr) => sum + arr.length, 0),
  );

  /** Count of active filter values from props (persists across page reloads). */
  const activeCount = $derived(
    groups.reduce((sum, g) => sum + g.selected.length, 0),
  );

  function toggle(groupKey: string, value: string, type: "single" | "multi") {
    if (type === "single") {
      working[groupKey] = working[groupKey]?.includes(value) ? [] : [value];
    } else {
      const cur = working[groupKey] ?? [];
      working[groupKey] = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
    }
    working = { ...working };
  }

  function openPanel() {
    if (open) return;
    snapshot = Object.fromEntries(groups.map((g) => [g.key, [...g.selected]]));
    working = Object.fromEntries(groups.map((g) => [g.key, [...g.selected]]));
    open = true;
    setTimeout(() => {
      // Focus first interactive element
      const first = root?.querySelector<HTMLElement>(
        "button:not([data-filter-trigger]), input, [tabindex]:not([tabindex='-1'])",
      );
      first?.focus();
    }, 50);
  }

  function closePanel(revert = false) {
    if (revert) {
      working = { ...snapshot };
    }
    open = false;
  }

  function resetAll() {
    for (const g of groups) {
      working[g.key] = [];
    }
    working = { ...working };
  }

  function apply() {
    onApply?.(working);
    // Build URL params
    const params = new URLSearchParams();
    for (const g of groups) {
      const vals = working[g.key] ?? [];
      if (vals.length > 0 && !(vals.length === 1 && vals[0] === "")) {
        params.set(g.key, vals.join(","));
      }
    }
    const qs = params.toString();
    const url = formAction
      ? `${formAction}${qs ? "?" + qs : ""}`
      : `${location.pathname}${qs ? "?" + qs : ""}`;
    location.href = url;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closePanel(true);
    if (e.key === "Tab" && open) {
      // Trap focus inside panel
      const focusables = root?.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    if (!open) return;
    if (root && !root.contains(e.target as Node)) {
      closePanel(true);
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleKeydown);
      return () => {
        document.removeEventListener("click", handleOutsideClick);
        document.removeEventListener("keydown", handleKeydown);
      };
    }
  });
</script>

<div class="relative inline-block" bind:this={root}>
  <button
    type="button"
    data-filter-trigger
    onclick={() => (open ? closePanel(true) : openPanel())}
    aria-haspopup="true"
    aria-expanded={open}
    class="inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95
      {activeCount > 0
      ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm hover:bg-ink-800'
      : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-300'}"
  >
    <Icon name="filter" size={13} stroke={2.25} />
    Filter
    {#if activeCount > 0}
      <span
        class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-extrabold text-white"
      >
        {activeCount}
      </span>
    {/if}
    <Icon name={open ? "chevron-up" : "chevron-down"} size={12} stroke={2.5} />
  </button>

  {#if open}
    <div
      class="absolute left-0 top-full z-50 mt-2 w-[min(92vw,360px)] origin-top rounded-2xl border border-ink-200 bg-surface p-3 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] ring-1 ring-ink-900/5"
      role="dialog"
      aria-label="Filter panel"
    >
      <div class="mb-2 flex items-center justify-between border-b border-ink-100 pb-2">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-ink-500"
          >Filter</span
        >
        <button
          type="button"
          onclick={resetAll}
          disabled={totalSelected === 0}
          class="text-[11px] font-semibold text-accent-600 transition-colors hover:text-accent-700 disabled:cursor-not-allowed disabled:text-ink-300"
        >
          Reset
        </button>
      </div>

      <div class="max-h-[60vh] space-y-3 overflow-y-auto">
        {#each groups as group (group.key)}
          <fieldset>
            <legend
              class="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-500"
            >
              {group.label}
              {#if working[group.key]?.length > 0}
                <span
                  class="rounded-md bg-ink-900 px-1.5 py-0.5 text-[9px] text-ink-50"
                >
                  {working[group.key].length}
                </span>
              {/if}
              {#if group.type === "single"}
                <span class="text-[9px] font-medium normal-case text-ink-400"
                  >(pilih satu)</span
                >
              {:else}
                <span class="text-[9px] font-medium normal-case text-ink-400"
                  >(pilih banyak)</span
                >
              {/if}
            </legend>

            <div class="flex flex-wrap gap-1.5">
              {#each group.options as opt (opt.value)}
                {@const isAll = opt.value === ""}
                {@const isSel = isAll
                  ? (working[group.key]?.length ?? 0) === 0
                  : (working[group.key] ?? []).includes(opt.value)}
                <button
                  type="button"
                  onclick={() => toggle(group.key, opt.value, group.type)}
                  aria-pressed={isSel}
                  class="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
                    {isSel
                    ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
                    : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-800'}"
                >
                  {#if group.type === "multi" && !isAll}
                    <span
                      class="grid h-3 w-3 place-items-center rounded-[4px] border {isSel
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-ink-300 bg-white'}"
                    >
                      {#if isSel}
                        <svg
                          viewBox="0 0 12 12"
                          class="h-2.5 w-2.5"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="2,6 5,9 10,3" />
                        </svg>
                      {/if}
                    </span>
                  {/if}
                  {#if opt.icon}
                    <Icon name={opt.icon} size={11} stroke={2.5} />
                  {/if}
                  {opt.label}
                  {#if opt.count !== undefined}
                    <span
                      class="rounded-md px-1 text-[10px] tabular-nums {isSel
                        ? 'bg-white/15 text-ink-50'
                        : 'bg-ink-100 text-ink-500'}"
                    >
                      {opt.count.toLocaleString("id-ID")}
                    </span>
                  {/if}
                </button>
              {/each}
            </div>
          </fieldset>
        {/each}
      </div>

      <div
        class="mt-3 flex items-center justify-end gap-2 border-t border-ink-100 pt-2"
      >
        <button
          type="button"
          onclick={() => closePanel(true)}
          class="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          Batal
        </button>
        <button
          type="button"
          onclick={apply}
          class="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-ink-50 shadow-sm transition-colors hover:bg-ink-800 active:scale-95"
        >
          Terapkan
        </button>
      </div>
    </div>
  {/if}
</div>
