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

  let { status }: { status: BadgeStatus } = $props();

  const map: Record<string, { label: string; cls: string }> = {
    pending: {
      label: "Pending",
      cls: "bg-status-pending-soft text-status-pending ring-1 ring-status-pending/15",
    },
    proses: {
      label: "Proses",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
    },
    processing: {
      label: "Proses",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
    },
    "in progress": {
      label: "Proses",
      cls: "bg-status-progress-soft text-status-progress ring-1 ring-status-progress/15",
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
  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold {s.cls}"
>
  {s.label}
</span>
