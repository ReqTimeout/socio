<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';

  // L2: HowItWorks — token drift repair (primary→accent-ink family),
  // real prices dari prices.json, anti-pattern "browser chrome dots" dihapus,
  // progress width animation → scaleX (GPU-safe), autoplay gated IO + reduced-motion,
  // slide→fade+fly (height animation removed).

  let activeStep = 1;
  let autoPlayInterval;
  let containerEl: HTMLElement | undefined;
  let inView = true;
  let reduced = false;

  const steps = [
    { id: 1, title: 'Daftar Reseller', desc: 'Rp50.000 sekali — saldo Rp20.000 langsung masuk, harga layanan turun otomatis.' },
    { id: 2, title: 'Top Up Saldo', desc: 'Isi saldo mulai Rp10.000 via QRIS, transfer bank, atau e-wallet. Langsung masuk otomatis.' },
    { id: 3, title: 'Pilih Layanan', desc: 'Cari dari 8.270 layanan katalog: followers, likes, views, member, hingga SEO.' },
    { id: 4, title: 'Order & Bayar', desc: 'Tempel link, tentukan quantity, klik pesan. Potong saldo otomatis, status live.' },
    { id: 5, title: 'Pantau Status', desc: 'Lihat order dari Pending → Proses → Selesai di dashboard, plus notifikasi real-time.' },
  ];

  const nextStep = () => {
    activeStep = activeStep < 5 ? activeStep + 1 : 1;
  };
  const startAutoPlay = () => {
    if (reduced || !inView) return;
    autoPlayInterval = setInterval(nextStep, 6000);
  };
  const stopAutoPlay = () => clearInterval(autoPlayInterval);

  // L2 review-animations: panel transitions. Reduced motion → no fly; otherwise fly y:16 320ms.
  // Diakses via $derived supaya reactive terhadap `reduced` setelah onMount.
  const panelTrans = $derived(reduced ? null : fly);
  const panelIntro = $derived(reduced ? null : { y: 16, duration: 320 });

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        if (inView && !autoPlayInterval) startAutoPlay();
        else if (!inView) stopAutoPlay();
      },
      { threshold: 0.25 },
    );
    if (containerEl) io.observe(containerEl);
    startAutoPlay();
    return () => {
      stopAutoPlay();
      io.disconnect();
    };
  });

  // Harga real dari prices.json (Sep 2026 sync)
  const catalogRow = [
    { label: 'IG Followers 1k', price: 'Rp7.395' },
    { label: 'TT Video Views 1k', price: 'Rp165' },
    { label: 'YT Views 1k', price: 'Rp6.162' },
  ];
</script>

<section bind:this={containerEl} class="py-24 bg-[var(--paper-2)] overflow-hidden" id="cara-kerja">
  <div class="container mx-auto px-6">
    <div class="text-center mb-16">
      <h2 class="font-display font-bold text-3xl md:text-5xl text-ink mb-4">Cara Pakai Socio.id</h2>
      <p class="text-ink-3">Naikkan engagement dalam 5 langkah mudah.</p>
    </div>

    <div
      class="grid lg:grid-cols-2 gap-12 items-center"
      onmouseenter={stopAutoPlay}
      onmouseleave={startAutoPlay}
      role="group"
      aria-label="Langkah-langkah order"
    >
      <div class="space-y-3">
        {#each steps as step}
          <button
            class="w-full text-left p-5 rounded-2xl transition-all duration-300 border-l-4 relative overflow-hidden group
              {activeStep === step.id
              ? 'bg-white shadow-lg border-[var(--accent-ink)] scale-[1.02] z-10'
              : 'bg-transparent border-transparent hover:bg-white/50 opacity-60 hover:opacity-100'}"
            onclick={() => (activeStep = step.id)}
            aria-pressed={activeStep === step.id}
          >
            <h3 class="font-bold text-lg {activeStep === step.id ? 'text-[var(--accent-ink)]' : 'text-ink-3'}">{step.id}. {step.title}</h3>
            {#if activeStep === step.id}
              <p transition:fade={{ duration: 180 }} class="text-sm text-ink-2 mt-2 leading-relaxed">{step.desc}</p>
              <div class="absolute bottom-0 left-0 h-1 bg-[var(--accent-tint)] w-full mt-4 overflow-hidden">
                <div class="h-full w-full origin-left transform scale-x-0 animate-[progress_6s_linear_forwards]"></div>
              </div>
            {/if}
          </button>
        {/each}
      </div>

      <div
        class="relative h-[480px] w-full bg-white rounded-[2rem] shadow-2xl border border-[var(--hairline)] overflow-hidden flex flex-col"
      >
        <div class="bg-white border-b border-[var(--hairline)] p-4 flex justify-between items-center shadow-sm z-20">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-[var(--accent-ink)] flex items-center justify-center text-white font-bold text-xs" aria-hidden="true">S</div>
            <span class="font-bold text-ink text-sm">Socio.id Dashboard</span>
          </div>
          <div class="hidden md:block bg-[var(--paper-2)] px-4 py-1.5 rounded-full text-[10px] text-ink-3 font-mono w-1/2 text-center">
            app.socio.id/dashboard
          </div>
        </div>

        <div class="flex-1 relative bg-[var(--paper-2)] p-6 overflow-hidden flex items-center justify-center">
          {#if activeStep === 1}
            {#if panelTrans}
              <div in:panelTrans={panelIntro} class="w-full max-w-sm text-center">
                <div class="bg-white p-8 rounded-2xl shadow-lg border border-[var(--hairline)] relative">
                  <div class="w-16 h-16 bg-[var(--accent-tint)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-[var(--accent-ink)]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/></svg>
                  </div>
                  <h4 class="font-bold text-ink mb-1">Daftar Reseller</h4>
                  <p class="text-xs text-ink-3 mb-4">Rp50.000 sekali bayar</p>
                  <p class="text-[10px] text-ink-3 mb-4">Saldo Rp20.000 langsung jalan</p>
                  <div class="bg-[var(--accent-ink)] text-white rounded-full py-3 font-bold text-sm">Daftar Reseller — Rp50rb</div>
                </div>
              </div>
            {:else}
              <div class="w-full max-w-sm text-center">
                <div class="bg-white p-8 rounded-2xl shadow-lg border border-[var(--hairline)]">
                  <div class="w-16 h-16 bg-[var(--accent-tint)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-[var(--accent-ink)]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/></svg>
                  </div>
                  <h4 class="font-bold text-ink mb-1">Daftar Reseller</h4>
                  <p class="text-xs text-ink-3 mb-4">Rp50.000 sekali bayar</p>
                  <p class="text-[10px] text-ink-3 mb-4">Saldo Rp20.000 langsung jalan</p>
                  <div class="bg-[var(--accent-ink)] text-white rounded-full py-3 font-bold text-sm">Daftar Reseller — Rp50rb</div>
                </div>
              </div>
            {/if}
          {/if}

          {#if activeStep === 2}
            {#if panelTrans}
              <div in:panelTrans={panelIntro} class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-[var(--hairline)] overflow-hidden">
                <div class="p-4 border-b border-[var(--hairline)] flex justify-between items-center bg-[var(--paper-2)]">
                  <span class="text-xs font-bold text-ink">Top Up Saldo</span>
                  <span class="text-[10px] bg-[var(--accent-tint)] text-[var(--accent-ink)] px-2 py-0.5 rounded font-bold">QRIS</span>
                </div>
                <div class="p-6 text-center">
                  <div class="w-32 h-32 bg-[oklch(0.19_0.02_235)] mx-auto rounded-xl flex items-center justify-center text-white text-[10px] font-bold mb-4">SCAN QRIS</div>
                  <div class="bg-[var(--color-success-soft)] text-[var(--color-success)] text-xs font-bold py-2 rounded-lg">Saldo masuk otomatis ✓</div>
                </div>
              </div>
            {:else}
              <div class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-[var(--hairline)] overflow-hidden">
                <div class="p-4 border-b border-[var(--hairline)] flex justify-between items-center bg-[var(--paper-2)]">
                  <span class="text-xs font-bold text-ink">Top Up Saldo</span>
                  <span class="text-[10px] bg-[var(--accent-tint)] text-[var(--accent-ink)] px-2 py-0.5 rounded font-bold">QRIS</span>
                </div>
                <div class="p-6 text-center">
                  <div class="w-32 h-32 bg-[oklch(0.19_0.02_235)] mx-auto rounded-xl flex items-center justify-center text-white text-[10px] font-bold mb-4">SCAN QRIS</div>
                  <div class="bg-[var(--color-success-soft)] text-[var(--color-success)] text-xs font-bold py-2 rounded-lg">Saldo masuk otomatis ✓</div>
                </div>
              </div>
            {/if}
          {/if}

          {#if activeStep === 3}
            {#if panelTrans}
              <div in:panelTrans={panelIntro} class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-[var(--hairline)] overflow-hidden">
                <div class="p-4 border-b border-[var(--hairline)] flex justify-between items-center bg-[var(--paper-2)]">
                  <span class="text-xs font-bold text-ink">Katalog Layanan</span>
                  <span class="text-[10px] bg-[var(--accent-tint)] text-[var(--accent-ink)] px-2 py-0.5 rounded font-bold">8.270</span>
                </div>
                <div class="p-4 space-y-2">
                  {#each catalogRow as r}
                    <div class="flex justify-between items-center bg-[var(--paper-2)] rounded-lg px-3 py-2 text-xs text-ink-2">
                      <span>{r.label}</span><span class="font-bold text-[var(--accent-ink)] num">{r.price}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-[var(--hairline)] overflow-hidden">
                <div class="p-4 border-b border-[var(--hairline)] flex justify-between items-center bg-[var(--paper-2)]">
                  <span class="text-xs font-bold text-ink">Katalog Layanan</span>
                  <span class="text-[10px] bg-[var(--accent-tint)] text-[var(--accent-ink)] px-2 py-0.5 rounded font-bold">8.270</span>
                </div>
                <div class="p-4 space-y-2">
                  {#each catalogRow as r}
                    <div class="flex justify-between items-center bg-[var(--paper-2)] rounded-lg px-3 py-2 text-xs text-ink-2">
                      <span>{r.label}</span><span class="font-bold text-[var(--accent-ink)] num">{r.price}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          {#if activeStep === 4}
            {#if panelTrans}
              <div in:panelTrans={panelIntro} class="w-full max-w-sm space-y-3">
                <div class="bg-white p-4 rounded-xl shadow-lg border border-[var(--hairline)] text-left">
                  <div class="text-[10px] text-ink-3 uppercase mb-1 font-bold tracking-wider">Link</div>
                  <div class="text-xs text-ink-2 bg-[var(--paper-2)] rounded px-2 py-1.5 mb-2 font-mono">instagram.com/p/abcd</div>
                  <div class="flex justify-between text-xs text-ink-2"><span>Quantity</span><span class="font-bold num">1.000</span></div>
                  <div class="flex justify-between text-sm mt-2 pt-2 border-t border-dashed border-[var(--hairline)]"><span class="font-bold text-ink">Total</span><span class="font-display font-bold text-[var(--accent-ink)] num">Rp7.395</span></div>
                  <div class="bg-[var(--accent-ink)] text-white text-center rounded-full py-2 mt-3 text-sm font-bold">Pesan Sekarang</div>
                </div>
              </div>
            {:else}
              <div class="w-full max-w-sm space-y-3">
                <div class="bg-white p-4 rounded-xl shadow-lg border border-[var(--hairline)] text-left">
                  <div class="text-[10px] text-ink-3 uppercase mb-1 font-bold tracking-wider">Link</div>
                  <div class="text-xs text-ink-2 bg-[var(--paper-2)] rounded px-2 py-1.5 mb-2 font-mono">instagram.com/p/abcd</div>
                  <div class="flex justify-between text-xs text-ink-2"><span>Quantity</span><span class="font-bold num">1.000</span></div>
                  <div class="flex justify-between text-sm mt-2 pt-2 border-t border-dashed border-[var(--hairline)]"><span class="font-bold text-ink">Total</span><span class="font-display font-bold text-[var(--accent-ink)] num">Rp7.395</span></div>
                  <div class="bg-[var(--accent-ink)] text-white text-center rounded-full py-2 mt-3 text-sm font-bold">Pesan Sekarang</div>
                </div>
              </div>
            {/if}
          {/if}

          {#if activeStep === 5}
            {#if panelTrans}
              <div in:panelTrans={panelIntro} class="w-full max-w-sm space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-[var(--hairline)]">
                    <div class="text-[10px] text-ink-3 mb-1 font-bold">Saldo</div>
                    <div class="text-xl font-bold text-[var(--accent-ink)] num">Rp 249.982</div>
                  </div>
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-[var(--hairline)]">
                    <div class="text-[10px] text-ink-3 mb-1 font-bold">Order Hari Ini</div>
                    <div class="text-xl font-bold text-ink num">37</div>
                  </div>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-[var(--hairline)] space-y-2">
                  <div class="text-[10px] text-ink-3 font-bold">Status Live</div>
                  {#each [{ s: 'Proses', c: 'bg-[var(--color-warning)]' }, { s: 'Selesai', c: 'bg-[var(--color-success)]' }] as r}
                    <div class="flex justify-between items-center text-xs">
                      <span class="font-mono text-ink-2 num">SOC-8823{r.s === 'Proses' ? '1' : '0'}</span>
                      <span class="text-white {r.c} px-2 py-0.5 rounded-full text-[10px] font-bold">{r.s}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="w-full max-w-sm space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-[var(--hairline)]">
                    <div class="text-[10px] text-ink-3 mb-1 font-bold">Saldo</div>
                    <div class="text-xl font-bold text-[var(--accent-ink)] num">Rp 249.982</div>
                  </div>
                  <div class="bg-white p-4 rounded-xl shadow-sm border border-[var(--hairline)]">
                    <div class="text-[10px] text-ink-3 mb-1 font-bold">Order Hari Ini</div>
                    <div class="text-xl font-bold text-ink num">37</div>
                  </div>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-[var(--hairline)] space-y-2">
                  <div class="text-[10px] text-ink-3 font-bold">Status Live</div>
                  {#each [{ s: 'Proses', c: 'bg-[var(--color-warning)]' }, { s: 'Selesai', c: 'bg-[var(--color-success)]' }] as r}
                    <div class="flex justify-between items-center text-xs">
                      <span class="font-mono text-ink-2 num">SOC-8823{r.s === 'Proses' ? '1' : '0'}</span>
                      <span class="text-white {r.c} px-2 py-0.5 rounded-full text-[10px] font-bold">{r.s}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* L2 review-animations: progress width → transform scaleX (GPU-safe).
     transform-origin left + scaleX 0 → 1. */
  @keyframes progress {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .animate-\[progress_6s_linear_forwards\] {
    animation: progress 6s linear forwards;
  }
</style>