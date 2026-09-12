<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  // Clone Haloka Features.svelte:30 interval 3s + tweened → Socio SMM order status rotator
  let orderState = 0;
  const orderData = [
    {
      label: 'PENDING',
      color: 'bg-amber-100 text-amber-700',
      border: 'border-amber-200',
      bubble: '“Order #48291 — 1.000 IG Followers → @rmdaa”',
      intent: 'Antre • estimasi 42 detik'
    },
    {
      label: 'DIPROSES',
      color: 'bg-blue-100 text-blue-700',
      border: 'border-blue-200',
      bubble: '“Sedang diproses — progress 62% · live-dot pulse”',
      intent: 'Diproses • bot jalan'
    },
    {
      label: 'SELESAI ✓',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
      border: 'border-emerald-200',
      bubble: '“Selesai +1.000 followers — saldo terpotong Rp42”',
      intent: 'Selesai • garansi refill'
    }
  ];

  let interval;
  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    interval = setInterval(() => {
      orderState = (orderState + 1) % 3;
    }, 3000);
    return () => clearInterval(interval);
  });
</script>

<div class="min-h-[180px] relative">
  {#key orderState}
    <div in:fade={{ duration: 300 }} class="absolute inset-0 flex flex-col justify-center">
      <div class="flex items-center gap-3 mb-4 p-3 rounded-2xl border {orderData[orderState].border} bg-white/80">
        <div class="w-9 h-9 rounded-full bg-[var(--paper-2)] grid place-items-center text-sm">📦</div>
        <div class="flex-1 min-w-0">
          <div class="text-[11px] font-bold tracking-widest text-ink-3 uppercase">Status Pesanan</div>
          <div class="h-2 w-20 bg-[var(--hairline)] rounded mt-1"></div>
        </div>
        <span class="{orderData[orderState].color} text-[11px] font-bold px-3 py-1 rounded-full transition-colors duration-300">
          {orderData[orderState].label}
        </span>
      </div>
      <div class="bg-[var(--paper-2)] p-4 rounded-2xl rounded-tr-none border border-[var(--hairline)] relative">
        <p class="text-[13px] font-medium leading-relaxed text-ink italic">
          {orderData[orderState].bubble}
        </p>
        <div class="absolute -bottom-3 -right-2 bg-white text-ink-3 text-[10px] px-2 py-1 rounded-full border shadow-sm">
          {orderData[orderState].intent}
        </div>
      </div>
      {#if orderState === 2}
        <div in:fly={{ y: 12, duration: 280 }} class="flex justify-end mt-4">
          <span class="inline-flex items-center gap-2 bg-[var(--accent-ink)] text-white text-xs font-bold px-4 py-2 rounded-full shadow">
            <span>✓</span> Garansi refill 30 hari
          </span>
        </div>
      {/if}
    </div>
  {/key}
</div>
