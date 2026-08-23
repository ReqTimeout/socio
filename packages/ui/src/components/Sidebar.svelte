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

  const fmt = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

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

  function handleLogout() {
    haptic();
    fetch("/api/auth/sign-out", { method: "POST" }).then(() => (location.href = "/login"));
  }
</script>

<aside
  class="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-ink-100 bg-surface safe-top"
  style="view-transition-name: sidebar;"
  aria-label="Navigasi desktop"
>
  <!-- Logo -->
  <div class="flex h-16 items-center px-5">
    <a href="/" class="transition-transform duration-200 hover:scale-[1.02]" aria-label="Socio.id — Beranda">
      <Wordmark size="md" />
    </a>
  </div>

  <!-- CTA Pesan baru -->
  <div class="px-3 pb-1">
    <a
      href="/pesan"
      onclick={() => haptic(10)}
      class="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-8px_rgba(79,70,229,0.75)] active:scale-[0.98]"
    >
      <Icon name="plus" size={18} stroke={2.5} />
      Pesan Sekarang
    </a>
  </div>

  <!-- Nav -->
  <nav class="flex-1 space-y-4 overflow-y-auto px-3 py-3">
    {#each Object.entries(groups) as [section, groupItems] (section)}
      <div class="space-y-1">
        <p class="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-300">
          {section}
        </p>
        {#each groupItems as item (item.href)}
          <a
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            onclick={() => haptic(8)}
            class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
              {isActive(item.href)
              ? 'bg-gradient-to-r from-primary-500/12 to-accent-500/10 text-primary font-semibold'
              : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'}"
          >
            {#if isActive(item.href)}
              <span
                class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-500 to-accent-500"
              ></span>
            {/if}
            <span class="relative transition-transform duration-200 group-hover:scale-110">
              <Icon name={item.icon} size={20} stroke={isActive(item.href) ? 2.25 : 1.75} />
              {#if item.badge}
                <span
                  class="absolute -top-1.5 -right-2 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              {/if}
            </span>
            <span>{item.label}</span>
            {#if isActive(item.href)}
              <Icon name="chevron_right" size={16} class="ml-auto text-primary/60" />
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>

  <!-- Saldo + user card -->
  <div class="border-t border-ink-100 p-3">
    <div
      class="mb-2 flex items-center justify-between rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 px-3.5 py-3 text-white shadow-[0_10px_24px_-12px_rgba(79,70,229,0.8)]"
    >
      <div class="min-w-0">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-white/70">Saldo</p>
        <p class="truncate font-display text-lg font-extrabold tabular-nums">{fmt(user.balance)}</p>
      </div>
      <a
        href="/saldo/top-up"
        onclick={() => haptic(10)}
        class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-90"
        aria-label="Top up saldo"
      >
        <Icon name="plus" size={18} stroke={2.5} />
      </a>
    </div>

    <div class="flex items-center gap-3 rounded-xl px-2 py-1.5">
      <Avatar name={displayName} size="sm" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-ink-900">{displayName}</p>
        <span
          class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold {levelStyle}"
        >
          {level}
        </span>
      </div>
      <button
        onclick={handleLogout}
        aria-label="Keluar"
        class="grid h-11 w-11 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      >
        <Icon name="logout" size={18} />
      </button>
    </div>
  </div>
</aside>
