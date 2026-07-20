<script lang="ts">
  import { page } from "$app/stores";
  import { BottomNav, Fab, Sheet, Avatar, toast, Icon } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";

  let { data, children } = $props();
  let menuOpen = $state(false);

  const navItems = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/pesanan", label: "Pesanan", icon: "receipt" },
    { href: "/akun", label: "Akun", icon: "user" },
  ];

  const menuItems = [
    { href: "/saldo/top-up", label: "Top Up Saldo", icon: "wallet" },
    { href: "/saldo/riwayat", label: "Riwayat Saldo", icon: "list" },
    { href: "/affiliate", label: "Affiliate", icon: "gift" },
    { href: "/tiket", label: "Tiket Bantuan", icon: "ticket" },
    { href: "/akun", label: "Pengaturan Akun", icon: "settings" },
  ];

  function greeting() {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }

  const firstName = $derived((data.user.name || "").split(" ")[0]);
</script>

<div class="min-h-dvh bg-ink-50 text-ink-900">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b border-ink-100 bg-surface/90 backdrop-blur-xl safe-top">
    <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <a href="/" class="font-display text-lg font-extrabold tracking-tight">
          socio<span class="text-primary">.id</span>
        </a>
      </div>
      <div class="flex items-center gap-2">
        <a
          href="/saldo/top-up"
          onclick={() => haptic(8)}
          class="hidden items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm
            transition-all active:scale-95 hover:bg-primary-800 sm:flex"
        >
          <Icon name="plus" size={14} stroke={2.5} />
          Saldo
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
        <button
          type="button"
          aria-label="Menu"
          onclick={() => {
            haptic(10);
            menuOpen = true;
          }}
          class="grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100 active:scale-90 transition"
        >
          <Icon name="menu" size={20} />
        </button>
      </div>
    </div>
  </header>

  <!-- Main -->
  <main class="mx-auto max-w-2xl px-4 pb-32 pt-4">
    {@render children()}
  </main>

  <BottomNav items={navItems} />
  <Fab onclick={() => (window.location.href = "/pesan")} label="Pesan Baru" icon="plus" />

  <!-- Flying menu (off-canvas) -->
  <Sheet bind:open={menuOpen} title="Menu">
    <div class="flex flex-col gap-1">
      <div class="mb-4 flex items-center gap-3 border-b border-ink-100 pb-4">
        <Avatar name={data.user.name} />
        <div class="min-w-0 flex-1">
          <div class="font-semibold truncate">{greeting()}, {firstName} 👋</div>
          <div class="text-xs text-ink-500 truncate">
            {data.user.level} · @{data.user.username} · {formatRupiah(data.user.balance)}
          </div>
        </div>
      </div>
      {#each menuItems as m (m.href)}
        <a
          href={m.href}
          class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-700
            hover:bg-ink-100 active:scale-[0.98] transition-all"
          onclick={() => (menuOpen = false)}
        >
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 text-ink-600">
            <Icon name={m.icon} size={16} />
          </span>
          {m.label}
          <Icon name="chevron_right" size={16} class="ml-auto text-ink-300" />
        </a>
      {/each}
      <div class="mt-4 border-t border-ink-100 pt-4">
        <a
          href="/api/auth/sign-out"
          data-method="POST"
          class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger
            hover:bg-danger/5 active:scale-[0.98] transition-all"
        >
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-danger/10 text-danger">
            <Icon name="logout" size={16} />
          </span>
          Keluar
        </a>
      </div>
    </div>
  </Sheet>
</div>
