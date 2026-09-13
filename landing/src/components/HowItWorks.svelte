<script lang="ts">
  import { onMount } from 'svelte';
  import SocioMascot from './SocioMascot.svelte';
  // V2 §5.7 HowItWorks — roadmap: hapus rasa "ribet", 3 langkah santai.
  // Jalur SVG berkelok, line-draw A6 mengikuti scroll (rAF + passive).
  // Desktop: horizontal; mobile: vertikal kiri. Tiap pos max 2 baris (anti #1).
  // Maskot paper-plane terbang ke ujung saat draw selesai (A2 pop + A10 float).
  const steps = [
    {
      n: 1,
      title: 'Daftar',
      desc: 'Isi form 1 menit. Reseller Rp50rb sudah termasuk saldo Rp20rb.',
      icon: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
    },
    {
      n: 2,
      title: 'Top up',
      desc: 'Transfer bank, saldo masuk otomatis. QRIS & e-wallet segera.',
      icon: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    },
    {
      n: 3,
      title: 'Order',
      desc: 'Pilih layanan, tempel link, klik. Sistem yang kerja 24 jam.',
      icon: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/>',
    },
  ];

  let sectionEl: HTMLElement | undefined;
  let pathH: SVGPathElement | undefined; // desktop horizontal
  let pathV: SVGPathElement | undefined; // mobile vertikal
  let progress = $state(0);
  let reduced = $state(false);
  let raf = 0;

  function paint() {
    raf = 0;
    if (!sectionEl) return;
    const r = sectionEl.getBoundingClientRect();
    const vh = window.innerHeight;
    // progress 0 saat section top di bawah viewport, 1 saat section lewat tengah-atas
    const p = (vh * 0.75 - r.top) / (r.height * 0.85);
    progress = Math.min(1, Math.max(0, reduced ? 1 : p));
    for (const path of [pathH, pathV]) {
      if (!path) continue;
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len * (1 - progress)}`;
    }
  }
  function onScroll() {
    if (!raf) raf = requestAnimationFrame(paint);
  }

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  });

  const done = $derived(progress > 0.92);
  const lit = $derived((i: number) => progress >= [0.02, 0.4, 0.78][i]);
</script>

<section bind:this={sectionEl} class="overflow-hidden bg-[var(--paper-warm)] py-16 md:py-24" aria-labelledby="how-title" id="cara-kerja">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="mx-auto max-w-2xl text-center">
      <h2 id="how-title" class="reveal font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Mulai dalam 3 langkah. Serius, sesimpel itu.
      </h2>
    </div>

    <!-- DESKTOP: jalur horizontal berkelok -->
    <div class="relative mt-12 hidden md:block" aria-hidden="false">
      <svg class="w-full" height="120" viewBox="0 0 1200 120" fill="none" aria-hidden="true" preserveAspectRatio="none">
        <path
          d="M60 90 C 260 90, 280 30, 480 30 S 700 30, 720 90 S 940 90, 1140 60"
          stroke="var(--hairline-strong)"
          stroke-width="3"
          stroke-linecap="round"
        />
        <path
          bind:this={pathH}
          d="M60 90 C 260 90, 280 30, 480 30 S 700 30, 720 90 S 940 90, 1140 60"
          stroke="var(--ink)"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
      {#if done && !reduced}
        <span class="float-idle absolute top-2 right-4" aria-hidden="true">
          <SocioMascot pose="fly" class="h-12 w-12" />
        </span>
      {:else}
        <span class="absolute top-2 right-4" aria-hidden="true">
          <SocioMascot pose="fly" class="h-12 w-12" />
        </span>
      {/if}
      <ol class="mt-2 grid grid-cols-3 gap-6">
        {#each steps as s, i}
          <li class="reveal {i === 0 ? 'tilt-l-sm' : i === 2 ? 'tilt-r-sm' : ''} rounded-2xl border-2 border-[var(--ink)] bg-white p-5 shadow-[2px_2px_0_var(--ink)]" style="--d:{i * 120}ms">
            <span
              class="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--ink)] {lit(i) ? 'bg-[var(--accent-ink)] text-white' : 'bg-[var(--paper-2)] text-ink-2'} transition-colors duration-300"
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{@html s.icon}</svg>
            </span>
            <p class="mt-3 text-[11px] font-bold tracking-widest text-ink-3 uppercase">Langkah {s.n}</p>
            <h3 class="font-display text-[19px] font-bold text-ink">{s.title}</h3>
            <p class="mt-1 text-[14px] leading-relaxed text-ink-2">{s.desc}</p>
          </li>
        {/each}
      </ol>
    </div>

    <!-- MOBILE: jalur vertikal kiri, kartu kanan -->
    <div class="relative mt-10 md:hidden">
      <svg class="absolute top-2 bottom-2 left-[23px] h-[calc(100%-16px)] w-[6px]" viewBox="0 0 6 600" fill="none" aria-hidden="true" preserveAspectRatio="none">
        <path d="M3 0 V600" stroke="var(--hairline-strong)" stroke-width="3" stroke-linecap="round" />
        <path bind:this={pathV} d="M3 0 V600" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" />
      </svg>
      <ol class="space-y-5">
        {#each steps as s, i}
          <li class="reveal relative pl-14" style="--d:{i * 120}ms">
            <span
              class="absolute top-1 left-3 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-warm)] {lit(i) ? '!bg-[var(--accent-ink)]' : ''} transition-colors duration-300"
              aria-hidden="true"
            >
              <span class="num text-[11px] font-bold {lit(i) ? 'text-white' : 'text-ink-2'}">{s.n}</span>
            </span>
            <div class="{i === 1 ? 'tilt-r-sm' : 'tilt-l-sm'} rounded-2xl border-2 border-[var(--ink)] bg-white p-4 shadow-[2px_2px_0_var(--ink)]">
              <h3 class="font-display text-[17px] font-bold text-ink">{s.title}</h3>
              <p class="mt-1 text-[14px] leading-relaxed text-ink-2">{s.desc}</p>
            </div>
          </li>
        {/each}
      </ol>
      <p class="mt-6 flex items-center gap-2 pl-14 text-[14px] text-ink-2">
        <SocioMascot pose="wave" class="h-9 w-9" />
        <span>Udah? Gas order pertama — sistem yang begadang buat kamu.</span>
      </p>
    </div>
  </div>
</section>
