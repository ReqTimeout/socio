<script lang="ts">
  type BadgeStatus =
    | "pending"
    | "proses"
    | "selesai"
    | "batal"
    | "partial"
    | "error"
    | "refilling"
    | "processing"
    | "success"
    | "canceled"
    | "in progress"
    | string;

  let { status, animated = true }: { status: BadgeStatus; animated?: boolean } = $props();

  // UX4.2 — Status variance: optional pulse/rotate animations per status
  const map: Record<string, { label: string; cls: string; motion?: string }> = {
    pending: {
      label: "Pending",
      cls: "bg-status-pending-soft text-status-pending ring-1 ring-status-pending/15",
      motion: "status-pulse-pending",
    },
    proses: {
      label: "Proses",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
      motion: "status-spin-proses",
    },
    processing: {
      label: "Proses",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
      motion: "status-spin-proses",
    },
    "in progress": {
      label: "Proses",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
      motion: "status-spin-proses",
    },
    selesai: {
      label: "Selesai",
      cls: "bg-status-complete-soft text-status-complete ring-1 ring-status-complete/15",
    },
    success: {
      label: "Selesai",
      cls: "bg-status-complete-soft text-status-complete ring-1 ring-status-complete/15",
    },
    batal: {
      label: "Batal",
      cls: "bg-status-canceled-soft text-status-canceled ring-1 ring-status-canceled/15",
    },
    canceled: {
      label: "Batal",
      cls: "bg-status-canceled-soft text-status-canceled ring-1 ring-status-canceled/15",
    },
    partial: {
      label: "Partial",
      cls: "bg-status-partial-soft text-status-partial ring-1 ring-status-partial/15",
      motion: "status-pulse-partial",
    },
    error: {
      label: "Error",
      cls: "bg-status-canceled-soft text-status-canceled ring-1 ring-status-canceled/15",
    },
    refilling: {
      label: "Refill",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
    },
  };
  const s = $derived(map[String(status).toLowerCase()] ?? map.pending);
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold {s.cls}"
>
  {#if s.motion && animated}
    <span
      aria-hidden="true"
      class="inline-block h-1.5 w-1.5 rounded-full bg-current {s.motion}"
    ></span>
  {/if}
  {s.label}
</span>

<style>
  /* UX4.2 — Status variance per state. CSS-only (no JS) — no layout thrash.
     Honor prefers-reduced-motion: no animation. */
  @keyframes status-pulse-pending {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(0.85); }
  }
  @keyframes status-spin-proses {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes status-pulse-partial {
    0%, 100% { opacity: 1; transform: scaleY(1); }
    50% { opacity: 0.4; transform: scaleY(0.6); }
  }
  .status-pulse-pending {
    animation: status-pulse-pending 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .status-spin-proses {
    animation: status-spin-proses 2.2s linear infinite;
    border-radius: 50%;
  }
  .status-pulse-partial {
    animation: status-pulse-partial 1.2s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .status-pulse-pending,
    .status-spin-proses,
    .status-pulse-partial {
      animation: none;
    }
  }
</style>
