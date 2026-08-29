<script lang="ts">
  import { Button, StatusBadge, EmptyState, ConfirmDialog, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  type OrderRow = PageData["orders"][number];

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state(data.q);

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

<section class="space-y-6">
  <!-- Header: inline narrative (zero card chrome, no stat strip) -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Orders
      </h1>
      <p class="mt-1 text-sm text-ink-500">
        {fmt(data.total)} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success">{fmt(data.stats.success.count)}</span> selesai
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-warning">{fmt(data.stats.pending.count)}</span> pending
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-primary-600">{fmt(data.stats.processing.count)}</span>
        proses
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-danger">{fmt(data.stats.error.count)}</span> error/batal
      </p>
    </div>
    <form method="GET" class="flex flex-wrap items-center gap-2">
      {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
      <div class="relative flex-1 min-w-0 sm:max-w-md">
        <input
          name="q"
          bind:value={q}
          oninput={onSearch}
          placeholder="ID / user / layanan / status…"
          class="w-full rounded-full border border-ink-200 bg-surface pl-4 pr-4 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      <Button type="submit" size="md" variant="ghost">Cari</Button>
      {#if data.q || data.status}
        <a
          href="/admin/orders"
          class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          Reset filter
        </a>
      {/if}
    </form>
  </header>

  <!-- Filter chips -->
  <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
    {#each filters as f}
      <a
        href={chipHref(f)}
        class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200
          {data.status === f
          ? 'border-transparent bg-ink-900 text-white shadow-sm'
          : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
        >{f || "Semua"}</a
      >
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
    <EmptyState title="Belum ada order" />
  {:else}
    <!-- Desktop table — clean ledger, no card chrome -->
    <div class="hidden overflow-x-auto lg:block">
      <table class="w-full text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="px-3 py-3 font-semibold">ID</th><th class="px-3 py-3 font-semibold">User</th
            ><th class="px-3 py-3 font-semibold">Layanan</th>
            <th class="px-3 py-3 font-semibold text-right">Qty</th><th
              class="px-3 py-3 font-semibold text-right">Harga</th
            ><th class="px-3 py-3 font-semibold">Status</th>
            <th class="px-3 py-3 font-semibold">Waktu</th><th
              class="px-3 py-3 font-semibold text-right">Aksi</th
            >
          </tr>
        </thead>
        <tbody>
          {#each data.orders as o, i (o.id)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{300 + i * 30}ms"
            >
              <td class="px-3 py-3 font-semibold tabular-nums text-ink-900">#{o.id}</td>
              <td class="px-3 py-3 text-ink-700">{o.username ?? "—"}</td>
              <td class="max-w-xs truncate px-3 py-3 text-ink-700">{o.serviceName}</td>
              <td class="px-3 py-3 text-right tabular-nums text-ink-700">{fmt(o.quantity)}</td>
              <td class="px-3 py-3 text-right font-semibold tabular-nums text-ink-900"
                >{formatRupiah(o.price)}</td
              >
              <td class="px-3 py-3"><StatusBadge status={o.status} /></td>
              <td class="whitespace-nowrap px-3 py-3 text-xs text-ink-500"
                >{fmtDate(o.createdAt)}</td
              >
              <td class="px-3 py-3 text-right">
                <Button size="sm" variant="ghost" onclick={() => openDetail(o)}>Detail</Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile ledger (hairline rows, no card chrome, data real lengkap) -->
    <ul class="lg:hidden">
      {#each data.orders as o, i (o.id)}
        <li
          class="reveal border-b border-ink-100 py-3 last:border-b-0 transition-colors hover:bg-ink-50/40"
          style="--d:{240 + i * 30}ms"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="shrink-0 tabular-nums text-xs text-ink-400">#{o.id}</span>
                <span class="truncate font-semibold text-ink-900">{o.serviceName}</span>
              </div>
              <p class="truncate text-xs text-ink-500">{o.username ?? "—"} · {orderBy(o.isApi)}</p>
              <!-- Order ladder: qty / harga / profit -->
              <dl class="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Qty</dt>
                  <dd class="tabular-nums font-semibold text-ink-900">{fmt(o.quantity)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Harga</dt>
                  <dd class="tabular-nums font-semibold text-ink-900">{formatRupiah(o.price)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Profit</dt>
                  <dd class="tabular-nums font-semibold text-ink-700">{formatRupiah(o.profit)}</dd>
                </div>
              </dl>
              <div class="mt-1.5 flex items-center gap-3 text-xs text-ink-400 tabular-nums">
                <span>start {fmt(o.startCount)}</span>
                <span class="text-ink-200">·</span>
                <span>remains {fmt(o.remains)}</span>
                <span class="text-ink-200">·</span>
                <span class="text-ink-400">{fmtDate(o.createdAt)}</span>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={o.status} />
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" full onclick={() => openDetail(o)}>Detail</Button>
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
</section>

<!-- Detail / Kelola modal -->
{#if detail}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) detail = null;
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-display text-lg font-bold">Order #{detail.id}</h3>
          <p class="truncate text-xs text-ink-400">
            {detail.username ?? "—"} · {orderBy(detail.isApi)}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-ink-400 hover:bg-ink-100"
          aria-label="Tutup"
          onclick={() => (detail = null)}>✕</button
        >
      </div>

      <!-- Info -->
      <dl class="space-y-1.5 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Layanan</dt>
          <dd class="text-right font-medium">{detail.serviceName}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Target / Link</dt>
          <dd class="max-w-[60%] break-all text-right text-xs">{detail.link}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Qty</dt>
          <dd class="text-right tabular-nums">{fmt(detail.quantity)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Harga</dt>
          <dd class="text-right tabular-nums">{formatRupiah(detail.price)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Profit</dt>
          <dd class="text-right tabular-nums">{formatRupiah(detail.profit)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Start Count</dt>
          <dd class="text-right tabular-nums">{fmt(detail.startCount)}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Remains</dt>
          <dd class="text-right tabular-nums">{fmt(detail.remains)}</dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-ink-500">Status</dt>
          <dd><StatusBadge status={detail.status} /></dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Provider Order ID</dt>
          <dd class="text-right">{detail.providerOrderId || "—"}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-ink-500">Dibuat</dt>
          <dd class="text-right text-xs">{fmtDate(detail.createdAt)}</dd>
        </div>
        {#if detail.updatedAt}
          <div class="flex justify-between gap-3">
            <dt class="text-ink-500">Update terakhir</dt>
            <dd class="text-right text-xs">{fmtDate(detail.updatedAt)}</dd>
          </div>
        {/if}
      </dl>

      <!-- Update status — via ConfirmDialog (G30) -->
      {#if UPDATABLE_FROM.includes(detail.status)}
        <hr class="border-ink-100" />
        <div class="space-y-2">
          <div class="text-xs font-semibold text-ink-500">Ubah Status</div>
          <div class="flex flex-wrap gap-2">
            {#each STATUS_ACTIONS as st}
              <Button
                type="button"
                size="sm"
                variant={st === "Success" ? "primary" : st === "Error" ? "danger" : "ghost"}
                onclick={() => (confirmStatus = st)}>{st}</Button
              >
            {/each}
          </div>
        </div>
      {/if}

      <!-- Edit detail provider (submit via ConfirmDialog di bawah — G30) -->
      {#if EDITABLE_STATUS.includes(detail.status)}
        <hr class="border-ink-100" />
        <div class="space-y-2">
          <div class="text-xs font-semibold text-ink-500">Edit Detail Provider</div>
          <input
            name="providerOrderId"
            bind:value={poid}
            placeholder="Provider Order ID"
            class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
          />
          <div class="flex gap-2">
            <input
              name="startCount"
              type="number"
              bind:value={sc}
              placeholder="Start count"
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
            />
            <input
              name="remains"
              type="number"
              bind:value={rem}
              placeholder="Remains"
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
            />
          </div>
          <Button type="button" size="sm" full onclick={() => (confirmEditProv = true)}
            >Simpan Detail Provider</Button
          >
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
  @media (prefers-reduced-motion: reduce) {
    .reveal {
      animation: none;
    }
  }
</style>
