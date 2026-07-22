<script lang="ts">
  import { BottomNav, AppFooter, Icon, Sidebar } from "@socio/ui";
  import { haptic } from "@socio/ui";

  let { data, children } = $props();

  const navItems = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/pesanan", label: "Pesanan", icon: "receipt" },
    { href: "/saldo", label: "Saldo", icon: "wallet" },
    { href: "/akun", label: "Akun", icon: "user" },
  ];

  // Sidebar nav (desktop) — lebih lengkap dari bottom-nav
  const sidebarItems = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/pesanan", label: "Pesanan", icon: "receipt" },
    { href: "/saldo", label: "Saldo", icon: "wallet" },
    { href: "/akun", label: "Akun", icon: "user" },
    { href: "/affiliate", label: "Affiliate", icon: "gift" },
    { href: "/tiket", label: "Tiket", icon: "ticket" },
  ];
</script>

<div class="min-h-dvh bg-ink-50 text-ink-900">
  <!-- Desktop sidebar -->
  <Sidebar items={sidebarItems} user={data.user} />

  <!-- Mobile header -->
  <header
    class="lg:hidden sticky top-0 z-40 border-b border-ink-100 bg-surface/90 backdrop-blur-xl safe-top"
  >
    <div class="flex h-14 items-center justify-between px-4">
      <a href="/" class="font-display text-lg font-extrabold tracking-tight">
        socio<span class="text-primary">.id</span>
      </a>
      <a
        href="/notif"
        onclick={() => haptic(8)}
        aria-label="Notifikasi"
        class="relative grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100 active:scale-90 transition"
      >
        <Icon name="bell" size={20} />
        {#if data.unreadCount > 0}
          <span
            class="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white"
          >
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        {/if}
      </a>
    </div>
  </header>

  <!-- Desktop header (sticky, inside main area) -->
  <header
    class="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-between border-b border-ink-100 bg-surface/90 px-8 backdrop-blur-xl"
  >
    <a
      href="/notif"
      class="relative grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100 transition"
    >
      <Icon name="bell" size={20} />
      {#if data.unreadCount > 0}
        <span
          class="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white"
        >
          {data.unreadCount > 99 ? "99+" : data.unreadCount}
        </span>
      {/if}
    </a>
  </header>

  <!-- Main content — offset for sidebar on desktop -->
  <main class="lg:pl-64">
    <div class="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6">
      {@render children()}
    </div>
    <AppFooter />
  </main>

  <BottomNav items={navItems} />
</div>
