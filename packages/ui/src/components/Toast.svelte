<script lang="ts">
  import { toasts, type ToastKind } from "../toast.js";

  const styles: Record<ToastKind, string> = {
    success: "bg-success text-white",
    error: "bg-danger text-white",
    info: "bg-ink-900 text-white",
  };
</script>

<div class="fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
  {#each $toasts as t (t.id)}
    <div
      class="pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-card {styles[t.kind]}
        [transition:transform_250ms_var(--ease-out-soft),opacity_250ms_var(--ease-out-soft)]"
      role="status"
    >
      {t.message}
    </div>
  {/each}
</div>
