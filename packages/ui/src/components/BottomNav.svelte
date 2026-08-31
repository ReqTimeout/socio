<script lang="ts">
  import { page } from "$app/stores";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  type Item = { href: string; label: string; icon: string; badge?: number };

  let { items, ticketBadge = 0 }: { items: Item[]; ticketBadge?: number } =
    $props();

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

<!-- iPhone premium dock: floating glass pill, superellipse 28px, blur-2xl, safe-area -->
<nav
  class="lg:hidden fixed inset-x-3 bottom-3 z-50 grid rounded-[28px] border border-white/40 bg-white/75 backdrop-blur-2xl
    shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]
    p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] supports-[backdrop-filter]:bg-white/60"
  style="grid-template-columns: repeat({items.length}, 1fr); view-transition-name: bottom-nav;"
  aria-label="Navigasi utama"
>
  {#each items as item (item.href)}
    {@const active = isActive(item.href)}
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      onclick={() => haptic(active ? 6 : 10)}
      class="group relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-full px-1 py-2 transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white
        active:scale-[0.96]
        {active
        ? 'bg-ink-900 text-white shadow-[0_4px_16px_rgba(15,23,42,0.22)]'
        : 'text-ink-800 hover:text-ink-900'}"
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
            class="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-danger text-white text-[9px] font-bold leading-none ring-2 ring-white shadow-sm"
          >
            {(badgeFor(item.href, item.badge) ?? 0) > 99
              ? "99+"
              : badgeFor(item.href, item.badge)}
          </span>
        {/if}
      </span>
      <!-- Label: full opacity — AA contrast (opacity dim membuat ink-500 turun ke 2.71) -->
      <span
        class="text-[9px] font-bold tracking-wide leading-none transition-colors
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
  }
</style>
