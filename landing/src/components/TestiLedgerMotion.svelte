<script>
  import { motion } from '@humanspeak/svelte-motion';
  // V2 §5.8 TestiWall — human touch puncak: kolom marquee chat (A5-Y) + 3 polaroid.
  // ⚠ TODO(testimoni-asli): kutipan di bawah ini PLACEHOLDER pola ("Rina/Bagas/Agus"
  // persona §1.4) — GANTI dengan testimoni + foto asli dari owner SEBELUM merge ke
  // prod (risiko iklan menyesatkan, PLAN §5.8). Staging preview dulu (§9).
  const chats = [
    { text: 'Order 5k followers IG buat klien olshop, jalan dalam 10 menit. Drop 200-an, refill otomatis tanpa aku tagih. Klien perpanjang kontrak.', name: 'Rina', role: 'Reseller IG · Jakarta' },
    { text: 'API-nya rapi. 20 klien satu dashboard, invoice ekspor beres. CS dibalas manusia, bukan template.', name: 'Agus', role: 'Agency · Surabaya' },
    { text: 'Awalnya skeptis, takut kena ban. Ternyata tanpa password, views naik gradual. Sekarang tiap minggu repeat order.', name: 'Bagas', role: 'UMKM kuliner · Bandung' },
    { text: 'Harga grosirnya transparan di katalog. Margin ku hitung sebelum order, bukan sesudah. Enak buat jualan lagi.', name: 'Sari', role: 'Reseller TikTok · Medan' },
  ];
  const loop = [...chats, ...chats];
  const polaroids = [
    { initial: 'R', tilt: 'tilt-l', caption: 'klien pertama dari TikTok' },
    { initial: 'A', tilt: 'tilt-r', caption: '20 klien, 1 dashboard' },
    { initial: 'B', tilt: 'tilt-l-sm', caption: 'repeat order tiap minggu' },
  ];
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const container = { hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } } };
  const item = { hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }, visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] } } };
</script>

<section class="bg-white py-16 md:py-24" aria-labelledby="testi-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="mx-auto max-w-2xl text-center">
      <h2 id="testi-title" class="reveal font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Kata mereka yang udah duluan <span class="marker-swipe">cuan</span>.
      </h2>
    </div>

    <div class="mt-10 grid gap-8 md:mt-14 lg:grid-cols-2 lg:gap-10">
      <!-- kolom marquee vertikal (reduced → grid statis, 4 kartu pertama) -->
      <div
        class="marquee-y relative h-[420px] md:h-[480px]"
        style="--marquee-duration: 45s; mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);"
      >
        <div class="marquee-y-track gap-4 pr-1">
          {#each loop as c}
            <figure class="shrink-0 rounded-2xl rounded-tl-md border border-[var(--hairline-strong)] bg-[var(--paper)] p-4">
              <blockquote class="text-[14px] leading-relaxed text-ink">“{c.text}”</blockquote>
              <figcaption class="mt-2.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                <span class="font-bold text-ink-2">{c.name}</span> · {c.role}
                <svg class="ml-1" width="28" height="14" viewBox="0 0 28 14" aria-label="sudah dibaca" role="img"><path d="M2 7.5 6.5 12 14 3.5M10 12l1.5 1.5L20 5" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </figcaption>
            </figure>
          {/each}
        </div>
      </div>

      <!-- 3 polaroid terserak -->
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={container} class="grid content-center gap-5 sm:grid-cols-3 lg:grid-cols-1 lg:gap-6">
        {#each polaroids as p}
          <motion.figure
            variants={item}
            whileHover={reduced ? {} : { rotate: 0, scale: 1.03, transition: { duration: 0.2 } }}
            class="{p.tilt} mx-auto w-full max-w-[240px] rounded-xl border border-[var(--hairline-strong)] bg-white p-2.5 pb-3 shadow-[4px_4px_0_var(--ink)] lg:max-w-[260px]"
          >
            <!-- TODO(foto-asli): ganti inisial dengan foto asli (minta ke owner). -->
            <span class="grid aspect-square w-full place-items-center rounded-lg bg-[var(--paper-warm-2)] font-display text-[56px] font-extrabold text-ink-3" aria-hidden="true">{p.initial}</span>
            <figcaption class="font-hand pt-1.5 text-center text-[21px] leading-tight text-ink-2">“{p.caption}”</figcaption>
          </motion.figure>
        {/each}
        <p class="text-center text-[13px] text-ink-3 lg:text-left">
          Punya pengalaman pakai socio.id? <a href="https://app.socio.id/tiket" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Ceritain ke kami →</a> Cerita asli pelanggan bakal tampil di sini.
        </p>
      </motion.div>
    </div>
  </div>
</section>
