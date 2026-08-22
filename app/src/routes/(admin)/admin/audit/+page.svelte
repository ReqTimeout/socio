<script lang="ts">
  import { Button, EmptyState } from "@socio/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let q = $state(data.q);

  const fmtDate = (d: Date | string) =>
    new Date(d as string).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Tone mapping untuk badge action
  const ACTION_TONE: Record<string, string> = {
    confirm_deposit: "bg-success-soft text-success",
    reject_deposit: "bg-danger-soft text-danger",
    change_level: "bg-primary-soft text-primary-600",
    suspend_user: "bg-warning-soft text-warning",
    edit_user: "bg-warning-soft text-warning",
    update_order_status: "bg-accent-soft text-accent-ink",
    edit_order_provider: "bg-accent-soft text-accent-ink",
    enable_maintenance: "bg-ink-100 text-ink-700",
    disable_maintenance: "bg-ink-100 text-ink-700",
    create_coupon: "bg-success-soft text-success",
    delete_coupon: "bg-danger-soft text-danger",
  };
  const toneFor = (action: string) => ACTION_TONE[action] ?? "bg-ink-100 text-ink-700";

  // Pretty detail: kalau object → render key:value; kalau string → tampilkan
  function prettyDetail(d: unknown): { k: string; v: string }[] | null {
    if (!d) return null;
    if (typeof d === "string") {
      try {
        const obj = JSON.parse(d);
        if (obj && typeof obj === "object") return entries(obj);
      } catch {
        return [{ k: "", v: d }];
      }
      return [{ k: "", v: d }];
    }
    if (typeof d === "object") return entries(d as Record<string, unknown>);
    return null;
  }
  function entries(obj: Record<string, unknown>): { k: string; v: string }[] {
    return Object.entries(obj).map(([k, v]) => ({
      k,
      v: typeof v === "object" ? JSON.stringify(v) : String(v),
    }));
  }

  function chipHref(a: string) {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (a) params.set("action", a);
    const qs = params.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (data.action) params.set("action", data.action);
    params.set("p", String(p));
    return `/admin/audit?${params.toString()}`;
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

<section class="space-y-4">
  <header class="flex flex-wrap items-end justify-between gap-2">
    <div>
      <h1 class="font-display text-xl font-bold lg:text-2xl">Audit Log</h1>
      <p class="text-sm text-ink-500">
        {data.total.toLocaleString("id-ID")} entri log admin
      </p>
    </div>
  </header>

  <!-- Search + filter chips -->
  <div class="space-y-3">
    <form method="GET" action="/admin/audit" class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-0 sm:max-w-md">
        <input
          type="search"
          name="q"
          bind:value={q}
          placeholder="Cari action / entity / admin / IP…"
          class="w-full rounded-full border border-ink-200 bg-surface pl-4 pr-4 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      {#if data.action}
        <input type="hidden" name="action" value={data.action} />
      {/if}
      <Button type="submit" size="md">Cari</Button>
      {#if data.q || data.action}
        <a
          href="/admin/audit"
          class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          Reset filter
        </a>
      {/if}
    </form>

    {#if data.actions.length > 0}
      <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <a
          href={chipHref("")}
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200
            {data.action === ''
            ? 'border-transparent bg-ink-900 text-white shadow-sm'
            : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
        >
          Semua
        </a>
        {#each data.actions as a (a.key)}
          <a
            href={chipHref(a.key)}
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200
              {data.action === a.key
              ? 'border-transparent bg-ink-900 text-white shadow-sm'
              : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
          >
            {a.key}
            <span
              class="rounded-full px-1.5 text-[10px] tabular-nums {data.action === a.key
                ? 'bg-white/20'
                : 'bg-ink-100 text-ink-500'}">{a.count}</span
            >
          </a>
        {/each}
      </div>
    {/if}
  </div>

  {#if data.logs.length === 0}
    <div class="rounded-2xl border border-ink-100 bg-surface">
      <EmptyState
        icon="�"
        title="Belum ada log"
        description={data.q || data.action
          ? "Coba ubah filter atau kata kunci."
          : "Aksi admin akan tercatat di sini."}
      />
    </div>
  {:else}
    <ul class="space-y-2">
      {#each data.logs as l, i (l.id)}
        {@const detail = prettyDetail(l.detail)}
        <li
          class="reveal rounded-2xl border border-ink-100 bg-surface p-3.5 transition-all hover:border-ink-200 hover:shadow-sm"
          style="--d:{i < 10 ? 240 + i * 35 : 0}ms"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700"
                >
                  @{l.adminUsername ?? l.adminId}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {toneFor(
                    l.action,
                  )}"
                >
                  {l.action}
                </span>
                <span class="text-sm text-ink-700">
                  {l.entity}{l.entityId ? ` #${l.entityId}` : ""}
                </span>
              </div>
              {#if detail && detail.length > 0}
                <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {#each detail as d (d.k)}
                    <div class="flex items-center gap-1">
                      {#if d.k}<span class="text-ink-500">{d.k}:</span>{/if}
                      <span class="font-medium text-ink-800 tabular-nums">{d.v}</span>
                    </div>
                  {/each}
                </div>
              {/if}
              {#if l.ip}
                <div class="mt-1.5 flex items-center gap-1 text-[11px] text-ink-400">
                  <span class="rounded bg-ink-50 px-1.5 py-0.5 font-mono">{l.ip}</span>
                </div>
              {/if}
            </div>
            <span class="shrink-0 text-xs text-ink-500">{fmtDate(l.createdAt)}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if data.pages > 1}
    <nav class="flex items-center justify-center gap-1 pt-2" aria-label="Pagination">
      <a
        href={pageHref(Math.max(1, data.page - 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
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
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
        class:pointer-events-none={data.page === data.pages}
        class:opacity-50={data.page === data.pages}
        aria-label="Next page">Next →</a
      >
    </nav>
  {/if}
</section>

<style>
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
