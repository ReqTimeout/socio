<script>
  import { motion } from '@humanspeak/svelte-motion';
  import { onMount } from 'svelte';
  import platforms from '../data/prices.json';
  // V2 §5.6 PlatformBento — keluasan katalog tanpa bullet spam.
  // H2 keyword + tile asimetris + angka A4 counter + link /layanan?platform=X.
  // Ikon: stroke SVG buatan sendiri (bukan icon pack generik).
  const tiles = [
    { key: 'Instagram', count: platforms.platforms.Instagram.services, big: true, icon: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/>' },
    { key: 'TikTok', count: platforms.platforms.TikTok.services, big: true, icon: '<path d="M9 18a3 3 0 1 0 3-3"/><path d="M12 15V4c.5 2.5 2.5 4 5 4"/>' },
    { key: 'YouTube', count: platforms.platforms.YouTube.services, icon: '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" stroke="none"/>' },
    { key: 'Telegram', count: platforms.platforms.Telegram.services, icon: '<path d="M21 4 3 11l7 2 2 7 4-5 5-11Z"/><path d="M10 13l4-4"/>' },
    { key: 'Facebook', count: platforms.platforms.Facebook.services, icon: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v4H9v8h4v-8h2.7l.6-4H13V6.8c0-.7.3-1 .8-1H15V3Z"/>' },
    { key: 'X/Twitter', count: platforms.platforms['X/Twitter'].services, icon: '<path d="M4 4l16 16M20 4 4 20"/>' },
    { key: 'Spotify', count: platforms.platforms.Spotify.services, icon: '<circle cx="12" cy="12" r="9"/><path d="M8 10.5c2.7-.8 5.5-.4 7.5 1M8.5 13.5c2-.6 4-.3 5.5.8"/>' },
    { key: 'Lainnya', count: platforms.platforms.Lainnya.services, icon: '<circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>' },
  ];
  const fmt = (n) => Math.round(n).toLocaleString('id-ID');
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = { hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.06 } } };
  const item = { hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 16 }, visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] } } };

  // A4 counter roll 900ms saat reveal (sekali). Reduced → angka final langsung.
  let shown = $state({});
  onMount(() => {
    const els = document.querySelectorAll('[data-count]');
    if (reduced) {
      const o = {};
      els.forEach((el) => (o[el.dataset.count] = Number(el.dataset.count)));
      shown = o;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          io.unobserve(el);
          const target = Number(el.dataset.count);
          const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / 900);
            shown = { ...shown, [target]: Math.round(target * (1 - (1 - p) * (1 - p))) };
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
</script>

<section class="bg-[var(--paper)] py-16 md:py-24" aria-labelledby="plat-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="mx-auto max-w-2xl text-center">
      <h2 id="plat-title" class="reveal font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Satu panel, semua platform yang kamu jualan.
      </h2>
      <p class="reveal mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2" style="--d:120ms">
        Klik platform apa pun — harga live-nya langsung kebuka.
      </p>
    </div>

    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={container}
      class="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4 md:gap-4"
    >
      {#each tiles as t}
        <motion.a
          variants={item}
          href="/layanan?platform={encodeURIComponent(t.key)}"
          whileHover={reduced ? {} : { rotate: t.big ? -1 : 1, y: -3, transition: { duration: 0.2 } }}
          class="group min-w-0 rounded-2xl border border-[var(--hairline-strong)] bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5 {t.big ? 'col-span-2' : ''}"
          aria-label="{t.key}: {fmt(t.count)} layanan — lihat harga"
        >
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent-ink)] transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{@html t.icon}</svg>
          </span>
          <p class="mt-3 truncate text-[15px] font-bold text-ink">{t.key}</p>
          <p class="num mt-0.5 text-[13px] font-semibold text-ink-2">
            <span data-count={t.count}>{fmt(shown[t.count] ?? 0)}</span> layanan
          </p>
        </motion.a>
      {/each}

      <!-- tile doodle: 882 kategori -->
      <motion.div
        variants={item}
        class="tilt-r-sm col-span-2 flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--ink-3)] bg-[var(--paper-warm)] p-4 md:col-span-2 md:p-5"
      >
        <svg class="h-10 w-10 shrink-0" width="40" height="40" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <path d="M12 8c2 20 10 36 34 46" stroke="var(--ink-2)" stroke-width="3" stroke-linecap="round" />
          <path d="M36 46l11 9 5-13" stroke="var(--ink-2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="text-[14px] leading-snug text-ink-2">
          + layanan SEO & lainnya — <strong class="num text-ink">{platforms.totalCategories} kategori</strong> total.
          <a href="/layanan" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Ubek-ubek katalog →</a>
        </p>
      </motion.div>
    </motion.div>
  </div>
</section>
