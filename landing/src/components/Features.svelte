<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';

  let observer;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0', 'translate-y-10');
            entry.target.classList.add('opacity-100', 'translate-y-0');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
  });
</script>

<section id="layanan" class="py-12 md:pb-24 md:pt-16 bg-gradient-to-b from-ink-50 to-white overflow-hidden relative min-h-screen">
  <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100/40 rounded-full blur-[100px] -z-10 translate-x-1/2"></div>
  <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent-100/40 rounded-full blur-[100px] -z-10 -translate-x-1/2"></div>

  <div class="container mx-auto px-6 space-y-16 md:space-y-32 relative z-10">
    <div class="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
      <div
        class="relative group animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out"
      >
        <div
          class="absolute inset-0 bg-primary-200/40 rounded-[2.5rem] blur-3xl -z-10 group-hover:bg-primary-300/50 transition duration-500 transform group-hover:scale-105"
        >
        </div>
        <div
          class="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-primary-900/5 border border-white/50 relative overflow-hidden transform transition duration-500 hover:-translate-y-2 hover:rotate-1"
        >
          <div class="flex justify-between items-center mb-6">
            <span class="text-[10px] font-bold tracking-[0.2em] text-ink-400 uppercase flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse"></span> Katalog Engine
            </span>
            <div class="flex gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-danger/70"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-warning/70"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-success/70"></div>
            </div>
          </div>
          <div
            class="bg-ink-50 rounded-xl p-5 mb-6 font-mono text-xs leading-relaxed border border-ink-100 text-primary-900 shadow-inner"
          >
            <p class="mb-2 flex items-center">
              <span class="text-ink-400 mr-2">$</span> sync --provider smmturk
            </p>
            <div class="w-full bg-ink-200 rounded-full h-1.5 mb-2 overflow-hidden relative">
              <div class="loading-bar bg-primary h-1.5 rounded-full absolute top-0 left-0"></div>
            </div>
            <p class="flex items-center">
              <span class="text-ink-400 mr-2">></span> Status:
              <span class="text-success font-bold ml-1 bg-success-soft px-1 rounded">8.185 layanan siap</span>
            </p>
          </div>
          <div class="flex gap-3 items-start">
            <div class="text-2xl">💡</div>
            <p
              class="text-sm text-ink-500 italic leading-relaxed bg-primary-50/50 p-3 rounded-lg border border-primary-100"
            >
              "Cari follower IG, like TikTok, views YouTube, sampai SEO — semua ada di satu dashboard."
            </p>
          </div>
        </div>
      </div>
      <div
        class="space-y-4 md:space-y-6 animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200"
      >
        <h3 class="font-display font-bold text-3xl md:text-4xl text-ink-900 leading-tight">
          Lupakan Panel<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-600"
            >Cuma Punya 10 Layanan.</span
          >
        </h3>
        <p class="text-base md:text-lg text-ink-600 leading-relaxed font-light">
          Socio.id terhubung langsung ke provider terbesar. <strong>Lebih dari 8.000 layanan</strong>
          dari Instagram, TikTok, YouTube, hingga SEO — auto-sinkron harga & stok tiap jam.
        </p>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
      <div class="space-y-4 md:space-y-6 order-2 md:order-1 animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out">
        <h3 class="font-display font-bold text-3xl md:text-4xl text-ink-900 leading-tight">
          Status Order<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent-600 to-primary"
            >Real-time & Transparan.</span
          >
        </h3>
        <p class="text-base md:text-lg text-ink-600 leading-relaxed font-light">
          Pantau order dari <strong>Pending → Proses → Selesai</strong> live di dashboard.
          Gak perlu nanya CS, semua kelihatan sendiri.
        </p>
      </div>

      <div
        class="relative group order-1 md:order-2 animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200"
      >
        <div class="absolute inset-0 bg-accent-200/40 rounded-[2.5rem] blur-3xl -z-10 transition duration-500"></div>
        <div class="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white/50 relative min-h-[280px]">
          <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-bold text-ink-400 uppercase">Live Order Status</span>
            <span class="bg-success-soft text-success text-[10px] px-2 py-1 rounded font-bold">Auto</span>
          </div>
          <div class="space-y-3">
            {#each [{ s: 'Pending', c: 'bg-status-pending', n: 'SOC-88231' }, { s: 'Proses', c: 'bg-status-progress', n: 'SOC-88230' }, { s: 'Selesai', c: 'bg-status-complete', n: 'SOC-88229' }] as row}
              <div class="flex items-center justify-between bg-ink-50 rounded-xl px-4 py-3 border border-ink-100">
                <span class="text-xs font-mono text-ink-500">{row.n}</span>
                <span class="flex items-center gap-2 text-xs font-bold text-white {row.c} px-3 py-1 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-white/80"></span>{row.s}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
      <div
        class="relative group animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out"
      >
        <div class="absolute inset-0 bg-warning-soft rounded-[2.5rem] blur-3xl -z-10 group-hover:bg-warning-soft/80 transition duration-500"></div>
        <div class="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white/50 relative overflow-hidden">
          <div class="flex justify-between items-center mb-8 border-b border-ink-100 pb-4">
            <span class="text-xs font-bold text-ink-400 uppercase">Garansi & Refill</span>
            <span class="bg-success-soft text-success text-[10px] px-2 py-1 rounded font-bold">Active</span>
          </div>
          <div class="relative pl-6 border-l-2 border-ink-100 space-y-8">
            <div class="relative">
              <div class="absolute -left-[31px] top-0 w-4 h-4 bg-success rounded-full border-2 border-white shadow-lg shadow-success/30"></div>
              <div class="text-xs text-ink-400 mb-1">Drop terdeteksi</div>
              <div class="bg-ink-50 p-3 rounded-lg text-xs text-ink-600 italic">-120 follower dalam 7 hari</div>
            </div>
            <div class="relative py-2">
              <div class="flex items-center gap-2 text-[10px] text-success bg-success-soft w-fit px-2 py-1 rounded">
                <span class="animate-spin">🔄</span> Refill otomatis…
              </div>
            </div>
            <div class="relative">
              <div class="absolute -left-[31px] top-0 w-4 h-4 bg-accent-500 rounded-full border-2 border-white shadow-lg shadow-accent-500/30"></div>
              <div class="text-xs text-accent-700 font-bold mb-1">Dikembalikan +120 ✅</div>
              <div class="bg-accent-50 p-3 rounded-lg text-xs text-ink-800 shadow-sm">Follower kembali utuh, garansi aman.</div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="space-y-4 md:space-y-6 order-2 md:order-1 animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200"
      >
        <h3 class="font-display font-bold text-3xl md:text-4xl text-ink-900 leading-tight">
          Takut Follower<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-warning to-danger"
            >Drop? Kami Garansi.</span
          >
        </h3>
        <p class="text-base md:text-lg text-ink-600 leading-relaxed font-light">
          Layanan kami dilengkapi <strong>refill otomatis</strong>. Kalau ada drop dalam periode garansi,
          kami isi ulang tanpa kamu harus lapor manual.
        </p>
        <ul class="space-y-2 text-sm text-ink-500">
          <li class="flex items-center gap-2">✅ Garansi uang kembali kalau gagal total</li>
          <li class="flex items-center gap-2">✅ Refill otomatis untuk layanan ber-Garansi</li>
          <li class="flex items-center gap-2">✅ Riwayat saldo transparan</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<style>
  .loading-bar {
    width: 0%;
    animation: progress 2s infinite ease-in-out;
  }

  @keyframes progress {
    0% {
      width: 0%;
      transform: translateX(-100%);
      opacity: 0;
    }
    50% {
      width: 70%;
      opacity: 1;
    }
    100% {
      width: 100%;
      transform: translateX(100%);
      opacity: 0;
    }
  }
</style>
