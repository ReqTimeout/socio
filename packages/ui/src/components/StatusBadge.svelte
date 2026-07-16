<script lang="ts">
  type Status = 'pending' | 'proses' | 'selesai' | 'batal' | 'partial';

  let { status }: { status: Status } = $props();

  const map: Record<Status, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-status-pending/10 text-status-pending' },
    proses: { label: 'Proses', cls: 'bg-status-progress/10 text-status-progress' },
    selesai: { label: 'Selesai', cls: 'bg-status-complete/10 text-status-complete' },
    batal: { label: 'Batal', cls: 'bg-status-canceled/10 text-status-canceled' },
    partial: { label: 'Partial', cls: 'bg-status-partial/10 text-status-partial' },
  };
  const s = $derived(map[status]);
</script>

<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold {s.cls}">
  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
  {s.label}
</span>
