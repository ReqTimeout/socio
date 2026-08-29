<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  type SvcRow = PageData["services"][number];

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state(data.q);

  // Sync search box dengan URL saat navigasi balik
  $effect(() => {
    q = data.q;
  });

  // Inline search (debounce) — ganti submit form tiap ketik
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (data.cat) u.set("cat", data.cat);
      if (data.status) u.set("status", data.status);
      goto(`/admin/services?${u.toString()}`, { keepFocus: true, noScroll: true });
    }, 350);
  }

  // Badge warna per provider
  const provTone: Record<string, string> = {
    SMMturk: "bg-primary-50 text-primary-700",
    JAP: "bg-accent-50 text-accent-700",
    IRVAN: "bg-warning-50 text-warning-700",
    SMC: "bg-success-50 text-success-700",
    MANUAL: "bg-ink-100 text-ink-600",
  };
  const provClass = (name: string) => provTone[name] ?? "bg-ink-100 text-ink-600";

  // Provider icon + gradient (untuk avatar)
  const provIcon: Record<string, { icon: string; tone: string }> = {
    SMMturk: { icon: "zap", tone: "from-primary-500 to-violet-500" },
    JAP: { icon: "rocket", tone: "from-accent-500 to-pink-500" },
    IRVAN: { icon: "flame", tone: "from-warning to-amber-500" },
    SMC: { icon: "sparkles", tone: "from-success to-emerald-500" },
    MANUAL: { icon: "shield", tone: "from-ink-700 to-ink-500" },
  };
  const provAvatar = (name: string) =>
    provIcon[name] ?? { icon: "package", tone: "from-ink-700 to-ink-500" };

  // Status accent bar (mobile)
  const statusAccent: Record<string, string> = {
    "1": "before:bg-success",
    "0": "before:bg-ink-300",
  };

  // Modal state
  let editSvc = $state<SvcRow | null>(null);
  let viewSvc = $state<SvcRow | null>(null);
  let addSvcOpen = $state(false);
  let addCatOpen = $state(false);
  let bulkPriceOpen = $state(false);
  let bp_categoryId = $state(0);
  let bp_mode = $state<"adjust" | "set_base">("adjust");
  let bp_value = $state(0);
  let editCat = $state<{ id: number; name: string } | null>(null);
  let confirm = $state<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    label?: string;
    danger?: boolean;
  } | null>(null);
  let selected = $state<Set<number>>(new Set());

  // Form state untuk add/edit service
  let f_categoryId = $state(0);
  let f_providerId = $state(0);
  let f_providerServiceId = $state(0);
  let f_serviceName = $state("");
  let f_note = $state("");
  let f_type = $state("Default");
  let f_profit = $state(0);
  let f_min = $state(1);
  let f_max = $state(1000);
  let f_status = $state(1);

  // Markup diambil dari pricing_rules (sumber kebenaran), bukan konstanta hardcode
  const markupPct = $derived.by<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const r of data.pricingRules ?? []) m[r.level] = Number(r.markupPercent);
    return m;
  });
  const pct = (lvl: string) => markupPct[lvl] ?? 0;
  const fmt = (n: number) => n.toLocaleString("id-ID");

  function openAdd() {
    addSvcOpen = true;
    f_categoryId = data.categories[0]?.id ?? 0;
    f_providerId = data.providers[0]?.id ?? 0;
    f_providerServiceId = 0;
    f_serviceName = "";
    f_note = "";
    f_type = "Default";
    f_profit = 0;
    f_min = 1;
    f_max = 1000;
    f_status = 1;
  }
  function openEdit(s: SvcRow) {
    editSvc = s;
    f_categoryId = s.categoryId;
    f_providerId = s.providerId;
    f_providerServiceId = s.providerServiceId;
    f_serviceName = s.serviceName;
    f_note = s.note ?? "";
    f_type = s.type;
    // base (modal) price = Member price / (1 + markup% Member), pakai pricing_rules
    f_profit = Math.round(s.price / (1 + pct("Member") / 100));
    f_min = s.min;
    f_max = s.max;
    f_status = s.status;
  }
  function closeModals() {
    addSvcOpen = false;
    editSvc = null;
    viewSvc = null;
    addCatOpen = false;
    editCat = null;
  }

  function toggleSel(id: number) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    selected = s;
  }
  function toggleAll() {
    const s = new Set(selected);
    const all = data.services.length > 0 && data.services.every((x) => s.has(x.id));
    for (const x of data.services) {
      if (all) s.delete(x.id);
      else s.add(x.id);
    }
    selected = s;
  }
  const allOnPage = $derived(
    data.services.length > 0 && data.services.every((x) => selected.has(x.id)),
  );

  const hasFilter = $derived(!!(data.q || data.cat || data.status));

  function chipHref(c: number | null) {
    const u = new URLSearchParams();
    if (data.q) u.set("q", data.q);
    if (c !== null) u.set("cat", String(c));
    const qs = u.toString();
    return qs ? `/admin/services?${qs}` : "/admin/services";
  }
  function statusChipHref(s: "" | "1" | "0") {
    const u = new URLSearchParams();
    if (data.q) u.set("q", data.q);
    if (data.cat) u.set("cat", data.cat);
    if (s) u.set("status", s);
    const qs = u.toString();
    return qs ? `/admin/services?${qs}` : "/admin/services";
  }
  function pageHref(p: number) {
    const u = new URLSearchParams();
    if (data.q) u.set("q", data.q);
    if (data.cat) u.set("cat", data.cat);
    if (data.status) u.set("status", data.status);
    u.set("p", String(p));
    return `/admin/services?${u.toString()}`;
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

  // enhance callback: toast + close modals
  const onResult =
    () =>
    async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
      else {
        toast((result.data as any)?.success ?? "OK", "success");
        closeModals();
        selected = new Set();
      }
      await update();
    };
</script>

<svelte:head>
  <title>Layanan — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5 lg:space-y-6">
  <!-- Header: premium hero + KPI + add buttons -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.5)]"
        >
          <Icon name="package" size={20} stroke={2.5} />
        </span>
        Layanan
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">
        {fmt(data.total)} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-ink-700">{fmt(data.stats.total)}</span> total
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success">{fmt(data.stats.active)}</span> aktif
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-primary-600">{fmt(data.stats.categories)}</span> kategori
      </p>
    </div>
    <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <form method="GET" class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        {#if data.cat}<input type="hidden" name="cat" value={data.cat} />{/if}
        {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
        <div class="relative w-full min-w-0 flex-1 sm:w-72">
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
            placeholder="Cari nama / catatan / provider ID…"
            class="h-10 w-full rounded-full border border-ink-200 bg-surface pl-10 pr-4 text-sm shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
          />
        </div>
        {#if hasFilter}
          <a
            href="/admin/services"
            class="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 text-xs font-bold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <Icon name="x" size={12} stroke={2.5} />
            Reset
          </a>
        {/if}
      </form>
      <button
        type="button"
        onclick={openAdd}
        class="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink-900 px-4 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-md active:scale-95"
      >
        <Icon name="plus" size={14} stroke={2.75} />
        Tambah Layanan
      </button>
      <button
        type="button"
        onclick={() => (addCatOpen = true)}
        class="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3 text-sm font-bold text-ink-700 transition-all hover:border-ink-300 hover:bg-ink-50 active:scale-95"
      >
        <Icon name="grid" size={13} stroke={2.5} />
        Kategori
      </button>
      {#if data.cat}
        <button
          type="button"
          onclick={() => {
            bp_categoryId = Number(data.cat);
            bulkPriceOpen = true;
          }}
          class="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3 text-sm font-bold text-ink-700 transition-all hover:border-ink-300 hover:bg-ink-50 active:scale-95"
        >
          <Icon name="tag" size={13} stroke={2.5} />
          Harga Kategori
        </button>
      {/if}
    </div>
  </header>

  <!-- KPI strip (3 cards, semantic tone-on-tone) -->
  <div class="grid grid-cols-3 gap-2 sm:gap-3">
    <div class="reveal rounded-2xl border border-ink-100 bg-surface p-3.5 sm:p-4" style="--d:60ms">
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400 sm:text-[11px]"
      >
        <Icon name="package" size={12} stroke={2.25} />
        Total
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl">
        {fmt(data.stats.total)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-400 sm:text-[11px]">layanan terdaftar</div>
    </div>
    <div
      class="reveal rounded-2xl border border-success-soft bg-success-soft/30 p-3.5 sm:p-4"
      style="--d:120ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-success sm:text-[11px]"
      >
        <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success"></span>
        Aktif
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-success">
        {fmt(data.stats.active)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-500 sm:text-[11px]">
        {data.stats.total > 0 ? Math.round((data.stats.active / data.stats.total) * 100) : 0}% dari
        total
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-primary-500/20 bg-primary-50/40 p-3.5 sm:p-4"
      style="--d:180ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-700 sm:text-[11px]"
      >
        <Icon name="grid" size={12} stroke={2.25} />
        Kategori
      </div>
      <div
        class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl text-primary-700"
      >
        {fmt(data.stats.categories)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-500 sm:text-[11px]">grup layanan</div>
    </div>
  </div>

  <!-- Category chips -->
  <div
    class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    role="tablist"
    aria-label="Filter kategori"
  >
    <a
      href={chipHref(null)}
      class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
        {!data.cat
        ? 'border-transparent bg-ink-900 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
    >
      <Icon name="layers" size={12} stroke={2.25} />
      Semua
    </a>
    {#each data.categories as c (c.id)}
      <a
        href={chipHref(c.id)}
        class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
          {Number(data.cat) === c.id
          ? 'border-transparent bg-ink-900 text-white shadow-sm'
          : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
      >
        {c.name}
      </a>
    {/each}
  </div>

  <!-- Status chips (semantic per status, 36px tap target) -->
  <div
    class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    role="tablist"
    aria-label="Filter status"
  >
    <a
      href={statusChipHref("")}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
        {!data.status
        ? 'border-transparent bg-ink-900 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
    >
      Semua status
    </a>
    <a
      href={statusChipHref("1")}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
        {data.status === '1'
        ? 'border-transparent bg-success text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      <span class="h-1.5 w-1.5 rounded-full {data.status === '1' ? 'bg-white' : 'bg-success'}"
      ></span>
      Aktif
    </a>
    <a
      href={statusChipHref("0")}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
        {data.status === '0'
        ? 'border-transparent bg-ink-700 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      <span class="h-1.5 w-1.5 rounded-full {data.status === '0' ? 'bg-white' : 'bg-ink-400'}"
      ></span>
      Nonaktif
    </a>
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

  {#if data.services.length === 0}
    <EmptyState
      icon="🧩"
      title="Belum ada layanan"
      description={hasFilter ? "Coba ubah filter atau kata kunci." : "Tambah layanan untuk mulai."}
    />
  {:else}
    <!-- Desktop table — clean ledger, no card chrome.
         table-fixed: max-w/truncate di td TIDAK efektif di auto-layout table —
         tanpa ini kategori/layanan mengembang ke max-content (>22.000px). -->
    <div class="hidden overflow-x-auto lg:block">
      <table class="w-full table-fixed text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="w-10 p-3"
              ><input
                type="checkbox"
                checked={allOnPage}
                onchange={toggleAll}
                aria-label="Pilih semua"
              /></th
            >
            <th class="w-12 p-3 font-semibold">ID</th><th class="w-32 p-3 font-semibold"
              >Kategori</th
            ><th class="p-3 font-semibold">Layanan</th>
            <th class="w-24 p-3 text-right font-semibold">Harga (M/R/A)</th><th
              class="w-20 p-3 font-semibold">Provider</th
            >
            <th class="w-20 p-3 font-semibold">Status</th><th
              class="w-24 p-3 text-right font-semibold">Aksi</th
            >
          </tr>
        </thead>
        <tbody>
          {#each data.services as s, i (s.id)}
            {@const pav = provAvatar(s.providerName ?? "")}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{240 + i * 30}ms"
            >
              <td class="p-3"
                ><input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onchange={() => toggleSel(s.id)}
                  aria-label={`Pilih ${s.serviceName}`}
                /></td
              >
              <td class="p-3 text-xs font-semibold tabular-nums text-ink-500">#{s.id}</td>
              <td class="truncate p-3 text-ink-700">
                <span
                  class="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700"
                >
                  {s.categoryName ?? "—"}
                </span>
              </td>
              <td class="overflow-hidden p-3">
                <div class="truncate font-medium text-ink-900">{s.serviceName}</div>
                {#if s.note}
                  <div class="truncate text-xs text-ink-400">{s.note}</div>
                {/if}
              </td>
              <td class="p-3 text-right tabular-nums">
                <div class="font-bold text-ink-900">{formatRupiah(s.price)}</div>
                <div class="text-[11px] text-ink-400">
                  R {formatRupiah(s.priceReseller)} · A {formatRupiah(s.priceApi)}
                </div>
              </td>
              <td class="p-3">
                {#if s.providerName}
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold {provClass(
                      s.providerName,
                    )}"
                  >
                    <Icon name={pav.icon} size={10} stroke={2.75} />
                    {s.providerName}
                  </span>
                {:else}
                  <span class="text-xs text-ink-400">—</span>
                {/if}
              </td>
              <td class="p-3">
                {#if s.status === 1}
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
                    ><span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success"
                    ></span>Aktif</span
                  >
                {:else}
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500"
                    ><Icon name="lock" size={10} stroke={2.75} />Nonaktif</span
                  >
                {/if}
              </td>
              <td class="p-3 text-right">
                <div class="inline-flex gap-1">
                  <button
                    type="button"
                    onclick={() => (viewSvc = s)}
                    class="grid h-9 w-9 place-items-center rounded-full text-ink-500 transition-all hover:bg-ink-100 hover:text-ink-700 active:scale-95"
                    aria-label="Lihat detail {s.serviceName}"
                  >
                    <Icon name="eye" size={15} stroke={2.5} />
                  </button>
                  <button
                    type="button"
                    onclick={() => openEdit(s)}
                    class="grid h-9 w-9 place-items-center rounded-full bg-ink-900 text-white shadow-sm transition-all hover:bg-ink-800 active:scale-95"
                    aria-label="Edit {s.serviceName}"
                  >
                    <Icon name="edit" size={14} stroke={2.5} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile ledger (hairline rows, accent bar per status, provider avatar) -->
    <ul class="lg:hidden">
      {#each data.services as s, i (s.id)}
        {@const pav = provAvatar(s.providerName ?? "")}
        <li
          class="reveal relative border-b border-ink-100 py-3 last:border-b-0 transition-colors hover:bg-ink-50/40 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full {statusAccent[
            String(s.status)
          ] ?? 'before:bg-ink-200'}"
          style="--d:{240 + i * 30}ms"
        >
          <div class="flex items-start justify-between gap-3 pl-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm {pav.tone}"
                >
                  <Icon name={pav.icon} size={15} stroke={2.5} />
                </span>
                <div class="min-w-0">
                  <div class="truncate font-semibold text-ink-900">{s.serviceName}</div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                    <span class="tabular-nums text-ink-400">#{s.id}</span>
                    <span class="text-ink-300">·</span>
                    <span class="truncate">{s.categoryName ?? "Tanpa kategori"}</span>
                    {#if s.providerName}
                      <span
                        class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold {provClass(
                          s.providerName,
                        )}"
                      >
                        {s.providerName}
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
              <!-- Margin ladder: Member / Reseller / Agen -->
              <dl class="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Member</dt>
                  <dd class="tabular-nums font-bold text-ink-900">{formatRupiah(s.price)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Reseller</dt>
                  <dd class="tabular-nums font-bold text-ink-700">
                    {formatRupiah(s.priceReseller)}
                  </dd>
                </div>
                <div>
                  <dt class="text-ink-400">Agen</dt>
                  <dd class="tabular-nums font-bold text-ink-700">
                    {formatRupiah(s.priceApi)}
                  </dd>
                </div>
              </dl>
              <div
                class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500 tabular-nums"
              >
                <span class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5">
                  min {fmt(s.min)}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5">
                  max {fmt(s.max)}
                </span>
                {#if s.type && s.type !== "Default"}
                  <span
                    class="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning"
                  >
                    {s.type}
                  </span>
                {/if}
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              {#if s.status === 1}
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success"
                  ><span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success"
                  ></span>Aktif</span
                >
              {:else}
                <span class="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500"
                  >Nonaktif</span
                >
              {/if}
            </div>
          </div>
          <div class="mt-3 flex gap-2 pl-2">
            <button
              type="button"
              onclick={() => (viewSvc = s)}
              class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 bg-surface text-xs font-bold text-ink-700 transition-all hover:bg-ink-50 active:scale-95"
            >
              <Icon name="eye" size={12} stroke={2.5} />
              Lihat
            </button>
            <button
              type="button"
              onclick={() => openEdit(s)}
              class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink-900 text-xs font-bold text-white shadow-sm transition-all hover:bg-ink-800 active:scale-95"
            >
              <Icon name="edit" size={12} stroke={2.5} />
              Edit
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
          ? 'pointer-events-none opacity-50'
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
              ? 'bg-ink-900 text-white shadow-sm'
              : 'border border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50'}"
            aria-current={p === data.page ? "page" : undefined}>{p}</a
          >
        {/if}
      {/each}
      <a
        href={pageHref(Math.min(data.pages, data.page + 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 {data.page ===
        data.pages
          ? 'pointer-events-none opacity-50'
          : ''}"
        aria-label="Next page">Next →</a
      >
    </nav>
  {/if}

  <!-- Categories sub-section — hairline-top ledger, no card chrome -->
  <details class="group mt-8 border-t border-ink-200 pt-4">
    <summary
      class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-700"
    >
      <span>Kategori ({data.categories.length})</span>
      <span class="transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
    </summary>
    <div class="overflow-x-auto border-t border-ink-100">
      <table class="w-full text-sm">
        <thead
          class="border-b border-ink-100 bg-ink-50/50 text-left text-xs uppercase tracking-wide text-ink-500"
        >
          <tr>
            <th class="p-3 font-semibold">ID</th><th class="p-3 font-semibold">Nama</th>
            <th class="p-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.categories as c, i (c.id)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{i * 25}ms"
            >
              <td class="p-3 font-semibold tabular-nums text-ink-900">#{c.id}</td>
              <td class="p-3 text-ink-700">{c.name}</td>
              <td class="p-3 text-right">
                <div class="inline-flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => (editCat = { id: c.id, name: c.name })}>Edit</Button
                  >
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => {
                      const cat = { id: c.id, name: c.name };
                      const used = data.services.filter((s) => s.categoryId === cat.id).length;
                      confirm = {
                        open: true,
                        title: "Hapus Kategori?",
                        message:
                          used > 0
                            ? `Kategori "${cat.name}" tidak bisa dihapus: ${used} layanan masih pakai kategori ini.`
                            : `Kategori "${cat.name}" akan dihapus permanen.`,
                        action:
                          used > 0
                            ? async () => {}
                            : async () => {
                                const fd = new FormData();
                                fd.set("id", String(cat.id));
                                const r = await fetch("?/deleteCategory", {
                                  method: "POST",
                                  body: fd,
                                });
                                if (r.ok) {
                                  toast("Kategori dihapus", "success");
                                  location.reload();
                                } else {
                                  toast("Gagal menghapus", "error");
                                }
                              },
                      };
                    }}>Hapus</Button
                  >
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</section>

<!-- Bulk action bar -->
{#if selected.size > 0}
  <div
    class="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-2 border-t border-ink-100 bg-surface/95 p-3 shadow-2xl backdrop-blur lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-auto lg:-translate-x-1/2 lg:rounded-2xl lg:border lg:px-4 lg:py-2.5"
  >
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-bold text-white"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-accent-500"></span>
      {selected.size} dipilih
    </span>
    <button
      type="button"
      onclick={() => {
        confirm = {
          open: true,
          title: `Hapus ${selected.size} layanan?`,
          message: "Tindakan ini tidak bisa dibatalkan.",
          action: async () => {
            const ids = [...selected];
            const fd = new FormData();
            for (const id of ids) fd.append("id", String(id));
            const r = await fetch("?/bulkDelete", { method: "POST", body: fd });
            if (r.ok) {
              toast(`${ids.length} layanan dihapus`, "success");
              location.reload();
            } else {
              toast("Gagal menghapus", "error");
            }
          },
        };
      }}
      class="inline-flex h-9 items-center gap-1.5 rounded-full bg-danger px-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-danger/90"
    >
      <Icon name="trash" size={12} stroke={2.5} />
      Hapus
    </button>
    <button
      type="button"
      onclick={() => (selected = new Set())}
      class="inline-flex h-9 items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 text-xs font-bold text-ink-600 transition-colors hover:bg-ink-50"
    >
      Batal
    </button>
  </div>
{/if}

<!-- Add Service modal -->
{#if addSvcOpen}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) addSvcOpen = false;
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span
            class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-success to-emerald-500 text-white shadow-md"
          >
            <Icon name="plus" size={18} stroke={2.75} />
          </span>
          <div>
            <h3 class="font-display text-lg font-extrabold">Tambah Layanan</h3>
            <p class="text-xs text-ink-500">Harga jual dihitung otomatis dari pricing rules.</p>
          </div>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Tutup"
          onclick={() => (addSvcOpen = false)}
        >
          <Icon name="x" size={16} stroke={2.5} />
        </button>
      </div>
      <form method="POST" action="?/addService" use:enhance={onResult} class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-name"
            >Nama Layanan</label
          >
          <input
            id="add-name"
            name="serviceName"
            bind:value={f_serviceName}
            required
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-cat"
              >Kategori</label
            >
            <select
              id="add-cat"
              name="categoryId"
              bind:value={f_categoryId}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              <option value={0} disabled>Pilih…</option>
              {#each data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-prov"
              >Provider</label
            >
            <select
              id="add-prov"
              name="providerId"
              bind:value={f_providerId}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              <option value={0} disabled>Pilih…</option>
              {#each data.providers as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-psi"
              >Provider Service ID</label
            >
            <input
              id="add-psi"
              name="providerServiceId"
              type="number"
              bind:value={f_providerServiceId}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-type">Tipe</label>
            <select
              id="add-type"
              name="type"
              bind:value={f_type}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              <option value="Default">Default</option>
              <option value="Custom Comments">Custom Comments</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-base"
              >Base Price (Rp)</label
            >
            <input
              id="add-base"
              name="profit"
              type="number"
              bind:value={f_profit}
              required
              min="1"
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
            <p class="mt-1 text-[11px] text-ink-400">
              Harga jual: {formatRupiah(f_profit * (1 + pct("Member") / 100))} Member · {formatRupiah(
                f_profit * (1 + pct("Reseller") / 100),
              )} Reseller · {formatRupiah(f_profit * (1 + pct("Agen") / 100))} Agen
            </p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-min">Min</label>
            <input
              id="add-min"
              name="min"
              type="number"
              bind:value={f_min}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-max">Max</label>
            <input
              id="add-max"
              name="max"
              type="number"
              bind:value={f_max}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-note"
            >Catatan (opsional)</label
          >
          <textarea
            id="add-note"
            name="note"
            bind:value={f_note}
            rows="2"
            class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm"
          ></textarea>
        </div>
        <div class="flex gap-2">
          <Button type="button" size="md" variant="ghost" full onclick={() => (addSvcOpen = false)}
            >Batal</Button
          >
          <Button type="submit" size="md" full>Tambah</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit Service modal -->
{#if editSvc}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) editSvc = null;
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span
            class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md"
          >
            <Icon name="edit" size={17} stroke={2.5} />
          </span>
          <div>
            <h3 class="font-display text-lg font-extrabold">Edit Layanan #{editSvc.id}</h3>
            <p class="truncate text-xs text-ink-500">{editSvc.serviceName}</p>
          </div>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Tutup"
          onclick={() => (editSvc = null)}
        >
          <Icon name="x" size={16} stroke={2.5} />
        </button>
      </div>
      <form method="POST" action="?/editService" use:enhance={onResult} class="space-y-3">
        <input type="hidden" name="id" value={editSvc.id} />
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-name"
            >Nama Layanan</label
          >
          <input
            id="edit-name"
            name="serviceName"
            bind:value={f_serviceName}
            required
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-cat"
              >Kategori</label
            >
            <select
              id="edit-cat"
              name="categoryId"
              bind:value={f_categoryId}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              {#each data.categories as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-prov"
              >Provider</label
            >
            <select
              id="edit-prov"
              name="providerId"
              bind:value={f_providerId}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              {#each data.providers as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-psi"
              >Provider Service ID</label
            >
            <input
              id="edit-psi"
              name="providerServiceId"
              type="number"
              bind:value={f_providerServiceId}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-type">Tipe</label
            >
            <select
              id="edit-type"
              name="type"
              bind:value={f_type}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              <option value="Default">Default</option>
              <option value="Custom Comments">Custom Comments</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-base"
              >Base Price (Rp)</label
            >
            <input
              id="edit-base"
              name="profit"
              type="number"
              bind:value={f_profit}
              required
              min="1"
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
            <p class="mt-1 text-[11px] text-ink-400">
              Harga jual: {formatRupiah(f_profit * (1 + pct("Member") / 100))} Member · {formatRupiah(
                f_profit * (1 + pct("Reseller") / 100),
              )} Reseller · {formatRupiah(f_profit * (1 + pct("Agen") / 100))} Agen
            </p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-min">Min</label>
            <input
              id="edit-min"
              name="min"
              type="number"
              bind:value={f_min}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-max">Max</label>
            <input
              id="edit-max"
              name="max"
              type="number"
              bind:value={f_max}
              required
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-status"
              >Status</label
            >
            <select
              id="edit-status"
              name="status"
              bind:value={f_status}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
            >
              <option value={1}>Aktif</option>
              <option value={0}>Nonaktif</option>
            </select>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-note"
            >Catatan</label
          >
          <textarea
            id="edit-note"
            name="note"
            bind:value={f_note}
            rows="2"
            class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm"
          ></textarea>
        </div>
        <div class="flex gap-2">
          <Button type="button" size="md" variant="ghost" full onclick={() => (editSvc = null)}
            >Batal</Button
          >
          <Button
            size="md"
            variant="danger"
            onclick={() => {
              const id = editSvc!.id;
              const name = editSvc!.serviceName;
              editSvc = null;
              confirm = {
                open: true,
                title: "Hapus Layanan?",
                message: `Layanan "${name}" akan dihapus permanen.`,
                action: async () => {
                  const fd = new FormData();
                  fd.set("id", String(id));
                  const r = await fetch("?/deleteService", { method: "POST", body: fd });
                  if (r.ok) {
                    toast("Layanan dihapus", "success");
                    location.reload();
                  } else {
                    toast("Gagal menghapus", "error");
                  }
                },
              };
            }}>Hapus</Button
          >
          <Button type="submit" size="md" full>Simpan</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- View Service modal -->
{#if viewSvc}
  {@const vpav = provAvatar(viewSvc.providerName ?? "")}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) viewSvc = null;
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br {vpav.tone}"
          >
            <Icon name={vpav.icon} size={17} stroke={2.5} />
          </span>
          <div class="min-w-0">
            <h3 class="truncate font-display text-lg font-extrabold">{viewSvc.serviceName}</h3>
            <p class="truncate text-xs text-ink-500">
              #{viewSvc.id} · {viewSvc.categoryName ?? "—"} · {viewSvc.providerName ?? "—"}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Tutup"
          onclick={() => (viewSvc = null)}
        >
          <Icon name="x" size={16} stroke={2.5} />
        </button>
      </div>
      <dl class="space-y-1.5 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Tipe</dt>
          <dd class="font-medium">{viewSvc.type}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Provider Service ID</dt>
          <dd class="tabular-nums">{viewSvc.providerServiceId}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Min / Max</dt>
          <dd class="tabular-nums">{fmt(viewSvc.min)} / {fmt(viewSvc.max)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Status</dt>
          <dd>
            {#if viewSvc.status === 1}
              <span
                class="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
                >Aktif</span
              >
            {:else}
              <span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500"
                >Nonaktif</span
              >
            {/if}
          </dd>
        </div>
        <hr class="border-ink-100" />
        <div class="text-xs font-semibold text-ink-500">Harga per 1.000</div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-xl bg-primary-50 px-2 py-2">
            <div class="text-[10px] font-semibold uppercase text-ink-500">Member</div>
            <div class="text-sm font-bold tabular-nums text-primary-700">
              {formatRupiah(viewSvc.price)}
            </div>
          </div>
          <div class="rounded-xl bg-accent-50 px-2 py-2">
            <div class="text-[10px] font-semibold uppercase text-ink-500">Reseller</div>
            <div class="text-sm font-bold tabular-nums text-accent-700">
              {formatRupiah(viewSvc.priceReseller)}
            </div>
          </div>
          <div class="rounded-xl bg-warning-50 px-2 py-2">
            <div class="text-[10px] font-semibold uppercase text-ink-500">Agen</div>
            <div class="text-sm font-bold tabular-nums text-warning-700">
              {formatRupiah(viewSvc.priceApi)}
            </div>
          </div>
        </div>
        {#if viewSvc.note}
          <div class="rounded-xl bg-ink-50 p-2 text-xs text-ink-600">{viewSvc.note}</div>
        {/if}
      </dl>
      <div class="flex gap-2">
        <Button size="md" variant="ghost" full onclick={() => (viewSvc = null)}>Tutup</Button>
        <Button
          size="md"
          full
          onclick={() => {
            const v = viewSvc;
            viewSvc = null;
            openEdit(v!);
          }}>Edit</Button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Bulk price per kategori modal -->
{#if bulkPriceOpen}
  {@const bpCat = data.categories.find((c) => c.id === bp_categoryId) ?? null}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) bulkPriceOpen = false;
    }}
  >
    <div class="w-full max-w-sm space-y-3 rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
      <div class="flex items-center gap-2.5">
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-warning to-amber-500 text-white shadow-md"
        >
          <Icon name="tag" size={18} stroke={2.5} />
        </span>
        <div class="min-w-0">
          <h3 class="font-display text-lg font-extrabold">Harga Kategori</h3>
          <p class="truncate text-xs text-ink-500">{bpCat?.name ?? "Semua layanan"}</p>
        </div>
      </div>
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="bp-mode">Mode</label>
          <select
            id="bp-mode"
            bind:value={bp_mode}
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          >
            <option value="adjust">Geser modal (%)</option>
            <option value="set_base">Set modal baru (Rp/1k)</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="bp-value">
            {bp_mode === "adjust" ? "Persentase (−100 s/d +1000)" : "Modal per 1.000 (Rp)"}
          </label>
          <input
            id="bp-value"
            type="number"
            step={bp_mode === "adjust" ? "1" : "any"}
            bind:value={bp_value}
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm tabular-nums"
          />
          <p class="mt-1 text-[11px] text-ink-400">
            {bp_mode === "adjust"
              ? "Contoh: 10 = naikkan modal 10% · −10 = turunkan 10%. Harga jual per level dihitung ulang dari pricing rules."
              : "Semua layanan di kategori ini dapat modal baru — harga lama ditimpa."}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            type="button"
            size="md"
            variant="ghost"
            full
            onclick={() => (bulkPriceOpen = false)}>Batal</Button
          >
          <Button
            type="button"
            size="md"
            variant="danger"
            full
            disabled={!Number.isFinite(bp_value) ||
              (bp_mode === "set_base" ? bp_value <= 0 : bp_value === 0)}
            onclick={() => {
              const catName = bpCat?.name ?? "";
              const val = bp_value;
              const isSet = bp_mode === "set_base";
              if ((isSet && val <= 0) || (!isSet && (val <= -100 || val > 1000 || val === 0)))
                return;
              confirm = {
                open: true,
                title: `Update harga kategori "${catName}"?`,
                message: isSet
                  ? `Modal semua layanan kategori ini akan di-set ke ${val.toLocaleString("id-ID")}/1k.`
                  : `Modal semua layanan kategori ini akan digeser ${val > 0 ? "+" : ""}${val}%.`,
                label: "Ya, Update Harga",
                danger: true,
                action: async () => {
                  const fd = new FormData();
                  fd.append("categoryId", String(bp_categoryId));
                  fd.append("mode", bp_mode);
                  fd.append("value", String(val));
                  const r = await fetch("?/bulkCategoryPrice", { method: "POST", body: fd });
                  const j = (await r.json().catch(() => null)) as any;
                  if (j?.type === "success") {
                    toast(j.data?.success ?? `${catName} diupdate`, "success");
                    bulkPriceOpen = false;
                    location.reload();
                  } else {
                    toast(j?.data?.error ?? "Gagal update harga kategori", "error");
                  }
                },
              };
            }}
          >
            {bp_mode === "adjust" ? "Geser" : "Set"} Harga
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Add Category modal -->
{#if addCatOpen}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) addCatOpen = false;
    }}
  >
    <div class="w-full max-w-sm space-y-3 rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
      <div class="flex items-center gap-2.5">
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-md"
        >
          <Icon name="grid" size={18} stroke={2.5} />
        </span>
        <h3 class="font-display text-lg font-extrabold">Tambah Kategori</h3>
      </div>
      <form method="POST" action="?/addCategory" use:enhance={onResult} class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-catname">Nama</label
          >
          <input
            id="add-catname"
            name="name"
            required
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          />
        </div>
        <div class="flex gap-2">
          <Button type="button" size="md" variant="ghost" full onclick={() => (addCatOpen = false)}
            >Batal</Button
          >
          <Button type="submit" size="md" full>Tambah</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit Category modal -->
{#if editCat}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) editCat = null;
    }}
  >
    <div class="w-full max-w-sm space-y-3 rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
      <div class="flex items-center gap-2.5">
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-warning to-amber-500 text-white shadow-md"
        >
          <Icon name="grid" size={18} stroke={2.5} />
        </span>
        <h3 class="font-display text-lg font-extrabold">Edit Kategori #{editCat.id}</h3>
      </div>
      <form method="POST" action="?/editCategory" use:enhance={onResult} class="space-y-3">
        <input type="hidden" name="id" value={editCat.id} />
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-catname"
            >Nama</label
          >
          <input
            id="edit-catname"
            name="name"
            bind:value={editCat.name}
            required
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          />
        </div>
        <div class="flex gap-2">
          <Button type="button" size="md" variant="ghost" full onclick={() => (editCat = null)}
            >Batal</Button
          >
          <Button type="submit" size="md" full>Simpan</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Confirm dialog unified -->
{#if confirm}
  <ConfirmDialog
    bind:open={confirm.open}
    title={confirm.title}
    message={confirm.message}
    confirmLabel={confirm.label ?? "Hapus"}
    danger={confirm.danger ?? true}
    onConfirm={confirm.action}
  />
{/if}

<style>
  /* Stagger reveal untuk stat cards + table rows + mobile cards + categories */
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
    .pulse-dot {
      animation: none;
    }
  }
  /* Domain-specific: status pulse untuk layanan aktif */
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
      transform: scale(1.35);
    }
  }
</style>
