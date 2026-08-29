<script lang="ts">
  import { Button, EmptyState, Icon } from "@socio/ui";
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

  // Human labels — gampang dimengerti (bukan snake_case)
  const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
    confirm_deposit: { label: "Konfirmasi deposit", icon: "wallet" },
    reject_deposit: { label: "Tolak deposit", icon: "x" },
    change_level: { label: "Ubah level user", icon: "user" },
    suspend_user: { label: "Blokir user", icon: "lock" },
    edit_user: { label: "Edit user", icon: "settings" },
    update_order_status: { label: "Update status order", icon: "receipt" },
    edit_order_provider: { label: "Edit provider order", icon: "zap" },
    enable_maintenance: { label: "Maintenance ON", icon: "shield" },
    disable_maintenance: { label: "Maintenance OFF", icon: "shield" },
    create_coupon: { label: "Buat kupon", icon: "gift" },
    delete_coupon: { label: "Hapus kupon", icon: "gift" },
    create_banner: { label: "Buat banner", icon: "image" },
    update_banner: { label: "Update banner", icon: "image" },
    delete_banner: { label: "Hapus banner", icon: "image" },
    activate_banner: { label: "Aktifkan banner", icon: "image" },
    deactivate_banner: { label: "Nonaktifkan banner", icon: "image" },
    create_news: { label: "Buat berita", icon: "megaphone" },
    update_news: { label: "Update berita", icon: "megaphone" },
    delete_news: { label: "Hapus berita", icon: "megaphone" },
    delete_user: { label: "Hapus user", icon: "user" },
    update_user: { label: "Update user", icon: "user" },
    create_user: { label: "Buat user", icon: "user" },
    sync_provider: { label: "Sync provider", icon: "refresh" },
    add_provider: { label: "Tambah provider", icon: "zap" },
    edit_provider: { label: "Edit provider", icon: "zap" },
    delete_provider: { label: "Hapus provider", icon: "zap" },
    test_provider: { label: "Tes provider", icon: "zap" },
    reply_ticket: { label: "Balas tiket", icon: "ticket" },
    close_ticket: { label: "Tutup tiket", icon: "ticket" },
    reopen_ticket: { label: "Buka tiket", icon: "ticket" },
    save_pricing_rules: { label: "Simpan harga", icon: "tag" },
    apply_pricing_to_catalog: { label: "Update katalog harga", icon: "tag" },
  };
  function humanAction(action: string): { label: string; icon: string } {
    return ACTION_LABELS[action] ?? { label: action.replace(/_/g, " "), icon: "clock" };
  }
  const ACTION_TONE: Record<string, string> = {
    confirm_deposit: "bg-emerald-100 text-emerald-800 border-emerald-300",
    reject_deposit: "bg-red-100 text-red-700 border-red-300",
    change_level: "bg-violet-100 text-violet-800 border-violet-300",
    suspend_user: "bg-amber-100 text-amber-800 border-amber-300",
    edit_user: "bg-amber-100 text-amber-800 border-amber-300",
    update_order_status: "bg-sky-100 text-sky-800 border-sky-300",
    edit_order_provider: "bg-sky-100 text-sky-800 border-sky-300",
    enable_maintenance: "bg-ink-900 text-white border-ink-900",
    disable_maintenance: "bg-ink-100 text-ink-700 border-ink-200",
    create_coupon: "bg-emerald-100 text-emerald-800 border-emerald-300",
    delete_coupon: "bg-red-100 text-red-700 border-red-300",
    create_banner: "bg-violet-100 text-violet-800 border-violet-300",
    update_banner: "bg-violet-100 text-violet-800 border-violet-300",
    delete_banner: "bg-red-100 text-red-700 border-red-300",
    activate_banner: "bg-emerald-100 text-emerald-800 border-emerald-300",
    deactivate_banner: "bg-ink-100 text-ink-600 border-ink-200",
    create_news: "bg-sky-100 text-sky-800 border-sky-300",
    update_news: "bg-sky-100 text-sky-800 border-sky-300",
    delete_news: "bg-red-100 text-red-700 border-red-300",
    save_pricing_rules: "bg-amber-100 text-amber-800 border-amber-300",
    apply_pricing_to_catalog: "bg-emerald-100 text-emerald-800 border-emerald-300",
    create_user: "bg-emerald-100 text-emerald-800 border-emerald-300",
    update_user: "bg-sky-100 text-sky-800 border-sky-300",
    delete_user: "bg-red-100 text-red-700 border-red-300",
    sync_provider: "bg-sky-100 text-sky-800 border-sky-300",
    add_provider: "bg-emerald-100 text-emerald-800 border-emerald-300",
    edit_provider: "bg-violet-100 text-violet-800 border-violet-300",
    delete_provider: "bg-red-100 text-red-700 border-red-300",
    test_provider: "bg-amber-100 text-amber-800 border-amber-300",
    reply_ticket: "bg-sky-100 text-sky-800 border-sky-300",
    close_ticket: "bg-red-100 text-red-700 border-red-300",
    reopen_ticket: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  const toneFor = (action: string) =>
    ACTION_TONE[action] ?? "bg-ink-50 text-ink-600 border-ink-200";

  // Pretty detail — ubah JSON kampret jadi kalimat enak dibaca (bukan markupPercent FlatPer1k)
  function prettyDetail(d: unknown): { k: string; v: string }[] | null {
    // Simpan harga: render markup per level doang (skip flat/minProfit 0)
    const tryPricing = (obj: any): { k: string; v: string }[] | null => {
      if (obj?.markup && typeof obj.markup === "object") {
        const parts = Object.entries(obj.markup as Record<string, number>)
          .map(([lv, pct]) => `${lv} ${Number(pct)}%`)
          .join(" · ");
        const extras: { k: string; v: string }[] = [{ k: "Markup", v: parts }];
        if (obj.total != null)
          extras.push({ k: "Layanan", v: `${Number(obj.total).toLocaleString("id-ID")} layanan` });
        return extras;
      }
      if (Array.isArray(obj?.updates)) {
        return obj.updates
          .filter((u: any) => Number(u?.markupPercent ?? 0) > 0 || Number(u?.isActive ?? 0) !== 0)
          .map((u: any) => ({
            k: String(u.level),
            v: `${u.markupPercent}%${Number(u.isActive) ? "" : " (nonaktif)"}`,
          }));
      }
      return null;
    };
    if (!d) return null;
    if (typeof d === "string") {
      try {
        const obj = JSON.parse(d);
        if (obj && typeof obj === "object") {
          const pr = tryPricing(obj);
          if (pr && pr.length) return pr;
          return entries(obj);
        }
      } catch {
        return [{ k: "", v: d }];
      }
      return [{ k: "", v: d }];
    }
    if (typeof d === "object") {
      const pr = tryPricing(d as any);
      if (pr && pr.length) return pr;
      return entries(d as Record<string, unknown>);
    }
    return null;
  }
  function entries(obj: Record<string, unknown>): { k: string; v: string }[] {
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k, v]) => ({
        k: k.replace(/_/g, " "),
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

<svelte:head>
  <title>Audit Log — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5">
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span class="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-white shadow-sm">
          <Icon name="shield" size={18} stroke={2.5} />
        </span>
        Audit Log
        <span class="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-white"
          >{data.total.toLocaleString("id-ID")}</span
        >
      </h1>
      <p class="mt-1.5 text-xs font-medium text-ink-500">
        Jejak aktivitas admin — siapa, ngapain, kapan. <span class="hidden sm:inline"
          >Cari action / entity / IP.</span
        >
      </p>
    </div>
  </header>

  <!-- Search + filter chips -->
  <div class="space-y-3">
    <form method="GET" action="/admin/audit" class="flex flex-wrap items-center gap-2">
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
          placeholder="Cari: konfirmasi deposit, hapus banner…"
          class="w-full rounded-full border border-ink-200 bg-surface py-2.5 pl-9 pr-4 text-sm transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
      </div>
      {#if data.action}
        <input type="hidden" name="action" value={data.action} />
      {/if}
      <Button type="submit" size="sm">Cari</Button>
      {#if data.q || data.action}
        <a
          href="/admin/audit"
          class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-800"
        >
          <Icon name="x" size={12} /> Reset
        </a>
      {/if}
    </form>

    {#if data.actions.length > 0}
      <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <a
          href={chipHref("")}
          class="inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-all {data.action ===
          ''
            ? 'border-transparent bg-ink-900 text-white shadow-sm'
            : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-50'}"
        >
          Semua
        </a>
        {#each data.actions as a (a.key)}
          {@const h = humanAction(a.key)}
          <a
            href={chipHref(a.key)}
            class="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-all {data.action ===
            a.key
              ? 'border-transparent bg-ink-900 text-white shadow-sm'
              : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-50'}"
            title={a.key}
          >
            <Icon name={h.icon} size={12} />
            {h.label}
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
        {@const h = humanAction(l.action)}
        <li
          class="reveal overflow-hidden rounded-2xl border border-ink-100 bg-surface transition-all hover:border-ink-200 hover:shadow-sm"
          style="--d:{i < 10 ? 240 + i * 35 : 0}ms"
        >
          <div class="flex items-start justify-between gap-3 p-3">
            <div class="flex min-w-0 flex-1 items-start gap-2.5">
              <span
                class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-white"
              >
                <Icon name={h.icon} size={14} stroke={2.5} />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-xs font-bold text-white"
                    >@{l.adminUsername ?? l.adminId}</span
                  >
                  <span
                    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold {toneFor(
                      l.action,
                    )}"
                  >
                    <Icon name={h.icon} size={11} />
                    {h.label}
                  </span>
                  <span class="text-xs font-medium text-ink-500"
                    >{l.entity}{l.entityId ? ` #${l.entityId}` : ""}</span
                  >
                  <span class="hidden sm:inline text-xs text-ink-300">·</span>
                  <span class="text-xs font-mono text-ink-400">{l.ip ?? "—"}</span>
                </div>
                {#if detail && detail.length > 0}
                  <div class="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                    {#each detail as d (d.k)}
                      <span
                        class="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs"
                      >
                        {#if d.k}<span class="font-semibold text-ink-500">{d.k}</span>{/if}
                        <span class="font-medium text-ink-800">{d.v}</span>
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <span class="shrink-0 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold text-ink-600"
              >{fmtDate(l.createdAt)}</span
            >
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
