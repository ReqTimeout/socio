<script>
  import { onMount } from 'svelte';
  import Sparko from '@socio/ui/components/Sparko.svelte';

  let isScrolled = false;

  const loginLink = 'https://app.socio.id/login';
  const regLink = 'https://app.socio.id/daftar';

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
  class="fixed inset-x-0 top-0 z-50"
  aria-label="Navigasi utama"
>
  <div class="mx-auto max-w-6xl px-3 md:px-6">
    <div
      class="mt-2 md:mt-3 flex items-center justify-between gap-2 rounded-[22px] md:rounded-full
        border-2 border-[var(--ink)] px-3 py-2 md:pl-5 md:pr-2.5 md:py-2 backdrop-blur-xl
        shadow-[3px_3px_0_var(--ink)] transition-colors duration-300
        {isScrolled ? 'bg-white/92' : 'bg-white/72'}"
    >
    <a href="/" class="mascot-wiggle inline-flex items-center gap-1.5" aria-label="Socio.id — beranda">
      <Sparko pose="idle" size={28} />
      <span class="font-display text-xl font-bold tracking-tight md:text-2xl">
        <span class="text-ink">socio</span><span class="text-accent-ink">.id</span>
      </span>
    </a>

    <!-- Desktop ≥768px: nav penuh — gaya neo-brutalist biar "pop" konsisten dgn dock mobile -->
    <div class="hidden items-center gap-1.5 md:flex">
      <a href="/layanan" class="rounded-full px-3.5 py-2 text-sm font-bold text-ink-2 transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink">Layanan</a>
      <a href="/reseller" class="rounded-full px-3.5 py-2 text-sm font-bold text-ink-2 transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink">Reseller</a>
      <a href="/blog" class="rounded-full px-3.5 py-2 text-sm font-bold text-ink-2 transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink">Blog</a>
      <a href="#harga" class="rounded-full px-3.5 py-2 text-sm font-bold text-ink-2 transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink">Harga</a>
      <a href="#faq" class="rounded-full px-3.5 py-2 text-sm font-bold text-ink-2 transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink">FAQ</a>
      <span class="mx-2 h-6 w-0.5 rounded-full bg-[var(--hairline-strong)]" aria-hidden="true"></span>
      <a
        href={loginLink}
        class="rounded-full border-2 border-[var(--ink)] bg-white px-4 py-1.5 text-sm font-bold text-ink
          shadow-[2px_2px_0_var(--ink)] transition-all duration-150
          hover:bg-[var(--paper)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus-ring)]"
      >Masuk</a>
      <a
        href={regLink}
        class="rounded-full border-2 border-[var(--ink)] bg-[var(--accent-ink)] px-5 py-1.5 text-sm font-bold text-white
          shadow-[2px_2px_0_var(--ink)] transition-all duration-150
          hover:bg-[var(--accent-hover)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus-ring)]"
      >
        Daftar Reseller
      </a>
    </div>

    <!-- Mobile: akses login eksplisit di kanan (dock bawah CTA-nya "Daftar", bukan "Masuk") -->
    <a
      href={loginLink}
      class="md:hidden inline-flex items-center rounded-full border-2 border-[var(--ink)]
        bg-[var(--accent-ink)] px-4 py-1.5 text-sm font-bold text-white shadow-[2px_2px_0_var(--ink)]
        transition-all duration-150 hover:bg-[var(--accent-hover)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
    >Masuk</a>
    </div>
  </div>
</nav>

<style>
  /* V2 §5.1: maskot wiggle 1× saat first load (450ms spring) */
  .mascot-wiggle {
    animation: mascot-wiggle 450ms var(--ease-spring) 200ms both;
    transform-origin: left center;
  }
  @keyframes mascot-wiggle {
    from {
      transform: rotate(-8deg) scale(0.9);
      opacity: 0;
    }
    to {
      transform: rotate(0deg) scale(1);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mascot-wiggle {
      animation: none;
    }
  }
</style>
