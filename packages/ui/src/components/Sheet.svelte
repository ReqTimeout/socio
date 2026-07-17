<script lang="ts">
  import type { Snippet } from "svelte";
  import { haptic } from "../haptic.js";

  let {
    open = $bindable(false),
    title,
    children,
  }: { open?: boolean; title?: string; children: Snippet } = $props();

  let dialog = $state<HTMLDivElement | null>(null);
  let lastFocused: HTMLElement | null = null;

  function close() {
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) close();
  }

  // Scroll-lock + focus trap + restore focus (a11y drawer)
  $effect(() => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      dialog?.focus();
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      lastFocused?.focus();
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  });

  function onBackdrop() {
    haptic();
    close();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
    <button
      class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
      onclick={onBackdrop}
      aria-label="Tutup"
      tabindex="-1"
      type="button"
    ></button>
    <div
      bind:this={dialog}
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
      class="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-card-hover
        max-h-[88vh] overflow-y-auto safe-bottom
        [transition:transform_320ms_cubic-bezier(0.32,0.72,0,1)]"
      style="animation: sheet-up 320ms cubic-bezier(0.32,0.72,0,1);"
    >
      <style>
        @keyframes sheet-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      </style>
      <div class="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
        <h2 class="font-display font-bold text-lg text-ink-900">{title}</h2>
        <button
          onclick={close}
          aria-label="Tutup"
          class="h-9 w-9 -mr-2 grid place-items-center rounded-full text-ink-400 hover:bg-ink-100 focus-ring"
        >
          ✕
        </button>
      </div>
      <div class="p-5">
        {@render children()}
      </div>
    </div>
  </div>
{/if}
