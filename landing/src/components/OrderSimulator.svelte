<script>
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  let step = 0; // 0: choose, 1: fill link, 2: processing, 3: done
  let link = '';
  let qty = 1000;

  const services = [
    { id: 'ig_followers', name: 'Instagram Followers 🔥', price: 18, unit: 'per 1k' },
    { id: 'ig_likes', name: 'Instagram Likes ❤️', price: 12, unit: 'per 1k' },
    { id: 'tt_views', name: 'TikTok Views ▶️', price: 8, unit: 'per 1k' },
    { id: 'yt_views', name: 'YouTube Views 📺', price: 25, unit: 'per 1k' },
  ];
  let selected = services[0];

  const formatIDR = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
  const total = $derived(Math.ceil((qty / 1000) * selected.price));

  const scenario = [
    'Milih layanan Instagram Followers…',
    'Nempel link & quantity…',
    'Cek stok provider SMMturk…',
    'Order masuk antrean, diproses otomatis 🚀',
  ];

  onMount(() => {
    const timers = [];
    timers.push(setTimeout(() => (step = 1), 1200));
    timers.push(setTimeout(() => (step = 2), 2600));
    timers.push(setTimeout(() => (step = 3), 5200));
    return () => timers.forEach(clearTimeout);
  });
</script>

<div
  class="relative mx-auto border-ink-900 bg-ink-900 border-[12px] rounded-[2.5rem] h-[650px] w-[340px] shadow-2xl shadow-primary-900/40 flex flex-col overflow-hidden transform hover:scale-105 transition-transform duration-500 ease-out"
>
  <div
    class="bg-primary p-4 pt-8 text-white flex items-center gap-3 shadow-md z-20 relative"
  >
    <div class="relative">
      <div
        class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary font-bold text-lg border-2 border-white/20"
      >
        S
      </div>
      <div
        class="absolute bottom-0 right-0 w-3 h-3 bg-accent-400 rounded-full border-2 border-primary animate-pulse"
      >
      </div>
    </div>
    <div>
      <h3 class="font-display font-bold text-base tracking-wide">Socio.id</h3>
      <p class="text-[10px] text-accent-200 flex items-center gap-1">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-accent-400"></span>
        Online 24 Jam
      </p>
    </div>
  </div>

  <div class="flex-1 bg-ink-50 p-4 overflow-y-auto space-y-4 pb-20 scroll-smooth relative">
    <div class="text-center">
      <span
        class="bg-white text-ink-600 text-[10px] px-3 py-1 rounded shadow-sm font-medium"
        >Pesan Layanan Sosmed</span
      >
    </div>

    {#if step >= 1}
      <div in:fly={{ y: 10, duration: 400 }} class="bg-white rounded-2xl p-4 shadow-sm border border-ink-100 space-y-3">
        <div class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Pilih Layanan</div>
        <div class="space-y-2">
          {#each services as s}
            <button
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left text-sm transition
                {selected.id === s.id
                ? 'border-primary bg-primary-50 text-primary-800 font-bold'
                : 'border-ink-200 text-ink-600 hover:border-primary-300'}"
              onclick={() => (selected = s)}
            >
              <span>{s.name}</span>
              <span class="text-[11px] text-ink-400">Rp{s.price}/1k</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if step >= 2}
      <div in:fly={{ y: 10, duration: 400 }} class="bg-white rounded-2xl p-4 shadow-sm border border-ink-100 space-y-3">
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Link Postingan</label>
          <div class="mt-1 bg-ink-50 rounded-lg px-3 py-2 text-xs text-ink-500 border border-ink-100">instagram.com/p/abcd1234</div>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Quantity</span>
          <span class="font-bold text-ink-800">{qty.toLocaleString('id-ID')}</span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-dashed border-ink-100">
          <span class="text-xs text-ink-500">Total</span>
          <span class="font-display font-bold text-primary text-lg">Rp {formatIDR(total)}</span>
        </div>
      </div>
    {/if}

    {#if step === 2}
      <div in:fade class="bg-white rounded-2xl p-4 shadow-sm border border-ink-100">
        <div class="flex items-center gap-2 text-sm text-ink-600">
          <span class="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
          Memproses order…
        </div>
      </div>
    {/if}

    {#if step === 3}
      <div in:fly={{ y: 10, duration: 500 }} class="bg-white rounded-2xl p-4 shadow-sm border border-success/30">
        <div class="flex items-center gap-2 text-success font-bold text-sm mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"
            ></path></svg
          >
          Order Berhasil! 🎉
        </div>
        <p class="text-xs text-ink-500">Order #SOC-88231 diproses otomatis. Cek status di dashboard kapan saja.</p>
      </div>
    {/if}
  </div>

  <div
    class="absolute bottom-0 left-0 w-full bg-white p-3 flex items-center gap-2 z-20 border-t border-ink-100"
  >
    <div
      class="flex-1 bg-ink-50 rounded-full h-10 px-4 text-sm flex items-center text-ink-400 border border-ink-100"
    >
      Saldo: Rp 250.000
    </div>
    <div
      class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg"
    >
      ➤
    </div>
  </div>
</div>
