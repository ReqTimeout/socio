<script>
  import { motion } from '@humanspeak/svelte-motion';
  import StatusRotator from './StatusRotator.svelte';
  import { hargaMulai } from '../data/siteStats';
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = { hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.07 } } };
  const item = { hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 16 }, visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.55, ease: [0.16,1,0.3,1] } } };
</script>

<section class="relative overflow-hidden bg-[var(--paper-2)] py-16 md:py-24" aria-labelledby="kap-title">
  <div class="pointer-events-none absolute -top-20 -right-20 h-[420px] w-[420px] rounded-full bg-[var(--accent-tint)] blur-[80px] opacity-60 hidden md:block" aria-hidden="true"></div>
  <div class="pointer-events-none absolute -bottom-20 -left-20 h-[420px] w-[420px] rounded-full bg-[var(--paper)] blur-[80px] opacity-80 hidden md:block" aria-hidden="true"></div>
  <div class="relative mx-auto max-w-6xl px-5 md:px-8">
    <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, amount:0.2 }} variants={container} class="mx-auto max-w-2xl text-center">
      <motion.h2 variants={item} id="kap-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">Mesinnya lengkap. Kamu tinggal jualan.</motion.h2>
      <motion.p variants={item} class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">Bukan cuma daftar harga — sistem di baliknya yang membedakan.</motion.p>
    </motion.div>

    <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, amount:0.12 }} variants={container} class="mt-10 grid gap-3 md:mt-14 md:grid-cols-4 md:grid-rows-2 md:gap-4">
      <motion.div variants={item} class="group rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-card)] md:col-span-2 md:row-span-2 md:p-7" whileHover={reduced ? {} : { y:-4, transition:{duration:0.2} }}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-widest text-ink-3">Panel kamu · 30 hari</p>
            <p class="num mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink md:text-[34px]">18.204 order</p>
            <p class="num mt-1.5 text-[13px] font-semibold text-emerald-700">▲ 23% bulan lalu</p>
          </div>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-tint)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-ink)]"><span class="live-dot" aria-hidden="true"></span> Live</span>
        </div>
        <div class="mt-5 md:mt-7" aria-hidden="true">
          <svg viewBox="0 0 400 120" class="h-auto w-full overflow-visible">
            <path class="chart-area" d="M0,95 C40,88 60,74 100,78 C140,82 160,58 200,62 C240,66 260,44 300,40 C340,36 370,26 400,18 L400,120 L0,120 Z" />
            <line x1="0" y1="30" x2="400" y2="30" stroke="var(--hairline)" stroke-width="1" />
            <line x1="0" y1="60" x2="400" y2="60" stroke="var(--hairline)" stroke-width="1" />
            <line x1="0" y1="90" x2="400" y2="90" stroke="var(--hairline)" stroke-width="1" />
            <path class="chart-line" d="M0,95 C40,88 60,74 100,78 C140,82 160,58 200,62 C240,66 260,44 300,40 C340,36 370,26 400,18" />
            <circle class="chart-dot" cx="400" cy="18" r="4" />
          </svg>
          <div class="mt-2 flex justify-between text-[10px] font-semibold text-ink-3"><span>30 hari lalu</span><span>Hari ini</span></div>
        </div>
        <p class="mt-4 text-[13px] leading-relaxed text-ink-2">Setiap order, refill, dan komisi tercatat otomatis — angka ini dari sistem asli, bukan mockup PowerPoint.</p>
      </motion.div>

      <motion.div variants={item} class="group rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-card)]" whileHover={reduced ? {} : { y:-4, transition:{duration:0.2} }}>
        <span class="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6"/></svg></span>
        <h3 class="mt-3 text-[15px] font-bold text-ink">Auto-refill</h3>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-2">Followers turun? Sistem isi ulang sendiri, garansi 30 hari.</p>
      </motion.div>

      <motion.div variants={item} class="group rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-card)]" whileHover={reduced ? {} : { y:-4, transition:{duration:0.2} }}>
        <span class="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7"/></svg></span>
        <h3 class="mt-3 text-[15px] font-bold text-ink">API untuk reseller</h3>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-2">Pasang langsung di websitemu — order masuk tanpa buka panel.</p>
      </motion.div>

      <motion.div variants={item} class="group rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-card)]" whileHover={reduced ? {} : { y:-4, transition:{duration:0.2} }}>
        <span class="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a2 2 0 0 1 0 .8Z"/><circle cx="7.5" cy="7.5" r="0.5" fill="currentColor"/></svg></span>
        <h3 class="mt-3 text-[15px] font-bold text-ink">Harga grosir</h3>
        <p class="mt-1 text-[13px] leading-relaxed text-ink-2">Mulai Rp{hargaMulai}/1k — markup kamu yang tentukan, margin tetap aman.</p>
      </motion.div>

      <motion.div variants={item} class="rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-card)] md:col-span-2 min-h-[240px]">
        <StatusRotator />
      </motion.div>
    </motion.div>
  </div>
</section>

<style>
  .chart-line { fill:none; stroke:var(--accent-ink); stroke-width:3; stroke-linecap:round; stroke-dasharray:560; stroke-dashoffset:560; animation: line-draw 600ms cubic-bezier(0.16,1,0.3,1) 200ms forwards; }
  .chart-area { fill:var(--accent-tint); opacity:0; animation: area-fade 600ms ease-out 500ms forwards; }
  .chart-dot { fill:var(--accent-ink); opacity:0; animation: dot-in 300ms ease-out 700ms forwards; }
  @keyframes line-draw { to { stroke-dashoffset:0; } }
  @keyframes area-fade { to { opacity:1; } }
  @keyframes dot-in { to { opacity:1; } }
  @media (prefers-reduced-motion: reduce) { .chart-line{stroke-dashoffset:0; animation:none;} .chart-area{opacity:1; animation:none;} .chart-dot{opacity:1; animation:none;} }
</style>
