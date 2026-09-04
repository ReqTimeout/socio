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

  let dialog = $state<HTMLDivElement | null>(null);
  let lastFocused: HTMLElement | null = null;

  // Selector fokus yang eligible untuk tab-trap (a11y WAI-ARIA APG).
  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusable(): HTMLElement[] {
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
  }

  function cancel() {
    open = false;
  }
  function confirm() {
    open = false;
    onConfirm?.();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      cancel();
      return;
    }
    // Tab trap — cycle focus di dalam dialog (P8-03).
    if (e.key === "Tab" && open) {
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !dialog?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  // P8-03: focus trap + scroll-lock + restore focus on close.
  $effect(() => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement;
      // Microtask: focus ke dialog dulu, lalu ke tombol konfirmasi kalau ada.
      queueMicrotask(() => {
        const items = getFocusable();
        if (items.length > 0) items[0].focus();
        else dialog?.focus();
      });
      window.addEventListener("keydown", onKey);
    } else {
      window.removeEventListener("keydown", onKey);
      lastFocused?.focus();
    }
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });
</script>

{#if open}
  <div class="fixed inset-0 z-[95] flex items-center justify-center p-4">
    <button class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onclick={cancel} aria-label="Batal" tabindex="-1" type="button"></button>
    <div
      bind:this={dialog}
      tabindex="-1"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={message ? "confirm-msg" : undefined}
      class="relative w-full max-w-sm bg-white rounded-card shadow-card-hover p-6 text-center
        [transition:transform_200ms_var(--ease-out-soft),opacity_200ms_var(--ease-out-soft)]"
    >
      <h2 id="confirm-title" class="font-display font-bold text-lg text-ink-900">{title}</h2>
      <p id="confirm-msg" class="mt-2 text-sm text-ink-500">{message}</p>
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
