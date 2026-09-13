<script>
  import { totalLayanan } from '../data/siteStats';
  // V2 §5.11 FAQ — objection handling + FAQPage schema. Accordion A13 CSS-only
  // (grid-rows, satu-satunya exception layout-anim). Satu terbuka default:
  // pertanyaan keamanan. Jawaban = AEO block 40-60 kata, JUJUR (§3.1).
  let open = $state(0);
  const faqs = [
    {
      q: 'Aman gak sih beli followers?',
      a: 'Aman selama caranya benar: kami <strong>tidak pernah minta password</strong> — cukup link publik. Order jalan gradual (bertahap) bukan sekaligus, jadi terlihat natural. Risiko drop tetap ada di platform mana pun — makanya layanan bergaransi dapat <strong>refill 30 hari</strong> otomatis.',
    },
    {
      q: 'Berapa lama prosesnya?',
      a: 'Rata-rata order <strong>mulai jalan &lt; 1 menit</strong> setelah saldo masuk, karena sistem otomatis 24 jam — bukan admin manusia. Kecepatan selesai tergantung antrean provider & jumlah order; progress-nya bisa dipantau live dari dashboard.',
    },
    {
      q: 'Followers bisa drop?',
      a: 'Bisa — di panel mana pun, karena platform rutin bersih-bersih akun. Bedanya di socio.id: pilih layanan bertanda <strong>refill</strong>, drop dalam 30 hari <strong>diisi ulang otomatis</strong> tanpa perlu lapor. Kalau order gagal total, saldo dikembalikan.',
    },
    {
      q: 'Bedanya member & reseller?',
      a: `Member daftar gratis dan langsung bisa order. Reseller bayar <strong>Rp50.000 sekali</strong> — dapat <strong>saldo Rp20.000</strong> langsung pakai plus <strong>harga lebih murah di semua ${totalLayanan} layanan</strong>, permanen. Buat kamu yang jualan jasa sosmed ke klien, selisihnya = margin.`,
    },
    {
      q: 'Bayarnya pakai apa?',
      a: 'Saat ini via <strong>transfer bank (BCA) manual</strong> — admin konfirmasi ±5 menit di jam kerja. <strong>QRIS & e-wallet otomatis segera hadir</strong>; ikut antrean info-nya biar gak ketinggalan.',
    },
    {
      q: 'Bisa pakai API untuk klien?',
      a: 'Bisa. Reseller dapat <strong>API key self-service</strong> dari dashboard: cek layanan, buat order, cek status, refill — semua via <strong>API v1</strong>. Dokumentasinya ada, dan support bantu kalau kamu nyangkut integrasi.',
    },
    {
      q: 'Kalau ada masalah, lapor ke siapa?',
      a: 'Buka <strong>tiket dari dashboard</strong> — tercatat & terpantau — atau chat <strong>WhatsApp support</strong>. Manusia beneran yang balas, bukan bot. Tiket garansi refill bahkan sering selesai otomatis sebelum kamu sempat nanya.',
    },
  ];
</script>

<div class="mx-auto w-full max-w-3xl">
  <div class="space-y-3">
    {#each faqs as faq, i}
      <div
        class="faq-item rounded-2xl border bg-white transition-colors duration-200 {open === i ? 'border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]' : 'border-[var(--hairline-strong)]'}"
        data-open={open === i}
      >
        <button
          type="button"
          class="flex min-h-[56px] w-full items-center justify-between gap-4 p-5 text-left"
          onclick={() => (open = open === i ? -1 : i)}
          aria-expanded={open === i}
        >
          <span class="font-display text-[16px] font-bold {open === i ? 'text-ink' : 'text-ink-2'}">{faq.q}</span>
          <svg class="faq-chevron h-5 w-5 shrink-0 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">
            <p class="px-5 pb-5 text-[15px] leading-relaxed text-ink-2">{@html faq.a}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>
  <p class="mt-8 text-center text-[14px] text-ink-2">
    Masih ada yang mengganjal? Chat manusia beneran via
    <a href="https://wa.me/6281221272016" target="_blank" rel="noopener" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">WhatsApp</a>
    — dibalas, bukan bot.
  </p>
</div>
