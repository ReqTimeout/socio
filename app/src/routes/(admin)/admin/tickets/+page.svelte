<script lang="ts">
  import { Button, EmptyState, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state(data.q);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (data.status) u.set("status", data.status);
      goto(`/admin/tickets?${u.toString()}`, { keepFocus: true, noScroll: true });
    }, 350);
  }
  $effect(() => {
    q = data.q;
  });
  let reply = $state("");

  const STATUSES = ["", "Pending", "Answered", "Reply by user", "Closed"];

  const STATUS_TONE: Record<string, string> = {
    Pending: "bg-warning-soft text-warning",
    Answered: "bg-success-soft text-success",
    "Reply by user": "bg-primary-soft text-primary-600",
    Closed: "bg-ink-100 text-ink-500",
  };

  function statusBadge(s: string) {
    const cls = STATUS_TONE[s] ?? "bg-ink-100 text-ink-600";
    const label =
      s === "Pending"
        ? "Pending"
        : s === "Answered"
          ? "Dibalas"
          : s === "Reply by user"
            ? "User balas"
            : s === "Closed"
              ? "Ditutup"
              : s;
    return { cls, label };
  }

  const fmtDate = (d: unknown) =>
    new Date(d as string).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const fmtShort = (d: unknown) =>
    new Date(d as string).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  const fmt = (n: number) => n.toLocaleString("id-ID");

  function chipHref(s: string) {
    const u = new URLSearchParams();
    if (data.q) u.set("q", data.q);
    if (data.activeId) u.set("id", String(data.activeId));
    if (s) u.set("status", s);
    const qs = u.toString();
    return qs ? `/admin/tickets?${qs}` : "/admin/tickets";
  }
  function pageHref(p: number) {
    const u = new URLSearchParams();
    if (data.q) u.set("q", data.q);
    if (data.status) u.set("status", data.status);
    if (data.activeId) u.set("id", String(data.activeId));
    u.set("p", String(p));
    return `/admin/tickets?${u.toString()}`;
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
  const hasFilter = $derived(!!(data.q || data.status));

  const onResult =
    () =>
    async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
      else {
        toast((result.data as any)?.success ?? "OK", "success");
        reply = "";
      }
      await update();
    };
</script>

<svelte:head>
  <title>Tiket — Admin Socio.id</title>
</svelte:head>

<section class="space-y-6">
  <!-- Header: inline narrative (zero card chrome, no stat strip) -->
  <header class="min-w-0">
    <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Tickets</h1>
    <p class="mt-1 text-sm text-ink-500">
      {fmt(data.total)} cocok filter
      <span class="mx-1 text-ink-300">·</span>
      <span class="font-semibold text-ink-700">{fmt(data.stats.totalTickets)}</span> total
      <span class="mx-1 text-ink-300">·</span>
      <span class="font-semibold text-warning">{fmt(data.stats.pending)}</span> pending
      <span class="mx-1 text-ink-300">·</span>
      <span class="font-semibold text-success">{fmt(data.stats.answered)}</span> dibalas
      <span class="mx-1 text-ink-300">·</span>
      <span class="font-semibold text-primary-600">{fmt(data.stats.replyByUser)}</span> user balas
      <span class="mx-1 text-ink-300">·</span>
      <span class="font-semibold text-ink-500">{fmt(data.stats.closed)}</span> ditutup
    </p>
  </header>

  <!-- Search + filter -->
  <form method="GET" class="flex flex-wrap items-center gap-2">
    {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
    {#if data.activeId}<input type="hidden" name="id" value={data.activeId} />{/if}
    <div class="relative flex-1 min-w-0 sm:max-w-md">
      <input
        type="search"
        name="q"
        bind:value={q}
        oninput={onSearch}
        placeholder="Cari subjek / pesan / ID tiket…"
        class="w-full rounded-full border border-ink-200 bg-surface pl-4 pr-4 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
    <Button type="submit" size="md">Cari</Button>
    {#if hasFilter}
      <a
        href="/admin/tickets"
        class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
      >
        Reset filter
      </a>
    {/if}
  </form>

  <!-- Status chips -->
  <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
    {#each STATUSES as s}
      <a
        href={chipHref(s)}
        class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200
          {data.status === s
          ? 'border-transparent bg-ink-900 text-white shadow-sm'
          : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
        >{s || "Semua"}</a
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

  <!-- Layout: list (desktop) + detail panel -->
  <div class="grid gap-6 {data.active ? 'lg:grid-cols-[minmax(0,360px)_1fr]' : ''}">
    <!-- Ticket list — no wrapper card, ledger rows -->
    <div>
      <div
        class="sticky top-0 z-10 border-b border-ink-200 bg-surface px-1 pb-2 text-xs font-bold uppercase tracking-wide text-ink-500 backdrop-blur"
      >
        Daftar tiket
      </div>
      {#if data.tickets.length === 0}
        <div class="pt-4">
          <EmptyState
            icon="🎫"
            title="Belum ada tiket"
            description={hasFilter
              ? "Coba ubah filter atau kata kunci."
              : "Tiket user akan muncul di sini."}
          />
        </div>
      {:else}
        <ul>
          {#each data.tickets as t, i (t.ticket_id)}
            {@const b = statusBadge(t.status)}
            <li class="border-b border-ink-100 last:border-b-0">
              <a
                href={`/admin/tickets?id=${t.ticket_id}${data.q ? `&q=${encodeURIComponent(data.q)}` : ""}${data.status ? `&status=${data.status}` : ""}`}
                class="reveal flex items-start gap-3 py-3 transition-colors hover:bg-ink-50/40 {Number(
                  data.activeId,
                ) === Number(t.ticket_id)
                  ? 'border-l-2 border-primary bg-primary-50/40 pl-3'
                  : ''}"
                style="--d:{i * 25}ms"
              >
                <div
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-600"
                >
                  {(t.username ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate font-semibold text-ink-900"
                      >#{t.ticket_id} · {t.subject || "(Tanpa subjek)"}</span
                    >
                    <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold {b.cls}">
                      {b.label}
                    </span>
                  </div>
                  <p class="truncate text-xs text-ink-500">
                    {t.username ?? "user#" + t.user_id} · {fmtShort(t.created_at)}
                  </p>
                  <p class="truncate text-xs text-ink-400">{t.last_message}</p>
                </div>
                {#if Number(t.is_read) === 0 && t.last_type === "user"}
                  <span
                    class="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500"
                    title="Belum dibaca"
                  ></span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
      {#if data.pages > 1}
        <nav class="flex flex-wrap items-center justify-center gap-1 pt-3" aria-label="Pagination">
          <a
            href={pageHref(Math.max(1, data.page - 1))}
            class="inline-flex h-8 items-center justify-center rounded-full border border-ink-200 bg-surface px-2 text-xs font-semibold text-ink-600 {data.page ===
            1
              ? 'pointer-events-none opacity-50'
              : 'hover:bg-ink-50'}">‹</a
          >
          {#each pageList as p}
            {#if p === "…"}
              <span class="px-1 text-ink-400">…</span>
            {:else}
              <a
                href={pageHref(p)}
                class="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums {p ===
                data.page
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-200 bg-surface hover:bg-ink-50'}">{p}</a
              >
            {/if}
          {/each}
          <a
            href={pageHref(Math.min(data.pages, data.page + 1))}
            class="inline-flex h-8 items-center justify-center rounded-full border border-ink-200 bg-surface px-2 text-xs font-semibold text-ink-600 {data.page ===
            data.pages
              ? 'pointer-events-none opacity-50'
              : 'hover:bg-ink-50'}">›</a
          >
        </nav>
      {/if}
    </div>

    <!-- Detail panel — no wrapper card -->
    {#if data.active}
      <div>
        <div class="flex items-start justify-between gap-2 border-b border-ink-200 pb-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-display text-lg font-bold">#{data.active.ticketId}</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-bold {statusBadge(data.active.status)
                  .cls}">{statusBadge(data.active.status).label}</span
              >
            </div>
            <p class="truncate text-sm text-ink-700">{data.active.subject}</p>
            <p class="truncate text-xs text-ink-400">
              @{data.active.username ?? "user#" + data.active.userId} · {data.active.email ?? ""}
            </p>
          </div>
          <a
            href={`/admin/tickets${data.q ? `?q=${encodeURIComponent(data.q)}` : ""}${data.status ? `?status=${data.status}` : ""}`}
            class="shrink-0 rounded-lg px-2 py-1 text-ink-400 hover:bg-ink-100"
            aria-label="Tutup detail">✕</a
          >
        </div>

        <!-- Thread -->
        <div class="max-h-[60vh] space-y-3 overflow-y-auto p-4">
          {#each data.thread as m, i (m.id)}
            <div
              class="reveal flex {m.type === 'admin' ? 'justify-end' : 'justify-start'}"
              style="--d:{i * 30}ms"
            >
              <div
                class="max-w-[80%] rounded-2xl px-3 py-2 text-sm {m.type === 'admin'
                  ? 'bg-primary-500 text-white'
                  : 'bg-ink-100 text-ink-800'}"
              >
                <div
                  class="mb-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide {m.type ===
                  'admin'
                    ? 'text-primary-100'
                    : 'text-ink-500'}"
                >
                  {m.type === "admin" ? "Admin" : (m.username ?? "User")}
                </div>
                <p class="whitespace-pre-wrap break-words">{m.message}</p>
                <p class="mt-1 text-right text-[10px] opacity-70">{fmtDate(m.created_at)}</p>
              </div>
            </div>
          {/each}
        </div>

        <!-- Reply form -->
        {#if data.active.status !== "Closed"}
          <div class="border-t border-ink-100 p-3">
            <form
              method="POST"
              action="?/reply&id={data.active.ticketId}{data.q
                ? `&q=${encodeURIComponent(data.q)}`
                : ''}{data.status ? `&status=${data.status}` : ''}"
              use:enhance={onResult}
            >
              <input type="hidden" name="ticketId" value={data.active.ticketId} />
              <div class="flex items-end gap-2">
                <textarea
                  name="message"
                  bind:value={reply}
                  rows="2"
                  placeholder="Tulis balasan…"
                  class="min-h-10 flex-1 resize-none rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                ></textarea>
                <Button type="submit" size="md" disabled={!reply.trim()}>Kirim</Button>
              </div>
            </form>
            <div class="mt-2 flex items-center justify-between gap-2">
              <p class="text-[10px] text-ink-400">
                Status tiket akan berubah menjadi "Dibalas" setelah Anda mengirim pesan.
              </p>
              <form
                method="POST"
                action="?/close&id={data.active.ticketId}"
                use:enhance={onResult}
                class="inline"
              >
                <input type="hidden" name="ticketId" value={data.active.ticketId} />
                <button type="submit" class="text-xs font-semibold text-danger hover:underline">
                  Tutup tiket
                </button>
              </form>
            </div>
          </div>
        {:else}
          <form
            method="POST"
            action="?/reopen&id={data.active.ticketId}"
            use:enhance={onResult}
            class="border-t border-ink-100 p-3"
          >
            <input type="hidden" name="ticketId" value={data.active.ticketId} />
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-ink-500">Tiket ini sudah ditutup.</p>
              <Button type="submit" size="sm" variant="ghost">Buka kembali</Button>
            </div>
          </form>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .reveal {
    animation: reveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: var(--d, 0ms);
  }
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(6px);
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
