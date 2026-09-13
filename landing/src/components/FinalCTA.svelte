<script>
  import SocioMascot from './SocioMascot.svelte';
  // V2 §5.12 FinalCTA — sederhana & hangat. CTA tunggal accent-ink besar (A8 hover),
  // trust line, maskot melambai. Background paper-warm + tanpa blob.
  const regBase = 'https://app.socio.id/daftar';
</script>

<section class="bg-[var(--paper-warm)] py-16 md:py-24" aria-labelledby="final-cta-title">
  <div class="mx-auto max-w-2xl px-5 text-center md:px-8">
    <p class="reveal flex justify-center" aria-hidden="true">
      <SocioMascot pose="wave" class="float-idle h-16 w-16" />
    </p>
    <h2 id="final-cta-title" class="reveal font-display mt-4 text-[length:var(--text-h2)] font-bold tracking-tight text-ink" style="--d:80ms">
      Siap bikin sosmed-mu (dan klienmu) bahagia?
    </h2>
    <div class="reveal mt-7" style="--d:160ms">
      <a
        href={regBase}
        class="magnetic cta-glow inline-flex min-h-[56px] items-center justify-center rounded-full bg-[var(--accent-ink)] px-10 text-[16px] font-bold text-white shadow-[0_8px_24px_-8px_var(--accent-ink)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] active:translate-y-0 active:scale-[0.97]"
      >
        Daftar Reseller Rp50rb →
      </a>
    </div>
    <p class="reveal mt-4 text-[13px] text-ink-2" style="--d:220ms">
      sekali bayar · saldo 20rb langsung masuk · garansi refill 30 hari
    </p>
  </div>
</section>
