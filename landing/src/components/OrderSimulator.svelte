<script lang="ts">
  // D3: OrderSimulator — domain centerpiece (§3b #5, kartu #1 dari 2)
  // Form 3 field → harga live count-up (tweened, pattern NumberFlow app) + SVG gauge.
  // Reduced-motion → angka langsung tanpa tween.
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const services = [
    { name: 'Instagram Followers', ratePerK: 4200, min: 100 },
    { name: 'TikTok Views', ratePerK: 42, min: 100 },
    { name: 'YouTube Likes', ratePerK: 1350, min: 50 },
    { name: 'Telegram Members', ratePerK: 8900, min: 100 },
  ];

  let serviceIdx = $state(1);
  let link = $state('');
  let qty = $state(5000);
  let submitted = $state(false);
  let linkError = $state('');

  const price = $derived(Math.ceil((qty / 1000) * services[serviceIdx].ratePerK));
  const priceShown = tweened(0, { duration: 300, easing: cubicOut });
  const gaugePct = $derived(Math.min(1, qty / 50000));
  const gaugeDash = 2 * Math.PI * 40; // r=40

  let reduced = false;
  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    priceShown.set(price, { duration: reduced ? 0 : 300 });
  });

  // A5: harga count-up saat qty/service berubah
  $effect(() => {
    priceShown.set(price, { duration: reduced ? 0 : 300 });
  });

  const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const ok = /^(https?:\/\/)?(www\.)?(instagram|tiktok|youtube|t)\.[a-z.]+\/[\w.\-/@]+/i.test(link.trim());
    if (!ok) {
      linkError = 'Tempel link yang valid dari platform-nya';
      return;
    }
    linkError = '';
    submitted = true;
    setTimeout(() => (submitted = false), 2600); // A4 check draw, lalu reset
  }
</script>

<section class="bg-[var(--paper)] py-16 md:py-24" aria-labelledby="sim-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="reveal mx-auto max-w-2xl text-center">
      <h2 id="sim-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Coba dulu, bayar belakangan.
      </h2>
      <p class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">
        Hitung sendiri harganya — tanpa daftar, tanpa login. Ini harga member;
        sebagai <strong class="text-ink">reseller kamu bayar lebih murah dari ini</strong>,
        di semua layanan.
      </p>
    </div>

    <!-- Inset panel — kartu #1 (dari 2) di seluruh landing -->
    <div class="reveal mx-auto mt-10 max-w-3xl rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-white p-5 shadow-[var(--shadow-card)] md:mt-12 md:p-8" style="--d: 80ms">
      <form class="grid gap-4" onsubmit={submit} aria-label="Simulasi harga order">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1.5">
            <span class="text-[13px] font-bold text-ink">Layanan</span>
            <select
              bind:value={serviceIdx}
              class="min-h-[48px] rounded-[var(--radius-sm)] border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 text-[14px] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-[var(--accent-ink)]"
            >
              {#each services as s, i}
                <option value={i}>{s.name}</option>
              {/each}
            </select>
          </label>
          <label class="grid gap-1.5">
            <span class="text-[13px] font-bold text-ink">Link kamu</span>
            <input
              bind:value={link}
              type="text"
              inputmode="url"
              placeholder="https://tiktok.com/@tokokue"
              aria-invalid={linkError ? 'true' : undefined}
              class="min-h-[48px] rounded-[var(--radius-sm)] border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 text-[14px] text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-[var(--accent-ink)]"
            />
            {#if linkError}
              <span class="text-[12px] font-semibold text-[var(--color-danger)]" role="alert">{linkError}</span>
            {/if}
          </label>
        </div>

        <label class="grid gap-2">
          <span class="flex items-baseline justify-between text-[13px] font-bold text-ink">
            Jumlah
            <span class="num text-[13px] font-extrabold text-[var(--accent-ink)]">{fmt(qty)}</span>
          </span>
          <input
            bind:value={qty}
            oninput={(e) => (qty = Math.max(services[serviceIdx].min, Math.round(Number((e.target as HTMLInputElement).value) / 100) * 100))}
            type="range"
            min={services[serviceIdx].min}
            max={50000}
            step={100}
            class="sim-range"
            aria-label="Jumlah order"
          />
          <span class="flex justify-between text-[11px] text-ink-3">
            <span>min {fmt(services[serviceIdx].min)}</span>
            <span>50.000</span>
          </span>
        </label>

        <!-- Gauge + total -->
        <div class="grid items-center gap-6 border-t border-[var(--hairline)] pt-5 sm:grid-cols-[auto_1fr]">
          <!-- SVG gauge ring A5 -->
          <div class="relative mx-auto h-[104px] w-[104px]" aria-hidden="true">
            <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--hairline)" stroke-width="7" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="var(--accent-ink)"
                stroke-width="7" stroke-linecap="round"
                stroke-dasharray={gaugeDash}
                stroke-dashoffset={gaugeDash * (1 - gaugePct)}
                style="transition: stroke-dashoffset 300ms cubic-bezier(0, 0, 0.2, 1) {reduced ? ', none' : ''}"
              />
            </svg>
            <span class="num absolute inset-0 grid place-items-center text-[15px] font-extrabold text-ink">
              {Math.round(gaugePct * 100)}%
            </span>
          </div>
          <div class="min-w-0">
            <p class="text-[12px] font-bold uppercase tracking-widest text-ink-3">Total harga</p>
            <p class="num font-display text-[32px] font-extrabold leading-none tracking-tight text-ink md:text-[36px]">
              Rp {fmt($priceShown)}
            </p>
            <p class="mt-1.5 text-[13px] text-ink-2">
              ≈ Rp{Math.round(price / (qty / 1000)).toLocaleString('id-ID')}/1k harga member · reseller lebih murah
            </p>
          </div>
        </div>

        <button
          type="submit"
          class="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--accent-ink)] px-8 text-[15px] font-bold text-white transition-transform duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        >
          {#if submitted}
            <!-- A4: SVG check draw -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="check-draw">
              <path d="M4 12.5 9.5 18 20 6.5" />
            </svg>
            Harga terkunci — daftar reseller Rp50rb?
          {:else}
            Pesan →
          {/if}
        </button>
      </form>
    </div>
  </div>
</section>

<style>
  /* Slider accent (pattern kalkulator reseller) */
  .sim-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 9999px;
    background: var(--paper-2);
    outline-offset: 4px;
  }
  .sim-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px; height: 24px;
    border-radius: 9999px;
    background: var(--accent-ink);
    border: 3px solid white;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.18);
    transition: transform 150ms;
  }
  .sim-range:active::-webkit-slider-thumb { transform: scale(1.15); }
  .sim-range::-moz-range-thumb {
    width: 24px; height: 24px;
    border-radius: 9999px;
    background: var(--accent-ink);
    border: 3px solid white;
  }

  /* A4 check draw 400ms */
  .check-draw path {
    stroke-dasharray: 26;
    stroke-dashoffset: 26;
    animation: draw 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes draw { to { stroke-dashoffset: 0; } }

  @media (prefers-reduced-motion: reduce) {
    .check-draw path { animation: none; stroke-dashoffset: 0; }
    .sim-range::-webkit-slider-thumb { transition: none; }
  }
</style>
