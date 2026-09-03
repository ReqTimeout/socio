<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { haptic, Icon, NotifBell } from "@socio/ui";
  import CommandPalette from "$lib/components/CommandPalette.svelte";

  let { data, children } = $props();

  /** Nav utama yang tampil di floating dock mobile + sidebar desktop */
  const primaryNav = [
    { href: "/admin", label: "Home", icon: "home" },
    {
      href: "/admin/users",
      keywords: ["user", "pengguna", "member"],
      label: "Users",
      icon: "user",
    },
    {
      href: "/admin/orders",
      keywords: ["order", "pesanan", "transaksi"],
      label: "Orders",
      icon: "receipt",
    },
    {
      href: "/admin/deposits",
      keywords: ["deposit", "topup", "top up", "saldo"],
      label: "Deposit",
      icon: "wallet",
    },
    {
      href: "/admin/services",
      keywords: ["layanan", "jasa", "katalog"],
      label: "Layanan",
      icon: "grid",
    },
    { href: "/admin/pricing", label: "Harga", icon: "tag" },
  ];
  /** Nav tambahan — diakses dari bottom sheet "Lainnya" (mobile) atau sidebar (desktop) */
  const moreNav = [
    {
      href: "/admin/coupons",
      keywords: ["kupon", "promo", "voucher"],
      label: "Kupon",
      icon: "percent",
    },
    {
      href: "/admin/tickets",
      keywords: ["tiket", "komplain", "support"],
      label: "Tickets",
      icon: "ticket",
    },
    { href: "/admin/providers", label: "Provider", icon: "zap" },
    { href: "/admin/reporting", label: "Reporting", icon: "chart" },
    { href: "/admin/affiliate", label: "Affiliate", icon: "gift" },
    { href: "/admin/banners", label: "Banner", icon: "image" },
    { href: "/admin/news", label: "Berita", icon: "megaphone" },
    { href: "/admin/email", label: "Email", icon: "mail" },
    { href: "/admin/audit", label: "Audit Log", icon: "shield" },
    {
      href: "/admin/settings",
      keywords: ["pengaturan", "setelan", "konfigurasi"],
      label: "Settings",
      icon: "settings",
    },
  ];
  const allPages = [
    ...primaryNav.map((n) => ({ ...n, group: "Operasional" })),
    ...moreNav.map((n) => ({ ...n, group: "Konten & Sistem" })),
  ];

  let sheetOpen = $state(false);
  let paletteOpen = $state(false);
  let dark = $state(false);
  $effect(() => {
    if (typeof document === "undefined") return;
    dark = document.documentElement.classList.contains("dark");
    if (data.maintenance) document.documentElement.dataset.maintenance = "1";
    else delete document.documentElement.dataset.maintenance;
  });
  function toggleDark() {
    dark = !dark;
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // private mode
    }
  }

  function isActive(href: string): boolean {
    if (href === "/admin") return $page.url.pathname === "/admin";
    return $page.url.pathname.startsWith(href);
  }
  const inMoreActive = $derived(moreNav.some((n) => isActive(n.href)));

  async function toggleMaintenanceOff() {
    const fd = new FormData();
    fd.set("on", "0");
    const res = await fetch("/admin/settings?/maintenance", { method: "POST", body: fd });
    const j = (await res.json().catch(() => null)) as any;
    const { toast } = await import("@socio/ui");
    toast(j?.data?.success ?? j?.data?.error ?? "Selesai.", "success");
    goto($page.url.pathname, { keepFocus: true, noScroll: true });
    window.location.reload();
  }

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
    // ⌘K/Ctrl+K berlaku di konteks apa pun (termasuk saat mengetik di input)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      paletteOpen = !paletteOpen;
      return;
    }
    if (e.key === "Escape") {
      if (paletteOpen) {
        paletteOpen = false;
        return;
      }
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
  <!-- Maintenance warning banner — pain point: admin lupa matikan (UIUXADMIN §8.16) -->
  {#if data.maintenance}
    <div
      class="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-danger px-4 py-2 text-center text-xs font-bold text-ink-50"
      role="alert"
    >
      <Icon name="alert" size={14} />
      <span>Maintenance AKTIF — user diblokir dari app.</span>
      <button
        type="button"
        onclick={toggleMaintenanceOff}
        class="rounded-full bg-white/15 px-2.5 py-0.5 transition-colors hover:bg-white/25"
        >Matikan sekarang</button
      >
    </div>
  {/if}

  <!-- Desktop sidebar — same width as user sidebar (w-64) for system consistency -->
  <aside
    class="hidden w-64 shrink-0 border-r border-ink-100 bg-surface p-4 lg:block"
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
      <div class="isolate flex items-center gap-1">
        <button
          type="button"
          onclick={toggleDark}
          class="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Ganti tema terang/gelap"
        >
          <Icon name={dark ? "sun" : "moon"} size={17} />
        </button>
        <NotifBell count={data.unreadCount ?? 0} href="/notif" />
      </div>
    </div>
    <!-- Command palette trigger -->
    <button
      type="button"
      onclick={() => (paletteOpen = true)}
      class="mb-4 flex w-full items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm text-ink-400 transition-colors hover:border-ink-300 hover:bg-ink-50"
    >
      <Icon name="search" size={15} />
      <span class="flex-1 text-left">Cari halaman / aksi…</span>
      <kbd
        class="rounded border border-ink-200 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-400"
        >⌘K</kbd
      >
    </button>
    <nav class="space-y-1">
      <div
        class="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400"
      >
        Operasional
      </div>
      {#each primaryNav as n (n.href)}
        <a
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          class="nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            {isActive(n.href)
            ? 'bg-ink-100/70 text-ink-900'
            : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800'}"
        >
          <span
            class="nav-indicator absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent-ink transition-all duration-150
              {isActive(n.href)
              ? 'opacity-100 scale-y-100'
              : 'opacity-0 scale-y-0 group-hover:opacity-40 group-hover:scale-y-100'}"
            aria-hidden="true"
          ></span>
          <span
            class="transition-transform duration-150 {isActive(n.href)
              ? 'translate-x-0.5'
              : 'group-hover:translate-x-0.5'}"
            ><Icon name={n.icon} size={18} stroke={isActive(n.href) ? 2.4 : 1.9} /></span
          >{n.label}
        </a>
      {/each}
      <div
        class="mt-3 border-t border-ink-100 px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400"
      >
        Konten &amp; Sistem
      </div>
      {#each moreNav as n (n.href)}
        <a
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          class="nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            {isActive(n.href)
            ? 'bg-ink-100/70 text-ink-900'
            : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800'}"
        >
          <span
            class="nav-indicator absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent-ink transition-all duration-150
              {isActive(n.href)
              ? 'opacity-100 scale-y-100'
              : 'opacity-0 scale-y-0 group-hover:opacity-40 group-hover:scale-y-100'}"
            aria-hidden="true"
          ></span>
          <span
            class="transition-transform duration-150 {isActive(n.href)
              ? 'translate-x-0.5'
              : 'group-hover:translate-x-0.5'}"
            ><Icon name={n.icon} size={18} stroke={isActive(n.href) ? 2.4 : 1.9} /></span
          >{n.label}
        </a>
      {/each}
    </nav>
    <a
      href="/"
      class="mt-6 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:bg-ink-100"
    >
      <Icon name="chevron_left" size={16} />Kembali ke App
    </a>
    <!-- Admin identity chip -->
    <div
      class="mt-2 flex items-center gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5"
    >
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-ink-50"
        >{(data.admin.username ?? "A").slice(0, 1).toUpperCase()}</span
      >
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-bold text-ink-800">@{data.admin.username}</span>
        <span class="block text-[11px] font-semibold uppercase tracking-wide text-ink-400"
          >{data.admin.level}</span
        >
      </span>
    </div>
  </aside>

  <!-- Mobile topbar (compact — bottom dock is primary nav) -->
  <header
    class="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-surface px-4 py-2.5 lg:hidden"
    style="view-transition-name: admin-topbar;"
  >
    <span class="font-display font-bold">Admin</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (paletteOpen = true)}
        class="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100"
        aria-label="Cari halaman atau aksi"
      >
        <Icon name="search" size={17} />
      </button>
      <NotifBell count={data.unreadCount ?? 0} href="/notif" />
      <a href="/akun" class="text-sm font-medium text-ink-500">@{data.admin.username}</a>
    </div>
  </header>

  <!-- min-w-0: flex item default min-width:auto → konten lebar (tabel) mendorong
       halamannya lebih lebar dari viewport tanpa ini.
       max-w-7xl + mx-auto: stretch content comfortably on 1440px without
       cards/supports feeling alone. -->
  <main class="mx-auto min-w-0 w-full max-w-7xl flex-1 p-4 pb-28 lg:p-8 lg:pb-10">
    {@render children()}
  </main>

  <!-- ===== Mobile: Floating Bottom Dock — iPhone premium glass pill ===== -->
  <nav
    class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-7 items-center gap-1 rounded-[28px] border border-white/40 bg-white/75 backdrop-blur-2xl p-2 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] supports-[backdrop-filter]:bg-white/60 dark:border-ink-700/60 dark:bg-ink-900/80 dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6),0_4px_16px_rgba(0,0,0,0.4)] dark:ring-white/[0.06] dark:supports-[backdrop-filter]:bg-ink-900/70 lg:hidden"
    style="padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));"
    aria-label="Menu admin utama"
  >
    {#each primaryNav as n (n.href)}
      <a
        href={n.href}
        onclick={() => haptic(isActive(n.href) ? 6 : 10)}
        aria-current={isActive(n.href) ? "page" : undefined}
        class="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[9px] font-bold tracking-wide leading-none transition-all duration-300 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-900 {isActive(
          n.href,
        )
          ? 'bg-ink-900 text-ink-50 shadow-[0_4px_16px_rgba(15,23,42,0.22)] dark:bg-ink-100 dark:text-ink-900 dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
          : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200'}"
      >
        <Icon name={n.icon} size={18} stroke={isActive(n.href) ? 2.4 : 1.9} />
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
      class="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[9px] font-bold tracking-wide leading-none transition-all duration-300 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 {inMoreActive
        ? 'bg-ink-900 text-ink-50 shadow-[0_4px_16px_rgba(15,23,42,0.22)] dark:bg-ink-100 dark:text-ink-900 dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
        : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200'}"
    >
      <Icon name="more_horizontal" size={18} stroke={inMoreActive ? 2.4 : 1.9} />
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
                <Icon name="chevron_right" size={16} class="text-ink-400" />
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
          <Icon name="chevron_right" size={16} class="text-ink-400" />
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
  <!-- Command palette (⌘K / Ctrl+K / tombol search) -->
  <CommandPalette open={paletteOpen} onclose={() => (paletteOpen = false)} pages={allPages} />
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
