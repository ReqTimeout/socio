<script lang="ts">
  import Button from "./Button.svelte";

  let {
    open = $bindable(false),
    title = "Konfirmasi",
    message = "",
    confirmLabel = "Ya",
    cancelLabel = "Batal",
    danger = false,
    onConfirm,
    children,
  }: {
    open?: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm?: () => void;
    children?: import("svelte").Snippet;
  } = $props();

  function cancel() {
    open = false;
  }
  function confirm() {
    open = false;
    onConfirm?.();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[95] flex items-center justify-center p-4">
    <button class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onclick={cancel} aria-label="Batal" tabindex="-1" type="button"></button>
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      class="relative w-full max-w-sm bg-white rounded-card shadow-card-hover p-6 text-center
        [transition:transform_200ms_var(--ease-out-soft),opacity_200ms_var(--ease-out-soft)]"
    >
      <h2 class="font-display font-bold text-lg text-ink-900">{title}</h2>
      <p class="mt-2 text-sm text-ink-500">{message}</p>
      {#if children}
        <div class="mt-4">{@render children()}</div>
      {:else}
        <div class="mt-6 flex gap-3">
          <Button variant="ghost" full onclick={cancel}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} full onclick={confirm}>{confirmLabel}</Button>
        </div>
      {/if}
    </div>
  </div>
{/if}
