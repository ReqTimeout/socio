<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import {
    BottomNav,
    AppFooter,
    Avatar,
    ConfirmDialog,
    Icon,
    Sheet,
    Sidebar,
    Fab,
    Wordmark,
    NotifBell,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";

  let { data, children } = $props();
  let showAccountSheet = $state(false);
  // Inisial avatar dipakai di aria-label supaya accessible name mengandung
  // visible text (label-content-name-mismatch Lighthouse).
  const avatarName = $derived(data.user?.name ?? data.user?.username ?? "U");
  const avatarInitials = $derived(
    avatarName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
  );
  let confirmLogout = $state(false);

  async function doLogout() {
    haptic(18);
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Gagal jaringan — tetap redirect
    }
    window.location.assign("/login");
  }

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

  <!-- Mobile header — avatar + notif (thumb-friendly, single tap to sheet) -->
  <header
    class="lg:hidden sticky top-0 z-40 border-b border-ink-100 bg-surface/90 backdrop-blur-xl safe-top"
    style="view-transition-name: app-header;"
  >
    <div class="flex h-14 items-center justify-between gap-3 px-4">
      <a href="/" class="inline-flex items-center shrink-0" aria-label="Socio.id — Beranda">
        <Wordmark size="sm" />
      </a>
      <div class="flex items-center gap-2">
        <NotifBell count={data.unreadCount} />
        <button
          type="button"
          onclick={() => {
            haptic(10);
            showAccountSheet = true;
          }}
          aria-label={`Menu akun ${avatarInitials} — buka profil & keluar`}
          class="grid h-9 w-9 place-items-center rounded-full ring-1 ring-ink-200 bg-ink-50 text-ink-700
            active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Avatar name={avatarName} size="sm" />
        </button>
      </div>
    </div>
  </header>

  <!-- Desktop header (sticky, inside main area) — aligned to content column -->
  <header
    class="hidden lg:flex sticky top-0 z-30 h-16 items-center border-b border-ink-100 bg-surface/90 backdrop-blur-xl lg:ml-72"
    style="view-transition-name: app-header-desktop;"
  >
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-10">
      <span class="font-display text-lg font-bold text-ink-900 tracking-tight">{pageTitle}</span>
      <NotifBell count={data.unreadCount} />
    </div>
  </header>

  <!-- Main content — offset for sidebar on desktop.
       pb-40 (mobile, FAB aktif): FAB duduk ~108px + dock ~70px — konten terakhir
       butuh clearance supaya tidak tertutup FAB/dock (P2-02/P3-01). -->
  <main class="lg:ml-72">
    <div
      class="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 {showFab
        ? 'pb-40 lg:pb-12'
        : 'pb-28 lg:pb-12'}"
    >
      {@render children()}
    </div>
    <AppFooter />
  </main>

  <BottomNav items={navItems} ticketBadge={data.unreadCount} />

  <!-- FAB pesan baru — satu komponen responsif: compact di atas dock mobile,
       besar & premium bottom-right di desktop (tidak di sidebar/menu) -->
  {#if showFab}
    <Fab
      label="Buat Pesanan"
      lgLabel="Pesan Sekarang"
      icon="rocket"
      onclick={() => goto("/pesan")}
    />
  {/if}

  <!-- Mobile account sheet (avatar tap) — premium shortcut + Keluar -->
  <Sheet bind:open={showAccountSheet} title="Akun">
    <div class="px-5 pb-6 pt-2 space-y-4">
      <div class="flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
        <Avatar name={data.user?.name ?? data.user?.username ?? "U"} size="md" />
        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-ink-900">
            {data.user?.name ?? data.user?.username ?? "User"}
          </p>
          <p class="truncate text-xs text-ink-500">
            {data.user?.email ?? ""} · {data.user?.level ?? "Member"}
          </p>
        </div>
      </div>
      <nav class="grid gap-1">
        <a
          href="/akun"
          onclick={() => (showAccountSheet = false)}
          class="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink-50"
        >
          <span class="flex items-center gap-2"
            ><Icon name="user" size={16} /> Profil & pengaturan</span
          ><span class="text-ink-500">›</span>
        </a>
        <a
          href="/saldo/riwayat"
          onclick={() => (showAccountSheet = false)}
          class="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink-50"
        >
          <span class="flex items-center gap-2"><Icon name="wallet" size={16} /> Riwayat saldo</span
          ><span class="text-ink-500">›</span>
        </a>
        <a
          href="/tiket"
          onclick={() => (showAccountSheet = false)}
          class="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink-50"
        >
          <span class="flex items-center gap-2"><Icon name="ticket" size={16} /> Tiket bantuan</span
          ><span class="text-ink-500">›</span>
        </a>
      </nav>
      <button
        type="button"
        onclick={() => {
          haptic(12);
          showAccountSheet = false;
          confirmLogout = true;
        }}
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger hover:bg-danger hover:text-white transition-colors"
      >
        <Icon name="logout" size={16} /> Keluar
      </button>
    </div>
  </Sheet>
  <ConfirmDialog
    bind:open={confirmLogout}
    title="Keluar akun?"
    message="Kamu akan keluar dan perlu login lagi."
    confirmLabel="Keluar"
    cancelLabel="Batal"
    danger
    onConfirm={doLogout}
  />
</div>
