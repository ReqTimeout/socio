<script>
  import { onMount } from 'svelte';

  // D1: FloatingTabDock mobile — 3 tab + 1 slot CTA (plan §3g.0 dock)
  // Beranda / · Layanan /layanan · Reseller /reseller + CTA accent-ink
  // Desktop ≥768px hidden. Tap feedback scale, entrance scroll >20% (A6b).

  let pathname = $state('/');
  let visible = $state(false);

  const loginLink = 'https://app.socio.id/login';

  const tabs = [
    { href: '/', label: 'Beranda', icon: 'home' },
    { href: '/layanan', label: 'Layanan', icon: 'bolt' },
    { href: '/reseller', label: 'Reseller', icon: 'crown' },
  ];

  // CTA label kontekstual per halaman (§3h spec: page-tuned CTA slot).
  // Exact match dulu, lalu prefix match (beli-* / smm-panel-*), terakhir default.
  const ctaExact = {
    '/': { label: 'Daftar Rp50rb', href: 'https://app.socio.id/daftar?mode=reseller' },
    '/layanan': { label: 'Daftar Rp50rb', href: 'https://app.socio.id/daftar?mode=reseller' },
    '/reseller': { label: 'Daftar Rp50rb', href: 'https://app.socio.id/daftar?mode=reseller' },
    '/blog': { label: 'Masuk', href: loginLink },
  };
  const ctaPrefix = [
    { p: '/beli-', c: { label: 'Pesan Sekarang', href: 'https://app.socio.id/daftar?mode=reseller' } },
    { p: '/smm-panel-', c: { label: 'Pesan Sekarang', href: 'https://app.socio.id/daftar?mode=reseller' } },
  ];
  const cta = $derived.by(() => {
    const override = typeof document !== 'undefined' ? document.body?.dataset?.dockCta : '';
    if (override && override.includes('|')) {
      const [label, href] = override.split('|');
      return { label: label || 'Masuk', href: href || loginLink };
    }
    return (
      ctaExact[pathname] ??
      ctaPrefix.find((r) => pathname.startsWith(r.p))?.c ??
      { label: 'Masuk', href: loginLink }
    );
  });

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  onMount(() => {
    pathname = location.pathname.replace(/\/$/, '') || '/';
    // A6b: dock masuk setelah scroll modest (>50vh) — atau langsung jika halaman pendek
    const check = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      visible = max < innerHeight * 0.5 || scrollY > innerHeight * 0.5;
    };
    check();
    addEventListener('scroll', check, { passive: true });
    return () => removeEventListener('scroll', check);
  });
</script>

<nav
  class="md:hidden fixed inset-x-3 bottom-3 z-50
    rounded-[28px] border border-white/40 bg-white/75 backdrop-blur-2xl
    shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.08)]
    p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]
    transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
    {visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}"
  style="grid-template-columns: 1fr 1fr 1fr 1.4fr"
  aria-label="Navigasi utama mobile"
>
  {#each tabs as tab (tab.href)}
    {@const active = isActive(tab.href)}
    <a
      href={tab.href}
      role="link"
      aria-current={active ? 'page' : undefined}
      class="group relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-full px-1 py-2
        transition-transform duration-150 active:scale-[0.92]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus-ring)]
        {active ? 'text-ink' : 'text-ink-2'}"
    >
      <!-- Icons: inline SVG outline 1.5-2px, konsisten app (no emoji) -->
      <span class="grid place-items-center">
        {#if tab.icon === 'home'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'var(--accent-ink)' : 'none'} stroke={active ? 'var(--accent-ink)' : 'currentColor'} stroke-width={active ? 2.2 : 1.7} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" />
          </svg>
        {:else if tab.icon === 'bolt'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'var(--accent-ink)' : 'none'} stroke={active ? 'var(--accent-ink)' : 'currentColor'} stroke-width={active ? 2.2 : 1.7} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
          </svg>
        {:else if tab.icon === 'crown'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'var(--accent-ink)' : 'none'} stroke={active ? 'var(--accent-ink)' : 'currentColor'} stroke-width={active ? 2.2 : 1.7} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 8l4 4 5-7 5 7 4-4-1.5 11h-15L3 8Z" />
          </svg>
        {/if}
      </span>
      <span class="text-[9px] font-bold tracking-wide leading-none">{tab.label}</span>
      <!-- Indicator dot aktif -->
      {#if active}
        <span class="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[var(--accent-ink)]" aria-hidden="true"></span>
      {/if}
    </a>
  {/each}

  <!-- Slot CTA accent-ink (~40% lebar, plan §3g.0) -->
  <a
    href={cta.href}
    class="flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent-ink)] px-3 text-sm font-bold text-white
      shadow-[0_4px_16px_-6px_var(--accent-ink)]
      transition-transform duration-150 active:scale-[0.97]
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-focus-ring)]
      hover:bg-[var(--accent-hover)]"
  >
    {cta.label}
  </a>
</nav>

<!-- Body padding agar konten tidak tertutup dock (a11y plan §3g.0) -->
<svelte:head>
  {@html '<style>body { padding-bottom: calc(88px + env(safe-area-inset-bottom)); } @media (min-width: 768px) { body { padding-bottom: 0; } }</style>'}
</svelte:head>
