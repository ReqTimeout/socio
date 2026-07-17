<script lang="ts">
  import { page } from "$app/stores";
  import { haptic } from "@socio/ui";

  let { data, children } = $props();

  const nav = [
    { href: "/admin", label: "Dashboard", icon: "▦" },
    { href: "/admin/users", label: "Users", icon: "◍" },
    { href: "/admin/orders", label: "Orders", icon: "≣" },
    { href: "/admin/deposits", label: "Deposits", icon: "₿" },
    { href: "/admin/services", label: "Services", icon: "✦" },
    { href: "/admin/audit", label: "Audit Log", icon: "❏" },
    { href: "/admin/settings", label: "Settings", icon: "⚙" },
  ];

  let menuOpen = $state(false);
</script>

<div class="min-h-dvh bg-ink-50 lg:flex">
  <!-- Desktop sidebar -->
  <aside class="hidden w-60 shrink-0 border-r border-ink-100 bg-surface p-4 lg:block">
    <div class="mb-6 flex items-center gap-2 px-2">
      <div class="h-8 w-8 rounded-lg bg-accent-ink"></div>
      <span class="font-display text-lg font-bold"
        >Socio<span class="text-accent-ink">Admin</span></span
      >
    </div>
    <nav class="space-y-1">
      {#each nav as n}
        <a
          href={n.href}
          class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium {$page.url
            .pathname === n.href ||
          (n.href !== '/admin' && $page.url.pathname.startsWith(n.href))
            ? 'bg-ink-900 text-white'
            : 'text-ink-600 hover:bg-ink-100'}"
        >
          <span class="text-base">{n.icon}</span>{n.label}
        </a>
      {/each}
    </nav>
    <a
      href="/"
      class="mt-6 block rounded-xl px-3 py-2 text-sm font-medium text-ink-400 hover:bg-ink-100"
      >← Kembali ke App</a
    >
  </aside>

  <!-- Mobile topbar -->
  <header
    class="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-surface px-4 py-3 lg:hidden"
  >
    <button
      onclick={() => {
        haptic();
        menuOpen = true;
      }}
      class="text-xl">☰</button
    >
    <span class="font-display font-bold">Admin</span>
    <a href="/akun" class="text-sm font-medium text-ink-500">@{data.admin.username}</a>
  </header>

  <!-- Mobile off-canvas -->
  {#if menuOpen}
    <div class="fixed inset-0 z-40 bg-black/40 lg:hidden" onclick={() => (menuOpen = false)}></div>
    <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-surface p-4 lg:hidden">
      <div class="mb-6 flex items-center justify-between px-2">
        <span class="font-display text-lg font-bold"
          >Socio<span class="text-accent-ink">Admin</span></span
        >
        <button onclick={() => (menuOpen = false)} class="text-xl">✕</button>
      </div>
      <nav class="space-y-1">
        {#each nav as n}
          <a
            href={n.href}
            onclick={() => (menuOpen = false)}
            class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium {$page.url.pathname.startsWith(
              n.href,
            )
              ? 'bg-ink-900 text-white'
              : 'text-ink-600 hover:bg-ink-100'}"
          >
            <span class="text-base">{n.icon}</span>{n.label}
          </a>
        {/each}
      </nav>
      <a href="/" class="mt-6 block rounded-xl px-3 py-2 text-sm font-medium text-ink-400"
        >← Kembali ke App</a
      >
    </aside>
  {/if}

  <main class="flex-1 p-4 pb-24 lg:p-8">
    {@render children()}
  </main>
</div>
