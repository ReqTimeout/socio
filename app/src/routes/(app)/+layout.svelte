<script lang="ts">
  import { page } from "$app/stores";
  import { BottomNav, Fab, Sheet, Avatar, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { fly } from "svelte/transition";
  import { navigating } from "$app/stores";
import { goto } from "$app/navigation";

  let { data, children } = $props();
  let menuOpen = $state(false);

  const navItems = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/pesan", label: "Pesan", icon: "plus" },
    { href: "/layanan", label: "Layanan", icon: "grid" },
    { href: "/pesanan", label: "Pesanan", icon: "list" },
    { href: "/akun", label: "Akun", icon: "user" },
  ];

  const menuItems = [
    { href: "/saldo/top-up", label: "Top Up Saldo" },
    { href: "/affiliate", label: "Affiliate" },
    { href: "/tiket", label: "Tiket Bantuan" },
    { href: "/pesanan", label: "Riwayat Pesanan" },
    { href: "/akun", label: "Pengaturan Akun" },
  ];
</script>

<div class="min-h-dvh bg-surface text-ink-900">
  <!-- Header -->
  <header class="sticky top-0 z-40 border-b border-ink-100 bg-surface/90 backdrop-blur safe-top">
    <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
      <a href="/" class="font-display text-lg font-extrabold tracking-tight">
        socio<span class="text-accent-ink">.id</span>
      </a>
      <div class="flex items-center gap-2">
        <a
          href="/saldo/top-up"
          class="rounded-full bg-accent-ink px-3 py-1.5 text-xs font-bold text-white shadow-sm"
        >
          + Saldo
        </a>
        <button
          type="button"
          aria-label="Menu"
          class="grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100"
          onclick={() => {
            haptic();
            menuOpen = true;
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Main -->
  <main class="mx-auto max-w-2xl px-4 pb-28 pt-4">
    {#if $navigating}
      <div class="fixed inset-x-0 top-14 z-30 h-0.5 bg-accent-ink/30">
        <div class="h-full w-1/3 animate-[shimmer_1s_infinite] bg-accent-ink"></div>
      </div>
    {/if}
    {@render children()}
  </main>

  <BottomNav items={navItems} />
  <Fab onclick={() => goto("/pesan")} label="Pesan" />

  <!-- Off-canvas menu -->
  <Sheet bind:open={menuOpen} title="Menu">
    <div class="flex flex-col gap-1">
      <div class="mb-3 flex items-center gap-3 border-b border-ink-100 pb-3">
        <Avatar name={data.user.name} />
        <div>
          <div class="font-semibold">{data.user.name}</div>
          <div class="text-xs text-ink-500">{data.user.level} · @{data.user.username}</div>
        </div>
      </div>
      {#each menuItems as m}
        <a
          href={m.href}
          class="rounded-xl px-3 py-3 text-sm font-medium hover:bg-ink-100"
          onclick={() => (menuOpen = false)}
        >
          {m.label}
        </a>
      {/each}
    </div>
  </Sheet>
</div>
