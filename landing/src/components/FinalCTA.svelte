<script>
  import { onMount } from 'svelte';

  let container;
  const regBase = 'https://app.socio.id/daftar?mode=reseller';

  // L2: spotlight decorative — gate by IntersectionObserver + reduced-motion,
  // throttle mousemove via rAF (review-animations: avoid style recalc storm).
  let raf = 0;
  let liveX = 0;
  let liveY = 0;
  let sectionVisible = false;
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMouseMove = (e) => {
    if (!container || reduced || !sectionVisible) return;
    const rect = container.getBoundingClientRect();
    liveX = e.clientX - rect.left;
    liveY = e.clientY - rect.top;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        container.style.setProperty('--mouse-x', `${liveX}px`);
        container.style.setProperty('--mouse-y', `${liveY}px`);
        raf = 0;
      });
    }
  };

  onMount(() => {
    // Gate cell flicker — only when section visible + motion allowed.
    const io = new IntersectionObserver(
      ([e]) => {
        sectionVisible = e.isIntersecting;
        if (!sectionVisible) {
          document.querySelectorAll('.grid-cell.active').forEach((c) => c.classList.remove('active'));
        }
      },
      { threshold: 0.1 },
    );
    if (container) io.observe(container);

    if (!reduced) {
      const cells = document.querySelectorAll('.grid-cell');
      const tick = setInterval(() => {
        if (!sectionVisible || !cells.length) return;
        const cell = cells[Math.floor(Math.random() * cells.length)];
        if (!cell) return;
        cell.classList.add('active');
        setTimeout(() => cell.classList.remove('active'), 2000);
      }, 220);
      return () => {
        clearInterval(tick);
        io.disconnect();
      };
    }
  });
</script>

<section
  id="final-cta"
  bind:this={container}
  onmousemove={handleMouseMove}
  class="relative py-28 overflow-hidden bg-[oklch(0.19_0.02_235)] text-[oklch(0.97_0.004_220)] isolate font-sans md:py-32"
>
  <div class="absolute inset-0 z-0 pointer-events-none">
    <div
      class="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25"
    ></div>
    <div
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style="background: radial-gradient(600px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(6,182,212,0.18), transparent 40%);"
    ></div>
    <div class="absolute inset-0 grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] grid-rows-[repeat(auto-fill,minmax(4rem,1fr))] opacity-30">
      {#each Array(40) as _}
        <div class="grid-cell w-full h-full border border-transparent transition-colors duration-1000"></div>
      {/each}
    </div>
  </div>

  <div class="container mx-auto px-6 text-center relative z-10">
    <div class="max-w-4xl mx-auto space-y-8">
      <h2 class="font-display font-black text-4xl md:text-6xl leading-[1.05] tracking-tight">
        Satu kali daftar.<br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[var(--accent-ink)]">Jualan selamanya.</span>
      </h2>

      <p
        class="text-[oklch(0.78_0.01_220)] text-lg md:text-xl leading-relaxed font-light max-w-2xl mx-auto md:text-center"
      >
        Daftar reseller <strong class="text-[oklch(0.97_0.004_220)]">Rp50.000</strong> — saldo
        <strong class="text-[oklch(0.97_0.004_220)]">Rp20.000</strong> langsung jalan, harga layanan
        <strong class="text-[oklch(0.97_0.004_220)] border-b border-[var(--accent)]">khusus reseller</strong>
        di 8.270 layanan Instagram, TikTok, YouTube &amp; semua platform.
      </p>

      <div class="pt-10 flex flex-col md:flex-row items-center justify-center gap-6">
        <a
          href={regBase}
          class="group relative inline-flex items-center justify-center gap-3 bg-[var(--accent-ink)] text-white px-10 py-5 rounded-full font-bold text-xl shadow-[0_8px_28px_-8px_rgba(14,116,144,0.45)] hover:shadow-[0_10px_36px_-8px_rgba(14,116,144,0.6)] hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98] z-20 overflow-hidden"
        >
          <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none"></div>
          <span class="relative">Daftar Reseller — Rp50rb</span>
        </a>

        <a href="#cara-kerja" class="text-[oklch(0.78_0.01_220)] hover:text-[oklch(0.97_0.004_220)] font-medium transition-colors flex items-center gap-2 group/link">
          <span class="inline-block transition-transform duration-300 group-hover/link:-rotate-180 motion-reduce:transition-none">↺</span>
          Saya mau lihat cara kerjanya
        </a>
      </div>

      <!-- L2 #5 anti-pattern: 4-col stat strip → inline narrative dengan hairline separator -->
      <p class="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-semibold text-[oklch(0.78_0.01_220)]">
        <span class="text-[oklch(0.97_0.004_220)]">Rp20rb</span><span>saldo langsung jalan</span>
        <span aria-hidden="true" class="opacity-40">·</span>
        <span class="text-[oklch(0.97_0.004_220)]">8.270</span><span>layanan reseller</span>
        <span aria-hidden="true" class="opacity-40">·</span>
        <span class="text-[oklch(0.97_0.004_220)]">24/7</span><span>panel online</span>
        <span aria-hidden="true" class="opacity-40">·</span>
        <span class="text-[oklch(0.97_0.004_220)]">30 hari</span><span>garansi refill</span>
      </p>
    </div>
  </div>
</section>

<style>
  @keyframes shine {
    100% {
      transform: translateX(100%);
    }
  }
  .animate-shine {
    animation: shine 0.8s;
  }

  .grid-cell.active {
    background-color: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.3);
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
  }
</style>