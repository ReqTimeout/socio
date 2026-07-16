<script>
  import { fade, fly, slide } from 'svelte/transition';
  import { onMount } from 'svelte';

  let activeStep = 1;
  let autoPlayInterval;

  const steps = [
    { id: 1, title: '1. Daftar Gratis', desc: 'Buat akun Socio.id dalam 30 detik. Langsung dapat akses dashboard & saldo trial.' },
    { id: 2, title: '2. Top Up Saldo', desc: 'Isi saldo mulai Rp10.000 via QRIS, Transfer Bank, atau e-wallet. Langsung masuk.' },
    { id: 3, title: '3. Pilih Layanan', desc: 'Cari layanan dari 8.000+ katalog: follower, like, views, hingga SEO.' },
    { id: 4, title: '4. Order & Bayar', desc: 'Tempel link, tentukan quantity, klik pesan. Potong saldo otomatis.' },
    { id: 5, title: '5. Pantau Status', desc: 'Lihat order dari Pending → Proses → Selesai live di dashboard.' },
  ];

  const nextStep = () => {
    activeStep = activeStep < 5 ? activeStep + 1 : 1;
  };
  const startAutoPlay = () => {
    autoPlayInterval = setInterval(nextStep, 6000);
  };
  const stopAutoPlay = () => clearInterval(autoPlayInterval);

  onMount(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  });
</script>

<section class="py-24 bg-ink-50 overflow-hidden" id="cara-kerja">
  <div class="container mx-auto px-6">
    <div class="text-center mb-16">
      <h2 class="font-display font-bold text-3xl md:text-5xl text-ink-900 mb-4">Cara Pakai Socio.id</h2>
      <p class="text-ink-500">Naikkan engagement dalam 5 langkah mudah.</p>
    </div>

    <div
      class="grid lg:grid-cols-2 gap-12 items-center"
      onmouseenter={stopAutoPlay}
      onmouseleave={startAutoPlay}
    >
      <div class="space-y-3">
        {#each steps as step}
          <button
            class="w-full text-left p-5 rounded-2xl transition-all duration-300 border-l-4 relative overflow-hidden group
              {activeStep === step.id
              ? 'bg-white shadow-lg border-primary scale-105 z-10'
              : 'bg-transparent border-transparent hover:bg-white/50 opacity-60 hover:opacity-100'}"
            onclick={() => (activeStep = step.id)}
          >
            <h3 class="font-bold text-lg {activeStep === step.id ? 'text-primary' : 'text-ink-500'}">{step.title}</h3>
            {#if activeStep === step.id}
              <p transition:slide class="text-sm text-ink-500 mt-2 leading-relaxed">{step.desc}</p>
              <div class="absolute bottom-0 left-0 h-1 bg-primary/20 w-full mt-4">
                <div class="h-full bg-primary w-full animate-[progress_6s_linear]"></div>
              </div>
            {/if}
          </button>
        {/each}
      </div>

      <div
        class="relative h-[480px] w-full bg-white rounded-[2rem] shadow-2xl border border-ink-100 overflow-hidden flex flex-col"
      >
        <div class="bg-white border-b border-ink-100 p-4 flex justify-between items-center shadow-sm z-20">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">S</div>
            <span class="font-bold text-ink-900 text-sm">Socio.id Dashboard</span>
          </div>
          <div class="hidden md:block bg-ink-100 px-4 py-1.5 rounded-full text-[10px] text-ink-400 font-mono w-1/2 text-center">
            app.socio.id/dashboard
          </div>
          <div class="flex gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-danger/70"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-warning/70"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-success/70"></div>
          </div>
        </div>

        <div class="flex-1 relative bg-ink-50 p-6 overflow-hidden flex items-center justify-center">
          {#if activeStep === 1}
            <div in:fly={{ y: 20, duration: 400 }} class="w-full max-w-sm text-center">
              <div class="bg-white p-8 rounded-2xl shadow-lg border border-ink-100 relative">
                <div class="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✨</div>
                <h4 class="font-bold text-ink-900 mb-1">Daftar Akun</h4>
                <p class="text-xs text-ink-400 mb-6">Email & password saja</p>
                <div class="bg-primary text-white rounded-full py-3 font-bold text-sm">Buat Akun Gratis</div>
              </div>
            </div>
          {/if}

          {#if activeStep === 2}
            <div in:fly={{ y: 20, duration: 400 }} class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-ink-100 overflow-hidden">
              <div class="p-4 border-b border-ink-100 flex justify-between items-center bg-ink-50">
                <span class="text-xs font-bold text-ink-900">Top Up Saldo</span>
                <span class="text-[10px] bg-accent-100 text-accent-700 px-2 py-0.5 rounded">QRIS</span>
              </div>
              <div class="p-6 text-center">
                <div class="w-32 h-32 bg-ink-900 mx-auto rounded-xl flex items-center justify-center text-white text-[10px] font-bold mb-4">SCAN QRIS</div>
                <div class="bg-success-soft text-success text-xs font-bold py-2 rounded-lg">Saldo masuk otomatis ✓</div>
              </div>
            </div>
          {/if}

          {#if activeStep === 3}
            <div in:fly={{ y: 20, duration: 400 }} class="w-full max-w-sm bg-white rounded-xl shadow-lg border border-ink-100 overflow-hidden">
              <div class="p-4 border-b border-ink-100 flex justify-between items-center bg-ink-50">
                <span class="text-xs font-bold text-ink-900">Katalog Layanan</span>
                <span class="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded">8.185</span>
              </div>
              <div class="p-4 space-y-2">
                {#each ['IG Followers 1k — Rp18', 'TT Views 1k — Rp8', 'YT Views 1k — Rp25'] as l}
                  <div class="flex justify-between items-center bg-ink-50 rounded-lg px-3 py-2 text-xs text-ink-700">
                    <span>{l}</span><span class="text-accent-600 font-bold">Pilih →</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if activeStep === 4}
            <div in:fly={{ y: 20, duration: 400 }} class="w-full max-w-sm space-y-3">
              <div class="bg-white p-4 rounded-xl shadow-lg border border-ink-100 text-left">
                <div class="text-[10px] text-ink-400 uppercase mb-1">Link</div>
                <div class="text-xs text-ink-600 bg-ink-50 rounded px-2 py-1.5 mb-2">instagram.com/p/abcd</div>
                <div class="flex justify-between text-xs text-ink-600"><span>Quantity</span><span class="font-bold">1.000</span></div>
                <div class="flex justify-between text-sm mt-2 pt-2 border-t border-dashed border-ink-100"><span class="font-bold text-ink-800">Total</span><span class="font-display font-bold text-primary">Rp 18</span></div>
                <div class="bg-primary text-white text-center rounded-full py-2 mt-3 text-sm font-bold">Pesan Sekarang</div>
              </div>
            </div>
          {/if}

          {#if activeStep === 5}
            <div in:fly={{ y: 20, duration: 400 }} class="w-full max-w-sm space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-4 rounded-xl shadow-sm border border-ink-100">
                  <div class="text-[10px] text-ink-400 mb-1 font-bold">Saldo</div>
                  <div class="text-xl font-bold text-primary">Rp 249.982</div>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-ink-100">
                  <div class="text-[10px] text-ink-400 mb-1 font-bold">Order Hari Ini</div>
                  <div class="text-xl font-bold text-ink-800">37</div>
                </div>
              </div>
              <div class="bg-white p-4 rounded-xl shadow-sm border border-ink-100 space-y-2">
                <div class="text-[10px] text-ink-400 font-bold">Status Live</div>
                {#each [{ s: 'Proses', c: 'bg-status-progress' }, { s: 'Selesai', c: 'bg-status-complete' }] as r}
                  <div class="flex justify-between items-center text-xs">
                    <span class="font-mono text-ink-500">SOC-8823{r.s === 'Proses' ? '1' : '0'}</span>
                    <span class="text-white {r.c} px-2 py-0.5 rounded-full text-[10px] font-bold">{r.s}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  @keyframes progress {
    0% {
      width: 0%;
    }
    100% {
      width: 100%;
    }
  }
</style>
