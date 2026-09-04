<script lang="ts">
  import { Button, EmptyState, Icon } from "@socio/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let q = $state("");
  $effect(() => {
    q = data.q;
  });

  const fmtDate = (d: Date | string) =>
    new Date(d as string).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // P2-02: Tone per action (success / warning / danger / primary / neutral)
  // Align dengan ContextFab tones (5 kategori) — bukan raw Tailwind shades.
  type ActionMeta = { label: string; icon: string; tone: ActionTone };
  const ACTIONS: Record<string, ActionMeta> = {
    // === Deposit ===
    confirm_deposit: { label: "Konfirmasi deposit", icon: "check", tone: "success" },
    reject_deposit: { label: "Tolak deposit", icon: "x", tone: "danger" },
    adjust_balance: { label: "Adjust saldo", icon: "wallet", tone: "warning" },
    // === User ===
    create_user: { label: "Buat user", icon: "user-plus", tone: "success" },
    update_user: { label: "Update user", icon: "user", tone: "neutral" },
    edit_user: { label: "Edit user", icon: "settings", tone: "neutral" },
    delete_user: { label: "Hapus user", icon: "trash", tone: "danger" },
    change_level: { label: "Ubah level user", icon: "shield", tone: "warning" },
    suspend_user: { label: "Blokir user", icon: "lock", tone: "danger" },
    // === Order ===
    update_order_status: { label: "Update status order", icon: "receipt", tone: "neutral" },
    edit_order_provider: { label: "Edit provider order", icon: "zap", tone: "warning" },
    // === Maintenance ===
    enable_maintenance: { label: "Maintenance ON", icon: "shield", tone: "warning" },
    disable_maintenance: { label: "Maintenance OFF", icon: "shield", tone: "neutral" },
    // === Coupon ===
    create_coupon: { label: "Buat kupon", icon: "gift", tone: "success" },
    delete_coupon: { label: "Hapus kupon", icon: "gift", tone: "danger" },
    // === Banner ===
    create_banner: { label: "Buat banner", icon: "image", tone: "primary" },
    update_banner: { label: "Update banner", icon: "image", tone: "neutral" },
    delete_banner: { label: "Hapus banner", icon: "image", tone: "danger" },
    activate_banner: { label: "Aktifkan banner", icon: "image", tone: "success" },
    deactivate_banner: { label: "Nonaktifkan banner", icon: "image", tone: "neutral" },
    // === News ===
    create_news: { label: "Buat berita", icon: "megaphone", tone: "primary" },
    update_news: { label: "Update berita", icon: "megaphone", tone: "neutral" },
    delete_news: { label: "Hapus berita", icon: "megaphone", tone: "danger" },
    // === Provider ===
    sync_provider: { label: "Sync provider", icon: "refresh", tone: "primary" },
    add_provider: { label: "Tambah provider", icon: "zap", tone: "success" },
    edit_provider: { label: "Edit provider", icon: "zap", tone: "neutral" },
    delete_provider: { label: "Hapus provider", icon: "zap", tone: "danger" },
    test_provider: { label: "Tes provider", icon: "zap", tone: "warning" },
    encrypt_provider_keys: { label: "Encrypt provider keys", icon: "lock", tone: "warning" },
    // === Ticket ===
    reply_ticket: { label: "Balas tiket", icon: "ticket", tone: "neutral" },
    close_ticket: { label: "Tutup tiket", icon: "ticket", tone: "danger" },
    reopen_ticket: { label: "Buka tiket", icon: "ticket", tone: "success" },
    // === Email campaign ===
    create_email_campaign: { label: "Buat campaign email", icon: "mail", tone: "primary" },
    delete_email_campaign: { label: "Hapus campaign email", icon: "mail", tone: "danger" },
    // === Pricing ===
    save_pricing_rules: { label: "Simpan harga", icon: "tag", tone: "warning" },
    apply_pricing_to_catalog: { label: "Update katalog harga", icon: "tag", tone: "success" },
  };

  type ActionTone = "success" | "warning" | "danger" | "primary" | "neutral";
  function humanAction(action: string): ActionMeta {
    return ACTIONS[action] ?? { label: action.replace(/_/g, " "), icon: "clock", tone: "neutral" };
  }

  // Tone → Tailwind class (align dengan ContextFab & StatusBadge)
  const TONE_CLS: Record<ActionTone, string> = {
    success: "bg-success-soft text-success-ink border-success/30",
    warning: "bg-warning-soft text-warning-ink border-warning/30",
    danger: "bg-danger-soft text-danger-ink border-danger/30",
    primary: "bg-primary-soft text-primary-ink border-primary/30",
    neutral: "bg-ink-50 text-ink-700 border-ink-200",
  };
  const toneFor = (action: string) => TONE_CLS[humanAction(action).tone];

  // IP resolved check: "0.0.0.0" / null / empty = unresolved (no proxy header)
  function ipResolved(ip: string | null | undefined): boolean {
    return !!ip && ip !== "0.0.0.0";
  }

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
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-ink-50 shadow-sm"
        >
          <Icon name="shield" size={18} stroke={2.5} />
        </span>
        Audit Log
        <span class="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-ink-50"
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
          class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-ink-50 hover:bg-ink-800"
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
            ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
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
              ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
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
        art="audit"
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
                class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-ink-50"
              >
                <Icon name={h.icon} size={14} stroke={2.5} />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-xs font-bold text-ink-50"
                    >@{l.adminUsername ?? l.adminId}</span
                  >
                  <span
                    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold {toneFor(
                      l.action,
                    )}"
                  >
                    <Icon name={h.icon} size={11} stroke={2.5} />
                    {h.label}
                  </span>
                  <span class="text-xs font-medium text-ink-500"
                    >{l.entity}{l.entityId ? ` #${l.entityId}` : ""}</span
                  >
                  <span class="hidden sm:inline text-xs text-ink-300">·</span>
                  {#if ipResolved(l.ip)}
                    <span class="font-mono text-xs font-medium text-ink-500" title="IP resolved via proxy header"
                      >{l.ip}</span
                    >
                  {:else}
                    <span
                      class="inline-flex items-center gap-0.5 rounded-md bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-warning-ink ring-1 ring-warning/20"
                      title="IP tidak ter-resolve — request tidak lewat trusted proxy. Cek TRUST_PROXY_HEADERS=true & reverse proxy config."
                    >
                      <Icon name="alert-triangle" size={9} stroke={2.75} />
                      {l.ip ?? "unresolved"}
                    </span>
                  {/if}
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
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
        class:pointer-events-none={data.page === data.pages}
        class:text-ink-400={data.page === data.pages}
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
