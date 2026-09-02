<script>
  import { onMount } from 'svelte';

  let isScrolled = false;

  const loginLink = 'https://app.socio.id/login';
  const regLink = 'https://app.socio.id/daftar?mode=reseller';

  // D1: scroll-state — blur + hairline pas threshold 24px (plan §3 navbar)
  onMount(() => {
    const onScroll = () => {
      isScrolled = window.scrollY > 24;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });
</script>

<nav
  class="fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,padding] duration-300
    {isScrolled ? 'bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] backdrop-blur-xl' : 'bg-transparent'}"
  style="border-bottom: 1px solid {isScrolled ? 'var(--hairline)' : 'transparent'}"
  aria-label="Navigasi utama"
>
  <div
    class="mx-auto flex max-w-6xl items-center justify-between px-5 md:px-8
      {isScrolled ? 'py-3' : 'py-5'} transition-all duration-300"
  >
    <a href="/" class="font-display text-xl font-bold tracking-tight md:text-2xl" aria-label="Socio.id — beranda">
      <span class="text-ink">socio</span><span class="text-accent-ink">.id</span>
    </a>

    <!-- Desktop ≥768px: nav penuh (plan: Layanan · Reseller · Blog + Masuk + Daftar accent-ink) -->
    <div class="hidden items-center gap-1 md:flex">
      <a href="/layanan" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink">Layanan</a>
      <a href="/reseller" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink">Reseller</a>
      <a href="/blog" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink">Blog</a>
      <span class="mx-2 h-5 w-px bg-[var(--hairline-strong)]" aria-hidden="true"></span>
      <a href={loginLink} class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:text-ink">Masuk</a>
      <a
        href={regLink}
        class="rounded-full bg-[var(--accent-ink)] px-5 py-2.5 text-sm font-bold text-white shadow-sm
          transition-transform duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus-ring)]
          active:scale-[0.97]"
      >
        Daftar Rp50rb
      </a>
    </div>

    <!-- Mobile: logo saja — semua navigasi utama ada di FloatingTabDock (no hamburger) -->
  </div>
</nav>
