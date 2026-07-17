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
    pending: { label: "Pending", cls: "bg-status-pending/10 text-status-pending" },
    proses: { label: "Proses", cls: "bg-status-progress/10 text-status-progress" },
    processing: { label: "Proses", cls: "bg-status-progress/10 text-status-progress" },
    "in progress": { label: "Proses", cls: "bg-status-progress/10 text-status-progress" },
    selesai: { label: "Selesai", cls: "bg-status-complete/10 text-status-complete" },
    success: { label: "Selesai", cls: "bg-status-complete/10 text-status-complete" },
    batal: { label: "Batal", cls: "bg-status-canceled/10 text-status-canceled" },
    canceled: { label: "Batal", cls: "bg-status-canceled/10 text-status-canceled" },
    partial: { label: "Partial", cls: "bg-status-partial/10 text-status-partial" },
    error: { label: "Error", cls: "bg-status-canceled/10 text-status-canceled" },
    refilling: { label: "Refill", cls: "bg-status-progress/10 text-status-progress" },
  };
  const s = $derived(map[String(status).toLowerCase()] ?? map.pending);
</script>

<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold {s.cls}">
  {s.label}
</span>
