<script lang="ts">
  import {
    StatusBadge,
    Sheet,
    Button,
    Icon,
    SwipeRow,
    toast,
    revealDelay,
    EmptyOrdersArt,
    LiveDot,
    Skeleton,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { formatRupiah, serviceDisplayName, formatDateShort } from "$lib/format";
  import { goto } from "$app/navigation";
  import { navigating } from "$app/state";
  import { applyAction, enhance } from "$app/forms";
  import { page } from "$app/stores";

  let { data } = $props();

  const tabs = [
    { f: "all", label: "Semua" },
    { f: "pending", label: "Pending" },
    { f: "proses", label: "Proses" },
    { f: "selesai", label: "Selesai" },
    { f: "gagal", label: "Gagal" },
    { f: "partial", label: "Partial" },
  ];

  let selected = $state<number | null>(null);
  let sheetOpen = $state(false);

  let selectMode = $state(false);
  let checked = $state<Set<number>>(new Set());

  // Init langsung dari server payload — SSR merender list penuh (avoid CLS:
  // empty-state flash saat hydration mendorong footer turun).
  let orders = $state(data.orders);
  // Order yang barusan berubah via SSE — dapat highlight sweep (1x, bukan loop)
  let sweptIds = $state<Set<number>>(new Set());

  // UX4.3 — SSE live banner: LiveDot timestamp refresh tiap order_update event
  let lastUpdate = $state<Date | null>(data.lastUpdate ? new Date(data.lastUpdate) : null);
  let sseConnected = $state(false);
  $effect(() => {
    orders = data.orders;
  });

  const counts = $derived(
    (data as any).counts ?? { all: orders.length, pending: 0, proses: 0, selesai: 0, gagal: 0 },
  );
  const checkedIds = $derived([...checked]);
  const massRefundable = $derived(
    orders.filter((o) => checked.has(o.id) && o.status === "Pending"),
  );
  const massRefundTotal = $derived(massRefundable.reduce((s, o) => s + Number(o.price), 0));

  function toggleSelectMode() {
    haptic(8);
    selectMode = !selectMode;
    if (!selectMode) checked = new Set();
  }
  function toggleCheck(id: number) {
    haptic(8);
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    checked = next;
  }

  if (typeof window !== "undefined") {
    const es = new EventSource("/api/sse");
    es.onopen = () => {
      sseConnected = true;
    };
    es.onerror = () => {
      sseConnected = false;
    };
    es.addEventListener("order_update", (e) => {
      const { id, status, remains } = JSON.parse((e as MessageEvent).data);
      // StatusBadge flip: status baru render + highlight sweep sekali lalu fade
      orders = orders.map((o) =>
        o.id === id ? { ...o, status, remains: remains ?? o.remains } : o,
      );
      sweptIds = new Set(sweptIds).add(id);
      if (selected === id) haptic(12);
      // UX4.3: update lastUpdate untuk LiveDot timestamp
      lastUpdate = new Date();
      setTimeout(() => {
        sweptIds = new Set([...sweptIds].filter((x) => x !== id));
      }, 1600);
    });
  }

  function select(f: string) {
    haptic(8);
    const p = new URLSearchParams($page.url.searchParams);
    if (f === "all") p.delete("f");
    else p.set("f", f);
    goto(`/pesanan?${p.toString()}`);
  }

  function openDetail(id: number) {
    haptic(10);
    selected = id;
    sheetOpen = true;
  }

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return formatDateShort(date);
  }

  const detail = $derived(orders.find((o) => o.id === selected) ?? null);

  function copyLink(link: string) {
    navigator.clipboard?.writeText(link);
    haptic(8);
    toast("Link disalin", "success");
  }

  function repeatOrder(o: (typeof orders)[0]) {
    haptic(12);
    sheetOpen = false;
    goto(`/pesan?service=${o.serviceId}&link=${encodeURIComponent(o.data)}&qty=${o.quantity}`);
  }
</script>

<svelte:head>
  <title>Pesanan — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Lihat riwayat dan status pesanan SMM kamu secara real-time. Kelola order, refill, dan batalkan pesanan."
  />
</svelte:head>

<section class="space-y-3 lg:space-y-5">
  <!-- h1 sr-only — mobile tidak punya heading visible; a11y tetap punya konteks halaman -->
  <h1 class="sr-only">Riwayat Pesanan</h1>

  <!-- Intro header (desktop) -->
  <div class="hidden items-end justify-between lg:flex">
    <div>
      <p class="font-display text-2xl font-extrabold tracking-tight">Riwayat Pesanan</p>
      <p class="mt-1 text-sm text-ink-500">
        Pantau status tiap order secara real-time — refill & pembatalan sekali klik di sini.
      </p>
    </div>
    <a
      href="/pesan"
      class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.6)] transition hover:-translate-y-0.5 active:scale-95"
    >
      <Icon name="plus" size={16} stroke={2.5} />
      Pesan Baru
    </a>
  </div>

  <!-- UX4.1 + UX4.3 — inline-stat narrative replaces 4-col strip + SSE live banner -->
  {#if counts.all > 0}
    <div
      class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-surface px-4 py-3 reveal"
    >
      <p class="text-sm leading-snug text-ink-700">
        <span class="font-display text-2xl font-extrabold tabular-nums text-ink-900"
          >{counts.all.toLocaleString("id-ID")}</span
        >
        pesanan
        {#if counts.pending > 0}
          · <span class="font-semibold text-amber-700">{counts.pending} pending</span>
        {/if}
        {#if counts.selesai > 0}
          · <span class="font-semibold text-emerald-700"
            >{counts.selesai.toLocaleString("id-ID")} selesai</span
          >
          {#if counts.all > 0}
            <span class="text-xs text-ink-400"
              >({Math.round((counts.selesai / counts.all) * 100)}% success rate)</span
            >
          {/if}
        {/if}
      </p>
      {#if lastUpdate}
        <LiveDot {lastUpdate} label={sseConnected ? "Live" : "Reconnect"} />
      {/if}
    </div>
  {/if}

  <!-- Filter chips -->
  <div
    class="sticky top-14 z-20 -mx-4 flex items-center gap-2 overflow-x-auto border-b border-ink-100 bg-surface/95 px-4 py-2 backdrop-blur shadow-[0_4px_12px_-8px_rgba(15,23,42,0.08)] [scrollbar-width:none] sm:static sm:border-0 sm:bg-transparent sm:p-0 lg:mx-0 lg:px-0 lg:gap-3 lg:py-1 sm:shadow-none"
  >
    {#each tabs as t}
      {@const c = (counts as any)[t.f] ?? 0}
      <button
        onclick={() => select(t.f)}
        class="min-h-[44px] shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95
          {data.filter === t.f
          ? 'bg-primary text-white shadow-sm'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
      >
        {t.label}
        {#if c > 0}
          <span
            class="ml-1.5 inline-flex min-w-[18px] justify-center rounded-full px-1 py-0.5 text-[10px] font-extrabold tabular-nums {data.filter ===
            t.f
              ? 'bg-ink-900/25 text-white'
              : 'bg-white text-ink-700'}">{c}</span
          >
        {/if}
      </button>
    {/each}
    <button
      onclick={toggleSelectMode}
      aria-label={selectMode
        ? "Keluar mode pilih banyak"
        : "Pilih beberapa pesanan untuk refund massal"}
      title={selectMode ? "Keluar mode pilih" : "Pilih beberapa pesanan"}
      class="ml-auto min-h-[44px] shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95
        {selectMode ? 'bg-ink-900 text-ink-50' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
    >
      <Icon name="check" size={14} class="sm:hidden" />
      <span class="hidden sm:inline">{selectMode ? "Batal" : "Pilih Banyak"}</span>
      <span class="sm:hidden">{selectMode ? "Batal" : "Pilih"}</span>
    </button>
  </div>

  {#if navigating.to?.url.pathname === "/pesanan"}
    <!-- Skeleton saat pindah filter (hindari flash empty-state) -->
    <ul class="grid grid-cols-1 gap-3 sm:gap-3.5 lg:grid-cols-2" aria-hidden="true">
      {#each [0, 1, 2, 3] as i (i)}
        <li class="rounded-2xl border border-ink-100 bg-surface p-4">
          <div class="flex items-center gap-3">
            <Skeleton width="2.25rem" height="2.25rem" rounded="rounded-xl" />
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton width="60%" height="0.9rem" />
              <Skeleton width="40%" height="0.75rem" />
            </div>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <Skeleton height="2rem" />
            <Skeleton height="2rem" />
            <Skeleton height="2rem" />
          </div>
        </li>
      {/each}
    </ul>
  {:else if orders.length === 0}
    <div
      class="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center lg:p-10 lg:rounded-3xl"
    >
      <div
        class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
      ></div>
      {#if data.filter === "all"}
        <EmptyOrdersArt size={112} class="relative mx-auto mb-3 text-ink-300" />
        <p class="relative text-sm font-bold text-ink-800">{copy.empty.orders.title}</p>
        <p class="relative mt-1 text-xs leading-relaxed text-ink-500">
          {copy.empty.orders.desc}
        </p>
      {:else}
        <EmptyOrdersArt size={88} class="relative mx-auto mb-3 text-ink-300" />
        <p class="relative text-sm font-bold text-ink-800">
          Tidak ada pesanan {tabs.find((t) => t.f === data.filter)?.label ?? ""}
        </p>
        <p class="relative mt-1 text-xs leading-relaxed text-ink-500">
          Coba ganti filter di atas, atau buat pesanan baru.
        </p>
      {/if}
      <a
        href="/pesan"
        class="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 hover:bg-primary-800"
      >
        <Icon name="plus" size={16} stroke={2.5} />
        {copy.empty.orders.cta}
      </a>
      {#if data.filter === "all" && data.popular.length > 0}
        <div class="relative mt-5 border-t border-ink-100 pt-4 text-left">
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
            Paling laris minggu ini
          </p>
          <div class="grid gap-2 sm:grid-cols-3">
            {#each data.popular as p (p.id)}
              <a
                href="/pesan?service={p.id}"
                class="group flex min-h-[56px] flex-col justify-center gap-0.5 rounded-xl border border-ink-100 px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-sm"
              >
                <span class="truncate text-xs font-bold text-ink-900 group-hover:text-primary-700"
                  >{p.serviceName}</span
                >
                <span class="text-[11px] font-semibold tabular-nums text-accent-700"
                  >{formatRupiah(p.price)}</span
                >
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Card grid — playful, premium, mudah scan tanpa scroll horizontal -->
    <ul class="grid grid-cols-1 gap-3 sm:gap-3.5 lg:grid-cols-2">
      {#each orders as o, i (o.id)}
        {@const swept = sweptIds.has(o.id)}
        <li>
          <!-- UX4.4 — SwipeRow wrapper di mobile only; desktop langsung card dengan 3-dot menu -->
          <div class="lg:hidden">
            <SwipeRow
              threshold={80}
              actionLabel="Pesan lagi"
              actionIcon="refresh"
              onAction={() => repeatOrder(o)}
            >
              <div
                class="flex flex-col overflow-hidden rounded-2xl border bg-surface p-4 shadow-sm sm:p-5
                  {checked.has(o.id)
                  ? 'border-primary ring-1 ring-primary bg-primary/[0.03]'
                  : 'border-ink-100'}
                  {swept ? 'sweep-highlight' : ''} reveal"
                style={revealDelay(i, 0, 35)}
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-extrabold leading-tight sm:text-[15px]">
                      {serviceDisplayName(o.serviceName)}
                    </p>
                    <p class="mt-1 flex items-center gap-1 truncate text-xs text-ink-500">
                      <Icon name="link" size={12} class="shrink-0 text-ink-300" />
                      <span class="truncate" title={o.data}>{o.data}</span>
                    </p>
                  </div>
                  <span class="shrink-0 badge-flip">
                    {#key o.status}
                      <StatusBadge status={o.status} />
                    {/key}
                  </span>
                </div>
                {#if o.status === "Partial"}
                  <p
                    class="mt-2 flex items-center gap-1.5 rounded-lg bg-status-partial/10 px-2.5 py-1.5 text-[11px] font-semibold text-status-partial"
                  >
                    <Icon name="info" size={12} class="shrink-0" />
                    Sebagian selesai — sisa {Number(o.remains ?? 0).toLocaleString("id-ID")} otomatis
                    direfund ke saldo.
                  </p>
                {/if}
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold tabular-nums text-ink-700"
                  >
                    {o.quantity.toLocaleString("id-ID")} qty
                  </span>
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold tabular-nums text-primary"
                  >
                    {formatRupiah(o.price)}
                  </span>
                  <span class="ml-auto flex items-center gap-1 text-xs text-ink-500">
                    <Icon name="clock" size={12} />
                    {timeAgo(o.createdAt)}
                  </span>
                  <span class="hidden text-xs font-medium text-ink-300 lg:inline">#{o.id}</span>
                </div>
              </div>
            </SwipeRow>
          </div>

          <!-- Desktop: full card with status badge + actions -->
          <div
            class="hidden lg:flex group relative flex-col overflow-hidden rounded-2xl border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.14)] sm:p-5
              {checked.has(o.id)
              ? 'border-primary ring-1 ring-primary bg-primary/[0.03]'
              : 'border-ink-100'}
              {swept ? 'sweep-highlight' : ''} reveal"
            style={revealDelay(i, 0, 35)}
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-extrabold leading-tight sm:text-[15px]">
                  {serviceDisplayName(o.serviceName)}
                </p>
                <p class="mt-1 flex items-center gap-1 truncate text-xs text-ink-500">
                  <Icon name="link" size={12} class="shrink-0 text-ink-300" />
                  <span class="truncate" title={o.data}>{o.data}</span>
                </p>
              </div>
              <span class="shrink-0 badge-flip">
                {#key o.status}
                  <StatusBadge status={o.status} />
                {/key}
              </span>
            </div>

            {#if o.status === "Partial"}
              <p
                class="mt-2 flex items-center gap-1.5 rounded-lg bg-status-partial/10 px-2.5 py-1.5 text-[11px] font-semibold text-status-partial"
              >
                <Icon name="info" size={12} class="shrink-0" />
                Sebagian selesai — sisa {Number(o.remains ?? 0).toLocaleString("id-ID")} otomatis direfund
                ke saldo.
              </p>
            {/if}

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold tabular-nums text-ink-700"
              >
                {o.quantity.toLocaleString("id-ID")} qty
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold tabular-nums text-primary"
              >
                {formatRupiah(o.price)}
              </span>
              <span class="ml-auto flex items-center gap-1 text-xs text-ink-500">
                <Icon name="clock" size={12} />
                {timeAgo(o.createdAt)}
              </span>
              <span class="hidden text-xs font-medium text-ink-300 lg:inline">#{o.id}</span>
            </div>

            <div class="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3">
              {#if selectMode}
                <button
                  type="button"
                  onclick={() => toggleCheck(o.id)}
                  class="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition active:scale-95
                    {checked.has(o.id)
                    ? 'border-primary bg-primary text-white'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'}"
                >
                  <span
                    class="grid h-4 w-4 place-items-center rounded-full {checked.has(o.id)
                      ? 'bg-white text-primary'
                      : 'bg-ink-100'}"
                  >
                    <Icon name="check" size={10} stroke={3} />
                  </span>
                  {checked.has(o.id) ? "Terpilih" : "Pilih"}
                </button>
              {:else}
                <button
                  onclick={() => openDetail(o.id)}
                  class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-ink-800 active:scale-95"
                >
                  <Icon name="eye" size={14} />
                  Detail
                </button>
                <button
                  onclick={() => repeatOrder(o)}
                  class="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink-200 bg-surface px-4 py-2 text-xs font-bold text-ink-700 transition hover:bg-ink-50 active:scale-95"
                >
                  <Icon name="refresh" size={14} stroke={2} />
                  Pesan lagi
                </button>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- Mass action bar -->
{#if selectMode && checkedIds.length > 0}
  <form
    method="POST"
    action="?/massCancel"
    use:enhance={() => {
      return async ({ result }) => {
        if (result.type === "failure") {
          toast((result.data as any)?.error ?? "Gagal", "error");
        } else if (result.type === "success") {
          toast((result.data as any)?.success ?? "Refund massal berhasil", "success");
          checked = new Set();
          selectMode = false;
          await applyAction(result);
        }
      };
    }}
  >
    <input type="hidden" name="ids" value={checkedIds.join(",")} />
    <div
      class="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 p-3 backdrop-blur
        shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]
        pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:pl-64"
    >
      <div class="mx-auto flex max-w-lg items-center gap-3">
        <div class="text-xs font-medium text-ink-600">
          {massRefundable.length} order · refund
          <span class="font-bold text-primary">{formatRupiah(massRefundTotal)}</span>
        </div>
        <Button type="submit" variant="danger" full disabled={!massRefundable.length}>
          <Icon name="x" size={16} />
          Batalkan & Refund
        </Button>
      </div>
    </div>
  </form>
{/if}

<!-- Detail Sheet -->
<Sheet bind:open={sheetOpen} title="Detail Pesanan">
  {#if detail}
    <div class="space-y-4">
      <div class="rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-4 text-white">
        <p class="text-sm font-bold leading-snug">{serviceDisplayName(detail.serviceName)}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={detail.status} />
          <span class="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold"
            >#{detail.id}</span
          >
          <span class="text-xs text-white/60"
            >{timeAgo(detail.createdAt)} · {detail.quantity.toLocaleString("id-ID")} qty</span
          >
        </div>
      </div>
      <div class="rounded-2xl border border-ink-200 p-4">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-xs font-semibold text-ink-600">Link / Username</span>
          <button
            type="button"
            onclick={() => copyLink(detail.data)}
            class="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition active:scale-90 hover:bg-primary/15"
          >
            <Icon name="copy" size={12} />
            Salin
          </button>
        </div>
        <p class="break-all text-sm leading-relaxed text-ink-800">{detail.data}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Jumlah</div>
          <div class="mt-0.5 font-display text-base font-bold tabular-nums">
            {detail.quantity.toLocaleString("id-ID")}
          </div>
        </div>
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Sisa</div>
          <div class="mt-0.5 font-display text-base font-bold tabular-nums">
            {detail.remains?.toLocaleString("id-ID") ?? "0"}
          </div>
        </div>
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Harga</div>
          <div class="mt-0.5 font-display text-base font-bold tabular-nums text-primary">
            {formatRupiah(detail.price)}
          </div>
        </div>
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Waktu</div>
          <div class="mt-0.5 text-xs font-semibold">{timeAgo(detail.createdAt)}</div>
        </div>
      </div>
      <div class="space-y-2 pt-2">
        <Button full onclick={() => repeatOrder(detail)}>
          <Icon name="refresh" size={16} />
          Pesan Ulang
        </Button>
        {#if detail.isRefill && detail.status === "Success" && detail.providerOrderId && detail.providerOrderId !== "0"}
          <form
            method="POST"
            action="?/refill"
            use:enhance={() => {
              return async ({ result }) => {
                if (result.type === "failure") {
                  toast((result.data as any)?.error ?? "Gagal", "error");
                } else {
                  toast("Refill diajukan", "success");
                  sheetOpen = false;
                  await applyAction(result);
                }
              };
            }}
          >
            <input type="hidden" name="id" value={detail.id} />
            <Button type="submit" variant="accent" full>
              <Icon name="refresh" size={16} />
              Refill
            </Button>
          </form>
        {/if}
        {#if detail.status === "Pending"}
          <form
            method="POST"
            action="?/cancel"
            use:enhance={() => {
              return async ({ result }) => {
                if (result.type === "failure") {
                  toast((result.data as any)?.error ?? "Gagal", "error");
                } else {
                  toast("Order dibatalkan, saldo dikembalikan", "success");
                  sheetOpen = false;
                  await applyAction(result);
                }
              };
            }}
          >
            <input type="hidden" name="id" value={detail.id} />
            <Button type="submit" variant="danger" full>
              <Icon name="x" size={16} />
              Batalkan Order
            </Button>
          </form>
        {/if}
      </div>
    </div>
  {/if}
</Sheet>

<style>
  /* SSE highlight sweep — overlay ::before opacity 1x (bukan loop).
     Strict transform/opacity; tidak konflik dgn bg-surface/tint checked. */
  .sweep-highlight::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgb(79 70 229 / 0.08);
    pointer-events: none;
    animation: sweep-out 1600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .sweep-highlight :global(.badge-flip) {
    animation: badge-flip 420ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes sweep-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  @keyframes badge-flip {
    0% {
      transform: scale(0.6);
      opacity: 0;
    }
    60% {
      transform: scale(1.08);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sweep-highlight::before,
    .sweep-highlight :global(.badge-flip) {
      animation: none;
      opacity: 0;
    }
  }
</style>
