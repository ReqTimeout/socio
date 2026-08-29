<script lang="ts">
  import { Button, ConfirmDialog, StatusBadge, EmptyState, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  type Status = "Pending" | "Success" | "Canceled";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state(data.q);

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

  const STATUS_FILTERS: { key: Status | ""; label: string }[] = [
    { key: "", label: "Semua" },
    { key: "Pending", label: "Pending" },
    { key: "Success", label: "Selesai" },
    { key: "Canceled", label: "Batal" },
  ];

  function timeAgo(d: Date | string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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

<section class="space-y-6">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Deposits
      </h1>
      <p class="mt-1 text-sm text-ink-500">
        {data.total.toLocaleString("id-ID")} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-warning"
          >{data.stats.Pending.count.toLocaleString("id-ID")}</span
        >
        pending
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success"
          >{data.stats.Success.count.toLocaleString("id-ID")}</span
        >
        sukses
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-danger"
          >{data.stats.Canceled.count.toLocaleString("id-ID")}</span
        > batal
      </p>
    </div>
  </header>

  {#if form?.error}
    <div class="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success-soft px-3 py-2 text-sm font-medium text-success">
      {form.success}
    </div>
  {/if}

  <!-- Search + filter chips -->
  <div class="space-y-3">
    <form method="GET" action="/admin/deposits" class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-0 sm:max-w-md">
        <input
          type="search"
          name="q"
          bind:value={q}
          oninput={onSearch}
          placeholder="Cari ID / username / metode / status…"
          class="w-full rounded-full border border-ink-200 bg-surface pl-4 pr-4 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      {#if data.status}
        <input type="hidden" name="status" value={data.status} />
      {/if}
      <Button type="submit" size="md">Cari</Button>
      {#if data.q || data.status}
        <a
          href="/admin/deposits"
          class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          Reset filter
        </a>
      {/if}
    </form>

    <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {#each STATUS_FILTERS as f (f.key)}
        <a
          href={chipHref(f.key as Status | "")}
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200
            {(data.status || '') === f.key
            ? 'border-transparent bg-ink-900 text-white shadow-sm'
            : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
        >
          {f.label}
        </a>
      {/each}
    </div>
  </div>

  {#if data.deposits.length === 0}
    <EmptyState
      icon="💰"
      title="Belum ada deposit"
      description={data.q || data.status
        ? "Coba ubah filter atau kata kunci."
        : "Deposit user akan muncul di sini setelah top-up."}
    />
  {:else}
    <!-- Desktop table — clean ledger, no card chrome -->
    <div class="hidden overflow-x-auto lg:block">
      <table class="w-full text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="px-3 py-3 font-semibold">ID</th>
            <th class="px-3 py-3 font-semibold">User</th>
            <th class="px-3 py-3 font-semibold">Metode</th>
            <th class="px-3 py-3 font-semibold text-right">Jumlah</th>
            <th class="px-3 py-3 font-semibold">Status</th>
            <th class="px-3 py-3 font-semibold">Waktu</th>
            <th class="px-3 py-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.deposits as d, i (d.id)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{240 + i * 30}ms"
            >
              <td class="px-3 py-3 font-semibold tabular-nums text-ink-900">#{d.id}</td>
              <td class="px-3 py-3">
                <div class="flex flex-col">
                  <span class="font-medium text-ink-900">{d.username ?? "—"}</span>
                  <span class="text-xs text-ink-400">ID {d.userId}</span>
                </div>
              </td>
              <td class="px-3 py-3 text-ink-700">{d.methodName}</td>
              <td class="px-3 py-3 text-right font-semibold tabular-nums text-ink-900">
                {formatRupiah(d.amount)}
              </td>
              <td class="px-3 py-3">
                <StatusBadge status={d.status} />
              </td>
              <td class="px-3 py-3 text-xs text-ink-500">{timeAgo(d.createdAt)}</td>
              <td class="px-3 py-3 text-right">
                {#if d.status === "Pending"}
                  <div class="inline-flex gap-2">
                    <Button
                      size="sm"
                      onclick={() => {
                        confirmId = d.id;
                        modalOpen = true;
                      }}>Confirm</Button
                    >
                    <Button
                      size="sm"
                      variant="ghost"
                      onclick={() => {
                        rejectId = d.id;
                        rejectOpen = true;
                      }}>Reject</Button
                    >
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile ledger (hairline rows, no card chrome) -->
    <ul class="lg:hidden">
      {#each data.deposits as d, i (d.id)}
        <li
          class="reveal border-b border-ink-100 py-3 last:border-b-0 transition-colors hover:bg-ink-50/40"
          style="--d:{240 + i * 30}ms"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="shrink-0 tabular-nums text-xs text-ink-400">#{d.id}</span>
                <span class="truncate font-semibold text-ink-900">{d.username ?? "—"}</span>
              </div>
              <p class="truncate text-xs text-ink-500">{d.methodName} · ID {d.userId}</p>
              <!-- Amount + waktu + status -->
              <dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Jumlah</dt>
                  <dd class="tabular-nums font-semibold text-ink-900">{formatRupiah(d.amount)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Waktu</dt>
                  <dd class="text-ink-700">{timeAgo(d.createdAt)}</dd>
                </div>
              </dl>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={d.status} />
            </div>
          </div>
          {#if d.status === "Pending"}
            <div class="mt-3 flex gap-2">
              <Button
                size="sm"
                full
                onclick={() => {
                  confirmId = d.id;
                  modalOpen = true;
                }}>Confirm</Button
              >
              <Button
                size="sm"
                variant="ghost"
                full
                onclick={() => {
                  rejectId = d.id;
                  rejectOpen = true;
                }}>Reject</Button
              >
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
        class:opacity-50={data.page === 1}
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
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:pointer-events-none disabled:opacity-50"
        class:pointer-events-none={data.page === data.pages}
        class:opacity-50={data.page === data.pages}
        aria-label="Next page">Next →</a
      >
    </nav>
  {/if}
</section>

<ConfirmDialog
  bind:open={modalOpen}
  title="Konfirmasi Deposit"
  message="Saldo user akan ditambah. Lanjut?"
>
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

<ConfirmDialog bind:open={rejectOpen} title="Tolak Deposit" message="Deposit akan ditandai Batal.">
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
