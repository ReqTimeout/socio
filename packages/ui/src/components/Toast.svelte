<script lang="ts">
  import { toasts, type ToastKind } from "../toast.js";

  const styles: Record<ToastKind, string> = {
    success: "bg-success text-white",
    error: "bg-danger text-white",
    info: "bg-ink-900 text-white",
  };
</script>

<!-- Mobile: bottom-center above dock+FAB | Desktop: top-right (offset sidebar) -->
<div
  class="fixed z-[100] flex flex-col gap-2 px-4 pointer-events-none
    inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] items-center
    lg:inset-x-auto lg:right-6 lg:top-4 lg:bottom-auto lg:items-end lg:ml-72 lg:px-0"
>
  {#each $toasts as t (t.id)}
    <div
      class="pointer-events-auto flex items-center gap-2 rounded-full py-3 pr-5 pl-4 text-sm font-semibold shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)] {styles[t.kind]}
        {t.kind === 'error' ? 'toast-shake' : 'animate-[toast-in_280ms_var(--ease-out-soft)]'}"
      role="status"
    >
      {#if t.kind === "success"}
        <svg
          class="toast-check h-4 w-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 8.5 6.5 12 13 4.5"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            pathLength="1"
          />
        </svg>
      {/if}
      {t.message}
    </div>
  {/each}
</div>

<style>
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  /* M13 — checkmark draw 400ms sekali */
  .toast-check path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: toast-draw 400ms var(--ease-out-soft) 60ms forwards;
  }
  @keyframes toast-draw {
    to { stroke-dashoffset: 0; }
  }
  /* Error shake 1× 340ms (pola auth) */
  .toast-shake {
    animation:
      toast-in 280ms var(--ease-out-soft),
      toast-shake 340ms ease-in-out 280ms 1;
  }
  @keyframes toast-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    50% { transform: translateX(4px); }
    75% { transform: translateX(-2px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast-check path {
      animation: none;
      stroke-dashoffset: 0;
    }
    .toast-shake {
      animation: toast-in 280ms var(--ease-out-soft);
    }
  }
</style>
