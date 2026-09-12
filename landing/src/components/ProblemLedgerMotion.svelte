<script>
  import { motion } from '@humanspeak/svelte-motion';
  import { totalLayanan, totalKategori, hargaMulai } from '../data/siteStats';
  const rows = [
    {
      pain: 'Followers turun sendiri?',
      solution: 'Refill otomatis',
      detail: 'Garansi 30 hari, sistem cek & isi ulang tanpa perlu tiket.',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6"/></svg>`,
    },
    {
      pain: 'Harga reseller lain mahal?',
      solution: 'Harga pabrik, langsung dari provider',
      detail: `Member mulai Rp${hargaMulai}/1k. Daftar reseller Rp50.000 — saldo Rp20.000 langsung masuk, harga khusus reseller di semua layanan.`,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a2 2 0 0 1 0 .8Z"/><circle cx="7.5" cy="7.5" r="0.5" fill="currentColor"/></svg>`,
    },
    {
      pain: 'Order harus nunggu admin?',
      solution: 'Diproses bot, rata-rata 42 detik',
      detail: '24 jam, termasuk tengah malam — sistem yang jalan, bukan manusia.',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"/></svg>`,
    },
  ];
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.55, ease: [0.16,1,0.3,1] } },
  };
</script>

<section class="relative overflow-hidden bg-[var(--paper-2)] py-16 md:py-24" aria-labelledby="problem-title">
  <!-- V2-3 blob parallax playful — self-heal iter2: naik chroma + opacity biar keliatan di paper-2 -->
  <div class="blob blob-a pointer-events-none absolute -top-12 -right-12 h-[460px] w-[460px] rounded-full blur-[64px] opacity-100 hidden md:block" style="background: radial-gradient(circle at center, oklch(0.72 0.16 220 / 0.18) 0%, oklch(0.72 0.16 220 / 0) 70%)" aria-hidden="true"></div>
  <div class="blob blob-b pointer-events-none absolute -bottom-12 -left-12 h-[460px] w-[460px] rounded-full blur-[64px] opacity-100 hidden md:block" style="background: radial-gradient(circle at center, oklch(0.65 0.18 285 / 0.14) 0%, oklch(0.65 0.18 285 / 0) 70%)" aria-hidden="true"></div>
  <div class="relative mx-auto max-w-6xl px-5 md:px-8">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      class="mx-auto max-w-2xl text-center"
    >
      <motion.h2 variants={itemVariants} id="problem-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Masalahnya kamu kenal baik.
      </motion.h2>
      <motion.p variants={itemVariants} class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">
        Kalau kamu reseller atau sering order, tiga hal ini pasti pernah kamu alami.
      </motion.p>
    </motion.div>

    <!-- Ledger: stagger per row via svelte-motion variants (V2-2) -->
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={containerVariants}
      class="mx-auto mt-10 max-w-3xl divide-y divide-[var(--hairline)] border-y border-[var(--hairline)] md:mt-14"
    >
      {#each rows as row, i}
        <motion.div
          variants={itemVariants}
          class="grid gap-2 py-6 md:grid-cols-12 md:items-center md:gap-6 md:py-7"
        >
          <p class="text-[15px] font-semibold text-ink-2 md:col-span-5 md:text-right md:text-[17px]">
            {row.pain}
          </p>
          <span class="hidden justify-self-end text-[var(--accent-ink)] md:col-span-1 md:flex" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m0 0-6-6m6 6-6 6" /></svg>
          </span>
          <motion.div whileHover={reduced ? {} : { y: -2, transition:{duration:0.2} }} class="flex items-start gap-3 md:col-span-6">
            <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-tint)] text-[var(--accent-ink)]" aria-hidden="true">
              {@html row.icon}
            </span>
            <div class="min-w-0">
              <p class="text-[15px] font-bold text-ink md:text-[17px]">{row.solution}</p>
              <p class="mt-1 text-[13px] leading-relaxed text-ink-2 md:text-[14px]">{row.detail}</p>
            </div>
          </motion.div>
        </motion.div>
      {/each}
    </motion.div>
  </div>
</section>

<style>
  .blob { will-change: transform; }
  .blob-a { animation: blob-drift-a 18s ease-in-out infinite alternate; }
  .blob-b { animation: blob-drift-b 22s ease-in-out infinite alternate; }
  @keyframes blob-drift-a {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    100% { transform: translate3d(-10px, 12px, 0) scale(1.05); }
  }
  @keyframes blob-drift-b {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    100% { transform: translate3d(12px, -8px, 0) scale(1.04); }
  }
  @media (prefers-reduced-motion: reduce) {
    .blob-a, .blob-b { animation: none; }
  }
</style>
