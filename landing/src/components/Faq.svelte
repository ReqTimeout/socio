<script>
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let activeIndex = 0;

  const faqs = [
    {
      q: 'Apakah follower/like yang diberikan aman dari banned?',
      a: 'Kami hanya menggunakan layanan <strong>real & gradual</strong> dari provider terpercaya. Risiko banned sangat rendah selama pemakaian wajar. Hindari bot spam massal agar akun tetap aman.',
    },
    {
      q: 'Daftar reseller Rp50.000 itu dapat apa saja?',
      a: '<strong>Saldo Rp20.000 langsung masuk</strong> — bisa langsung dipakai order — plus akses <strong>harga reseller</strong>: lebih murah dari harga member di semua 8.270 layanan, berlaku selamanya.',
    },
    {
      q: 'Berapa minimal top up?',
      a: 'Setelah daftar, top up mulai <strong>Rp10.000</strong> via QRIS, Transfer Bank, atau e-wallet. Saldo masuk otomatis setelah pembayaran dikonfirmasi.',
    },
    {
      q: 'Saya gaptek, apakah susah pakainya?',
      a: 'Justru Socio.id dibuat semudah mungkin. Cukup <strong>tempel link, pilih quantity, klik pesan</strong>. Dashboardnya simpel, gak perlu teknis sama sekali.',
    },
    {
      q: 'Bagaimana kalau order gagal atau drop?',
      a: 'Tenang. Layanan ber-garansi akan <strong>refill otomatis</strong>. Kalau gagal total, saldo dikembalikan ke akun kamu. Transparan, gak hangus.',
    },
    {
      q: 'Platform apa saja yang dilayani?',
      a: 'Instagram, TikTok, YouTube, Facebook, X/Twitter, hingga <strong>SEO & Google Maps</strong>. Total lebih dari 8.000 layanan dari satu dashboard.',
    },
    {
      q: 'Bisa jadi reseller / agen?',
      a: '<strong>Bisa!</strong> Daftar reseller Rp50.000 sekali bayar — saldo awal Rp20.000 include, harga layanan turun otomatis. Banyak member jadiin ini side-income dengan jualan ke client sendiri.',
    },
    {
      q: 'Apakah ada kontrak atau biaya tersembunyi?',
      a: 'Tidak ada kontrak. Kamu cuma bayar saldo yang dipakai. <strong>Gak ada biaya bulanan</strong> atau charge tersembunyi.',
    },
  ];

  const toggle = (i) => {
    activeIndex = activeIndex === i ? null : i;
  };
</script>

<div class="relative w-full max-w-4xl mx-auto z-10">
  <div class="space-y-4">
    {#each faqs as faq, i}
      <div
        class="group relative bg-white/80 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden
          {activeIndex === i
          ? 'border-[var(--accent-ink)] shadow-lg shadow-[var(--accent-tint)] scale-[1.01]'
          : 'border-[var(--hairline-strong)] hover:border-[var(--accent-ink)]/50 hover:shadow-md'}"
      >
        <button
          class="w-full flex justify-between items-center p-6 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus-ring)]"
          onclick={() => toggle(i)}
          aria-expanded={activeIndex === i}
        >
          <span
            class="font-display font-bold text-lg transition-colors duration-300 {activeIndex === i
              ? 'text-[var(--accent-ink)]'
              : 'text-ink group-hover:text-[var(--accent-ink)]'}"
          >
            {faq.q}
          </span>
          <span
            class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
              {activeIndex === i ? 'bg-[var(--accent-ink)] text-white rotate-180' : 'bg-[var(--paper-2)] text-ink-3 group-hover:bg-[var(--accent-tint)] group-hover:text-[var(--accent-ink)]'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {#if activeIndex === i}
          <div transition:slide={{ duration: 300, easing: cubicOut }} class="px-6 pb-6">
            <div class="pt-4 border-t border-dashed border-[var(--accent-tint)] text-ink-2 leading-relaxed text-base">
              {@html faq.a}
            </div>
          </div>
        {/if}

        <div
          class="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-ink)] transition-opacity duration-300 {activeIndex === i
            ? 'opacity-100'
            : 'opacity-0'}"
        >
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-12 text-center">
    <p class="text-ink-3 mb-4">Masih ada pertanyaan?</p>
    <a href="https://wa.me/62811919328" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-[var(--accent-ink)] font-bold hover:text-[var(--accent-hover)] transition-colors">
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      Chat Tim Support Kami
    </a>
  </div>
</div>
