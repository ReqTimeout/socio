<script>
  import { motion } from '@humanspeak/svelte-motion';
  import { totalLayanan } from '../data/siteStats';
  import prices from '../data/prices.json';
  // V2 §5.9 PricingTable — transparansi = positioning utama. Keyword "harga smm panel".
  // Tabel REAL <table>: 10 layanan dari prices.json top[] — kolom Member/Reseller/Refill.
  // Toggle pill default RESELLER (hero offer). Kolom aktif highlight mango-soft.
  const fmt = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const rows = ((prices).top ?? []).slice(0, 10).map((t) => ({
    layanan: t.name, min: t.min, member: Math.round(t.price),
    reseller: Math.round(t.priceReseller ?? t.price), refill: !!t.refill,
  }));
  let mode = $state('reseller'); // 'member' | 'reseller'
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = { hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.04 } } };
  const item = { hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }, visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] } } };
</script>

<section class="bg-[var(--paper)] py-16 md:py-24" aria-labelledby="harga-title" id="harga">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="mx-auto max-w-2xl text-center">
      <h2 id="harga-title" class="reveal font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Harga grosir, terbuka. Gak ada harga “kontak admin”.
      </h2>
      <!-- toggle member/reseller -->
      <div class="reveal mt-6 inline-flex items-center rounded-full border border-[var(--hairline-strong)] bg-white p-1" role="group" aria-label="Pilih tampilan harga" style="--d:120ms">
        {#each [['member', 'Member'], ['reseller', 'Reseller']] as [v, label]}
          <button
            type="button"
            aria-pressed={mode === v}
            onclick={() => (mode = v)}
            class="min-h-[40px] rounded-full px-5 text-[14px] font-bold transition-all duration-150 {mode === v ? 'bg-[var(--ink)] text-white shadow-sm' : 'text-ink-2 hover:text-ink'}"
          >
            {label}
          </button>
        {/each}
      </div>
    </div>

    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={container}
      class="mx-auto mt-8 max-w-4xl overflow-x-auto rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white shadow-[var(--shadow-card)] md:mt-10"
    >
      <table class="w-full min-w-[560px] text-left">
        <thead>
          <tr class="border-b border-[var(--hairline)] bg-[var(--paper-2)]">
            <th scope="col" class="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-3">Layanan</th>
            <th scope="col" class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-3">Min. order</th>
            <th scope="col" class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest {mode === 'member' ? 'bg-[var(--pop-mango-soft)] text-ink' : 'text-ink-3'}">Member/1k</th>
            <th scope="col" class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest {mode === 'reseller' ? 'bg-[var(--pop-mango-soft)] text-ink' : 'text-ink-3'}">Reseller/1k</th>
            <th scope="col" class="hidden px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-ink-3 sm:table-cell">Refill</th>
          </tr>
        </thead>
        <motion.tbody variants={container} class="divide-y divide-[var(--hairline)]">
          {#each rows as r}
            <motion.tr variants={item} class="transition-colors hover:bg-[var(--paper-warm)]">
              <td class="px-4 py-3 text-[14px] font-semibold text-ink">
                {r.layanan}
                {#if r.refill}
                  <span class="ml-2 hidden items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:inline-flex">✓ 30 hari</span>
                {:else}
                  <span class="ml-2 inline-flex rounded-full bg-[var(--pop-mango-soft)] px-2 py-0.5 text-[10px] font-bold text-ink sm:hidden">member</span>
                {/if}
              </td>
              <td class="num px-4 py-3 text-right text-[13px] text-ink-3">{r.min.toLocaleString('id-ID')}</td>
              <td class="num px-4 py-3 text-right text-[13px] font-bold {mode === 'member' ? 'bg-[var(--pop-mango-soft)] text-ink' : 'text-ink-2'}">{fmt(r.member)}</td>
              <td class="num px-4 py-3 text-right text-[13px] font-bold {mode === 'reseller' ? 'bg-[var(--pop-mango-soft)] text-ink' : 'text-ink-2'}">{fmt(r.reseller)}</td>
              <td class="hidden px-4 py-3 text-center text-[13px] sm:table-cell">
                {#if r.refill}<span class="font-bold text-emerald-600" aria-label="garansi refill 30 hari">✓</span>{:else}<span class="text-ink-3" aria-label="tanpa refill">–</span>{/if}
              </td>
            </motion.tr>
          {/each}
        </motion.tbody>
      </table>
      <div class="border-t border-[var(--hairline)] bg-[var(--paper-2)] px-4 py-3">
        <p class="text-[12px] leading-relaxed text-ink-3">10 dari <strong class="num text-ink-2">{totalLayanan} layanan</strong> — harga live tersinkron tiap jam dari provider.</p>
      </div>
    </motion.div>

    <!-- mesh keyword -->
    <p class="reveal mx-auto mt-6 max-w-3xl text-center text-[14px] leading-relaxed text-ink-2">
      <a href="/beli-followers-instagram" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Beli followers Instagram</a> ·
      <a href="/beli-views-tiktok" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Jasa viewers TikTok</a> ·
      <a href="/beli-members-telegram" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Beli members Telegram</a> ·
      <a href="/layanan" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Lihat semua {totalLayanan} harga →</a>
    </p>
  </div>
</section>
