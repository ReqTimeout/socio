<script lang="ts">
  import { Button, EmptyState, toast, Icon } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state("");
  $effect(() => {
    q = data.q;
  });

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
  let reply = $state("");

  const STATUSES = ["", "Pending", "Answered", "Reply by user", "Closed"];

  const STATUS_TONE: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    Answered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Reply by user": "bg-violet-100 text-violet-700 border-violet-200",
    Closed: "bg-ink-100 text-ink-500 border-ink-200",
  };
  const STATUS_DOT: Record<string, string> = {
    Pending: "bg-amber-500",
    Answered: "bg-emerald-500",
    "Reply by user": "bg-violet-500",
    Closed: "bg-ink-300",
  };
  const STATUS_ICON: Record<string, string> = {
    Pending: "clock",
    Answered: "check",
    "Reply by user": "message",
    Closed: "check_circle",
  };

  function statusBadge(s: string) {
    const cls = STATUS_TONE[s] ?? "bg-ink-100 text-ink-600 border-ink-200";
    const dot = STATUS_DOT[s] ?? "bg-ink-300";
    const icon = STATUS_ICON[s] ?? "ticket";
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
    return { cls, dot, icon, label };
  }
  function userInitials(name: string | null | undefined, userId: number): string {
    const n = String(name ?? "").trim();
    if (n) return n.slice(0, 1).toUpperCase();
    return String(userId).slice(-1);
  }
  function userColor(name: string | null | undefined, userId: number) {
    const palette = [
      "from-violet-500 to-indigo-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-orange-500",
      "from-rose-500 to-pink-500",
      "from-sky-500 to-cyan-500",
      "from-fuchsia-500 to-purple-500",
    ];
    const key = String(name ?? userId);
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  const fmtDate = (d: unknown) => {
    const v = new Date(d as string);
    return Number.isNaN(v.getTime())
      ? String(d ?? "")
      : v.toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };
  const fmtShort = (d: unknown) => {
    const v = new Date(d as string);
    return Number.isNaN(v.getTime())
      ? String(d ?? "")
      : v.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
  };
  const fmt = (n: number) => n.toLocaleString("id-ID");
  // thread anchor
  let threadEl: HTMLDivElement | undefined = $state(undefined);
  $effect(() => {
    if (data.activeId && threadEl) {
      // scroll thread to bottom on open / after update
      requestAnimationFrame(() => {
        threadEl!.scrollTop = threadEl!.scrollHeight;
      });
      // A-13: explicit POST markRead (sebelumnya side-effect di load GET).
      if (typeof fetch !== "undefined") {
        const fd = new FormData();
        fd.set("ticketId", String(data.activeId));
        fetch("/admin/tickets?/markRead", { method: "POST", body: fd }).catch(() => {});
      }
    }
  });

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

  // central extractor: SvelteKit devalue can return [obj, str] array
  function msgOf(d: unknown): string | undefined {
    if (d == null) return undefined;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      const obj = (d as any[]).find((x) => x && typeof x === "object" && (x.success || x.error));
      const str = (d as any[]).find((x) => typeof x === "string");
      return (obj?.success ?? obj?.error ?? str) as string | undefined;
    }
    const o = d as any;
    return (o.success ?? o.error ?? o.message) as string | undefined;
  }
  const onResult =
    () =>
    async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      if (result.type === "failure") toast(msgOf(result.data) ?? "Gagal", "error");
      else {
        toast(msgOf(result.data) ?? "OK", "success");
        reply = "";
      }
      await update();
      if (threadEl) requestAnimationFrame(() => (threadEl!.scrollTop = threadEl!.scrollHeight));
    };
</script>

<svelte:head>
  <title>Tiket — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5">
  <!-- Header: title + KPI pills (no dot-jumble sentence) -->
  <header class="min-w-0">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1
          class="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
        >
          <span
            class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm"
          >
            <Icon name="ticket" size={18} stroke={2.5} />
          </span>
          Tickets
        </h1>
        <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-500">
          {#if hasFilter}
            <span class="rounded-full bg-ink-900 px-2.5 py-1 text-white"
              >{fmt(data.total)} cocok filter</span
            >
            <span class="text-ink-300">·</span>
          {/if}
          <span class="rounded-full border border-ink-200 bg-surface px-2.5 py-1"
            >{fmt(data.stats.totalTickets)} total</span
          >
          <span
            class="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700"
            ><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>{fmt(data.stats.pending)} pending</span
          >
          <span
            class="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700"
            ><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{fmt(data.stats.answered)} dibalas</span
          >
          <span
            class="hidden sm:inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700"
            ><span class="h-1.5 w-1.5 rounded-full bg-violet-500"></span>{fmt(
              data.stats.replyByUser,
            )} user balas</span
          >
          <span
            class="hidden sm:inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-100 px-2.5 py-1 text-ink-500"
            ><span class="h-1.5 w-1.5 rounded-full bg-ink-300"></span>{fmt(data.stats.closed)} ditutup</span
          >
        </p>
        <!-- mobile: single compact line -->
        <p class="mt-1 flex sm:hidden items-center gap-1.5 text-[11px] font-medium text-ink-500">
          <span class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700"
            >{fmt(data.stats.pending)} pending</span
          >
          <span
            class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700"
            >{fmt(data.stats.answered)} dibalas</span
          >
          <span class="rounded-full border border-ink-200 bg-ink-100 px-2 py-0.5 text-ink-500"
            >{fmt(data.stats.closed)} ditutup</span
          >
        </p>
      </div>
      {#if !data.active}
        <a
          href="/admin/tickets"
          class="hidden lg:inline-flex items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
        >
          <Icon name="refresh" size={12} />
          Refresh
        </a>
      {/if}
    </div>
  </header>

  <!-- Search + filter -->
  <form method="GET" class="flex flex-wrap items-center gap-2">
    {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
    {#if data.activeId}<input type="hidden" name="id" value={data.activeId} />{/if}
    <div class="relative flex-1 min-w-0 sm:max-w-md">
      <span
        class="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-ink-400"
      >
        <Icon name="search" size={16} />
      </span>
      <input
        type="search"
        name="q"
        bind:value={q}
        oninput={onSearch}
        placeholder="Cari subjek / pesan / ID tiket…"
        class="w-full rounded-full border border-ink-200 bg-surface py-2.5 pl-9 pr-4 text-sm transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />
    </div>
    <Button type="submit" size="md">Cari</Button>
    {#if hasFilter}
      <a
        href="/admin/tickets"
        class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800"
      >
        <Icon name="x" size={12} /> Reset
      </a>
    {/if}
  </form>

  <!-- Status chips -->
  <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
    {#each STATUSES as s}
      {@const active = data.status === s}
      {@const b = s ? statusBadge(s) : null}
      <a
        href={chipHref(s)}
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200
          {active
          ? 'border-transparent bg-ink-900 text-white shadow-sm'
          : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-800'}"
      >
        {#if s}<span class="h-1.5 w-1.5 rounded-full {active ? 'bg-white' : b!.dot}"></span>{/if}
        {s || "Semua"}
        {#if !active}
          <span class="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] leading-none">
            {s === ""
              ? fmt(data.stats.totalTickets)
              : s === "Pending"
                ? fmt(data.stats.pending)
                : s === "Answered"
                  ? fmt(data.stats.answered)
                  : s === "Reply by user"
                    ? fmt(data.stats.replyByUser)
                    : fmt(data.stats.closed)}
          </span>
        {/if}
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

  <!-- Layout: on mobile → detail as drawer; on desktop → split 360 + 1fr -->
  <div class="grid gap-5 {data.active ? 'lg:grid-cols-[380px_1fr]' : ''}">
    <!-- Ticket list — ledger card -->
    <div
      class="{data.active
        ? 'hidden lg:block'
        : ''} overflow-hidden rounded-2xl border border-ink-100 bg-surface"
    >
      <div
        class="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-ink-50/50 px-3 py-2.5 backdrop-blur"
      >
        <span class="text-xs font-bold uppercase tracking-wide text-ink-500">Daftar tiket</span>
        <span class="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-white"
          >{fmt(data.total)}</span
        >
      </div>
      {#if data.tickets.length === 0}
        <div class="pt-4">
          <EmptyState
            art="tickets"
            title="Belum ada tiket"
            description={hasFilter
              ? "Coba ubah filter atau kata kunci."
              : "Tiket user akan muncul di sini."}
          />
        </div>
      {:else}
        <ul class="divide-y divide-ink-100">
          {#each data.tickets as t, i (t.ticket_id)}
            {@const b = statusBadge(t.status)}
            {@const isActive = Number(data.activeId) === Number(t.ticket_id)}
            {@const isUnread = Number(t.is_read) === 0 && t.last_type === "user"}
            <li>
              <a
                href={`/admin/tickets?id=${t.ticket_id}${data.q ? `&q=${encodeURIComponent(data.q)}` : ""}${data.status ? `&status=${data.status}` : ""}`}
                class="reveal flex items-start gap-3 px-3 py-3 transition-colors {isActive
                  ? 'bg-violet-50/80 border-l-2 border-violet-600'
                  : isUnread
                    ? 'bg-amber-50/40 hover:bg-amber-50/70'
                    : 'hover:bg-ink-50/60'}"
                style="--d:{i * 22}ms"
              >
                <div
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br {userColor(
                    t.username,
                    Number(t.user_id),
                  )} text-xs font-extrabold text-white shadow-sm ring-1 ring-black/5"
                >
                  {userInitials(t.username, Number(t.user_id))}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <span
                      class="truncate text-[13px] font-bold leading-tight {isUnread
                        ? 'text-ink-900'
                        : 'text-ink-800'}">#{t.ticket_id} · {t.subject || "(Tanpa subjek)"}</span
                    >
                    <span
                      class="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none {b.cls}"
                    >
                      <span class="h-1.5 w-1.5 rounded-full {b.dot}"></span>{b.label}
                    </span>
                  </div>
                  <p class="truncate text-xs text-ink-500">
                    <span class="font-medium">@{t.username ?? "user#" + t.user_id}</span>
                    <span class="text-ink-300">·</span>
                    {fmtShort(t.created_at)}
                    {#if isUnread}<span
                        class="ml-1 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                        >Baru</span
                      >{/if}
                  </p>
                  <p
                    class="truncate text-xs leading-snug {isUnread
                      ? 'font-medium text-ink-700'
                      : 'text-ink-400'}"
                  >
                    {t.last_message || "—"}
                  </p>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
      {#if data.pages > 1}
        <nav
          class="flex flex-wrap items-center justify-center gap-1 border-t border-ink-100 bg-ink-50/30 px-3 py-3"
          aria-label="Pagination"
        >
          <a
            href={pageHref(Math.max(1, data.page - 1))}
            class="inline-flex h-7 items-center justify-center rounded-full border border-ink-200 bg-surface px-2 text-xs font-bold text-ink-600 {data.page ===
            1
              ? 'pointer-events-none opacity-40'
              : 'hover:bg-ink-50'}">‹</a
          >
          {#each pageList as p}
            {#if p === "…"}
              <span class="px-1 text-ink-400">…</span>
            {:else}
              <a
                href={pageHref(p)}
                class="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums {p ===
                data.page
                  ? 'bg-ink-900 text-white'
                  : 'border border-ink-200 bg-surface hover:bg-ink-50'}">{p}</a
              >
            {/if}
          {/each}
          <a
            href={pageHref(Math.min(data.pages, data.page + 1))}
            class="inline-flex h-7 items-center justify-center rounded-full border border-ink-200 bg-surface px-2 text-xs font-bold text-ink-600 {data.page ===
            data.pages
              ? 'pointer-events-none opacity-40'
              : 'hover:bg-ink-50'}">›</a
          >
        </nav>
      {/if}
    </div>

    <!-- Detail panel — card on desktop, full-width section below on mobile -->
    {#if data.active}
      <!-- Mobile: show detail full-width (list hidden above) — has back bar -->
      <div class="lg:hidden">
        <a
          href={`/admin/tickets${data.q ? `?q=${encodeURIComponent(data.q)}` : ""}${data.status ? `?status=${data.status}` : ""}`}
          class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-ink-50"
          aria-label="Kembali ke daftar">‹ Kembali ke daftar</a
        >
        <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
          <div
            class="flex items-start justify-between gap-2 border-b border-ink-100 bg-ink-50/50 px-4 py-3"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-display text-base font-bold">#{data.active.ticketId}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-bold {statusBadge(data.active.status)
                    .cls}">{statusBadge(data.active.status).label}</span
                >
              </div>
              <p class="truncate text-sm font-medium text-ink-700">{data.active.subject}</p>
              <p class="truncate text-xs text-ink-400">
                @{data.active.username ?? "user#" + data.active.userId}{data.active.email
                  ? ` · ${data.active.email}`
                  : ""}
              </p>
            </div>
          </div>
          <div bind:this={threadEl} class="max-h-[50vh] space-y-3 overflow-y-auto p-4">
            {#if data.thread.length === 0}
              <p class="py-6 text-center text-sm text-ink-400">Belum ada percakapan.</p>
            {:else}
              {#each data.thread as m, i (m.id)}
                <div
                  class="reveal flex {m.type === 'admin' ? 'justify-end' : 'justify-start'}"
                  style="--d:{i * 30}ms"
                >
                  <div
                    class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm {m.type === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-ink-100 text-ink-800'}"
                  >
                    <div
                      class="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide {m.type ===
                      'admin'
                        ? 'text-primary-100'
                        : 'text-ink-500'}"
                    >
                      {m.type === "admin" ? "Admin" : (m.username ?? "User")}
                    </div>
                    <p class="whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>
                    <p class="mt-1.5 text-right text-[10px] opacity-70">{fmtDate(m.created_at)}</p>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
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
                    placeholder="Tulis balasan… (Enter untuk kirim)"
                    onkeydown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const f = (e.currentTarget as HTMLTextAreaElement).closest(
                          "form",
                        ) as HTMLFormElement | null;
                        if (reply.trim() && f) f.requestSubmit();
                      }
                    }}
                    class="min-h-11 flex-1 resize-none rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    required
                  ></textarea>
                  <Button type="submit" size="md" disabled={!reply.trim()}>Kirim</Button>
                </div>
              </form>
              <div class="mt-2 flex items-center justify-between gap-2">
                <p class="text-[10px] text-ink-400">
                  Shift+Enter baris baru · status jadi "Dibalas".
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
      </div>
      <!-- Desktop: side panel -->
      <div class="hidden lg:block">
        <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
          <div
            class="flex items-start justify-between gap-2 border-b border-ink-100 bg-ink-50/50 px-4 py-3"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-display text-base font-bold">#{data.active.ticketId}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-bold {statusBadge(data.active.status)
                    .cls}">{statusBadge(data.active.status).label}</span
                >
              </div>
              <p class="truncate text-sm font-medium text-ink-700">{data.active.subject}</p>
              <p class="truncate text-xs text-ink-400">
                @{data.active.username ?? "user#" + data.active.userId}{data.active.email
                  ? ` · ${data.active.email}`
                  : ""}
              </p>
            </div>
            <a
              href={`/admin/tickets${data.q ? `?q=${encodeURIComponent(data.q)}` : ""}${data.status ? `?status=${data.status}` : ""}`}
              class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              aria-label="Tutup detail">✕</a
            >
          </div>
          <div bind:this={threadEl} class="max-h-[58vh] space-y-3 overflow-y-auto p-4">
            {#if data.thread.length === 0}
              <p class="py-6 text-center text-sm text-ink-400">Belum ada percakapan.</p>
            {:else}
              {#each data.thread as m, i (m.id)}
                <div
                  class="reveal flex {m.type === 'admin' ? 'justify-end' : 'justify-start'}"
                  style="--d:{i * 30}ms"
                >
                  <div
                    class="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm {m.type === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-ink-100 text-ink-800'}"
                  >
                    <div
                      class="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide {m.type ===
                      'admin'
                        ? 'text-primary-100'
                        : 'text-ink-500'}"
                    >
                      {m.type === "admin" ? "Admin" : (m.username ?? "User")}
                    </div>
                    <p class="whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>
                    <p class="mt-1.5 text-right text-[10px] opacity-70">{fmtDate(m.created_at)}</p>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
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
                    placeholder="Tulis balasan… (Enter untuk kirim)"
                    onkeydown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const f = (e.currentTarget as HTMLTextAreaElement).closest(
                          "form",
                        ) as HTMLFormElement | null;
                        if (reply.trim() && f) f.requestSubmit();
                      }
                    }}
                    class="min-h-11 flex-1 resize-none rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    required
                  ></textarea>
                  <Button type="submit" size="md" disabled={!reply.trim()}>Kirim</Button>
                </div>
              </form>
              <div class="mt-2 flex items-center justify-between gap-2">
                <p class="text-[10px] text-ink-400">
                  Shift+Enter baris baru · status jadi "Dibalas".
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
