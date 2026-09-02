<script>
  import { fly } from 'svelte/transition';

  let showSticky = $state(false);
  const regLink = 'https://app.socio.id/daftar?mode=reseller';

  $effect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScroll = () => {
      showSticky = window.scrollY > 300;
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
    };
  });
</script>

{#if showSticky}
  <div
    transition:fly={{ y: 100, duration: 380 }}
    class="md:hidden fixed inset-x-3 z-40 px-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
  >
    <a
      href={regLink}
      class="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-[oklch(0.19_0.02_235_/_0.96)] px-4 py-2.5 text-white shadow-[0_10px_36px_-14px_rgba(6,182,212,0.45),0_4px_14px_rgba(15,23,42,0.28)] backdrop-blur-md transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
    >
      <div class="min-w-0 leading-tight">
        <p class="text-[13px] font-bold text-white">Daftar reseller · Rp50.000</p>
        <p class="text-[10px] font-medium tracking-wide text-white/65">Saldo Rp20rb + harga reseller</p>
      </div>
      <span class="grid h-9 shrink-0 place-items-center rounded-full bg-[var(--accent-ink)] px-4 text-[12px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        Daftar
      </span>
    </a>
  </div>
{/if}