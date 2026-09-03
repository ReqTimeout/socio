<script lang="ts">
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
  <div class="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
    <!-- Desktop: 3 col grid | Mobile: centered stack -->
    <div
      class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8"
    >
      <!-- Brand + tagline -->
      <div class="text-center lg:text-left">
        <a
          href="/"
          class="inline-flex items-center gap-1.5 font-display text-lg font-extrabold tracking-tight"
        >
          socio<span class="text-primary">.id</span>
        </a>
        <p
          class="mx-auto mt-1 max-w-[240px] text-xs leading-relaxed text-ink-500 lg:mx-0"
        >
          Panel SMM Indonesia — proses otomatis, harga termurah.
        </p>
      </div>

      <!-- Links -->
      <div
        class="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center lg:items-start"
      >
        <div class="text-center sm:text-left">
          <p
            class="text-[11px] font-bold uppercase tracking-widest text-ink-500"
          >
            Menu
          </p>
          <div
            class="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start lg:gap-1"
          >
            {#each links as l}
              <a
                href={l.href}
                class="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                >{l.label}</a
              >
            {/each}
          </div>
        </div>
        <div class="hidden h-10 w-px bg-ink-100 sm:block"></div>
        <div class="text-center sm:text-left">
          <p
            class="text-[11px] font-bold uppercase tracking-widest text-ink-500"
          >
            Bantuan
          </p>
          <div
            class="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start"
          >
            {#each legal as l}
              <a
                href={l.href}
                class="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                >{l.label}</a
              >
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div
      class="mt-6 flex flex-col items-center gap-2 border-t border-ink-100 pt-4 text-center lg:mt-8 lg:flex-row lg:justify-between"
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
