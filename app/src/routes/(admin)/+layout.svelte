<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { haptic, Icon } from "@socio/ui";

  let { data, children } = $props();

  /** Nav utama yang tampil di floating dock mobile + sidebar desktop */
  const primaryNav = [
    { href: "/admin", label: "Home", icon: "home" },
    { href: "/admin/users", label: "Users", icon: "user" },
    { href: "/admin/orders", label: "Orders", icon: "receipt" },
    { href: "/admin/deposits", label: "Saldo", icon: "wallet" },
    { href: "/admin/services", label: "Layanan", icon: "grid" },
    { href: "/admin/pricing", label: "Harga", icon: "tag" },
  ];
  /** Nav tambahan — diakses dari bottom sheet "Lainnya" (mobile) atau sidebar (desktop) */
  const moreNav = [
    { href: "/admin/tickets", label: "Tickets", icon: "ticket" },
    { href: "/admin/providers", label: "Provider", icon: "zap" },
    { href: "/admin/reporting", label: "Reporting", icon: "chart" },
    { href: "/admin/affiliate", label: "Affiliate", icon: "gift" },
    { href: "/admin/banners", label: "Banners", icon: "image" },
    { href: "/admin/news", label: "Berita", icon: "newspaper" },
    { href: "/admin/email", label: "Email", icon: "mail" },
    { href: "/admin/audit", label: "Audit Log", icon: "shield" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ];

  let sheetOpen = $state(false);

  function isActive(href: string): boolean {
    if (href === "/admin") return $page.url.pathname === "/admin";
    return $page.url.pathname.startsWith(href);
  }
  const inMoreActive = $derived(moreNav.some((n) => isActive(n.href)));

  // A11y sheet: Esc untuk tutup
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && sheetOpen) sheetOpen = false;
  }
  // Lock scroll body saat sheet buka
  $effect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = sheetOpen ? "hidden" : "";
  });

  async function logout() {
    haptic();
    sheetOpen = false;
    await fetch("/logout", { method: "POST" });
    goto("/login");
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="min-h-dvh bg-ink-50 lg:flex">
  <!-- Desktop sidebar -->
  <aside
    class="hidden w-60 shrink-0 border-r border-ink-100 bg-surface p-4 lg:block"
    style="view-transition-name: admin-sidebar;"
  >
    <div class="mb-6 flex items-center gap-2 px-2">
      <div class="grid h-8 w-8 place-items-center rounded-lg bg-accent-ink text-white">
        <Icon name="shield" size={16} stroke={2.25} />
      </div>
      <span class="font-display text-lg font-bold"
        >Socio<span class="text-accent-ink">Admin</span></span
      >
    </div>
    <nav class="space-y-1">
      {#each primaryNav as n (n.href)}
        <a
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors {isActive(
            n.href,
          )
            ? 'bg-ink-900 text-white'
            : 'text-ink-600 hover:bg-ink-100'}"
        >
          <Icon name={n.icon} size={18} />{n.label === "Home" ? "Dashboard" : n.label}
        </a>
      {/each}
      <div class="my-3 border-t border-ink-100"></div>
      {#each moreNav as n (n.href)}
        <a
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors {isActive(
            n.href,
          )
            ? 'bg-ink-900 text-white'
            : 'text-ink-600 hover:bg-ink-100'}"
        >
          <Icon name={n.icon} size={18} />{n.label}
        </a>
      {/each}
    </nav>
    <a
      href="/"
      class="mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-400 hover:bg-ink-100"
    >
      <Icon name="chevron_left" size={16} />Kembali ke App
    </a>
  </aside>

  <!-- Mobile topbar (compact — bottom dock is primary nav) -->
  <header
    class="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-surface px-4 py-2.5 lg:hidden"
    style="view-transition-name: admin-topbar;"
  >
    <span class="font-display font-bold">Admin</span>
    <a href="/akun" class="text-sm font-medium text-ink-500">@{data.admin.username}</a>
  </header>

  <main class="flex-1 p-4 pb-28 lg:p-8 lg:pb-8">
    {@render children()}
  </main>

  <!-- ===== Mobile: Floating Bottom Dock ===== -->
  <nav
    class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 items-center gap-0.5 rounded-2xl border border-ink-100 bg-surface/95 p-1 shadow-card-hover backdrop-blur lg:hidden"
    style="padding-bottom: max(0.25rem, env(safe-area-inset-bottom));"
    aria-label="Menu admin utama"
  >
    {#each primaryNav as n (n.href)}
      <a
        href={n.href}
        onclick={() => haptic()}
        aria-current={isActive(n.href) ? "page" : undefined}
        class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 {isActive(
          n.href,
        )
          ? 'bg-primary-50 text-primary-700'
          : 'text-ink-500 hover:text-ink-800'}"
      >
        <Icon name={n.icon} size={20} stroke={isActive(n.href) ? 2.25 : 1.75} />
        <span class="leading-none">{n.label}</span>
      </a>
    {/each}
    <button
      type="button"
      onclick={() => {
        haptic();
        sheetOpen = true;
      }}
      aria-current={inMoreActive ? "true" : undefined}
      aria-label="Menu lainnya"
      class="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 {inMoreActive
        ? 'bg-primary-50 text-primary-700'
        : 'text-ink-500 hover:text-ink-800'}"
    >
      <Icon name="more_horizontal" size={20} stroke={inMoreActive ? 2.25 : 1.75} />
      <span class="leading-none">Lainnya</span>
    </button>
  </nav>

  <!-- ===== Mobile: Bottom Sheet "Lainnya" ===== -->
  {#if sheetOpen}
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm lg:hidden"
      role="presentation"
      onclick={(e) => {
        if (e.target === e.currentTarget) sheetOpen = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu lainnya"
        class="w-full max-w-md rounded-t-2xl bg-surface p-2 shadow-card-hover [animation:slide-up_0.25s_var(--ease-out-soft)]"
        style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom));"
      >
        <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-ink-200"></div>
        <div class="px-3 py-2 text-xs font-semibold text-ink-400">Menu lainnya</div>
        <nav class="space-y-0.5">
          {#each moreNav as n (n.href)}
            <a
              href={n.href}
              onclick={() => {
                haptic();
                sheetOpen = false;
              }}
              aria-current={isActive(n.href) ? "page" : undefined}
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors {isActive(
                n.href,
              )
                ? 'bg-primary-50 text-primary-700'
                : 'text-ink-700 hover:bg-ink-50'}"
            >
              <Icon name={n.icon} size={20} />
              <span class="flex-1">{n.label}</span>
              {#if isActive(n.href)}
                <span
                  class="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white"
                  >Aktif</span
                >
              {:else}
                <Icon name="chevron_right" size={16} class="text-ink-300" />
              {/if}
            </a>
          {/each}
        </nav>
        <div class="my-2 border-t border-ink-100"></div>
        <a
          href="/akun"
          onclick={() => (sheetOpen = false)}
          class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
        >
          <Icon name="user" size={20} /><span class="flex-1"
            >Akun saya (@{data.admin.username})</span
          >
          <Icon name="chevron_right" size={16} class="text-ink-300" />
        </a>
        <a
          href="/"
          onclick={() => (sheetOpen = false)}
          class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
        >
          <Icon name="chevron_left" size={20} /><span class="flex-1">Kembali ke App</span>
        </a>
        <button
          type="button"
          onclick={logout}
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/5"
        >
          <Icon name="logout" size={20} /><span class="flex-1 text-left">Logout</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    [style*="animation"] {
      animation: none !important;
    }
  }
</style>
