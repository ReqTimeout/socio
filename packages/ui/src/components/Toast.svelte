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
      class="pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)] {styles[t.kind]}
        animate-[toast-in_280ms_var(--ease-out-soft)]"
      role="status"
    >
      {t.message}
    </div>
  {/each}
</div>

<style>
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
</style>
