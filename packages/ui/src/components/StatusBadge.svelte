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
      cls: "bg-status-pending/15 text-status-pending ring-1 ring-status-pending/20",
    },
    proses: {
      label: "Proses",
      cls: "bg-status-progress/15 text-status-progress ring-1 ring-status-progress/20",
    },
    processing: {
      label: "Proses",
      cls: "bg-status-progress/15 text-status-progress ring-1 ring-status-progress/20",
    },
    "in progress": {
      label: "Proses",
      cls: "bg-status-progress/15 text-status-progress ring-1 ring-status-progress/20",
    },
    selesai: {
      label: "Selesai",
      cls: "bg-status-complete/15 text-status-complete ring-1 ring-status-complete/20",
    },
    success: {
      label: "Selesai",
      cls: "bg-status-complete/15 text-status-complete ring-1 ring-status-complete/20",
    },
    batal: {
      label: "Batal",
      cls: "bg-status-canceled/15 text-status-canceled ring-1 ring-status-canceled/20",
    },
    canceled: {
      label: "Batal",
      cls: "bg-status-canceled/15 text-status-canceled ring-1 ring-status-canceled/20",
    },
    partial: {
      label: "Partial",
      cls: "bg-status-partial/15 text-status-partial ring-1 ring-status-partial/20",
    },
    error: {
      label: "Error",
      cls: "bg-status-canceled/15 text-status-canceled ring-1 ring-status-canceled/20",
    },
    refilling: {
      label: "Refill",
      cls: "bg-status-progress/15 text-status-progress ring-1 ring-status-progress/20",
    },
  };
  const s = $derived(map[String(status).toLowerCase()] ?? map.pending);
</script>

<span
  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold {s.cls}"
>
  {s.label}
</span>
