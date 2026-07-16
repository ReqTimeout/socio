<script>
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';

  let showSticky = false;
  const regLink = 'https://app.socio.id/register';

  onMount(() => {
    const handleScroll = () => {
      showSticky = window.scrollY > 300;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

{#if showSticky}
  <div transition:fly={{ y: 100, duration: 500 }} class="fixed bottom-4 left-0 w-full z-50 px-4 flex justify-center">
    <div
      class="bg-primary/95 backdrop-blur-md text-white p-3 md:p-4 rounded-full shadow-2xl flex items-center gap-4 md:gap-8 border border-white/10 max-w-2xl w-full justify-between"
    >
      <div class="hidden md:block pl-4">
        <p class="text-sm font-light text-ink-200">Belum punya akun?</p>
        <p class="font-bold text-white text-sm">Daftar gratis, top-up mulai Rp10.000.</p>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="md:hidden flex-1 pl-2">
          <p class="text-xs text-accent-200 font-bold">Gratis Daftar!</p>
          <p class="text-[10px] text-ink-300">Tanpa kartu kredit</p>
        </div>

        <a
          href={regLink}
          class="bg-accent-500 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:scale-105 transition-transform flex items-center gap-2 whitespace-nowrap animate-pulse"
        >
          Daftar
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </a>
      </div>
    </div>
  </div>
{/if}
