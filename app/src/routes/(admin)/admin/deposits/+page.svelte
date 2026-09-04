<script lang="ts">
  import {
    Button,
    ConfirmDialog,
    ContextFab,
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

  type Status = "Pending" | "Success" | "Canceled";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state("");

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (data.status) u.set("status", data.status);
      goto(`/admin/deposits?${u.toString()}`, { keepFocus: true, noScroll: true });
    }, 350);
  }
  $effect(() => {
    q = data.q;
  });
  let confirmId = $state<number | null>(null);
  let rejectId = $state<number | null>(null);
  let modalOpen = $state(false);
  let rejectOpen = $state(false);

  const confirmDep = $derived(data.deposits.find((d) => d.id === confirmId) ?? null);
  const rejectDep = $derived(data.deposits.find((d) => d.id === rejectId) ?? null);

  const STATUS_FILTERS: { key: Status | ""; label: string; icon: string }[] = [
    { key: "", label: "Semua", icon: "layers" },
    { key: "Pending", label: "Pending", icon: "clock" },
    { key: "Success", label: "Selesai", icon: "check" },
    { key: "Canceled", label: "Batal", icon: "x" },
  ];

  function timeAgo(d: Date | string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Payment method icon detection — kasih konteks visual untuk tiap metode
  function methodIcon(name: string): { icon: string; tone: string } {
    const n = String(name ?? "").toLowerCase();
    if (n.includes("bca")) return { icon: "banknote", tone: "from-blue-500 to-blue-600" };
    if (n.includes("bri") || n.includes("mandiri") || n.includes("bni"))
      return { icon: "banknote", tone: "from-orange-500 to-red-500" };
    if (n.includes("dana") || n.includes("ovo") || n.includes("gopay"))
      return { icon: "wallet", tone: "from-violet-500 to-purple-600" };
    if (n.includes("qris")) return { icon: "grid", tone: "from-ink-900 to-ink-700" };
    if (n.includes("tripay")) return { icon: "credit_card", tone: "from-emerald-500 to-green-600" };
    return { icon: "banknote", tone: "from-ink-700 to-ink-500" };
  }

  // Status tone untuk accent bar mobile
  const statusAccent: Record<string, string> = {
    pending: "before:bg-status-pending",
    success: "before:bg-status-complete",
    canceled: "before:bg-status-canceled",
  };

  function chipHref(s: Status | "") {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (s) params.set("status", s);
    const qs = params.toString();
    return qs ? `/admin/deposits?${qs}` : "/admin/deposits";
  }

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (data.status) params.set("status", data.status);
    params.set("p", String(p));
    return `/admin/deposits?${params.toString()}`;
  }

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
  <title>Deposit — Admin Socio.id</title>
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
          <Icon name="wallet" size={20} stroke={2.5} />
        </span>
        Deposits
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">
        {data.total.toLocaleString("id-ID")} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        Top-up saldo user via transfer bank / e-wallet / QRIS.
      </p>
    </div>
    <form
      method="GET"
      action="/admin/deposits"
      class="flex w-full flex-wrap items-center gap-2 sm:w-auto"
    >
      {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
      <div class="relative w-full min-w-0 flex-1 sm:w-80">
        <span
          class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-400"
        >
          <Icon name="search" size={15} stroke={2} />
        </span>
        <input
          type="search"
          name="q"
          bind:value={q}
          oninput={onSearch}
          placeholder="Cari ID / username / metode…"
          class="h-10 w-full rounded-full border border-ink-200 bg-surface pl-10 pr-4 text-sm shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
        />
      </div>
      {#if data.q || data.status}
        <a
          href="/admin/deposits"
          class="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 text-xs font-bold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
        >
          <Icon name="x" size={12} stroke={2.5} />
          Reset
        </a>
      {/if}
    </form>
  </header>

  <!-- KPI strip (3 cards, semantic tone-on-tone + total value) -->
  <div class="grid grid-cols-3 gap-2 sm:gap-3">
    <div
      class="reveal rounded-2xl border border-warning/20 bg-warning-soft/30 p-3.5 sm:p-4"
      style="--d:60ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-warning sm:text-[11px]"
      >
        <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-warning"></span>
        Pending
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-warning">
        {data.stats.Pending.count.toLocaleString("id-ID")}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        Locked {formatRupiah(data.stats.Pending.total)}
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-success-soft bg-success-soft/30 p-3.5 sm:p-4"
      style="--d:120ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-success sm:text-[11px]"
      >
        <Icon name="check" size={12} stroke={2.75} />
        Sukses
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-success">
        {data.stats.Success.count.toLocaleString("id-ID")}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        Masuk {formatRupiah(data.stats.Success.total)}
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-danger-soft bg-danger-soft/30 p-3.5 sm:p-4"
      style="--d:180ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-danger sm:text-[11px]"
      >
        <Icon name="x" size={12} stroke={2.75} />
        Batal
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-danger">
        {data.stats.Canceled.count.toLocaleString("id-ID")}
      </div>
      <div class="mt-0.5 truncate text-[10px] text-ink-500 sm:text-[11px]">
        Tolak {formatRupiah(data.stats.Canceled.total)}
      </div>
    </div>
  </div>
  <p class="-mt-0.5 text-[10px] text-ink-400 sm:text-[11px]">
    Statistik & daftar mengexclude akun Admin (order/deposit internal admin tidak dihitung). Total
    Batal mengexclude deposit legacy >Rp100jt (anomali #1456).
  </p>

  {#if form?.error}
    <div
      class="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger"
    >
      <Icon name="alert" size={14} stroke={2.5} />
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div
      class="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success"
    >
      <Icon name="check" size={14} stroke={2.75} />
      {form.success}
    </div>
  {/if}

  <!-- Status filter chips (semantic per status, 36px tap target) -->
  <div
    class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    role="tablist"
    aria-label="Filter status deposit"
  >
    {#each STATUS_FILTERS as f (f.key)}
      {@const active = (data.status || "") === f.key}
      <a
        href={chipHref(f.key as Status | "")}
        role="tab"
        aria-selected={active}
        class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
          {active
          ? f.key === 'Pending'
            ? 'border-transparent bg-status-pending text-ink-50 shadow-sm'
            : f.key === 'Success'
              ? 'border-transparent bg-status-complete text-ink-50 shadow-sm'
              : f.key === 'Canceled'
                ? 'border-transparent bg-status-canceled text-ink-50 shadow-sm'
                : 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
          : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
      >
        <Icon name={f.icon} size={11} stroke={2.5} />
        {f.label}
      </a>
    {/each}
  </div>

  {#if data.deposits.length === 0}
    <EmptyState
      art="deposits"
      title="Belum ada deposit"
      description={data.q || data.status
        ? "Coba ubah filter atau kata kunci."
        : "Deposit user akan muncul di sini setelah top-up."}
    />
  {:else}
    <!-- Desktop table — clean ledger + method icon avatar -->
    <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
      <table class="w-full min-w-[800px] text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="px-3 py-3 font-semibold">ID</th>
            <th class="px-3 py-3 font-semibold">User</th>
            <th class="px-3 py-3 font-semibold">Metode</th>
            <th class="px-3 py-3 font-semibold text-right">Jumlah</th>
            <th class="px-3 py-3 font-semibold">Bukti</th>
            <th class="px-3 py-3 font-semibold">Status</th>
            <th class="px-3 py-3 font-semibold">Waktu</th>
            <th class="px-3 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.deposits as d, i (d.id)}
            {@const m = methodIcon(d.methodName)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{240 + i * 30}ms"
            >
              <td class="px-3 py-3 font-semibold tabular-nums text-ink-900">#{d.id}</td>
              <td class="px-3 py-3">
                <div class="flex flex-col">
                  <span class="font-medium text-ink-900">{d.username ?? "—"}</span>
                  <span class="text-xs text-ink-400">User ID {d.userId}</span>
                </div>
              </td>
              <td class="px-3 py-3 text-ink-700">
                <div class="flex min-w-0 items-center gap-2">
                  <span
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm {m.tone}"
                  >
                    <Icon name={m.icon} size={13} stroke={2.5} />
                  </span>
                  <span class="truncate font-medium" title={d.methodName}>{d.methodName}</span>
                  {#if d.untukApa === "reseller"}
                    <span
                      class="inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-ink"
                    >
                      <Icon name="crown" size={9} stroke={2.75} />
                      Reseller
                    </span>
                  {/if}
                </div>
              </td>
              <td class="px-3 py-3 text-right font-semibold tabular-nums text-ink-900">
                {formatRupiah(d.amount)}
              </td>
              <td class="px-3 py-3">
                {#if d.img}
                  <a
                    href={d.img}
                    target="_blank"
                    rel="noreferrer"
                    title="Lihat bukti transfer"
                    class="group inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface p-1 pr-2.5 transition-all hover:border-primary-300 hover:bg-primary-50"
                  >
                    <img
                      src={d.img}
                      alt="Bukti"
                      class="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-ink-100 transition-transform group-hover:scale-105"
                      onerror={(e) =>
                        ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                    <span class="text-[10px] font-bold text-primary-ink">Bukti</span>
                    <Icon name="external" size={10} stroke={2.5} class="text-primary-ink" />
                  </a>
                {:else}
                  <span
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-danger"
                  >
                    <Icon name="alert" size={11} stroke={2.5} />
                    Belum
                  </span>
                {/if}
              </td>
              <td class="px-3 py-3">
                <StatusBadge status={d.status} />
              </td>
              <td class="whitespace-nowrap px-3 py-3 text-xs text-ink-500">
                {timeAgo(d.createdAt)}
              </td>
              <td class="px-3 py-3 text-right">
                {#if d.status === "Pending"}
                  <div class="inline-flex gap-1.5">
                    <button
                      type="button"
                      onclick={() => {
                        confirmId = d.id;
                        modalOpen = true;
                      }}
                      class="inline-flex h-9 items-center gap-1.5 rounded-full bg-success px-3 text-xs font-bold text-ink-50 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-success/90 hover:shadow-md active:scale-95"
                    >
                      <Icon name="check" size={12} stroke={2.75} />
                      Confirm
                    </button>
                    <button
                      type="button"
                      onclick={() => {
                        rejectId = d.id;
                        rejectOpen = true;
                      }}
                      class="inline-flex h-9 items-center gap-1 rounded-full border border-danger-soft bg-danger-soft/50 px-3 text-xs font-bold text-danger transition-all hover:bg-danger hover:text-ink-50 active:scale-95"
                    >
                      <Icon name="x" size={12} stroke={2.75} />
                      Tolak
                    </button>
                  </div>
                {:else}
                  <span class="inline-flex items-center gap-1 text-xs text-ink-400">
                    <Icon name="lock" size={11} stroke={2.5} />
                    Final
                  </span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile ledger (hairline rows, accent bar, premium action buttons) -->
    <ul class="lg:hidden">
      {#each data.deposits as d, i (d.id)}
        {@const m = methodIcon(d.methodName)}
        <li
          class="reveal relative border-b border-ink-100 py-3 pl-2 last:border-b-0 transition-colors hover:bg-ink-50/40 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full {statusAccent[
            d.status?.toLowerCase()
          ] ?? 'before:bg-ink-200'}"
          style="--d:{240 + i * 30}ms"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm {m.tone}"
                >
                  <Icon name={m.icon} size={15} stroke={2.5} />
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="shrink-0 tabular-nums text-xs text-ink-400">#{d.id}</span>
                    <span class="truncate font-semibold text-ink-900">{d.username ?? "—"}</span>
                  </div>
                  <p class="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
                    {d.methodName} · ID {d.userId}
                    {#if d.untukApa === "reseller"}
                      <span
                        class="inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary-ink"
                      >
                        <Icon name="crown" size={9} stroke={2.75} />
                        Reseller
                      </span>
                    {/if}
                  </p>
                </div>
              </div>
              <!-- Amount + waktu + bukti + status -->
              <dl class="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Jumlah</dt>
                  <dd class="tabular-nums font-bold text-ink-900">{formatRupiah(d.amount)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Waktu</dt>
                  <dd class="text-ink-700">{timeAgo(d.createdAt)}</dd>
                </div>
              </dl>
              <div class="mt-1.5 flex items-center gap-2">
                {#if d.img}
                  <a
                    href={d.img}
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-2 py-1 transition-colors hover:border-primary-300 hover:bg-primary-50"
                  >
                    <img
                      src={d.img}
                      alt="Bukti"
                      class="h-5 w-5 rounded object-cover"
                      onerror={(e) =>
                        ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                    <span class="text-[10px] font-bold text-primary-ink">Bukti</span>
                    <Icon name="external" size={9} stroke={2.5} class="text-primary-ink" />
                  </a>
                {/if}
                <StatusBadge status={d.status} />
              </div>
            </div>
          </div>
          {#if d.status === "Pending"}
            <div class="mt-3 flex gap-2">
              <button
                type="button"
                onclick={() => {
                  confirmId = d.id;
                  modalOpen = true;
                }}
                class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-success px-3 text-xs font-bold text-ink-50 shadow-sm transition-all active:scale-95 hover:bg-success/90"
              >
                <Icon name="check" size={12} stroke={2.75} />
                Confirm
              </button>
              <button
                type="button"
                onclick={() => {
                  rejectId = d.id;
                  rejectOpen = true;
                }}
                class="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-full border border-danger-soft bg-danger-soft/50 px-3 text-xs font-bold text-danger transition-all active:scale-95 hover:bg-danger hover:text-ink-50"
              >
                <Icon name="x" size={12} stroke={2.75} />
                Tolak
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Pagination -->
  {#if data.pages > 1}
    <nav class="flex items-center justify-center gap-1 pt-2" aria-label="Pagination">
      <a
        href={pageHref(Math.max(1, data.page - 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:pointer-events-none disabled:opacity-50"
        class:pointer-events-none={data.page === 1}
        class:text-ink-400={data.page === 1}
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
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:pointer-events-none disabled:opacity-50"
        class:pointer-events-none={data.page === data.pages}
        class:text-ink-400={data.page === data.pages}
        aria-label="Next page">Next →</a
      >
    </nav>
  {/if}
</section>

<ConfirmDialog
  bind:open={modalOpen}
  title="Konfirmasi Deposit"
  message={confirmDep?.untukApa === "reseller"
    ? "Deposit aktivasi reseller Rp50.000 (saldo Rp20.000 sudah termasuk) — akun aktif + kredit saldo otomatis."
    : "Pastikan bukti transfer cocok dengan nominal. Saldo akan ditambah."}
>
  <!-- Ringkasan deposit yang dikonfirmasi (cek bukti DULU) -->
  {#if confirmDep}
    <div class="mb-3 space-y-2 rounded-xl bg-ink-50/70 p-3 text-xs">
      <div class="flex items-center justify-between gap-2">
        <span class="text-ink-500">User</span>
        <span class="font-semibold text-ink-900"
          >{confirmDep.username ?? "—"} #{confirmDep.userId}</span
        >
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-ink-500">Kredit saldo</span>
        <span class="tabular-nums text-base font-extrabold text-success"
          >{formatRupiah(confirmDep.amount)}</span
        >
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-ink-500">Ditransfer (+kode unik)</span>
        <span class="tabular-nums text-ink-700">{formatRupiah(confirmDep.postAmount)}</span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-ink-500">Bukti transfer</span>
        {#if confirmDep.img}
          <a
            href={confirmDep.img}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-surface p-1 pr-2.5 transition-colors hover:border-primary-300 hover:bg-primary-50"
          >
            <img
              src={confirmDep.img}
              alt="Bukti"
              class="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-ink-100"
              onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
            <span class="text-[10px] font-bold text-primary-ink">Lihat ↗</span>
          </a>
        {:else}
          <span class="inline-flex items-center gap-1 font-bold text-danger">
            <Icon name="alert" size={11} stroke={2.5} />
            Belum upload bukti!
          </span>
        {/if}
      </div>
    </div>
  {/if}
  <form
    method="POST"
    action="?/confirm"
    use:enhance={() => async (input: any) => {
      if (input.result.type === "failure")
        toast((input.result.data as any)?.error ?? "Gagal", "error");
      else toast((input.result.data as any)?.success ?? "OK", "success");
      modalOpen = false;
      await input.update();
    }}
  >
    <input type="hidden" name="id" value={confirmId ?? 0} />
    <div class="flex gap-2">
      <Button type="submit" class="flex-1">Ya, Konfirmasi</Button>
      <Button type="button" variant="ghost" onclick={() => (modalOpen = false)}>Batal</Button>
    </div>
  </form>
</ConfirmDialog>

<ConfirmDialog
  bind:open={rejectOpen}
  title="Tolak Deposit"
  message={rejectDep
    ? `Deposit #${rejectDep.id} (${rejectDep.username ?? ""}) akan dibatalkan. User TIDAK dapat saldo.`
    : "Deposit akan ditandai Batal."}
>
  {#if rejectDep}
    <div
      class="mb-3 flex items-center justify-between gap-2 rounded-xl bg-danger-soft/50 p-3 text-xs"
    >
      <span class="text-ink-500">Deposit</span>
      <span class="font-semibold text-ink-900">#{rejectDep.id} · {rejectDep.username ?? "—"}</span>
    </div>
  {/if}
  <form
    method="POST"
    action="?/reject"
    use:enhance={() => async (input: any) => {
      if (input.result.type === "failure")
        toast((input.result.data as any)?.error ?? "Gagal", "error");
      else toast((input.result.data as any)?.success ?? "OK", "success");
      rejectOpen = false;
      await input.update();
    }}
  >
    <input type="hidden" name="id" value={rejectId ?? 0} />
    <div class="flex gap-2">
      <Button type="submit" variant="danger" class="flex-1">Ya, Tolak</Button>
      <Button type="button" variant="ghost" onclick={() => (rejectOpen = false)}>Batal</Button>
    </div>
  </form>
</ConfirmDialog>

<!-- P1-01/02: ContextFab — quick action -->
<ContextFab
  primary={{ label: "Aksi Cepat", icon: "plus" }}
  lgLabel="Aksi Cepat Deposit"
  actions={[
    { label: "Cari deposit", icon: "search", href: "?q=", tone: "neutral" },
    { label: "Pending", icon: "clock", href: "?status=Pending", tone: "warning" },
    { label: "Sukses", icon: "check", href: "?status=Success", tone: "success" },
    { label: "Batal", icon: "x-circle", href: "?status=Batal", tone: "danger" },
  ]}
/>

<style>
  /* Reveal animation — transform + opacity only (GPU-friendly) */
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
  @media (prefers-reduced-motion: reduce) {
    .reveal {
      animation: none;
    }
  }
</style>
