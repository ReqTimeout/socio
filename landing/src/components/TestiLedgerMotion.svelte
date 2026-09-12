<script>
  import { motion } from '@humanspeak/svelte-motion';
  const testi = [
    { initials: 'RA', name: 'Rizky A.', role: 'Reseller SMM · 2 tahun', text: 'Harga pabriknya bikin margin aman. Order client tinggal tempel link, sisanya bot yang urus.', metric: '1.2 jt order' },
    { initials: 'SP', name: 'Sari P.', role: 'Owner thrift shop', text: 'Views TikTok jalan 2 menit setelah bayar. Dulu nunggu admin sampe besok, sekarang gak pernah.', metric: '62 rb views /bulan' },
    { initials: 'BD', name: 'Bang D.', role: 'Jasa follower UMKM', text: 'Followers turun dikit, keesokan harinya keisi lagi sendiri. Garansi refillnya beneran jalan.', metric: '98% retention' },
  ];
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = { hidden:{}, visible:{ transition:{ staggerChildren: reduced?0:0.08 } } };
  const item = { hidden:{opacity: reduced?1:0, y: reduced?0:12}, visible:{opacity:1,y:0, transition:{duration: reduced?0:0.5, ease:[0.16,1,0.3,1]}} };
</script>

<section class="bg-[var(--paper-2)] py-16 md:py-24" aria-labelledby="testi-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <motion.div initial="hidden" whileInView="visible" viewport={{once:true, amount:0.2}} variants={container} class="mx-auto max-w-2xl text-center">
      <motion.h2 variants={item} id="testi-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">Yang sudah jualan pakai ini.</motion.h2>
      <motion.p variants={item} class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">50.000+ reseller dan UMKM order tiap hari lewat socio.id.</motion.p>
    </motion.div>

    <motion.div initial="hidden" whileInView="visible" viewport={{once:true, amount:0.15}} variants={container} class="mx-auto mt-10 max-w-3xl divide-y divide-[var(--hairline)] border-y border-[var(--hairline)] md:mt-14">
      {#each testi as t}
        <motion.div variants={item} class="flex items-start gap-4 py-6" whileHover={reduced?{}:{ x:2, transition:{duration:0.15} }}>
          <motion.span whileHover={reduced?{}:{scale:1.08}} class="num grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent-tint)] text-[14px] font-extrabold text-[var(--accent-ink)]" aria-hidden="true">{t.initials}</motion.span>
          <div class="min-w-0 flex-1">
            <blockquote class="text-[15px] font-medium leading-relaxed text-ink md:text-[16px]">“{t.text}”</blockquote>
            <p class="mt-2 text-[12px] text-ink-3"><span class="font-bold text-ink-2">{t.name}</span> · {t.role} · <span class="num font-semibold text-ink-2">{t.metric}</span></p>
          </div>
        </motion.div>
      {/each}
    </motion.div>
  </div>
</section>
