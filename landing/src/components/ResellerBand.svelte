<script>
  import Confetti from './Confetti.svelte';
  import SocioMascot from './SocioMascot.svelte';
  // V2 §5.10 ResellerBand — inverted: dorongan terakhir offer reseller.
  // Split: kiri copy + ledger 4 baris on-dark; kanan kartu member (sticker, tilt, float).
  // CTA confetti on click → app…/daftar?mode=reseller.
  let fire = $state(0);
  const regReseller = 'https://app.socio.id/daftar?mode=reseller';
</script>

<section class="bg-[var(--dark-panel)] py-16 md:py-24" aria-labelledby="reseller-band-title">
  <div class="mx-auto grid max-w-6xl items-center gap-10 px-5 md:px-8 lg:grid-cols-2 lg:gap-14">
    <div class="min-w-0">
      <h2 id="reseller-band-title" class="reveal font-display text-[length:var(--text-h2)] font-bold tracking-tight text-[var(--on-dark)]">
        Modal Rp50 ribu, mulai bisnis jasa sosmed hari ini.
      </h2>
      <dl class="reveal mt-7 max-w-md divide-y divide-[var(--hairline-dark)] border-y border-[var(--hairline-dark)]" style="--d:120ms">
        {#each [['Saldo awal langsung jalan', 'Rp20.000'], ['Harga grosir', 'semua layanan'], ['API + dashboard', 'siap reseller'], ['Affiliate', '2% seumur hidup']] as [k, v]}
          <div class="flex items-baseline justify-between gap-4 py-2.5">
            <dt class="text-[14px] text-[var(--on-dark-2)]">{k}</dt>
            <dd class="text-[14px] font-bold text-[var(--on-dark)]">
              <span class="mr-1.5 text-emerald-400" aria-hidden="true">✓</span>{v}
            </dd>
          </div>
        {/each}
      </dl>
      <div class="reveal relative mt-8" style="--d:200ms">
        <Confetti {fire} />
        <a
          href={regReseller}
          onclick={() => (fire += 1)}
          class="magnetic cta-glow inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent-ink)] px-8 text-[15px] font-bold text-white transition-transform duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        >
          Ambil Slot Reseller →
        </a>
        <p class="mt-3 text-[13px] text-[var(--on-dark-2)]">Sekali bayar · tanpa langganan · <a href="/reseller" class="font-bold text-[var(--on-dark)] underline decoration-2 underline-offset-2">hitung dulu cuanmu →</a></p>
      </div>
    </div>

    <!-- kartu member reseller -->
    <div class="reveal flex justify-center lg:justify-end" style="--d:160ms">
      <div class="tilt-r sticker float-idle w-full max-w-[320px] bg-[var(--paper)] p-6" aria-hidden="true">
        <div class="flex items-center gap-2.5">
          <SocioMascot pose="wave" class="h-10 w-10" />
          <div>
            <p class="font-display text-[15px] font-extrabold tracking-tight text-ink">SOCIO RESELLER</p>
            <p class="text-[12px] text-ink-3">member grosir · sejak 2026</p>
          </div>
        </div>
        <p class="num mt-5 text-[13px] font-bold tracking-[0.2em] text-ink-2">RESELLER ··· 20K</p>
        <div class="mt-4 flex items-center justify-between rounded-xl bg-[var(--accent-tint)] px-4 py-3">
          <span class="text-[12px] font-bold text-[var(--accent-ink)]">Saldo awal</span>
          <span class="num text-[16px] font-extrabold text-[var(--accent-ink)]">Rp20.000</span>
        </div>
      </div>
    </div>
  </div>
</section>
