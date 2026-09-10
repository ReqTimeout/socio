<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  type Item = { href: string; label: string; icon: string; badge?: number };

  let { items, ticketBadge = 0 }: { items: Item[]; ticketBadge?: number } =
    $props();

  // Auto-hide saat scroll ke bawah (muncul lagi saat scroll ke atas / dekat atas).
  // Smooth: transform-only + rAF throttle. Tetap di-mount agar tidak reflow;
  // `inert` mematikan fokus keyboard saat tersembunyi.
  let dockHidden = $state(false);
  onMount(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastY + 8 && y > 140) dockHidden = true;
        else if (y < lastY - 8 || y <= 140) dockHidden = false;
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  function isActive(href: string): boolean {
    if (href === "/") return $page.url.pathname === "/";
    return $page.url.pathname.startsWith(href);
  }

  // Item yang dapat badge notifikasi (Tiket = balasan admin).
  // Kita tumpang di sini agar layout tidak perlu merender badge per-item.
  function badgeFor(href: string, own?: number): number | undefined {
    if (own && own > 0) return own;
    if (ticketBadge > 0 && (href === "/tiket" || href.startsWith("/tiket")))
      return ticketBadge;
    return undefined;
  }
</script>

<!-- Dock user: solid + 3D + border hidup (ganti glass transparan).
     Solid bg-surface (tidak tembus konten), shadow berlapis = efek 3D mengambang,
     hairline gradient animasi = "hidup". -->
<nav
  class="dock-live-user lg:hidden fixed inset-x-3 bottom-3 z-50 grid rounded-[28px] border border-ink-200/70 bg-surface
    p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_18px_45px_-12px_rgba(15,23,42,0.35),0_4px_12px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_45px_-12px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.4)]
    transition-transform duration-300 ease-out will-change-transform {dockHidden
    ? 'translate-y-[calc(100%+1.5rem)]'
    : 'translate-y-0'}"
  style="grid-template-columns: repeat({items.length}, 1fr); view-transition-name: bottom-nav;"
  aria-label="Navigasi utama"
  aria-hidden={dockHidden}
  inert={dockHidden}
>
  {#each items as item (item.href)}
    {@const active = isActive(item.href)}
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      onclick={() => haptic(active ? 6 : 10)}
      class="group relative flex h-[52px] flex-col items-center justify-center gap-1 overflow-hidden rounded-full px-1 py-2 transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-900
        active:scale-[0.96]
        {active
        ? 'bg-ink-900 text-ink-50 shadow-[0_4px_16px_rgba(15,23,42,0.22)] dark:bg-ink-800 dark:text-ink-100 dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
        : 'text-ink-800 hover:text-ink-900 dark:hover:text-ink-200'}"
    >
      <span class="relative">
        <span
          class="grid place-items-center transition-transform duration-300 {active
            ? 'dock-bounce scale-[1.02]'
            : 'group-active:scale-95'}"
        >
          <Icon name={item.icon} size={20} stroke={active ? 2.4 : 1.9} />
        </span>
        {#if badgeFor(item.href, item.badge)}
          <span
            class="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-danger text-ink-50 text-[9px] font-bold leading-none ring-2 ring-white dark:ring-ink-900 shadow-sm"
          >
            {(badgeFor(item.href, item.badge) ?? 0) > 99
              ? "99+"
              : badgeFor(item.href, item.badge)}
          </span>
        {/if}
      </span>
      <!-- Label: full opacity — AA contrast (opacity dim membuat ink-500 turun ke 2.71) -->
      <span
        class="whitespace-nowrap text-[9px] font-bold tracking-wide leading-none transition-colors
          {active ? '' : 'group-hover:text-ink-700'}"
      >
        {item.label}
      </span>
    </a>
  {/each}
</nav>

<style>
  /* Icon bounce 1× saat item jadi aktif (dock premium, spring-feel CSS) */
  .dock-bounce {
    animation: dock-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) 1;
  }
  @keyframes dock-pop {
    0% {
      transform: scale(0.82) translateY(2px);
    }
    60% {
      transform: scale(1.12) translateY(-2px);
    }
    100% {
      transform: scale(1.02) translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dock-bounce {
      animation: none !important;
    }
    .dock-live-user::before {
      animation: none;
    }
  }

  /* Hairline gradient animasi di sekeliling dock — border "hidup" */
  .dock-live-user::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 29px;
    padding: 1.5px;
    background: linear-gradient(
      120deg,
      var(--color-accent-300),
      var(--color-primary-300),
      var(--color-accent-300)
    );
    background-size: 220% 100%;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: dock-sheen 7s linear infinite;
    pointer-events: none;
  }
  @keyframes dock-sheen {
    to {
      background-position: 220% 0;
    }
  }
</style>
