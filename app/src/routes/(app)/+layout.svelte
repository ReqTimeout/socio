<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { BottomNav, AppFooter, Icon, Sidebar, Fab, Wordmark, NotifBell } from "@socio/ui";
  import { haptic } from "@socio/ui";

  let { data, children } = $props();

  // Nav utama mobile (floating bottom dock) — 5 item: Katalog (repeat flow) masuk dock
  // sesuai audit UI/UX 23 Agt 2026 (docs/audituiux.md P1.1)
  const navItems = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/pesanan", label: "Pesanan", icon: "receipt" },
    { href: "/saldo", label: "Saldo", icon: "wallet" },
    { href: "/tiket", label: "Tiket", icon: "ticket" },
  ];

  // Sidebar nav (desktop) — lengkap + 4 item mobile persis di top section
  const sidebarItems = [
    { href: "/", label: "Home", icon: "home", section: "Menu" },
    { href: "/pesanan", label: "Pesanan", icon: "receipt", section: "Menu" },
    { href: "/saldo", label: "Saldo", icon: "wallet", section: "Menu" },
    { href: "/tiket", label: "Tiket", icon: "ticket", section: "Menu" },
    { href: "/layanan", label: "Layanan", icon: "grid", section: "Lainnya" },
    { href: "/affiliate", label: "Affiliate", icon: "gift", section: "Lainnya" },
    { href: "/akun", label: "Akun", icon: "user", section: "Lainnya" },
    { href: "/notif", label: "Notifikasi", icon: "bell", section: "Lainnya" },
  ];

  // Judul halaman untuk desktop header (breadcrumb ringan)
  const pageTitles: Record<string, string> = {
    "/": "Beranda",
    "/layanan": "Katalog Layanan",
    "/pesan": "Buat Pesanan",
    "/pesanan": "Riwayat Pesanan",
    "/saldo": "Saldo",
    "/saldo/top-up": "Top Up Saldo",
    "/saldo/riwayat": "Riwayat Saldo",
    "/akun": "Akun Saya",
    "/affiliate": "Program Affiliate",
    "/tiket": "Tiket Bantuan",
    "/notif": "Notifikasi",
  };
  const pageTitle = $derived(pageTitles[$page.url.pathname] ?? "socio.id");

  // FAB "pesan baru" — sembunyikan di halaman pesan itu sendiri
  const showFab = $derived($page.url.pathname !== "/pesan");
</script>

<div class="min-h-dvh bg-ink-50 text-ink-900">
  <!-- Desktop sidebar -->
  <Sidebar items={sidebarItems} user={data.user} />

  <!-- Mobile header -->
  <header
    class="lg:hidden sticky top-0 z-40 border-b border-ink-100 bg-surface/90 backdrop-blur-xl safe-top"
    style="view-transition-name: app-header;"
  >
    <div class="flex h-14 items-center justify-between px-4">
      <a href="/" class="inline-flex items-center" aria-label="Socio.id — Beranda">
        <Wordmark size="sm" />
      </a>
      <NotifBell count={data.unreadCount} />
    </div>
  </header>

  <!-- Desktop header (sticky, inside main area) -->
  <header
    class="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-between border-b border-ink-100 bg-surface/90 px-8 backdrop-blur-xl lg:ml-64"
    style="view-transition-name: app-header-desktop;"
  >
    <div class="flex items-center gap-2 text-sm">
      <span class="font-display text-lg font-bold text-ink-900">{pageTitle}</span>
    </div>
    <NotifBell count={data.unreadCount} />
  </header>

  <!-- Main content — offset for sidebar on desktop -->
  <main class="lg:pl-64">
    <div class="mx-auto w-full max-w-7xl px-4 pb-44 pt-4 sm:pb-28 lg:px-8 lg:pb-12 lg:pt-6">
      {@render children()}
    </div>
    <AppFooter />
  </main>

  <BottomNav items={navItems} ticketBadge={data.unreadCount} />

  <!-- FAB pesan baru (mobile only) -->
  {#if showFab}
    <div class="lg:hidden">
      <Fab label="Buat pesanan baru" onclick={() => goto("/pesan")} />
    </div>
  {/if}
</div>
