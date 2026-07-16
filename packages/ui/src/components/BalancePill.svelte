<script lang="ts">
  let { balance }: { balance: number } = $props();
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
</script>

<div
  class="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-4 py-2"
>
  <span class="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
  <span class="text-xs font-bold text-ink-500 uppercase tracking-wide">Saldo</span>
  <span class="font-display font-bold text-primary">Rp {fmt(balance)}</span>
</div>
