<script lang="ts">
  import { page } from "$app/stores";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";
  import Avatar from "./Avatar.svelte";
  import Wordmark from "./Wordmark.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";
  import Sparko from "./Sparko.svelte";

  type Item = { href: string; label: string; icon: string; badge?: number; section?: string };

  let {
    items,
    user,
    collapsed = false,
    onToggle,
  }: {
    items: Item[];
    user: {
      name?: string;
      username?: string;
      level?: string;
      balance: number;
    };
    /** Rail ikon-only saat true (desktop collapse). */
    collapsed?: boolean;
    /** Panggil saat user menekan tombol collapse/expand. */
    onToggle?: () => void;
  } = $props();

  function isActive(href: string): boolean {
    if (href === "/") return $page.url.pathname === "/";
    return $page.url.pathname.startsWith(href);
  }

  const displayName = $derived(user.name || user.username || "User");
  const level = $derived(user.level || "Member");

  const levelStyles: Record<string, string> = {
    Admin: "bg-danger/10 text-danger",
    Reseller: "bg-accent-500/10 text-accent-600",
    Agen: "bg-warning/15 text-warning",
    Member: "bg-primary/10 text-primary",
  };
  const levelStyle = $derived(levelStyles[level] ?? levelStyles.Member);

  // Kelompokkan item berdasarkan section (default "Menu")
  const groups = $derived(
    items.reduce<Record<string, Item[]>>((acc, it) => {
      const key = it.section ?? "Menu";
      (acc[key] ??= []).push(it);
      return acc;
    }, {}),
  );

  let confirmLogout = $state(false);

  async function doLogout() {
    haptic();
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Gagal jaringan — tetap redirect
    }
    window.location.assign("/login");
  }

  function handleLogout() {
    haptic();
    confirmLogout = true;
  }
</script>

<aside
  class="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-ink-100 bg-surface safe-top transition-[width] duration-300 ease-out {collapsed
    ? 'w-20'
    : 'w-72'}"
  style="view-transition-name: sidebar;"
  aria-label="Navigasi desktop"
>
  <!-- Logo + toggle -->
  <div class="flex h-16 items-center border-b border-ink-100 px-3 {collapsed ? 'justify-center' : 'justify-between px-5'}">
    {#if collapsed}
      <a href="/" class="grid h-9 w-9 place-items-center" aria-label="Socio.id — Beranda">
        <Sparko pose="idle" size={26} />
      </a>
    {:else}
      <a href="/" class="transition-transform duration-200 hover:scale-[1.02]" aria-label="Socio.id — Beranda">
        <Wordmark size="md" />
      </a>
    {/if}
    <button
      type="button"
      onclick={() => (onToggle?.(), haptic(6))}
      aria-label={collapsed ? "Lebarkan menu" : "Sembunyikan menu"}
      aria-expanded={!collapsed}
      class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={18} stroke={2.25} />
    </button>
  </div>

  <!-- Nav -->
  <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4 {collapsed ? 'px-2' : ''}">
    {#each Object.entries(groups) as [section, groupItems] (section)}
      <div class="space-y-1">
        {#if !collapsed}
          <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">
            {section}
          </p>
        {:else}
          <p class="mx-auto mb-2 h-px w-6 bg-ink-100" aria-hidden="true"></p>
        {/if}
        {#each groupItems as item (item.href)}
          {@const active = isActive(item.href)}
          <a
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            onclick={() => haptic(8)}
            class="group relative flex items-center rounded-xl text-sm font-medium transition-all
              {collapsed ? 'justify-center gap-0 px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
              {active
              ? 'bg-ink-900 text-ink-50 font-semibold shadow-[2px_2px_0_var(--color-ink-300)] dark:bg-ink-50 dark:text-ink-900'
              : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900 hover:translate-x-0.5'}"
          >
            {#if active}
              <span
                class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                style="background: var(--sparko-mango);"
              ></span>
            {/if}
            <span
              class="grid h-8 w-8 place-items-center rounded-lg transition-all duration-200 group-hover:scale-105
                {active ? 'bg-white/15 text-white scale-105 dark:bg-ink-900/10 dark:text-ink-900' : 'bg-ink-50 text-ink-500 group-hover:bg-white group-hover:shadow-sm group-hover:text-ink-700'}"
            >
              <span class={active ? "nav-pop" : ""}>
                <Icon name={item.icon} size={18} stroke={active ? 2.25 : 1.75} />
              </span>
              {#if item.badge}
                <span
                  class="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-white"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              {/if}
            </span>
            {#if !collapsed}
              <span>{item.label}</span>
              {#if active}
                <Icon name="chevron_right" size={16} class="ml-auto text-primary/60" />
              {/if}
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>

  <!-- Saldo — icon-only hint (P3-02: nominal hanya di SaldoHero Beranda/Saldo
       page supaya tidak duplikat 4 tempat). Tap → /saldo lihat nominal. -->
  <a
    href="/saldo"
    class="mx-3 mb-3 flex items-center rounded-xl bg-ink-50 text-left transition hover:bg-ink-100
      {collapsed ? 'justify-center gap-0 px-0 py-2.5' : 'gap-2.5 px-3 py-2.5'}"
    aria-label="Buka halaman saldo"
    title={collapsed ? "Saldo" : undefined}
  >
    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-800 text-white">
      <Icon name="wallet" size={15} stroke={2} />
    </span>
    {#if !collapsed}
      <span class="min-w-0 flex-1">
        <span class="block text-xs font-bold text-ink-800">Saldo</span>
        <span class="block text-[10px] text-ink-500">Lihat & top up</span>
      </span>
      <Icon name="chevron_right" size={14} class="text-ink-400" />
    {/if}
  </a>

  <!-- Maskot footer (§4: Sparko resmi) — idle 24px, dekoratif (hidden saat rail) -->
  {#if !collapsed}
    <div class="flex justify-center px-3 pb-1" aria-hidden="true">
      <Sparko pose="idle" size={24} class="opacity-80" />
    </div>
  {/if}

  <!-- User card -->
  <div class="border-t border-ink-100 p-3">
    <div class="flex items-center rounded-xl bg-ink-50 {collapsed ? 'justify-center gap-0 px-0 py-2' : 'gap-3 px-3 py-2.5'}">
      <Avatar name={displayName} size="sm" />
      {#if !collapsed}
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-ink-900">{displayName}</p>
          <span
            class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold {levelStyle}"
          >
            {level}
          </span>
        </div>
      {/if}
      <button
        onclick={handleLogout}
        aria-label="Keluar"
        class="{collapsed ? 'mt-2 grid h-8 w-8' : 'grid h-9 w-9'} place-items-center rounded-lg bg-white text-ink-500 shadow-sm ring-1 ring-ink-100 transition hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      >
        <Icon name="logout" size={16} />
      </button>
    </div>
  </div>
</aside>

<ConfirmDialog
  bind:open={confirmLogout}
  title="Keluar dari akun ini?"
  message="Kamu akan keluar dan perlu login lagi."
  confirmLabel="Keluar"
  cancelLabel="Batal"
  danger
  onConfirm={doLogout}
/>

<style>
  /* Icon pop 1× saat item jadi aktif */
  .nav-pop {
    display: grid;
    place-items: center;
    animation: nav-pop 380ms cubic-bezier(0.34, 1.56, 0.64, 1) 1;
  }
  @keyframes nav-pop {
    0% { transform: scale(0.8); }
    60% { transform: scale(1.14); }
    100% { transform: scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-pop { animation: none !important; }
  }
</style>
