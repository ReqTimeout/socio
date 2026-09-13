<script lang="ts">
  // V2 §5.5 OrderSimulator — centerpiece gamified ("oh, gampang banget").
  // Pilih layanan (chip squishy) → jumlah (slider+input) → harga live (A4 roll)
  // → toggle reseller (coret + pop + badge hemat) → "Coba Pesan" = confetti
  // (A9) + mock toast. Label jujur: ini SIMULASI. Harga 100% prices.json.
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import prices from '../data/prices.json';
  import Confetti from './Confetti.svelte';

  type Sample = { name: string; short: string; ratePerK: number; resellerPerK: number; min: number; slug: string | null };

  // Layanan contoh dari katalog real (bukan hardcode) — 4 platform berbeda.
  function pickSample(): Sample[] {
    const top = (prices.top ?? []) as Array<{ platform: string; name: string; price: number; priceReseller?: number; min: number }>;
    const want: Array<{ match: string; short: string; slug: string | null }> = [
      { match: 'Instagram Video Views', short: 'IG Views', slug: null },
      { match: 'TikTok Video Views', short: 'TikTok Views', slug: 'beli-views-tiktok' },
      { match: 'Youtube Subscriber', short: 'YT Subscriber', slug: 'beli-subscribers-youtube' },
      { match: 'Spotify Plays', short: 'Spotify Plays', slug: null },
    ];
    const out: Sample[] = [];
    for (const w of want) {
      const hit = top.find((t) => t.name.startsWith(w.match));
      if (hit) {
        out.push({
          name: hit.name,
          short: w.short,
          ratePerK: Math.round(hit.price),
          resellerPerK: Math.round(hit.priceReseller ?? hit.price),
          min: hit.min || 100,
          slug: w.slug,
        });
      }
    }
    return out;
  }
  const services = pickSample();

  let serviceIdx = $state(1);
  let qty = $state(5000);
  let reseller = $state(false);
  let submitted = $state(false);
  let confettiFire = $state(0);
  let orderNo = $state('');

  const svc = $derived(services[serviceIdx]);
  const rate = $derived(reseller ? svc.resellerPerK : svc.ratePerK);
  const price = $derived(Math.ceil((qty / 1000) * rate));
  const memberPrice = $derived(Math.ceil((qty / 1000) * svc.ratePerK));
  const hemat = $derived(memberPrice - price);
  const priceShown = tweened(0, { duration: 300, easing: cubicOut });

  let reduced = false;
  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    priceShown.set(price, { duration: reduced ? 0 : 200 });
  });

  // A4: harga counter-roll saat qty/layanan/toggle berubah
  $effect(() => {
    priceShown.set(price, { duration: reduced ? 0 : 200 });
  });

  // ganti layanan → qty kembali ke min layanan tsb kalau di bawahnya.
  // (Hanya saat layanan berubah — jangan ganggu user yang sedang mengetik angka.)
  let prevIdx = serviceIdx;
  $effect(() => {
    if (serviceIdx !== prevIdx) {
      prevIdx = serviceIdx;
      if (qty < svc.min) qty = svc.min;
    }
  });

  const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');

  function submit() {
    orderNo = `SOC-${8200 + Math.floor(Math.random() * 90)}`;
    submitted = true;
    confettiFire += 1; // Confetti hening saat reduced-motion (di dalam komponen)
    setTimeout(() => (submitted = false), 5200);
  }
</script>

<section class="bg-white py-16 md:py-24" aria-labelledby="sim-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="reveal mx-auto max-w-2xl text-center">
      <h2 id="sim-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Coba dulu, GRATIS. Rasain gampangnya.
      </h2>
      <p class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">
        Ini simulasi — order benerannya bahkan lebih gampang.
      </p>
    </div>

    <!-- STICKER CARD #1 -->
    <div class="sticker-lg reveal relative mx-auto mt-10 max-w-3xl p-5 md:mt-12 md:p-8" style="--d: 80ms">
      <Confetti fire={confettiFire} />
      <div class="grid gap-5">
        <!-- 1. pilih platform/layanan — chip squishy -->
        <div>
          <p class="text-[13px] font-bold text-ink" id="sim-svc-label">1 · Pilih layanan</p>
          <div class="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="sim-svc-label">
            {#each services as s, i}
              <button
                type="button"
                aria-pressed={serviceIdx === i}
                onclick={() => (serviceIdx = i)}
                class="min-h-[44px] rounded-full border-2 px-4 text-[14px] font-bold transition-all duration-150 active:scale-95
                  {serviceIdx === i
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-white shadow-[2px_2px_0_var(--pop-mango)]'
                    : 'border-[var(--hairline-strong)] bg-[var(--paper)] text-ink-2 hover:border-[var(--ink)] hover:text-ink'}"
              >
                {s.short}
              </button>
            {/each}
          </div>
        </div>

        <!-- 2. jumlah — slider + input angka -->
        <div>
          <p class="flex items-baseline justify-between text-[13px] font-bold text-ink">
            <span>2 · Jumlah</span>
            <span class="flex items-center gap-2">
              <input
                type="number"
                bind:value={qty}
                min={svc.min}
                max={100000}
                step={100}
                aria-label="Jumlah order (ketik langsung)"
                class="num min-h-[40px] w-[110px] rounded-[var(--radius-sm)] border border-[var(--hairline-strong)] bg-[var(--paper)] px-2.5 text-right text-[14px] font-bold text-ink focus-visible:outline-2 focus-visible:outline-[var(--accent-ink)]"
              />
            </span>
          </p>
          <input
            bind:value={qty}
            oninput={(e) => {
              const v = Math.round(Number((e.target as HTMLInputElement).value) / 100) * 100;
              qty = Math.min(100000, Math.max(svc.min, v || svc.min));
            }}
            type="range"
            min={svc.min}
            max={100000}
            step={100}
            class="sim-range mt-3"
            aria-label="Jumlah order (geser)"
          />
          <span class="mt-1.5 flex justify-between text-[11px] text-ink-3" aria-hidden="true">
            <span>{fmt(svc.min)}</span><span>10k</span><span>50k</span><span>100k</span>
          </span>
        </div>

        <!-- hasil -->
        <div class="rounded-2xl border border-[var(--hairline)] bg-[var(--paper)] p-4 md:p-5" aria-live="polite">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[12px] font-bold uppercase tracking-widest text-ink-3">Estimasi biaya</p>
              <p class="num font-display mt-1 text-[32px] font-extrabold leading-none tracking-tight text-ink md:text-[36px]">
                {#if reseller}<span class="mr-2 align-middle text-[18px] font-bold text-ink-3 line-through">Rp{fmt(memberPrice)}</span>{/if}
                Rp{fmt($priceShown)}
              </p>
              <p class="mt-1.5 text-[13px] text-ink-2">
                {fmt(qty)} {svc.short} ≈ Rp{fmt(rate)}/1k
                {#if svc.slug}
                  · <a href="/{svc.slug}" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Beli {svc.short.toLowerCase()} mulai Rp{fmt(svc.ratePerK)}/1k →</a>
                {:else}
                  · <a href="/layanan" class="font-bold text-[var(--accent-ink)] underline decoration-2 underline-offset-2">Lihat semua harga →</a>
                {/if}
              </p>
            </div>
            <!-- toggle harga reseller -->
            <button
              type="button"
              role="switch"
              aria-checked={reseller}
              onclick={() => (reseller = !reseller)}
              class="relative inline-flex min-h-[44px] items-center gap-2.5 rounded-full border-2 {reseller ? 'border-[var(--ink)] bg-[var(--pop-mango-soft)]' : 'border-[var(--hairline-strong)] bg-white'} px-4 py-2 text-[13px] font-bold text-ink transition-colors"
            >
              <span class="grid h-5 w-9 place-items-center rounded-full {reseller ? 'bg-[var(--accent-ink)]' : 'bg-[var(--hairline-strong)]'} transition-colors" aria-hidden="true">
                <span class="block h-3.5 w-3.5 rounded-full bg-white transition-transform {reseller ? 'translate-x-2' : '-translate-x-2'}"></span>
              </span>
              Harga Reseller
              {#if reseller && hemat > 0}
                <span class="pop-in is-visible rounded-full bg-[var(--pop-mango)] px-2 py-0.5 text-[11px] font-extrabold text-ink">hemat Rp{fmt(hemat)}</span>
              {/if}
            </button>
          </div>
          <p class="mt-2 text-[12px] text-ink-3">Mulai proses &lt; 1 menit setelah saldo masuk.</p>
        </div>

        <div>
          <button
            type="button"
            onclick={submit}
            class="relative flex min-h-[52px] w-full items-center justify-center gap-2 overflow-visible rounded-full bg-[var(--accent-ink)] px-8 text-[15px] font-bold text-white transition-transform duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.97]"
          >
            Coba Pesan →
          </button>
          {#if submitted}
            <p class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-[13px] font-semibold text-emerald-800" role="status">
              Order #{orderNo} masuk! Mulai proses &lt; 1 menit.
              <span class="mt-0.5 block text-[12px] font-normal text-emerald-700">simulasi ya, belum order beneran — daftar dulu biar jadi beneran 🙂</span>
            </p>
          {:else}
            <p class="mt-2 text-center text-[12px] text-ink-3">simulasi ya, belum order beneran 🙂</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
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
  @media (prefers-reduced-motion: reduce) {
    .sim-range::-webkit-slider-thumb { transition: none; }
  }
</style>
