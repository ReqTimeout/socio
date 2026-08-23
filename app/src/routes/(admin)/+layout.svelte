<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { haptic, Icon, NotifBell } from "@socio/ui";

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

  let helpOpen = $state(false);

  function isTypingTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false;
    return (
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable
    );
  }

  // A11y + keyboard shortcuts (P3.4): Esc tutup sheet, s/= focus search, j/k pagination, ? help
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (helpOpen) {
        helpOpen = false;
        return;
      }
      if (sheetOpen) {
        sheetOpen = false;
        return;
      }
      if (isTypingTarget(e.target) && e.target instanceof HTMLElement) {
        e.target.blur();
        return;
      }
    }
    if (isTypingTarget(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "s" || e.key === "/") {
      const q = document.querySelector<HTMLInputElement>(
        'input[type="search"], input[name="q"], input[placeholder*="Cari"]',
      );
      if (q) {
        e.preventDefault();
        q.focus();
        q.select();
      }
      return;
    }
    if (e.key === "?") {
      e.preventDefault();
      helpOpen = !helpOpen;
      return;
    }
    // j/k: pagination prev/next (audit, users, etc. pakai ?p=)
    if (e.key === "j" || e.key === "k") {
      const url = new URL($page.url.href);
      const cur = Math.max(1, Number(url.searchParams.get("p") ?? 1));
      // Heuristic: next/prev page existence cek dari link pagination di DOM
      const nextLink = document.querySelector<HTMLAnchorElement>(
        'a[rel="next"], a[aria-label*="Next"], a[href*="p="][href*="' + (cur + 1) + '"]',
      );
      const prevLink = document.querySelector<HTMLAnchorElement>(
        'a[rel="prev"], a[aria-label*="Prev"]',
      );
      if (e.key === "j" && nextLink) {
        e.preventDefault();
        nextLink.click();
      }
      if (e.key === "k" && prevLink) {
        e.preventDefault();
        prevLink.click();
      }
      // Fallback: navigasi via URL jika link tidak ditemu tapi param p ada
      if (e.key === "j" && !nextLink && document.querySelector('[data-has-next="true"]')) {
        e.preventDefault();
        url.searchParams.set("p", String(cur + 1));
        goto(url.pathname + url.search);
      }
      if (e.key === "k" && cur > 1) {
        // only if no prevLink found but we are beyond page 1
        const hasPrev = !!prevLink;
        if (!hasPrev) {
          e.preventDefault();
          url.searchParams.set("p", String(cur - 1));
          goto(url.pathname + url.search);
        }
      }
    }
    // g h = go home, g u = users, etc. (quick nav)
    if (e.key === "g") {
      // two-key sequence: wait 600ms for second key
      const handler = (ev: KeyboardEvent) => {
        if (ev.key === "h") {
          ev.preventDefault();
          goto("/admin");
        } else if (ev.key === "u") {
          ev.preventDefault();
          goto("/admin/users");
        } else if (ev.key === "o") {
          ev.preventDefault();
          goto("/admin/orders");
        } else if (ev.key === "a") {
          ev.preventDefault();
          goto("/admin/audit");
        }
        window.removeEventListener("keydown", handler);
      };
      window.addEventListener("keydown", handler, { once: true });
      setTimeout(() => window.removeEventListener("keydown", handler), 700);
    }
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
    <div class="mb-6 flex items-center justify-between gap-2 px-2">
      <a href="/admin" class="flex items-center gap-2">
        <div class="grid h-8 w-8 place-items-center rounded-lg bg-accent-ink text-white">
          <Icon name="shield" size={16} stroke={2.25} />
        </div>
        <span class="font-display text-lg font-bold"
          >Socio<span class="text-accent-ink">Admin</span></span
        >
      </a>
      <NotifBell count={data.unreadCount ?? 0} href="/notif" />
    </div>
    <nav class="space-y-1">
      {#each primaryNav as n (n.href)}
        <a
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            {isActive(n.href) ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'}"
        >
          <Icon name={n.icon} size={18} />{n.label === "Home" ? "Dashboard" : n.label}
        </a>
      {/each}
      <div class="my-3 border-t border-ink-100"></div>
      {#each moreNav as n (n.href)}
        <a
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            {isActive(n.href) ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'}"
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
    <div class="flex items-center gap-2">
      <NotifBell count={data.unreadCount ?? 0} href="/notif" />
      <a href="/akun" class="text-sm font-medium text-ink-500">@{data.admin.username}</a>
    </div>
  </header>

  <!-- min-w-0: flex item default min-width:auto → konten lebar (tabel) mendorong
       halamannya lebih lebar dari viewport tanpa ini -->
  <main class="min-w-0 flex-1 p-4 pb-28 lg:p-8 lg:pb-8">
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
        class="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 {isActive(
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
      class="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 {inMoreActive
        ? 'bg-primary-50 text-primary-700'
        : 'text-ink-500 hover:text-ink-800'}"
    >
      <Icon name="more_horizontal" size={20} stroke={inMoreActive ? 2.25 : 1.75} />
      <span class="leading-none">Lainnya</span>
    </button>
  </nav>

  <!-- ===== Mobile: Bottom Sheet "Lainnya" ===== -->
  {#if helpOpen}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4"
      role="presentation"
      onclick={(e) => {
        if (e.target === e.currentTarget) helpOpen = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
      >
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-display text-base font-bold">Shortcuts</h2>
          <button
            type="button"
            onclick={() => (helpOpen = false)}
            class="grid h-8 w-8 place-items-center rounded-full hover:bg-ink-100"
            aria-label="Tutup">✕</button
          >
        </div>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-ink-500">
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">s</kbd> /
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">/</kbd>
            </dt>
            <dd class="font-medium">Fokus pencarian</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-500">
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">j</kbd> /
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">k</kbd>
            </dt>
            <dd class="font-medium">Next / prev halaman</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-500">
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">g</kbd>
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">h</kbd>/<kbd
                class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">u</kbd
              >/<kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">o</kbd>/<kbd
                class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">a</kbd
              >
            </dt>
            <dd class="font-medium">Go home/users/orders/audit</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-500">
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">?</kbd>
            </dt>
            <dd class="font-medium">Toggle bantuan ini</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-500">
              <kbd class="rounded border bg-ink-50 px-1.5 py-0.5 font-mono text-xs">Esc</kbd>
            </dt>
            <dd class="font-medium">Tutup sheet / blur input</dd>
          </div>
        </dl>
        <p class="mt-3 text-xs text-ink-400">
          Tekan <kbd class="rounded border bg-ink-50 px-1 py-0.5 font-mono text-[10px]">?</kbd> lagi untuk
          tutup.
        </p>
      </div>
    </div>
  {/if}
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
