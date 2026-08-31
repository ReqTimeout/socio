<script>
  import { onMount } from 'svelte';

  let isScrolled = false;
  let isMenuOpen = false;

  const loginLink = 'https://app.socio.id/login';
  const regLink = 'https://app.socio.id/daftar';
  const resellerLink = 'https://app.socio.id/daftar?mode=reseller';

  onMount(() => {
    const handleScroll = () => {
      isScrolled = window.scrollY > 20;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<nav
  class="fixed w-full z-50 transition-all duration-300 {isScrolled
    ? 'bg-white/90 backdrop-blur-md shadow-sm py-3'
    : 'bg-transparent py-5'}"
>
  <div class="container mx-auto px-5 md:px-6 flex justify-between items-center">
    <a href="/" class="font-display font-black text-xl md:text-2xl tracking-tight">
      <span class="text-ink-900">socio</span><span class="text-primary">.id</span>
    </a>

    <!-- Desktop: 3 CTAs jelas -->
    <div class="hidden md:flex gap-2 text-sm font-bold items-center">
      <a href="#layanan" class="px-3 py-2 text-ink-600 hover:text-ink-900 transition">Layanan</a>
      <a href="#cara-kerja" class="px-3 py-2 text-ink-600 hover:text-ink-900 transition">Cara Kerja</a>
      <a href="#harga" class="px-3 py-2 text-ink-600 hover:text-ink-900 transition">Harga</a>
      <span class="w-px h-5 bg-ink-200 mx-1"></span>
      <a href={loginLink} class="px-4 py-2 text-ink-700 hover:text-primary transition">Masuk</a>
      <a href={regLink} class="px-5 py-2.5 rounded-full border border-ink-200 bg-white hover:bg-ink-50 transition">Daftar</a>
      <a
        href={resellerLink}
        class="bg-amber-400 text-ink-900 px-5 py-2.5 rounded-full hover:bg-amber-500 transition shadow-md flex items-center gap-1"
      >
        👑 Reseller
      </a>
    </div>

    <button
      class="md:hidden w-11 h-11 grid place-items-center rounded-xl bg-white shadow-sm border border-ink-100 text-ink-700"
      onclick={() => (isMenuOpen = !isMenuOpen)}
      aria-label="Buka menu"
      aria-expanded={isMenuOpen}
    >
      {isMenuOpen ? '✕' : '☰'}
    </button>
  </div>

  {#if isMenuOpen}
    <div
      class="absolute top-full left-0 w-full bg-white shadow-xl border-t border-ink-100 p-5 flex flex-col gap-3 md:hidden"
    >
      <a href="#layanan" class="text-base font-bold text-ink-700 py-2" onclick={() => (isMenuOpen = false)}>Layanan</a>
      <a href="#cara-kerja" class="text-base font-bold text-ink-700 py-2" onclick={() => (isMenuOpen = false)}>Cara Kerja</a>
      <a href="#harga" class="text-base font-bold text-ink-700 py-2" onclick={() => (isMenuOpen = false)}>Harga</a>
      <hr class="border-ink-100 my-1" />
      <a href={loginLink} class="text-center py-3 font-bold text-ink-700 bg-ink-50 rounded-xl" onclick={() => (isMenuOpen = false)}>Masuk</a>
      <a href={regLink} class="text-center py-3 font-bold text-white bg-primary rounded-xl shadow-md" onclick={() => (isMenuOpen = false)}>Daftar Gratis — Member</a>
      <a href={resellerLink} class="text-center py-3 font-bold text-ink-900 bg-amber-400 rounded-xl shadow-md flex items-center justify-center gap-2" onclick={() => (isMenuOpen = false)}>👑 Daftar Reseller</a>
    </div>
  {/if}
</nav>
