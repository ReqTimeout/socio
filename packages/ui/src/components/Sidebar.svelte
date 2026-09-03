<script lang="ts">
  import { page } from "$app/stores";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";
  import Avatar from "./Avatar.svelte";
  import Wordmark from "./Wordmark.svelte";

  type Item = { href: string; label: string; icon: string; badge?: number; section?: string };

  let {
    items,
    user,
  }: {
    items: Item[];
    user: {
      name?: string;
      username?: string;
      level?: string;
      balance: number;
    };
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

async function handleLogout() {
    haptic();
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Gagal jaringan — tetap redirect
    }
    window.location.assign("/login");
  }
</script>

<aside
  class="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-ink-100 bg-surface safe-top"
  style="view-transition-name: sidebar;"
  aria-label="Navigasi desktop"
>
  <!-- Logo -->
  <div class="flex h-16 items-center justify-between border-b border-ink-100 px-5">
    <a href="/" class="transition-transform duration-200 hover:scale-[1.02]" aria-label="Socio.id — Beranda">
      <Wordmark size="md" />
    </a>
    <span class="hidden rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary xl:inline">Panel</span>
  </div>

  <!-- Nav -->
  <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
    {#each Object.entries(groups) as [section, groupItems] (section)}
      <div class="space-y-1">
        <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">
          {section}
        </p>
        {#each groupItems as item (item.href)}
          {@const active = isActive(item.href)}
          <a
            href={item.href}
            aria-current={active ? "page" : undefined}
            onclick={() => haptic(8)}
            class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
              {active
              ? 'bg-gradient-to-r from-primary-500/12 to-accent-500/10 text-primary font-semibold shadow-sm ring-1 ring-primary/10'
              : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900 hover:translate-x-0.5'}"
          >
            {#if active}
              <span
                class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-500 to-accent-500"
              ></span>
            {/if}
            <span
              class="grid h-8 w-8 place-items-center rounded-lg transition-all duration-200 group-hover:scale-105
                {active ? 'bg-primary text-white shadow-sm' : 'bg-ink-50 text-ink-500 group-hover:bg-white group-hover:shadow-sm group-hover:text-ink-700'}"
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
            <span>{item.label}</span>
            {#if active}
              <Icon name="chevron_right" size={16} class="ml-auto text-primary/60" />
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
    class="mx-3 mb-3 flex items-center gap-2.5 rounded-xl bg-ink-50 px-3 py-2.5 text-left transition hover:bg-ink-100"
    aria-label="Buka halaman saldo"
  >
    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink-900 to-ink-800 text-white">
      <Icon name="wallet" size={15} stroke={2} />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-xs font-bold text-ink-800">Saldo</span>
      <span class="block text-[10px] text-ink-500">Lihat & top up</span>
    </span>
    <Icon name="chevron_right" size={14} class="text-ink-400" />
  </a>

  <!-- User card -->
  <div class="border-t border-ink-100 p-3">
    <div class="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2.5">
      <Avatar name={displayName} size="sm" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold text-ink-900">{displayName}</p>
        <span
          class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold {levelStyle}"
        >
          {level}
        </span>
      </div>
      <button
        onclick={handleLogout}
        aria-label="Keluar"
        class="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-500 shadow-sm ring-1 ring-ink-100 transition hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      >
        <Icon name="logout" size={16} />
      </button>
    </div>
  </div>
</aside>

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
