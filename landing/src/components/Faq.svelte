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
      q: 'Berapa minimal top up?',
      a: 'Minimal top up hanya <strong>Rp10.000</strong> via QRIS, Transfer Bank, atau e-wallet. Saldo masuk otomatis setelah pembayaran dikonfirmasi.',
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
      a: '<strong>Bisa!</strong> Socio.id punya paket agen dengan harga grosir & akses API. Banyak member jadiin ini side-income dengan jualan ke client sendiri.',
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
  <div class="absolute -top-20 -left-20 w-72 h-72 bg-primary-200/30 rounded-full blur-[80px] animate-pulse"></div>
  <div class="absolute -bottom-20 -right-20 w-72 h-72 bg-accent-200/30 rounded-full blur-[80px] animate-pulse delay-700"></div>

  <div class="space-y-4">
    {#each faqs as faq, i}
      <div
        class="group relative bg-white/80 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden
          {activeIndex === i
          ? 'border-primary shadow-lg shadow-primary/10 scale-[1.01]'
          : 'border-ink-200 hover:border-primary/50 hover:shadow-md'}"
      >
        <button
          class="w-full flex justify-between items-center p-6 text-left focus:outline-none cursor-pointer"
          onclick={() => toggle(i)}
        >
          <span
            class="font-display font-bold text-lg transition-colors duration-300 {activeIndex === i
              ? 'text-primary-700'
              : 'text-ink-700 group-hover:text-primary'}"
          >
            {faq.q}
          </span>
          <span
            class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
              {activeIndex === i ? 'bg-primary text-white rotate-180' : 'bg-ink-100 text-ink-500 group-hover:bg-primary/10 group-hover:text-primary'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {#if activeIndex === i}
          <div transition:slide={{ duration: 300, easing: cubicOut }} class="px-6 pb-6">
            <div class="pt-4 border-t border-dashed border-primary/20 text-ink-600 leading-relaxed text-base">
              {@html faq.a}
            </div>
          </div>
        {/if}

        <div
          class="absolute left-0 top-0 bottom-0 w-1 bg-primary transition-all duration-300 {activeIndex === i
            ? 'opacity-100'
            : 'opacity-0'}"
        >
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-12 text-center">
    <p class="text-ink-500 mb-4">Masih ada pertanyaan?</p>
    <a href="https://wa.me/62811919328" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-primary font-bold hover:text-primary-800 transition">
      <span>💬</span> Chat Tim Support Kami
    </a>
  </div>
</div>
