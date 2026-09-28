<script lang="ts">
  import Sparko from "./Sparko.svelte";
  const links = [
    { href: "/layanan", label: "Layanan" },
    { href: "/pesanan", label: "Pesanan" },
    { href: "/saldo", label: "Saldo" },
    { href: "/tiket", label: "Bantuan" },
    { href: "/affiliate", label: "Affiliate" },
  ];
  const legal = [
    { href: "/tiket", label: "Pusat Bantuan" },
    { href: "/akun", label: "Akun" },
  ];
</script>

<footer class="border-t border-ink-100 bg-surface">
  <div class="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-5">
    <!-- Desktop: satu baris rapi (brand kiri · menu kanan). Mobile: stack center. -->
    <div class="flex flex-col items-center gap-3 lg:flex-row lg:justify-between lg:gap-6">
      <!-- Brand + Sparko -->
      <a href="/" class="inline-flex items-center gap-2">
        <Sparko pose="wave" size={30} />
        <span class="font-display text-lg font-extrabold tracking-tight"
          >socio<span class="text-primary">.id</span></span
        >
      </a>

      <!-- Menu -->
      <nav class="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 lg:justify-end">
        {#each links as l}
          <a
            href={l.href}
            class="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
            >{l.label}</a
          >
        {/each}
        <span class="mx-1 hidden h-4 w-px bg-ink-200 lg:inline-block" aria-hidden="true"></span>
        {#each legal as l}
          <a
            href={l.href}
            class="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
            >{l.label}</a
          >
        {/each}
      </nav>
    </div>

    <!-- Bottom bar -->
    <div
      class="mt-3 flex flex-col items-center justify-between gap-1 border-t border-ink-100 pt-3 text-center lg:mt-4 lg:flex-row"
    >
      <p class="text-[11px] font-medium text-ink-500">
        &copy; {new Date().getFullYear()} Socio.id · Panel SMM Indonesia
      </p>
      <p class="text-[11px] text-ink-500">
        Butuh bantuan?
        <a
          href="/tiket"
          class="font-bold text-primary underline-offset-2 hover:underline">Buat tiket</a
        > — balas &lt; 5 menit
      </p>
    </div>
  </div>
</footer>
