<script lang="ts">
  import { EmptyState, Icon, revealDelay } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  let { data } = $props();

  const logMeta: Record<string, { label: string; icon: string; tone: string }> = {
    order: { label: "Pesan", icon: "receipt", tone: "danger" },
    ref: { label: "Refund", icon: "refresh", tone: "success" },
    deposit: { label: "Top Up", icon: "plus", tone: "success" },
    wd: { label: "Withdraw", icon: "arrow_down", tone: "danger" },
    admin: { label: "Admin", icon: "settings", tone: "ink" },
    // Legacy PHP (pre-rebuild): type hanya 'plus' (masuk) / 'minus' (keluar),
    // amount selalu positif. Catat di note ("Make an Order…" / "Deposit…" /
    // "Pengembalian dana…" — lihat app.socio.id/order/new-action.php).
    plus: { label: "Masuk", icon: "arrow_down", tone: "success" },
    minus: { label: "Keluar", icon: "receipt", tone: "danger" },
  };
  function metaOf(type: string, note = "") {
    const m = logMeta[type];
    if (m) return m;
    // Refine label legacy dari note biar lebih deskriptif
    if (/^Pengembalian/i.test(note)) return { label: "Refund", icon: "refresh", tone: "success" };
    if (/^Deposit/i.test(note)) return { label: "Top Up", icon: "plus", tone: "success" };
    if (/^Make an (API )?Order/i.test(note))
      return { label: "Pesan", icon: "receipt", tone: "danger" };
    return { label: type, icon: "info", tone: "ink" };
  }
  // Arah transaksi: app baru menulis amount bertanda; legacy menulis amount
  // positif + type 'minus' → keluar. Jangan percaya tanda amount saja.
  function isOutLog(l: { type: string; amount: number | string }) {
    const amt = Number(l.amount);
    return l.type === "minus" || l.type === "wd" || l.type === "order" || amt < 0;
  }

  const typeFilters = [
    { v: "", label: "Semua" },
    { v: "deposit", label: "Top Up" },
    { v: "order", label: "Pesan" },
    { v: "ref", label: "Refund" },
    { v: "admin", label: "Lainnya" },
  ];

  const currentType = $derived($page.url.searchParams.get("type") ?? "");
  // Map type legacy (plus/minus) ke kategori filter yang sama dengan app baru
  // supaya filter tab tetap berfungsi untuk data lama.
  function filterType(l: { type: string; note: string }): string {
    const t = l.type;
    if (t === "deposit" || t === "ref" || t === "order" || t === "wd" || t === "admin") return t;
    if (t === "plus") {
      if (/^Pengembalian/i.test(l.note)) return "ref";
      if (/^Deposit/i.test(l.note)) return "deposit";
      return "admin";
    }
    if (t === "minus") return "order";
    return "admin";
  }
  const filtered = $derived(
    currentType ? data.logs.filter((l) => filterType(l) === currentType) : data.logs,
  );

  function selectType(v: string) {
    haptic(8);
    const p = new URLSearchParams($page.url.searchParams);
    if (v) p.set("type", v);
    else p.delete("type");
    goto(`/saldo/riwayat?${p.toString()}`, { noScroll: true });
  }

  function formatDate(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const summary = $derived((data as any).summary ?? { masuk: 0, keluar: 0 });
</script>

<svelte:head>
  <title>Riwayat Saldo — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Lihat riwayat transaksi saldo Socio.id kamu. Top up, order, refund, dan withdraw."
  />
</svelte:head>

<section class="space-y-4 lg:space-y-5">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h1 class="font-display text-xl font-extrabold tracking-tight lg:text-[1.7rem]">
        Riwayat Saldo
      </h1>
      <p class="mt-1 text-xs text-ink-500 lg:text-[13px]">
        {filtered.length} transaksi{currentType
          ? ` · ${logMeta[currentType]?.label ?? currentType}`
          : ""} · geser tabel di mobile
      </p>
    </div>
    <a
      href="/saldo"
      class="hidden shrink-0 items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 hover:bg-ink-800 sm:inline-flex"
    >
      <Icon name="chevron_left" size={14} />
      Ringkasan
    </a>
    <a href="/saldo" class="shrink-0 text-xs font-bold text-primary sm:hidden">Ringkasan ›</a>
  </div>

  <!-- Summary — all-time -->
  <div class="grid grid-cols-2 gap-2 lg:gap-3">
    <div
      class="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 lg:p-4"
    >
      <div class="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl"></div>
      <div
        class="relative flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600"
      >
        <span class="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500 text-white"
          ><Icon name="arrow_up" size={12} stroke={2.5} /></span
        >
        Pemasukan
      </div>
      <div
        class="relative mt-1 font-display text-base font-extrabold tabular-nums text-emerald-700 lg:text-lg"
      >
        +{formatRupiah(summary.masuk)}
      </div>
      <div class="relative text-[11px] text-emerald-600/70">total masuk</div>
    </div>
    <div
      class="relative overflow-hidden rounded-2xl border border-ink-200 bg-gradient-to-br from-ink-50 to-white p-3 lg:p-4"
    >
      <div class="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-ink-500/10 blur-xl"></div>
      <div
        class="relative flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-500"
      >
        <span class="grid h-6 w-6 place-items-center rounded-lg bg-ink-900 text-white"
          ><Icon name="arrow_down" size={12} stroke={2.5} /></span
        >
        Pengeluaran
      </div>
      <div
        class="relative mt-1 font-display text-base font-extrabold tabular-nums text-ink-800 lg:text-lg"
      >
        {formatRupiah(summary.keluar)}
      </div>
      <div class="relative text-[11px] text-ink-500">total keluar</div>
    </div>
  </div>

  <!-- Type filter -->
  <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
    {#each typeFilters as f}
      <button
        onclick={() => selectType(f.v)}
        class="min-h-[44px] shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95
          {currentType === f.v
          ? 'bg-ink-900 text-white shadow-sm'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
      >
        {f.label}
      </button>
    {/each}
  </div>

  {#if filtered.length === 0}
    <EmptyState
      title={currentType
        ? `Tidak ada ${logMeta[currentType]?.label ?? currentType}`
        : "Belum ada riwayat"}
      description={currentType ? "Coba ganti filter." : "Pergerakan saldo akan muncul di sini."}
    />
  {:else}
    <!-- TABLE — premium, scroll on mobile -->
    <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card">
      <div class="overflow-x-auto [scrollbar-width:thin]">
        <table class="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr
              class="border-b border-ink-100 bg-ink-50/70 text-[11px] font-bold uppercase tracking-wide text-ink-500"
            >
              <th class="px-4 py-3 whitespace-nowrap">Waktu</th>
              <th class="px-4 py-3 whitespace-nowrap">Jenis</th>
              <th class="px-4 py-3">Keterangan</th>
              <th class="px-4 py-3 text-right whitespace-nowrap">Jumlah</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            {#each filtered as l, i (l.id)}
              {@const m = metaOf(l.type, l.note)}
              {@const isOut = isOutLog(l)}
              <tr
                class="group transition-colors hover:bg-ink-50/70 reveal"
                style={revealDelay(i, 60, 18)}
              >
                <td class="px-4 py-3 whitespace-nowrap text-xs text-ink-500">
                  {formatDate(l.createdAt)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold {m.tone ===
                    'success'
                      ? 'bg-success/10 text-success'
                      : m.tone === 'danger'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-ink-100 text-ink-600'}"
                  >
                    <Icon name={m.icon} size={12} />
                    {m.label}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="block max-w-[260px] truncate text-sm font-medium text-ink-800"
                    title={l.note}>{l.note}</span
                  >
                </td>
                <td class="px-4 py-3 text-right">
                  <span
                    class="inline-flex rounded-lg px-2.5 py-1 text-sm font-extrabold tabular-nums {isOut
                      ? 'bg-danger text-white'
                      : 'bg-success text-white'}"
                  >
                    {isOut ? "−" : "+"}{formatRupiah(Math.abs(Number(l.amount)))}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div
        class="flex items-center justify-center gap-1 border-t border-ink-100 bg-ink-50/50 px-3 py-1.5 text-[10px] text-ink-500 lg:hidden"
      >
        <Icon name="arrow_right" size={12} /> Geser untuk lihat kolom lengkap
      </div>
    </div>
  {/if}
</section>
