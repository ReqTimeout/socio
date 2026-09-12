<script>
  import { motion } from '@humanspeak/svelte-motion';
  import { totalLayanan } from '../data/siteStats';
  import prices from '../data/prices.json';
  const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');
  const RETAIL_BY_PLATFORM = { 'X/Twitter': 1000, Telegram: 2500, Instagram: 20000, TikTok: 4000, YouTube: 12000, Facebook: 12000, Spotify: 15000 };
  const rows = ((prices).top ?? []).slice(0, 8).map((t) => ({
    layanan: t.name, min: t.min, kamu: Math.round(t.price), retail: RETAIL_BY_PLATFORM[t.platform] ?? Math.round(t.price*2), refill: !!t.refill,
  }));
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = { hidden:{}, visible:{ transition:{ staggerChildren: reduced ? 0 : 0.04 } } };
  const item = { hidden:{opacity: reduced ? 1 : 0, y: reduced ? 0 : 12}, visible:{opacity:1,y:0, transition:{duration: reduced ? 0 : 0.45, ease:[0.16,1,0.3,1]}} };
</script>

<section class="relative overflow-hidden bg-[var(--paper)] py-16 md:py-24" aria-labelledby="harga-title">
  <!-- V2-3 dotGrid playful — opacity 0.035 terlalu pucat, naik 0.06 -->
  <div class="dot-grid pointer-events-none absolute inset-0 opacity-[0.06] hidden md:block" aria-hidden="true"></div>
  <div class="relative mx-auto max-w-6xl px-5 md:px-8">
    <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, amount:0.2 }} variants={container} class="mx-auto max-w-2xl text-center">
      <motion.h2 variants={item} id="harga-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">Daftar Rp50 ribu. Harga grosir selamanya.</motion.h2>
      <motion.p variants={item} class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">Sekali daftar reseller <strong class="text-ink">Rp50.000</strong>, saldo awal <strong class="text-ink">Rp20.000</strong> langsung masuk — dan semua layanan di bawah ini kamu dapat <strong class="text-ink">lebih murah dari harga member</strong>. Potongan berlaku permanen di {totalLayanan} layanan.</motion.p>
    </motion.div>

    <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, amount:0.12 }} variants={container} class="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white shadow-[var(--shadow-card)] md:mt-12">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-[var(--hairline)] bg-[var(--paper-2)]">
            <th scope="col" class="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-3">Layanan</th>
            <th scope="col" class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-3">Min</th>
            <th scope="col" class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-[var(--accent-ink)]">Harga member /1k</th>
            <th scope="col" class="hidden px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-3 sm:table-cell">Retail umum /1k</th>
          </tr>
        </thead>
        <motion.tbody variants={container} class="divide-y divide-[var(--hairline)]">
          {#each rows as r}
            <motion.tr variants={item} whileHover={reduced ? {} : { backgroundColor:"color-mix(in oklab, var(--accent-tint) 40%, transparent)", transition:{duration:0.15} }} class="group">
              <td class="px-4 py-3 text-[14px] font-semibold text-ink">
                {r.layanan}
                {#if r.refill}
                  <span class="ml-2 hidden items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:inline-flex"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6"/></svg> refill</span>
                {/if}
              </td>
              <td class="num px-4 py-3 text-right font-mono text-[13px] text-ink-3">{r.min}</td>
              <td class="num px-4 py-3 text-right font-mono text-[13px] font-bold text-ink">{fmt(r.kamu)}</td>
              <td class="num hidden px-4 py-3 text-right font-mono text-[13px] text-ink-3 line-through sm:table-cell">{fmt(r.retail)}</td>
            </motion.tr>
          {/each}
        </motion.tbody>
      </table>
      <div class="border-t border-[var(--hairline)] bg-[var(--paper-2)] px-4 py-3">
        <p class="text-[12px] leading-relaxed text-ink-3">Snapshot 8 dari <strong class="num text-ink-2">{totalLayanan} layanan</strong> — harga live &amp; stok tersinkron tiap jam di panel.</p>
      </div>
    </motion.div>

    <motion.p initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5, delay:0.1}} class="mx-auto mt-6 max-w-2xl text-center text-[14px] leading-relaxed text-ink-2">Daftar reseller Rp50.000 &rarr; saldo Rp20.000 + <strong class="text-ink">potongan harga di semua layanan</strong> — berlaku selamanya, bukan sekali pakai. <a href="/reseller" class="font-semibold text-[var(--accent-ink)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent-ink)]">Lihat program reseller →</a></motion.p>
  </div>
</section>

<style>
  .dot-grid {
    background-image: radial-gradient(circle, var(--ink) 1px, transparent 1px);
    background-size: 20px 20px;
    will-change: transform;
    animation: dot-drift 24s linear infinite;
  }
  @keyframes dot-drift {
    0% { transform: translate3d(0, 0, 0); }
    100% { transform: translate3d(-20px, -20px, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot-grid { animation: none; }
  }
</style>
