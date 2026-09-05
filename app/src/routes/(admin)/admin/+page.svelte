<script lang="ts">
  import { onMount } from "svelte";
  import { invalidate } from "$app/navigation";
  import { Chart, Icon, StatusBadge, tweenNumber } from "@socio/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const m = $derived(data.metrics);

  // P2-08: Live auto-refresh (10s) — pause saat tab hidden, pause saat user interact 5s
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let userPauseTimer: ReturnType<typeof setTimeout> | null = null;
  let lastRefreshed = $state(Date.now());
  let isPaused = $state(false);

  function scheduleRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (document.hidden) return;
      if (isPaused) return;
      invalidate("admin:dashboard").finally(() => {
        lastRefreshed = Date.now();
      });
    }, 10_000);
  }

  function pauseRefresh() {
    isPaused = true;
    if (userPauseTimer) clearTimeout(userPauseTimer);
    userPauseTimer = setTimeout(() => {
      isPaused = false;
    }, 5_000);
  }

  onMount(() => {
    scheduleRefresh();
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      if (userPauseTimer) clearTimeout(userPauseTimer);
    };
  });

  function fmtCountdown(ts: number): string {
    const elapsed = Math.max(0, 10 - Math.floor((Date.now() - ts) / 1000));
    return `${elapsed}s`;
  }

  function rp(n: number) {
    return "Rp" + Math.round(n).toLocaleString("id-ID");
  }

  function ago(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return "baru saja";
    const mi = Math.floor(s / 60);
    if (mi < 60) return `${mi} menit lalu`;
    const h = Math.floor(mi / 60);
    if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} hari lalu`;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  const feedMeta: Record<string, { icon: string; cls: string }> = {
    order: { icon: "receipt", cls: "bg-accent-soft text-accent-ink" },
    deposit: { icon: "wallet", cls: "bg-warning-soft text-warning" },
    user: { icon: "user", cls: "bg-primary-soft text-primary-ink" },
    audit: { icon: "shield", cls: "bg-ink-100 text-ink-600" },
  };

  // Filter feed per tipe aktivitas
  type FeedKind = "all" | "order" | "deposit" | "user" | "audit";
  let filter = $state<FeedKind>("all");
  const filters: { key: FeedKind; label: string; icon: string }[] = [
    { key: "all", label: "Semua", icon: "activity" },
    { key: "order", label: "Order", icon: "receipt" },
    { key: "deposit", label: "Deposit", icon: "wallet" },
    { key: "user", label: "User", icon: "user" },
    { key: "audit", label: "Admin", icon: "shield" },
  ];
  const counts = $derived.by(() => {
    const c: Record<string, number> = {
      all: data.feed.length,
      order: 0,
      deposit: 0,
      user: 0,
      audit: 0,
    };
    for (const f of data.feed) c[f.kind]++;
    return c;
  });
  const shown = $derived(filter === "all" ? data.feed : data.feed.filter((f) => f.kind === filter));

  const queue: {
    icon: string;
    label: string;
    value: string;
    sub: string;
    note: string;
    tone: string;
    accent: string;
  }[] = $derived([
    {
      icon: "refresh",
      label: "Provider sync",
      value: data.queue.sync ? `${data.queue.sync.changed}` : "—",
      sub: data.queue.sync ? `/ ${data.queue.sync.fetched}` : "",
      note: data.queue.sync ? ago(data.queue.sync.at) : "Belum ada sync",
      tone:
        data.queue.sync?.status === "ok"
          ? "text-success"
          : data.queue.sync?.status === "error"
            ? "text-danger"
            : data.queue.sync
              ? "text-warning"
              : "text-ink-300",
      accent: "before:bg-primary-500",
    },
    {
      icon: "activity",
      label: "Polling",
      value: data.queue.polling.toLocaleString("id-ID"),
      sub: "",
      note: "order aktif",
      tone: "text-ink-900",
      accent: "before:bg-accent-500",
    },
    {
      icon: "list",
      label: "Queue",
      value: data.queue.depth.toLocaleString("id-ID"),
      sub: "",
      note: "job pending",
      tone: data.queue.depth > 0 ? "text-warning" : "text-ink-900",
      accent: data.queue.depth > 0 ? "before:bg-warning" : "before:bg-ink-300",
    },
  ]);

  const revenueTotal7d = $derived(m.revenue.spark.reduce((a, b) => a + b, 0));

  // Hero moment: tween revenue counter from 0 → real (700ms cubicOut).
  const revenueTween = tweenNumber(0);
  $effect(() => {
    revenueTween.set(m.revenue.today);
  });
</script>

<section class="space-y-5 lg:space-y-6">
  <header class="reveal flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight lg:text-2xl"
      >
        <span class="grid h-8 w-8 place-items-center rounded-xl bg-ink-900 text-ink-50 shadow-sm">
          <Icon name="shield" size={15} stroke={2.5} />
        </span>
        Command Center
      </h1>
      <p class="mt-0.5 text-sm text-ink-500">Ringkasan real-time operasional Socio hari ini.</p>
    </div>
    <div class="flex items-center gap-2">
      <span
        class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success transition-colors hover:bg-success/15 motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]"
        title={isPaused ? "Auto-refresh dijeda sebentar" : "Auto-refresh tiap 10 detik"}
        onclick={pauseRefresh}
        onkeydown={(e) => (e.key === "Enter" || e.key === " ") && pauseRefresh()}
        role="button"
        tabindex="0"
      >
        <span class="relative flex h-2 w-2">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60"
          ></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
        </span>
        <span>Live · auto-refresh 10s</span>
        <span
          class="rounded-md bg-success/15 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-success-ink"
        >
          {fmtCountdown(lastRefreshed)}
        </span>
      </span>
    </div>
  </header>

  <!-- HERO STAT (single, prominent) — fix anti-pattern #5: no 4-col stat strip -->
  <div
    class="reveal relative overflow-hidden rounded-3xl border border-ink-800 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-5 text-white shadow-[0_18px_44px_-16px_rgba(15,23,42,0.55)] sm:p-8"
    style="--d:60ms"
  >
    <div
      class="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-25 blur-3xl motion-safe:animate-[pulse_6s_ease-in-out_infinite]"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-accent-500/30 blur-3xl"
    ></div>
    <div class="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 flex-1">
        <p
          class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-300"
        >
          <Icon name="trending_up" size={12} stroke={2.5} class="text-accent-400" />
          Revenue hari ini
        </p>
        <div class="mt-1.5 font-display text-4xl font-extrabold tabular-nums sm:text-5xl">
          {rp($revenueTween)}
        </div>
        {#if m.revenue.delta !== undefined}
          <p
            class="mt-1 inline-flex items-center gap-1 text-sm font-semibold {m.revenue.delta >= 0
              ? 'text-success'
              : 'text-danger'}"
          >
            <span class="rounded-full bg-white/10 px-1.5 py-0.5">
              {m.revenue.delta >= 0 ? "▲" : "▼"}
              {Math.abs(m.revenue.delta).toFixed(1)}%
            </span>
            <span class="text-ink-300">vs kemarin</span>
          </p>
        {/if}
      </div>
      <div class="w-full sm:w-64 lg:w-72">
        <Chart
          series={[{ label: "Revenue", data: m.revenue.spark, color: "var(--color-accent-400)" }]}
          labels={data.chart.labels}
          height={72}
          formatValue={(v) => rp(v)}
        />
      </div>
    </div>
  </div>

  <!-- INLINE-STAT NARRATIVE (bukan kartu) — fix anti-pattern #5 -->
  <div
    class="reveal flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-ink-100 bg-surface px-5 py-4 text-sm"
    style="--d:120ms"
  >
    <span class="text-ink-500"
      >User baru <strong class="text-ink-900">{m.users.today.toLocaleString("id-ID")}</strong>
      <span class="text-ink-400">/ {m.users.total.toLocaleString("id-ID")} total</span></span
    >
    <span class="text-ink-200">·</span>
    <span class="text-ink-500"
      >Order <strong class="text-ink-900">{m.orders.today.toLocaleString("id-ID")}</strong
      >{#if m.orders.delta !== undefined}
        <span class={m.orders.delta >= 0 ? "text-success" : "text-danger"}
          >{m.orders.delta >= 0 ? "+" : ""}{m.orders.delta.toFixed(1)}%</span
        >{/if}</span
    >
    <span class="text-ink-200">·</span>
    <span class="text-ink-500"
      >Deposit pending <strong class="text-warning"
        >{m.depositPending.count.toLocaleString("id-ID")}</strong
      >
      <span class="text-ink-400">({rp(m.depositPending.amount)})</span></span
    >
  </div>

  <!-- Queue health -->
  <div class="grid grid-cols-3 gap-2 sm:gap-3">
    {#each queue as q, i (q.label)}
      <div
        class="reveal group relative overflow-hidden rounded-2xl border border-ink-100 bg-surface p-3 pl-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-full before:transition-all before:duration-300 group-hover:before:inset-y-1.5 sm:p-3.5 sm:pl-4 {q.accent}"
        style="--d:{300 + i * 60}ms"
      >
        <div
          class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-400 sm:text-[11px]"
        >
          <Icon name={q.icon} size={12} stroke={2.25} class="shrink-0" />
          <span class="truncate">{q.label}</span>
        </div>
        <div
          class="mt-1.5 truncate font-display text-base font-extrabold tabular-nums sm:text-lg {q.tone}"
        >
          {q.value}{#if q.sub}<span class="text-[11px] font-medium text-ink-400 sm:text-xs">
              {q.sub}</span
            >{/if}
        </div>
        <div class="truncate text-[10px] text-ink-400 sm:text-[11px]">{q.note}</div>
      </div>
    {/each}
  </div>

  <!-- Aktivitas terbaru (utama) + aksi terakhir -->
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div
      class="reveal rounded-2xl border border-ink-100 bg-surface lg:col-span-2"
      style="--d:420ms"
    >
      <div class="flex items-center justify-between border-b border-ink-50 px-4 py-3.5">
        <div class="flex items-center gap-2">
          <span
            class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm"
          >
            <Icon name="activity" size={16} stroke={2.5} />
          </span>
          <div>
            <h2 class="text-sm font-bold leading-tight">Aktivitas terbaru</h2>
            <p class="text-[11px] text-ink-400">Order, deposit, user & aksi admin</p>
          </div>
        </div>
        <a
          href="/admin/audit"
          class="inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-xs font-bold text-primary-ink transition-colors hover:bg-primary-soft"
        >
          Lihat semua <Icon name="arrow_right" size={13} stroke={2.5} />
        </a>
      </div>

      <!-- filter chips — min-h-36 tap comfort -->
      <div class="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto px-1 pt-3 [scrollbar-width:none]">
        {#each filters as fl (fl.key)}
          <button
            type="button"
            onclick={() => (filter = fl.key)}
            class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95
              {filter === fl.key
              ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
              : 'border-ink-100 bg-surface text-ink-500 hover:border-ink-200 hover:text-ink-700'}"
          >
            <Icon name={fl.icon} size={12} stroke={2.25} />
            {fl.label}
            <span
              class="rounded-full px-1.5 text-[10px] tabular-nums {filter === fl.key
                ? 'bg-white/20 text-white'
                : 'bg-ink-100 text-ink-500'}">{counts[fl.key]}</span
            >
          </button>
        {/each}
      </div>

      <!-- list -->
      <div class="feed max-h-[70vh] overflow-y-auto overscroll-contain px-2 py-2 lg:max-h-[26rem]">
        {#if shown.length === 0}
          <p class="px-2 py-8 text-center text-sm text-ink-400">Belum ada aktivitas.</p>
        {:else}
          {#each shown as f, i (f.id)}
            <a
              href={f.href}
              class="reveal group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-200 hover:bg-ink-50"
              style="--d:{i < 12 ? 440 + i * 35 : 0}ms"
            >
              <span
                class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 {feedMeta[
                  f.kind
                ].cls}"
              >
                <Icon name={feedMeta[f.kind].icon} size={16} stroke={2.25} />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-2">
                  <p class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                    {f.title}
                  </p>
                  <span class="shrink-0 whitespace-nowrap text-[11px] text-ink-400"
                    >{ago(f.at)}</span
                  >
                </div>
                <div class="mt-0.5 flex min-w-0 items-center gap-1.5">
                  {#if f.status}
                    <span class="shrink-0 origin-left scale-90"
                      ><StatusBadge status={f.status} /></span
                    >
                  {/if}
                  <p class="min-w-0 flex-1 truncate text-xs text-ink-500">{f.meta}</p>
                </div>
              </div>
            </a>
          {/each}
        {/if}
      </div>
    </div>

    <!-- aksi terakhir kamu + shortcut -->
    <div class="space-y-4">
      <div
        class="reveal relative overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-4 text-ink-50"
        style="--d:480ms"
      >
        <div
          class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-20 blur-2xl"
        ></div>
        <div
          class="relative flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-300"
        >
          <Icon name="shield" size={13} stroke={2.25} /> Aksi terakhir kamu
        </div>
        {#if data.lastMine}
          <p class="relative mt-1.5 text-sm font-semibold">
            {data.lastMine.action}
            {data.lastMine.entity}{data.lastMine.entityId ? ` #${data.lastMine.entityId}` : ""}
          </p>
          <p class="relative text-xs text-ink-400">{ago(data.lastMine.at)}</p>
        {:else}
          <p class="relative mt-1.5 text-sm text-ink-400">Belum ada aksi admin dari akunmu.</p>
        {/if}
      </div>

      <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:540ms">
        <h3 class="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">
          Aksi cepat
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <a
            href="/admin/deposits"
            class="group flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-warning/40 hover:text-warning"
          >
            <Icon name="wallet" size={16} stroke={2.25} /> Deposit
          </a>
          <a
            href="/admin/orders"
            class="group flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-accent-500/40 hover:text-accent-ink"
          >
            <Icon name="receipt" size={16} stroke={2.25} /> Order
          </a>
          <a
            href="/admin/users"
            class="group flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-primary-500/40 hover:text-primary-ink"
          >
            <Icon name="users" size={16} stroke={2.25} /> Users
          </a>
          <a
            href="/admin/audit"
            class="group flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-ink-300 hover:text-ink-900"
          >
            <Icon name="shield" size={16} stroke={2.25} /> Audit
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- Revenue chart 7 hari (bawah, full-width) -->
  <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:600ms">
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span
          class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-success/15 to-success/5 text-success"
        >
          <Icon name="trending_up" size={16} stroke={2.5} />
        </span>
        <div>
          <h2 class="text-sm font-bold leading-tight">Revenue 7 hari</h2>
          <p class="text-[11px] text-ink-400">
            Total {rp(revenueTotal7d)} · {data.chart.labels.length} hari
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <dl class="hidden text-right sm:block">
          <dt class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Rata-rata/hari
          </dt>
          <dd class="font-mono text-xs font-bold tabular-nums text-ink-700">
            {rp(revenueTotal7d / Math.max(1, data.chart.labels.length))}
          </dd>
        </dl>
        <a
          href="/admin/reporting"
          class="inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-xs font-bold text-primary-ink transition-colors hover:bg-primary-soft"
        >
          Detail <Icon name="arrow_right" size={13} stroke={2.5} />
        </a>
      </div>
    </div>
    <div class="mx-auto w-full max-w-3xl">
      <Chart
        series={[{ label: "Revenue", data: data.chart.revenue, color: "var(--color-success)" }]}
        labels={data.chart.labels}
        height={200}
        formatValue={(v) => rp(v)}
      />
    </div>
  </div>
</section>

<style>
  /* Reveal masuk bertahap — transform + opacity only (GPU-friendly). */
  .reveal {
    animation: reveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: var(--d, 0ms);
  }
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* Scrollbar halus untuk feed */
  .feed {
    scrollbar-width: thin;
    scrollbar-color: var(--color-ink-200) transparent;
  }
  .feed::-webkit-scrollbar {
    width: 6px;
  }
  .feed::-webkit-scrollbar-thumb {
    background: var(--color-ink-200);
    border-radius: 9999px;
  }
  .feed::-webkit-scrollbar-track {
    background: transparent;
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal {
      animation: none;
    }
  }
</style>
