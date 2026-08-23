<script lang="ts">
  const links = [
    { href: "/tiket", label: "Bantuan" },
    { href: "/layanan", label: "Layanan" },
    { href: "/affiliate", label: "Affiliate" },
    { href: "/api-docs", label: "API" },
  ];
</script>

<footer class="border-t border-ink-100 bg-surface mt-8">
  <div class="mx-auto max-w-7xl px-4 py-8 lg:px-8">
    <!-- Links + Brand -->
    <div class="flex flex-col items-center gap-4 text-center">
      <a href="/" class="font-display text-lg font-extrabold tracking-tight">
        socio<span class="text-primary">.id</span>
      </a>
      <div class="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
        {#each links as l}
          <a
            href={l.href}
            class="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-primary"
            >{l.label}</a
          >
        {/each}
      </div>
      <p class="text-[11px] text-ink-400">
        &copy; {new Date().getFullYear()} Socio.id &middot; Panel SMM Indonesia
      </p>
    </div>
  </div>
</footer>
