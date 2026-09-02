<script lang="ts">
  // D6: TopLayananTable — real table 14 layanan dari prices.json: search live filter
  // + sort klik header (180ms) + highlight match + count hasil.
  // Plan §4.2 #3 + micro. Data di-inject dari Astro frontmatter (satu island, client:visible).
  import { onMount } from 'svelte';
  import prices from '../data/prices.json';

  interface Row {
    platform: string;
    name: string;
    price: number;
    priceReseller: number;
    min: number;
    refill: boolean;
  }

  const rows: Row[] = (prices as any).top;

  let query = $state('');
  let sortKey = $state<'price' | 'name'>('price');
  let sortAsc = $state(true);

  // 404 search prefill via ?q= param (L1: search layanan → /layanan?q=followers)
  onMount(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q && !query) query = q;
  });

  const fmt = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

  const filtered = $derived(
    rows
      .filter((r) => (r.name + ' ' + r.platform).toLowerCase().includes(query.trim().toLowerCase()))
      .toSorted((a, b) => {
        const mul = sortAsc ? 1 : -1;
        if (sortKey === 'price') return (a.price - b.price) * mul;
        return a.name.localeCompare(b.name) * mul;
      }),
  );

  function toggleSort(k: 'price' | 'name') {
    if (sortKey === k) sortAsc = !sortAsc;
    else {
      sortKey = k;
      sortAsc = true;
    }
  }

  // highlight match — escape regex dari input user
  function mark(text: string): { hit: boolean; parts: string[] } {
    const q = query.trim().toLowerCase();
    if (!q) return { hit: false, parts: [text] };
    const i = text.toLowerCase().indexOf(q);
    if (i === -1) return { hit: false, parts: [text] };
    return { hit: true, parts: [text.slice(0, i), text.slice(i, i + q.length), text.slice(i + q.length)] };
  }
</script>

<section class="bg-[var(--paper-2)] py-16 md:py-24" aria-labelledby="top-title">
  <div class="mx-auto max-w-6xl px-5 md:px-8">
    <div class="reveal mx-auto max-w-2xl text-center">
      <h2 id="top-title" class="font-display text-[length:var(--text-h2)] font-bold tracking-tight text-ink">
        Harga layanan terpopuler.
      </h2>
      <p class="mt-3 text-[length:var(--text-body)] leading-relaxed text-ink-2">
        Ini harga member. Daftar reseller Rp50.000 — saldo Rp20.000 langsung masuk dan
        <strong class="text-ink">semua harga di bawah lebih murah lagi</strong>.
      </p>
    </div>

    <div class="reveal mx-auto mt-10 max-w-3xl md:mt-12" style="--d: 60ms">
      <!-- search input besar -->
      <label class="relative block">
        <span class="sr-only">Cari layanan</span>
        <svg class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          bind:value={query}
          type="search"
          placeholder="Cari layanan… (contoh: followers, views)"
          class="min-h-[56px] w-full rounded-[var(--radius-md)] border border-[var(--hairline-strong)] bg-white pl-12 pr-4 text-[16px] font-medium text-ink shadow-[var(--n)] placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-[var(--accent-ink)]"
        />
      </label>
      <p class="mt-2 text-right text-[12px] text-ink-3" aria-live="polite">
        <span class="num font-bold text-ink-2">{filtered.length}</span> layanan
      </p>

      <!-- table -->
      <div class="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--hairline)] bg-white shadow-[var(--n)]">
        <table class="w-full min-w-[560px] text-left">
          <thead>
            <tr class="border-b border-[var(--hairline)] bg-[var(--paper-2)]">
              <th scope="col" class="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-3">Platform</th>
              <th scope="col">
                <button type="button" onclick={() => toggleSort('name')} class="flex w-full items-center gap-1 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-3 transition-colors hover:text-[var(--accent-ink)]">
                  Layanan
                  <svg class={`h-3 w-3 transition-transform duration-200 ${sortKey === 'name' ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d={sortAsc ? 'm6 15 6-6 6 9' : 'm6 9 6 6 6-9'} /></svg>
                </button>
              </th>
              <th scope="col" class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-3">Min</th>
              <th scope="col">
                <button type="button" onclick={() => toggleSort('price')} class="flex w-full items-center justify-end gap-1 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-ink-3 transition-colors hover:text-[var(--accent-ink)]">
                  Harga member /1k
                  <svg class={`h-3 w-3 transition-transform duration-200 ${sortKey === 'price' ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d={sortAsc ? 'm6 15 6-6 6 9' : 'm6 9 6 6 6-9'} /></svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--hairline)]">
            {#each filtered as r, i (r.platform + r.name)}
              <tr class="transition-opacity duration-200" style={`animation: fadein 180ms ease ${Math.min(i * 20, 140)}ms both`}>
                <td class="whitespace-nowrap px-4 py-3 text-[13px] font-semibold text-ink-2">{r.platform}</td>
                <td class="min-w-0 px-4 py-3 text-[14px] font-semibold text-ink">
                  {#if mark(r.name).hit}
                    {@const m = mark(r.name)}
                    {m.parts[0]}<mark class="rounded-sm bg-[var(--accent-tint)] px-0.5 text-ink">{m.parts[1]}</mark>{m.parts[2]}
                  {:else}
                    {r.name}
                  {/if}
                  {#if r.refill}
                    <span class="ml-2 hidden items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:inline-flex">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6"/></svg>
                      refill
                    </span>
                  {/if}
                </td>
                <td class="num px-4 py-3 text-right font-mono text-[13px] text-ink-3">{r.min.toLocaleString('id-ID')}</td>
                <td class="num px-4 py-3 text-right font-mono text-[13px] font-bold text-ink">{fmt(r.price)}</td>
              </tr>
            {/each}
            {#if filtered.length === 0}
              <tr>
                <td colspan="4" class="px-4 py-10 text-center text-[14px] text-ink-3">
                  Tidak ketemu “{query}” — coba kata lain, atau lihat semua 8.270 layanan setelah daftar.
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-[12px] text-ink-3">
        Harga per 1.000, dapat berubah. Daftar untuk lihat harga reseller live di 8.270 layanan.
      </p>
    </div>
  </div>
</section>

<style>
  @keyframes fadein {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    tbody tr { animation: none; }
  }
</style>
