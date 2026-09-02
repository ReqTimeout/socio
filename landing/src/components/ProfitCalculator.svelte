<script lang="ts">
  // D5: ProfitCalculator — slider pelanggan/bulan × harga jual/1k → profit count-up + SVG bar.
  // Plan §4.1 #3: inset panel (kartu 1), paper-2 bg. Pattern tweened dari OrderSimulator (D3).
  // Asumsi ekonomi: tiap pelanggan order rata-rata 2.000 unit/bulan.
  // Modal (harga socio reseller) pakai IG Followers reseller Rp6.902/1k (real DB).
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const COST_PER_K = 6902; // IG Followers harga reseller/1k (DB real)
  const AVG_UNITS_PER_CUSTOMER = 2000; // asumsi marketing: 2rb unit/pelanggan/bulan

  let customers = $state(30);
  let jualPerK = $state(15000);

  // profit = (harga jual - modal) × total unit
  const profit = $derived(Math.max(0, Math.round(((jualPerK - COST_PER_K) * (customers * AVG_UNITS_PER_CUSTOMER)) / 1000)));
  const modal = $derived(Math.round((COST_PER_K * customers * AVG_UNITS_PER_CUSTOMER) / 1000));
  const omzet = $derived(profit + modal);

  const profitShown = tweened(0, { duration: 350, easing: cubicOut });
  const barPct = $derived(Math.min(1, profit / 20000000)); // skala 0–20jt full bar

  let reduced = false;
  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    profitShown.set(profit, { duration: 0 });
  });
  $effect(() => {
    profitShown.set(profit, { duration: reduced ? 0 : 350 });
  });

  const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');
  const noop = (e: SubmitEvent) => e.preventDefault();
</script>

<section class="bg-[var(--paper-2)] py-16 md:py-24" aria-labelledby="kalkulator-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="reveal mx-auto max-w-2xl text-center">
      <h2 id="kalkulator-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Berapa cuan jualannya?
      </h2>
      <p class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">
        Geser dua slider di bawah — hitung sendiri margin kamu. Contoh pakai
        <strong class="text-ink">IG Followers reseller Rp6.902/1k</strong>, jual Rp15rb/1k.
      </p>
    </div>

    <!-- Inset panel — kartu 1 (satu-satunya) di halaman reseller -->
    <div class="reveal mx-auto mt-10 max-w-3xl rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--n)] md:mt-12 md:p-8" style="--d: 80ms">
      <form class="grid gap-6" aria-label="Kalkulator profit reseller" onsubmit={noop}>
        <div class="grid gap-6 sm:grid-cols-2">
          <label class="grid gap-2">
            <span class="flex items-baseline justify-between text-[13px] font-bold text-ink">
              Pelanggan / bulan
              <span class="num text-[15px] font-extrabold text-[var(--accent-ink)]">{customers}</span>
            </span>
            <input
              bind:value={customers}
              oninput={(e) => (customers = Math.round(Number((e.target as HTMLInputElement).value)))}
              type="range" min="1" max="200" step="1"
              class="calc-range" aria-label="Jumlah pelanggan per bulan"
            />
            <span class="flex justify-between text-[11px] text-ink-3"><span>1</span><span>200</span></span>
          </label>
          <label class="grid gap-2">
            <span class="flex items-baseline justify-between text-[13px] font-bold text-ink">
              Harga jual kamu /1k
              <span class="num text-[15px] font-extrabold text-[var(--accent-ink)]">Rp{fmt(jualPerK)}</span>
            </span>
            <input
              bind:value={jualPerK}
              oninput={(e) => (jualPerK = Math.round(Number((e.target as HTMLInputElement).value) / 500) * 500)}
              type="range" min={COST_PER_K + 500} max="30000" step="500"
              class="calc-range" aria-label="Harga jual per 1000"
            />
            <span class="flex justify-between text-[11px] text-ink-3">
              <span>modal Rp{fmt(COST_PER_K)}</span><span>Rp30rb</span>
            </span>
          </label>
        </div>

        <!-- Hasil: bar SVG + profit count-up -->
        <div class="border-t border-[var(--hairline)] pt-5">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-[12px] font-bold uppercase tracking-widest text-ink-3">Profit kamu / bulan</p>
              <p class="num font-display text-[32px] font-extrabold leading-none tracking-tight text-ink md:text-[40px]">
                Rp {fmt($profitShown)}
              </p>
            </div>
            <!-- SVG bar tumbuh -->
            <svg width="120" height="14" viewBox="0 0 120 14" class="hidden shrink-0 sm:block" aria-hidden="true">
              <rect x="0" y="0" width="120" height="14" rx="7" fill="var(--paper-2)" />
              <rect
                x="0" y="0" width="120" height="14" rx="7" fill="var(--accent-ink)"
                style="transform-origin: 0 50%; transform: scaleX({barPct}); transition: transform 350ms cubic-bezier(0, 0, 0.2, 1){reduced ? ', none' : ''}"
              />
            </svg>
          </div>
          <p class="mt-2 text-[13px] leading-relaxed text-ink-2">
            Asumsi tiap pelanggan order ±2.000 unit/bulan · omzet kamu
            <span class="num font-semibold text-ink">Rp{fmt(omzet)}</span>,
            modal <span class="num font-semibold text-ink">Rp{fmt(modal)}</span>.
            Kamu pasang harga sendiri — sisanya socio yang urus stok, proses &amp; refill.
          </p>
        </div>
      </form>
    </div>
  </div>
</section>

<style>
  .calc-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 9999px;
    background: var(--paper-2);
    outline-offset: 4px;
  }
  .calc-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px; height: 24px;
    border-radius: 9999px;
    background: var(--accent-ink);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.18);
    transition: transform 150ms;
  }
  .calc-range:active::-webkit-slider-thumb { transform: scale(1.15); }
  .calc-range::-moz-range-thumb {
    width: 24px; height: 24px;
    border-radius: 9999px;
    background: var(--accent-ink);
    border: 3px solid white;
  }
  @media (prefers-reduced-motion: reduce) {
    .calc-range::-webkit-slider-thumb { transition: none; }
  }
</style>
