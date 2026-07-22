<script lang="ts">
  import { page } from "$app/stores";
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";
  import Avatar from "./Avatar.svelte";

  type Item = { href: string; label: string; icon: string; badge?: number };

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

  function handleLogout() {
    haptic();
    fetch("/api/auth/sign-out", { method: "POST" }).then(
      () => (location.href = "/login"),
    );
  }
</script>

<aside
  class="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-ink-100 bg-surface safe-top"
  aria-label="Navigasi desktop"
>
  <!-- Logo -->
  <div class="flex h-16 items-center px-6">
    <a href="/" class="font-display text-xl font-extrabold tracking-tight">
      socio<span class="text-primary">.id</span>
    </a>
  </div>

  <!-- Nav -->
  <nav class="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
    {#each items as item (item.href)}
      <a
        href={item.href}
        aria-current={isActive(item.href) ? "page" : undefined}
        onclick={() => haptic(8)}
        class="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
          {isActive(item.href)
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'}"
      >
        {#if isActive(item.href)}
          <span
            class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
          ></span>
        {/if}
        <span class="relative">
          <Icon
            name={item.icon}
            size={20}
            stroke={isActive(item.href) ? 2.25 : 1.75}
          />
          {#if item.badge}
            <span
              class="absolute -top-1.5 -right-2 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white"
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          {/if}
        </span>
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>

  <!-- User card -->
  <div class="border-t border-ink-100 p-3">
    <div class="flex items-center gap-3 rounded-lg px-2 py-2">
      <Avatar name={displayName} size="sm" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-ink-900">{displayName}</p>
        <div class="flex items-center gap-1.5">
          <span
            class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold {levelStyle}"
          >
            {level}
          </span>
          <span class="text-[11px] text-ink-400">{fmt(user.balance)}</span>
        </div>
      </div>
      <button
        onclick={handleLogout}
        aria-label="Keluar"
        class="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-danger-soft hover:text-danger transition-colors"
      >
        <Icon name="logout" size={18} />
      </button>
    </div>
  </div>
</aside>
