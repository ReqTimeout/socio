<script lang="ts">
  import {
    Button,
    ContextFab,
    ConfirmDialog,
    CsvExportButton,
    EmptyState,
    Icon,
    StatusBadge,
    toast,
  } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  type OrderRow = PageData["orders"][number];

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state("");

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (data.status) u.set("status", data.status);
      goto(`/admin/orders?${u.toString()}`, { keepFocus: true, noScroll: true });
    }, 350);
  }
  $effect(() => {
    q = data.q;
  });
  let detail = $state<OrderRow | null>(null);
  let poid = $state("");
  let sc = $state(0);
  let rem = $state(0);

  // status yang boleh diubah manual / diedit (samakan admin lama)
  const UPDATABLE_FROM = ["Pending", "Processing", "In progress"];
  const EDITABLE_STATUS = ["Pending", "Processing", "In progress", "Error", "Partial"];
  const REFUNDABLE_STATUS = [
    "Pending",
    "Processing",
    "In progress",
    "Error",
    "Partial",
    "Canceled",
  ];
  const STATUS_ACTIONS = ["Success", "Processing", "Error", "Partial"];

  const filters = [
    "",
    "Pending",
    "Processing",
    "In progress",
    "Success",
    "Partial",
    "Canceled",
    "Error",
  ];

  let confirmStatus = $state<string | null>(null); // G30: pending status target
  let confirmEditProv = $state(false);
  let confirmRefund = $state(false);
  let refundAmount = $state(0); // 0 = full refund

  function openDetail(o: OrderRow) {
    detail = o;
    poid = o.providerOrderId ?? "";
    sc = o.startCount ?? 0;
    rem = o.remains ?? 0;
    confirmStatus = null;
    confirmEditProv = false;
  }

  const fmtDate = (d: unknown) =>
    new Date(d as string).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const orderBy = (n: number) => (n === 1 ? "API" : n === 2 ? "WhatsApp" : "WEB");
  const fmt = (n: number) => n.toLocaleString("id-ID");

  // service icon detection — kasih konteks visual untuk tiap order
  function serviceIcon(name: string): { icon: string; tone: string } {
    const n = String(name ?? "").toLowerCase();
    if (n.includes("instagram") || n.includes(" ig ") || n.endsWith(" ig"))
      return { icon: "instagram", tone: "from-pink-500 to-fuchsia-500" };
    if (n.includes("tiktok") || n.includes("tik tok"))
      return { icon: "music", tone: "from-ink-900 to-ink-700" };
    if (n.includes("youtube") || n.includes(" yt "))
      return { icon: "youtube", tone: "from-red-500 to-red-600" };
    if (n.includes("facebook") || n.includes(" fb "))
      return { icon: "facebook", tone: "from-blue-500 to-blue-600" };
    if (n.includes("telegram")) return { icon: "telegram", tone: "from-sky-500 to-sky-600" };
    if (n.includes("whatsapp") || n.includes(" wa "))
      return { icon: "whatsapp", tone: "from-emerald-500 to-green-600" };
    if (n.includes("twitter") || n.includes(" x "))
      return { icon: "twitter", tone: "from-ink-900 to-ink-700" };
    if (n.includes("view") || n.includes("visitor"))
      return { icon: "eye", tone: "from-violet-500 to-purple-600" };
    if (n.includes("follower") || n.includes("subscriber") || n.includes("like"))
      return { icon: "user_plus", tone: "from-amber-500 to-orange-600" };
    if (n.includes("comment")) return { icon: "mail", tone: "from-cyan-500 to-blue-500" };
    if (n.includes("share")) return { icon: "sparkles", tone: "from-accent-500 to-pink-500" };
    return { icon: "zap", tone: "from-ink-700 to-ink-500" };
  }
  // status tone untuk accent bar mobile
  const statusAccent: Record<string, string> = {
    pending: "before:bg-status-pending",
    success: "before:bg-status-complete",
    selesai: "before:bg-status-complete",
    error: "before:bg-status-canceled",
    canceled: "before:bg-status-canceled",
    processing: "before:bg-status-progress",
    "in progress": "before:bg-status-progress",
    partial: "before:bg-status-partial",
  };

  // callback enhance: toast + tutup modal saat sukses + invalidateAll
  // pertahankan filter aktif saat pindah halaman
  function pageHref(p: number) {
    const s = new URLSearchParams();
    if (data.q) s.set("q", data.q);
    if (data.status) s.set("status", data.status);
    s.set("p", String(p));
    return `/admin/orders?${s.toString()}`;
  }
  // href chip filter status (reset ke page 1, pertahankan q)
  // P2-04: display label map (DB status → short label)
  const CHIP_LABEL: Record<string, string> = {
    "In progress": "Progress",
  };
  function chipHref(f: string) {
    const s = new URLSearchParams();
    if (data.q) s.set("q", data.q);
    if (f) s.set("status", f);
    const qs = s.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }
  // pagination compact + ellipsis (hindari render ratusan link → overflow)
  const pageList = $derived.by<(number | "…")[]>(() => {
    const total = data.pages;
    const cur = data.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const want = new Set([1, 2, total - 1, total, cur - 1, cur, cur + 1]);
    const nums = [...want].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) out.push("…");
      out.push(n);
      prev = n;
    }
    return out;
  });
</script>

<svelte:head>
  <title>Orders — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5 lg:space-y-6">
  <!-- Header: premium hero + search -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.5)]"
        >
          <Icon name="receipt" size={20} stroke={2.5} />
        </span>
        Orders
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">
        {fmt(data.total)} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success">{fmt(data.stats.success.count)}</span> selesai
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-warning">{fmt(data.stats.pending.count)}</span> pending
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-primary-ink">{fmt(data.stats.processing.count)}</span>
        proses
      </p>
    </div>
    <form method="GET" class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
      <div class="relative w-full min-w-0 flex-1 sm:w-80">
        <span
          class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-400"
        >
          <Icon name="search" size={15} stroke={2} />
        </span>
        <input
          name="q"
          bind:value={q}
          oninput={onSearch}
          placeholder="Cari ID / user / layanan…"
          class="h-10 w-full rounded-full border border-ink-200 bg-surface pl-10 pr-4 text-sm shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
        />
      </div>
      {#if data.q || data.status}
        <a
          href="/admin/orders"
          class="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 text-xs font-bold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
        >
          <Icon name="x" size={12} stroke={2.5} />
          Reset
        </a>
      {/if}
    </form>
  </header>

  <!-- KPI strip (4 cards, semantic tone-on-tone + total value) -->
  <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-2 xl:grid-cols-4">
    <div
      class="reveal rounded-2xl border border-success-soft bg-success-soft/30 p-3.5 sm:p-4"
      style="--d:60ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-success sm:text-[11px]"
      >
        <Icon name="check" size={12} stroke={2.75} />
        Selesai
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-success">
        {fmt(data.stats.success.count)}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        Total {formatRupiah(data.stats.success.total)}
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-warning/20 bg-warning-soft/30 p-3.5 sm:p-4"
      style="--d:120ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-warning sm:text-[11px]"
      >
        <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-warning"></span>
        Pending
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-warning">
        {fmt(data.stats.pending.count)}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        Locked {formatRupiah(data.stats.pending.total)}
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-primary-500/20 bg-primary-50/40 p-3.5 sm:p-4"
      style="--d:180ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-ink sm:text-[11px]"
      >
        <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary-500"></span>
        Proses
      </div>
      <div
        class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-primary-ink"
      >
        {fmt(data.stats.processing.count)}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        In-flight {formatRupiah(data.stats.processing.total)}
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-danger-soft bg-danger-soft/30 p-3.5 sm:p-4"
      style="--d:240ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-danger sm:text-[11px]"
      >
        <Icon name="alert" size={12} stroke={2.5} />
        Error / Batal
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-danger">
        {fmt(data.stats.error.count)}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        Lost {formatRupiah(data.stats.error.total)}
      </div>
    </div>
  </div>
  <p class="-mt-0.5 text-[10px] text-ink-400 sm:text-[11px]">
    Statistik mengexclude akun Admin (order internal admin tidak dihitung).
  </p>

  <!-- Filter chips — status (semantic per status, 36px tap target) -->
  <div
    class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    role="tablist"
    aria-label="Filter status order"
  >
    <a
      href={chipHref("")}
      role="tab"
      aria-selected={!data.status}
      class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
        {!data.status
        ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
    >
      <Icon name="layers" size={12} stroke={2.25} />
      Semua
    </a>
    {#each filters.filter(Boolean) as f}
      <a
        href={chipHref(f)}
        role="tab"
        aria-selected={String(data.status).toLowerCase() === String(f).toLowerCase()}
        class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
          {(() => {
          const s = String(f).toLowerCase();
          if (data.status === f)
            return s === 'success'
              ? 'border-transparent bg-status-complete text-ink-50 shadow-sm'
              : s === 'pending'
                ? 'border-transparent bg-status-pending text-ink-50 shadow-sm'
                : s === 'error' || s === 'canceled'
                  ? 'border-transparent bg-status-canceled text-ink-50 shadow-sm'
                  : s === 'partial'
                    ? 'border-transparent bg-status-partial text-ink-50 shadow-sm'
                    : s === 'processing' || s === 'in progress'
                      ? 'border-transparent bg-status-progress text-ink-50 shadow-sm'
                      : 'border-transparent bg-ink-900 text-ink-50 shadow-sm';
          return 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700';
        })()}"
      >
        {#if f === "Pending"}
          <span
            class="h-1.5 w-1.5 rounded-full {data.status === f ? 'bg-white' : 'bg-status-pending'}"
          ></span>
        {:else if f === "Success"}
          <Icon name="check" size={11} stroke={3} />
        {:else if f === "Error" || f === "Canceled"}
          <Icon name="x" size={11} stroke={2.75} />
        {:else if f === "Partial"}
          <Icon name="alert" size={11} stroke={2.5} />
        {:else if f === "Refilling"}
          <Icon name="refresh" size={11} stroke={2.5} />
        {:else}
          <span
            class="h-1.5 w-1.5 rounded-full {data.status === f ? 'bg-white' : 'bg-status-progress'}"
          ></span>
        {/if}
        {CHIP_LABEL[f] ?? f}
      </a>
    {/each}
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
      {form.success}
    </div>
  {/if}

  {#if data.orders.length === 0}
    <EmptyState
      art="orders"
      title="Belum ada order"
      description="Order baru dari user akan muncul di sini secara real-time."
    />
  {:else}
    <!-- Desktop table — clean ledger + service icon avatar -->
    <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
      <table class="w-full min-w-[800px] text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="px-3 py-3 font-semibold">ID</th>
            <th class="px-3 py-3 font-semibold">User</th>
            <th class="px-3 py-3 font-semibold">Layanan</th>
            <th class="px-3 py-3 font-semibold text-right">Qty</th>
            <th class="px-3 py-3 font-semibold text-right">Harga</th>
            <th class="px-3 py-3 font-semibold text-right">Profit</th>
            <th class="px-3 py-3 font-semibold">Status</th>
            <th class="px-3 py-3 font-semibold">Waktu</th>
            <th class="px-3 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.orders as o, i (o.id)}
            {@const svc = serviceIcon(o.serviceName)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{300 + i * 30}ms"
            >
              <td class="px-3 py-3 font-semibold tabular-nums text-ink-900">#{o.id}</td>
              <td class="px-3 py-3 text-ink-700">{o.username ?? "—"}</td>
              <td class="max-w-xs px-3 py-3 text-ink-700">
                <div class="flex items-center gap-2">
                  <span
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm {svc.tone}"
                  >
                    <Icon name={svc.icon} size={13} stroke={2.5} />
                  </span>
                  <span class="truncate font-medium">{o.serviceName}</span>
                </div>
              </td>
              <td class="px-3 py-3 text-right tabular-nums text-ink-700">{fmt(o.quantity)}</td>
              <td class="px-3 py-3 text-right font-semibold tabular-nums text-ink-900"
                >{formatRupiah(o.price)}</td
              >
              <td class="px-3 py-3 text-right tabular-nums text-success font-semibold"
                >{formatRupiah(o.profit)}</td
              >
              <td class="px-3 py-3"><StatusBadge status={o.status} /></td>
              <td class="whitespace-nowrap px-3 py-3 text-xs text-ink-500"
                >{fmtDate(o.createdAt)}</td
              >
              <td class="px-3 py-3 text-right">
                <button
                  type="button"
                  onclick={() => openDetail(o)}
                  class="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3 text-xs font-bold text-ink-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-md active:scale-95"
                >
                  <Icon name="arrow_right" size={12} stroke={2.75} />
                  Detail
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile ledger (hairline rows, accent bar per status, data real lengkap) -->
    <ul class="lg:hidden">
      {#each data.orders as o, i (o.id)}
        {@const svc = serviceIcon(o.serviceName)}
        <li
          class="reveal relative border-b border-ink-100 py-3 last:border-b-0 transition-colors hover:bg-ink-50/40 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full {statusAccent[
            o.status?.toLowerCase()
          ] ?? 'before:bg-ink-200'}"
          style="--d:{240 + i * 30}ms"
        >
          <div class="flex items-start justify-between gap-3 pl-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm {svc.tone}"
                >
                  <Icon name={svc.icon} size={15} stroke={2.5} />
                </span>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="shrink-0 tabular-nums text-xs font-semibold text-ink-400"
                      >#{o.id}</span
                    >
                    <span class="truncate font-semibold text-ink-900">{o.serviceName}</span>
                  </div>
                  <p class="truncate text-xs text-ink-500">
                    {o.username ?? "—"} · {orderBy(o.isApi)}
                  </p>
                </div>
              </div>
              <!-- Order ladder: qty / harga / profit -->
              <dl class="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Qty</dt>
                  <dd class="tabular-nums font-bold text-ink-900">{fmt(o.quantity)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Harga</dt>
                  <dd class="tabular-nums font-bold text-ink-900">{formatRupiah(o.price)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Profit</dt>
                  <dd class="tabular-nums font-bold text-success">+{formatRupiah(o.profit)}</dd>
                </div>
              </dl>
              <div
                class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500 tabular-nums"
              >
                <span class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5">
                  <Icon name="trending_up" size={10} stroke={2.5} class="text-ink-400" />
                  start {fmt(o.startCount)}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5">
                  <Icon name="trending_down" size={10} stroke={2.5} class="text-ink-400" />
                  remains {fmt(o.remains)}
                </span>
                <span class="inline-flex items-center gap-1 text-ink-400">
                  <Icon name="clock" size={10} stroke={2} />
                  {fmtDate(o.createdAt)}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={o.status} />
            </div>
          </div>
          <div class="mt-3 flex gap-2 pl-2">
            <button
              type="button"
              onclick={() => openDetail(o)}
              class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink-900 text-xs font-bold text-ink-50 shadow-sm transition-all active:scale-95 hover:bg-ink-800"
            >
              <Icon name="arrow_right" size={12} stroke={2.75} />
              Detail & Edit
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Pagination -->
  {#if data.pages > 1}
    <nav class="flex flex-wrap items-center justify-center gap-1 pt-2" aria-label="Pagination">
      <a
        href={pageHref(Math.max(1, data.page - 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 {data.page ===
        1
          ? 'pointer-events-none text-ink-300'
          : ''}"
        aria-label="Previous page">← Prev</a
      >
      {#each pageList as p}
        {#if p === "…"}
          <span class="px-1 text-ink-400">…</span>
        {:else}
          <a
            href={pageHref(p)}
            class="inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-xs font-semibold tabular-nums transition-colors
              {p === data.page
              ? 'bg-ink-900 text-ink-50 shadow-sm'
              : 'border border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50'}"
            aria-current={p === data.page ? "page" : undefined}>{p}</a
          >
        {/if}
      {/each}
      <a
        href={pageHref(Math.min(data.pages, data.page + 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 {data.page ===
        data.pages
          ? 'pointer-events-none text-ink-300'
          : ''}"
        aria-label="Next page">Next →</a
      >
    </nav>
  {/if}
</section>

<!-- Detail / Kelola modal -->
{#if detail}
  {@const svc = serviceIcon(detail.serviceName)}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) detail = null;
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl"
    >
      <!-- Header: service icon + identity + close -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br {svc.tone}"
          >
            <Icon name={svc.icon} size={20} stroke={2.5} />
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="truncate font-display text-lg font-extrabold">Order #{detail.id}</h3>
              <StatusBadge status={detail.status} />
            </div>
            <p class="truncate text-xs text-ink-400">
              {detail.username ?? "—"} · {orderBy(detail.isApi)} · {detail.serviceName}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Tutup"
          onclick={() => (detail = null)}
        >
          <Icon name="x" size={16} stroke={2.5} />
        </button>
      </div>

      <!-- Info: 2-col grid with icon labels -->
      <div class="space-y-1.5 text-sm">
        <div
          class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-ink-50/50"
        >
          <span class="flex items-center gap-1.5 text-ink-500">
            <Icon name="link" size={12} stroke={2.5} />
            Target / Link
          </span>
          <span class="max-w-[60%] break-all text-right text-xs font-medium text-ink-700">
            {detail.link}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2 rounded-lg bg-ink-50/40 p-2.5">
          <div>
            <dt class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Qty</dt>
            <dd class="tabular-nums text-base font-extrabold text-ink-900">
              {fmt(detail.quantity)}
            </dd>
          </div>
          <div>
            <dt class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Harga</dt>
            <dd class="tabular-nums text-sm font-extrabold text-ink-900">
              {formatRupiah(detail.price)}
            </dd>
          </div>
          <div>
            <dt class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Profit</dt>
            <dd class="tabular-nums text-sm font-extrabold text-success">
              +{formatRupiah(detail.profit)}
            </dd>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 rounded-lg bg-ink-50/40 p-2.5">
          <div>
            <dt
              class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-400"
            >
              <Icon name="trending_up" size={10} stroke={2.5} />
              Start
            </dt>
            <dd class="tabular-nums text-sm font-bold text-ink-900">{fmt(detail.startCount)}</dd>
          </div>
          <div>
            <dt
              class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-400"
            >
              <Icon name="trending_down" size={10} stroke={2.5} />
              Remains
            </dt>
            <dd class="tabular-nums text-sm font-bold text-ink-900">{fmt(detail.remains)}</dd>
          </div>
        </div>
        <div
          class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-ink-50/50"
        >
          <span class="flex items-center gap-1.5 text-ink-500">
            <Icon name="zap" size={12} stroke={2.5} />
            Provider Order ID
          </span>
          <span class="rounded-md bg-ink-50 px-2 py-0.5 font-mono text-xs font-bold text-ink-700">
            {detail.providerOrderId || "—"}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-500">
            <Icon name="plus" size={11} stroke={2.5} />
            Dibuat {fmtDate(detail.createdAt)}
          </div>
          {#if detail.updatedAt}
            <div class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-500">
              <Icon name="clock" size={11} stroke={2} />
              Update {fmtDate(detail.updatedAt)}
            </div>
          {/if}
        </div>
      </div>

      <!-- Update status — via ConfirmDialog (G30) -->
      {#if UPDATABLE_FROM.includes(detail.status)}
        <hr class="border-ink-100" />
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-ink-500">
            <Icon name="refresh" size={12} stroke={2.5} class="text-primary-ink" />
            Ubah Status
          </div>
          <div class="flex flex-wrap gap-2">
            {#each STATUS_ACTIONS as st}
              <button
                type="button"
                onclick={() => (confirmStatus = st)}
                class="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all active:scale-95
                  {st === 'Success'
                  ? 'bg-status-complete text-ink-50 shadow-sm hover:opacity-90'
                  : st === 'Error'
                    ? 'bg-status-canceled text-ink-50 shadow-sm hover:opacity-90'
                    : st === 'Partial'
                      ? 'bg-status-partial text-ink-50 shadow-sm hover:opacity-90'
                      : 'bg-ink-900 text-ink-50 shadow-sm hover:bg-ink-800'}"
              >
                {#if st === "Success"}
                  <Icon name="check" size={11} stroke={3} />
                {:else if st === "Error"}
                  <Icon name="x" size={11} stroke={2.75} />
                {:else if st === "Partial"}
                  <Icon name="alert" size={11} stroke={2.5} />
                {:else}
                  <Icon name="refresh" size={11} stroke={2.5} />
                {/if}
                {st}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Edit detail provider (submit via ConfirmDialog di bawah — G30) -->
      {#if EDITABLE_STATUS.includes(detail.status)}
        <hr class="border-ink-100" />
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-ink-500">
            <Icon name="zap" size={12} stroke={2.5} class="text-accent-ink" />
            Edit Detail Provider
          </div>
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400"
            >
              <Icon name="hash" size={13} stroke={2} />
            </span>
            <input
              name="providerOrderId"
              bind:value={poid}
              placeholder="Provider Order ID"
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-9 pr-3 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="relative">
              <span
                class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400"
              >
                <Icon name="trending_up" size={12} stroke={2.5} />
              </span>
              <input
                name="startCount"
                type="number"
                bind:value={sc}
                placeholder="Start count"
                class="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-9 pr-3 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
              />
            </div>
            <div class="relative">
              <span
                class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400"
              >
                <Icon name="trending_down" size={12} stroke={2.5} />
              </span>
              <input
                name="remains"
                type="number"
                bind:value={rem}
                placeholder="Remains"
                class="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-9 pr-3 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
              />
            </div>
          </div>
          <button
            type="button"
            onclick={() => (confirmEditProv = true)}
            class="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-ink-900 text-sm font-bold text-ink-50 shadow-sm transition-all hover:bg-ink-800 active:scale-95"
          >
            <Icon name="check" size={13} stroke={2.75} />
            Simpan Detail Provider
          </button>
        </div>
      {/if}

      <!-- Refund manual (G-refund) — full atau parsial, idempotent -->
      {#if !detail.isRefund && REFUNDABLE_STATUS.includes(detail.status)}
        <hr class="border-ink-100" />
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-ink-500">
            <Icon name="arrow_down" size={12} stroke={2.5} class="text-danger" />
            Refund Manual
          </div>
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400"
            >
              <Icon name="wallet" size={13} stroke={2} />
            </span>
            <input
              type="number"
              min="0"
              bind:value={refundAmount}
              placeholder={`Nominal (kosong/0 = full ${formatRupiah(detail.price)})`}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-9 pr-3 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
            />
          </div>
          <p class="text-[11px] text-ink-400">
            Dana kembali ke saldo user, harga order dipotong, tercatat di audit log. Order yang
            sudah di-refund tidak bisa di-refund lagi.
          </p>
          <button
            type="button"
            onclick={() => (confirmRefund = true)}
            class="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-danger text-sm font-bold text-ink-50 shadow-sm transition-all hover:bg-danger/90 active:scale-95"
          >
            <Icon name="arrow_down" size={13} stroke={2.75} />
            Refund{refundAmount > 0
              ? " " + formatRupiah(Math.min(refundAmount, detail.price))
              : " Full " + formatRupiah(detail.price)}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- G30: confirm dialog ubah status order -->
{#if detail && confirmStatus}
  <ConfirmDialog
    open={true}
    danger={confirmStatus === "Error"}
    title="Ubah Status Order"
    message="Order #{detail.id} akan diubah dari {detail.status} → {confirmStatus}. Ternotifikasi ke user dan tercatat di audit log."
  >
    <form
      method="POST"
      action="?/updateStatus"
      use:enhance={() => async (input: any) => {
        const { result, update } = input;
        confirmStatus = null;
        if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
        else toast((result.data as any)?.success ?? "OK", "success");
        await update();
      }}
      class="flex gap-3"
    >
      <input type="hidden" name="id" value={detail.id} />
      <input type="hidden" name="status" value={confirmStatus} />
      <Button type="button" variant="ghost" full onclick={() => (confirmStatus = null)}
        >Batal</Button
      >
      <Button type="submit" variant={confirmStatus === "Error" ? "danger" : "primary"} full>
        Ya, Ubah
      </Button>
    </form>
  </ConfirmDialog>
{/if}

<!-- G30: confirm dialog edit detail provider -->
{#if detail && confirmEditProv}
  <ConfirmDialog
    open={true}
    title="Simpan Detail Provider"
    message="Detail provider order #{detail.id} akan di-update. Aksi tercatat di audit log."
  >
    <form
      method="POST"
      action="?/editProvider"
      use:enhance={() => async (input: any) => {
        const { result, update } = input;
        confirmEditProv = false;
        if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
        else toast((result.data as any)?.success ?? "OK", "success");
        await update();
      }}
      class="flex gap-3"
    >
      <input type="hidden" name="id" value={detail.id} />
      <input type="hidden" name="providerOrderId" value={poid} />
      <input type="hidden" name="startCount" value={sc} />
      <input type="hidden" name="remains" value={rem} />
      <Button type="button" variant="ghost" full onclick={() => (confirmEditProv = false)}
        >Batal</Button
      >
      <Button type="submit" full>Ya, Simpan</Button>
    </form>
  </ConfirmDialog>
{/if}

<!-- G30: confirm dialog refund manual -->
{#if detail && confirmRefund}
  <ConfirmDialog
    open={true}
    danger={true}
    title="Refund Order"
    message="Order #{detail.id} ({detail.status}) akan di-refund
    {refundAmount > 0
      ? formatRupiah(Math.min(refundAmount, detail.price))
      : formatRupiah(detail.price)} ke saldo user {detail.username ??
      '#' + detail.userId}. Tidak bisa dibatalkan."
  >
    <form
      method="POST"
      action="?/refund"
      use:enhance={() => async (input: any) => {
        const { result, update } = input;
        confirmRefund = false;
        refundAmount = 0;
        if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
        else toast((result.data as any)?.success ?? "OK", "success");
        await update();
      }}
      class="flex gap-3"
    >
      <input type="hidden" name="id" value={detail.id} />
      <input type="hidden" name="amount" value={refundAmount} />
      <Button type="button" variant="ghost" full onclick={() => (confirmRefund = false)}
        >Batal</Button
      >
      <Button type="submit" variant="danger" full>Ya, Refund</Button>
    </form>
  </ConfirmDialog>
{/if}

<!-- P1-01/02: ContextFab — quick action -->
<ContextFab
  primary={{ label: "Aksi Cepat", icon: "plus" }}
  lgLabel="Aksi Cepat Order"
  actions={[
    { label: "Cari order", icon: "search", href: "?q=", tone: "neutral" },
    { label: "Pending", icon: "clock", href: "?status=Pending", tone: "warning" },
    { label: "Processing", icon: "loader", href: "?status=Processing", tone: "primary" },
    { label: "Sukses", icon: "check-circle", href: "?status=Success", tone: "success" },
  ]}
/>

<style>
  /* Stagger reveal untuk stat cards + table rows + mobile cards */
  .reveal {
    animation: reveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: var(--d, 0ms);
  }
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  /* Pulse dot untuk pending/processing indicators */
  .pulse-dot {
    animation: pulse-soft 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse-soft {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.55;
      transform: scale(0.85);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reveal,
    .pulse-dot {
      animation: none;
    }
  }
</style>
