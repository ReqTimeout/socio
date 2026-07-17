<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  let {
    value = $bindable(""),
    label,
    error,
    hint,
    id = `inp-${Math.random().toString(36).slice(2)}`,
    ...rest
  }: { value?: string; label?: string; error?: string; hint?: string; id?: string } & HTMLInputAttributes = $props();

  const base =
    "w-full rounded-2xl border bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary";
  const border = $derived(error ? "border-danger" : "border-ink-200");
</script>

{#if label}
  <label for={id} class="block text-sm font-semibold text-ink-700 mb-1.5">{label}</label>
{/if}
<input
  {id}
  bind:value
  class="{base} {border}"
  aria-invalid={error ? "true" : undefined}
  {...rest}
/>
{#if error}
  <p class="mt-1.5 text-xs font-medium text-danger">{error}</p>
{:else if hint}
  <p class="mt-1.5 text-xs text-ink-400">{hint}</p>
{/if}
