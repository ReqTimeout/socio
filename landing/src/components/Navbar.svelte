<script>
  import { onMount } from 'svelte';

  let isScrolled = false;
  let isMenuOpen = false;

  const loginLink = 'https://app.socio.id/login';
  const regLink = 'https://app.socio.id/register';

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
    ? 'bg-white/90 backdrop-blur-md shadow-sm py-4'
    : 'bg-transparent py-6'}"
>
  <div class="container mx-auto px-6 flex justify-between items-center">
    <a href="/" class="font-display font-bold text-xl md:text-2xl text-primary">Socio.id</a>

    <div class="hidden md:flex gap-8 text-sm font-semibold text-ink-700 items-center">
      <a href="#layanan" class="hover:text-primary transition">Layanan</a>
      <a href="#cara-kerja" class="hover:text-primary transition">Cara Kerja</a>
      <a href="#harga" class="hover:text-primary transition">Harga</a>
      <a href={loginLink} class="text-primary hover:text-primary-800 font-bold px-4">Masuk</a>
      <a
        href={regLink}
        class="bg-primary text-white px-6 py-2.5 rounded-full hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/50"
      >
        Daftar Gratis
      </a>
    </div>

    <button
      class="md:hidden text-2xl text-ink-700"
      onclick={() => (isMenuOpen = !isMenuOpen)}
      aria-label="Buka menu"
    >
      {isMenuOpen ? '✕' : '☰'}
    </button>
  </div>

  {#if isMenuOpen}
    <div
      class="absolute top-full left-0 w-full bg-white shadow-xl border-t border-ink-100 p-6 flex flex-col gap-4 md:hidden"
    >
      <a href="#layanan" class="text-lg font-semibold text-ink-700" onclick={() => (isMenuOpen = false)}>Layanan</a>
      <a href="#cara-kerja" class="text-lg font-semibold text-ink-700" onclick={() => (isMenuOpen = false)}>Cara Kerja</a>
      <a href="#harga" class="text-lg font-semibold text-ink-700" onclick={() => (isMenuOpen = false)}>Harga</a>
      <hr class="border-ink-100" />
      <a href={loginLink} class="text-center py-3 font-bold text-primary bg-ink-50 rounded-lg">Masuk Member</a>
    </div>
  {/if}
</nav>
