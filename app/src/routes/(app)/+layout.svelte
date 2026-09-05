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
  let confirmLogout = $state(false);
  let showFabSheet = $state(false);
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

  async function doLogout() {
    haptic(18);
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Gagal jaringan — tetap redirect
    }
    window.location.assign("/login");
  }

  // Nav utama mobile (UX1 — 5 item sesuai plan redesign):
  // Beranda · Saldo · Pesan · Pesanan · Akun
  // Tiket + Katalog dipindah ke FAB quick actions Sheet.
  const navItems = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/saldo", label: "Saldo", icon: "wallet" },
    { href: "/pesanan", label: "Pesanan", icon: "receipt" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/akun", label: "Akun", icon: "user" },
  ];

  // Sidebar nav (desktop) — lengkap + 8 item (sesuai audit UI/UX)
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

  // FAB UX1: tampil hanya di mobile (< lg) DAN bukan di halaman /pesan.
  // Desktop tidak butuh FAB karena sidebar desktop sudah punya semua menu.
  const onPesan = $derived(
    $page.url.pathname === "/pesan" || $page.url.pathname.startsWith("/pesan/"),
  );
  const showFab = $derived(!onPesan);
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

  <!-- FAB pesan baru — UX1: mobile only, buka Sheet quick actions.
       Desktop tidak butuh FAB karena sidebar desktop sudah punya menu. -->
  {#if showFab}
    <Fab
      label="Buat Pesanan"
      lgLabel="Pesan Sekarang"
      icon="rocket"
      onclick={() => {
        haptic(10);
        showFabSheet = true;
      }}
    />
  {/if}

  <!-- FAB Quick Actions Sheet (UX1 — UX4.4). Hero-style list dengan 4 aksi:
       Pesan Baru / Pesan Lagi / Tiket Bantuan / Katalog. -->
  <Sheet bind:open={showFabSheet} title="Mau ngapain?">
    <nav class="space-y-2" aria-label="Aksi cepat pesan">
      <a
        href="/pesan"
        onclick={() => (showFabSheet = false)}
        class="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 transition hover:bg-primary/10 active:scale-[0.99]"
      >
        <span
          class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm"
        >
          <Icon name="rocket" size={20} stroke={2.4} />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink-900">Pesan Baru</span>
          <span class="mt-0.5 block text-xs text-ink-500">Pilih kategori, langsung order</span>
        </span>
        <Icon name="chevron_right" size={16} class="text-ink-400" />
      </a>

      <a
        href="/pesanan"
        onclick={() => (showFabSheet = false)}
        class="flex items-center gap-3 rounded-2xl border border-ink-200 p-3 transition hover:bg-ink-50 active:scale-[0.99]"
      >
        <span
          class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700"
        >
          <Icon name="refresh" size={20} stroke={2} />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink-900">Pesan Lagi</span>
          <span class="mt-0.5 block text-xs text-ink-500">1-tap, link terisi otomatis</span>
        </span>
        <Icon name="chevron_right" size={16} class="text-ink-400" />
      </a>

      <a
        href="/tiket"
        onclick={() => (showFabSheet = false)}
        class="flex items-center gap-3 rounded-2xl border border-ink-200 p-3 transition hover:bg-ink-50 active:scale-[0.99]"
      >
        <span
          class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-700"
        >
          <Icon name="ticket" size={20} stroke={2} />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink-900">Tiket Bantuan</span>
          <span class="mt-0.5 block text-xs text-ink-500">Kami balas &lt; 5 menit (24/7)</span>
        </span>
        <Icon name="chevron_right" size={16} class="text-ink-400" />
      </a>

      <a
        href="/layanan"
        onclick={() => (showFabSheet = false)}
        class="flex items-center gap-3 rounded-2xl border border-ink-200 p-3 transition hover:bg-ink-50 active:scale-[0.99]"
      >
        <span
          class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700"
        >
          <Icon name="grid" size={20} stroke={2} />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-bold text-ink-900">Lihat Katalog</span>
          <span class="mt-0.5 block text-xs text-ink-500">8.270+ layanan SMM</span>
        </span>
        <Icon name="chevron_right" size={16} class="text-ink-400" />
      </a>
    </nav>
  </Sheet>

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
