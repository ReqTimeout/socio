<script lang="ts">
  import { Chart, StatCard, Icon, toast } from "@socio/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const RANGES = [
    { key: "7d", label: "7 hari" },
    { key: "30d", label: "30 hari" },
    { key: "month", label: "Bulan ini" },
    { key: "all", label: "All time" },
  ];

  const STATUS_TONE: Record<string, { bg: string; text: string; label: string }> = {
    Pending: { bg: "bg-warning-soft", text: "text-warning", label: "Pending" },
    Processing: { bg: "bg-primary-soft", text: "text-primary-ink", label: "Proses" },
    "In progress": { bg: "bg-primary-soft", text: "text-primary-ink", label: "Berjalan" },
    Success: { bg: "bg-success-soft", text: "text-success", label: "Sukses" },
    Partial: { bg: "bg-warning-soft", text: "text-warning", label: "Sebagian" },
    Error: { bg: "bg-danger/10", text: "text-danger", label: "Error" },
    Canceled: { bg: "bg-ink-100", text: "text-ink-500", label: "Batal" },
    Refilling: { bg: "bg-primary-soft", text: "text-primary-ink", label: "Refill" },
  };

  function rangeHref(r: string) {
    return `/admin/reporting?range=${r}`;
  }

  function rp(n: number) {
    return "Rp" + Math.round(n).toLocaleString("id-ID");
  }
  function rpShort(n: number) {
    if (n >= 1_000_000) return "Rp" + (n / 1_000_000).toFixed(1).replace(".0", "") + "jt";
    if (n >= 1_000) return "Rp" + Math.round(n / 1_000) + "rb";
    return "Rp" + Math.round(n);
  }
  const fmt = (n: number) => n.toLocaleString("id-ID");

  const totalStatus = $derived(
    data.statusBreakdown.reduce((a: number, s: { count: number }) => a + s.count, 0),
  );

  const maxServiceRev = $derived(
    Math.max(1, ...data.topServices.map((s: { revenue: number }) => s.revenue)),
  );
  const maxUserSpend = $derived(
    Math.max(1, ...data.topUsers.map((u: { spend: number }) => u.spend)),
  );

  function exportCsv(kind: "orders" | "services" | "users") {
    let csv = "";
    let filename = "";
    if (kind === "orders") {
      csv =
        "status,orders,revenue\n" +
        data.statusBreakdown
          .map(
            (s: { status: string; count: number; revenue: number }) =>
              `${s.status},${s.count},${s.revenue}`,
          )
          .join("\n");
      filename = `reporting-status-${data.range}.csv`;
    } else if (kind === "services") {
      csv =
        "service,orders,revenue,profit\n" +
        data.topServices
          .map(
            (s: { name: string; ordersCount: number; revenue: number; profit: number }) =>
              `"${s.name.replace(/"/g, '""')}",${s.ordersCount},${s.revenue},${s.profit}`,
          )
          .join("\n");
      filename = `top-services-${data.range}.csv`;
    } else {
      csv =
        "user_id,username,orders,spend\n" +
        data.topUsers
          .map(
            (u: { userId: number; username: string; ordersCount: number; spend: number }) =>
              `${u.userId},${u.username},${u.ordersCount},${u.spend}`,
          )
          .join("\n");
      filename = `top-users-${data.range}.csv`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Export ${filename} selesai.`, "success");
  }

  const chartSeries = $derived([
    {
      label: "Revenue",
      data: data.days.map((d) => d.revenue),
      color: "var(--color-success)",
    },
  ]);
</script>

<svelte:head>
  <title>Reporting — Admin Socio.id</title>
</svelte:head>

<section class="space-y-4">
  <!-- Header -->
  <div class="flex flex-wrap items-end justify-between gap-2">
    <div>
      <h1 class="font-display text-xl font-bold">Reporting</h1>
      <p class="text-sm text-ink-500">
        Analitik order, revenue, dan aktivitas user berdasarkan periode.
      </p>
    </div>
    <!-- Range switcher -->
    <div
      class="inline-flex rounded-full border border-ink-200 bg-surface p-0.5 text-xs font-semibold"
    >
      {#each RANGES as r}
        <a
          href={rangeHref(r.key)}
          class="rounded-full px-3 py-1.5 transition-all {data.range === r.key
            ? 'bg-ink-900 text-ink-50 shadow-sm'
            : 'text-ink-500 hover:text-ink-700'}"
        >
          {r.label}
        </a>
      {/each}
    </div>
  </div>

  {#if data.overview.totalOrders === 0}
    <div
      class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-warning-ink"
    >
      <Icon name="alert" size={16} stroke={2} class="mt-0.5 shrink-0 text-amber-600" />
      <span
        >Tidak ada order di periode ini. Coba <a
          href="/admin/reporting?range=all"
          class="font-bold underline">All time</a
        > untuk melihat semua data (order terakhir 20 Jun 2026).</span
      >
    </div>
  {/if}

  <!-- Overview stats -->
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-2 xl:grid-cols-4">
    <div class="reveal" style="--d:60ms">
      <StatCard
        label="Total order"
        value={fmt(data.overview.totalOrders)}
        icon="receipt"
        tone="primary"
        hint={`${fmt(data.overview.successOrders)} sukses`}
      />
    </div>
    <div class="reveal" style="--d:120ms">
      <StatCard
        label="Revenue"
        value={rpShort(data.overview.revenue)}
        icon="trending_up"
        tone="success"
        hint={`Sukses ${rpShort(data.overview.revenueDone)}`}
      />
    </div>
    <div class="reveal" style="--d:180ms">
      <StatCard
        label="Profit"
        value={rpShort(data.overview.totalProfit)}
        icon="wallet"
        tone="accent"
        hint={`Avg order ${rpShort(data.overview.avgPrice)}`}
      />
    </div>
    <div class="reveal" style="--d:240ms">
      <StatCard
        label="Success rate"
        value={`${data.overview.successRate.toFixed(1)}%`}
        icon="check"
        tone={data.overview.successRate >= 80 ? "success" : "warning"}
      />
    </div>
  </div>

  <!-- Revenue chart -->
  <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:300ms">
    <div class="mb-2 flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold">Revenue 14 hari</h2>
        <p class="text-[11px] text-ink-400">
          Total {rp(data.days.reduce((a, d) => a + d.revenue, 0))}
        </p>
      </div>
    </div>
    <Chart
      series={chartSeries}
      labels={data.days.map((d) => d.label)}
      height={220}
      formatValue={(v) => rpShort(v)}
    />
  </div>

  <!-- Status breakdown + Top services -->
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:360ms">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Status breakdown</h2>
        <button
          type="button"
          onclick={() => exportCsv("orders")}
          class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <Icon name="arrow_down" size={11} stroke={2.5} />
          CSV
        </button>
      </div>
      {#if data.statusBreakdown.length === 0}
        <p class="py-8 text-center text-sm text-ink-400">Belum ada order di periode ini.</p>
      {:else}
        <ul class="space-y-2">
          {#each data.statusBreakdown as s, i (s.status)}
            {@const meta = STATUS_TONE[s.status] ?? {
              bg: "bg-ink-100",
              text: "text-ink-600",
              label: s.status,
            }}
            {@const pct = totalStatus > 0 ? (s.count / totalStatus) * 100 : 0}
            <li class="reveal" style="--d:{400 + i * 30}ms">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-ink-700">{meta.label}</span>
                <span class="tabular-nums text-ink-500">
                  {fmt(s.count)} · {pct.toFixed(1)}%
                </span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  class="h-full rounded-full {meta.bg}"
                  style="width: {pct}%; transition: width 0.6s cubic-bezier(0.16,1,0.3,1);"
                ></div>
              </div>
              <p class="mt-0.5 text-[10px] text-ink-400">{rp(s.revenue)} nilai</p>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:420ms">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Top layanan (sukses)</h2>
        <button
          type="button"
          onclick={() => exportCsv("services")}
          class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <Icon name="arrow_down" size={11} stroke={2.5} />
          CSV
        </button>
      </div>
      {#if data.topServices.length === 0}
        <p class="py-8 text-center text-sm text-ink-400">
          Belum ada layanan sukses di periode ini.
        </p>
      {:else}
        <ul class="space-y-2.5">
          {#each data.topServices as s, i (s.name)}
            <li class="reveal" style="--d:{460 + i * 30}ms">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="min-w-0 truncate font-semibold text-ink-800">{s.name}</span>
                <span class="shrink-0 tabular-nums text-ink-500">
                  {fmt(s.ordersCount)} order · {rpShort(s.revenue)}
                </span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                  style="width: {(s.revenue / maxServiceRev) *
                    100}%; transition: width 0.6s cubic-bezier(0.16,1,0.3,1);"
                ></div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <!-- Top users -->
  <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:540ms">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold">Top user (belanja)</h2>
      <button
        type="button"
        onclick={() => exportCsv("users")}
        class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
      >
        <Icon name="arrow_down" size={11} stroke={2.5} />
        CSV
      </button>
    </div>
    {#if data.topUsers.length === 0}
      <p class="py-8 text-center text-sm text-ink-400">Belum ada user belanja di periode ini.</p>
    {:else}
      <ul class="space-y-2">
        {#each data.topUsers as u, i (u.userId)}
          <li class="reveal flex items-center gap-3" style="--d:{580 + i * 30}ms">
            <span
              class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-600"
            >
              {i + 1}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="truncate font-semibold text-ink-800">@{u.username}</span>
                <span class="shrink-0 tabular-nums text-ink-500">
                  {fmt(u.ordersCount)} order · {rpShort(u.spend)}
                </span>
              </div>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700"
                  style="width: {(u.spend / maxUserSpend) *
                    100}%; transition: width 0.6s cubic-bezier(0.16,1,0.3,1);"
                ></div>
              </div>
            </div>
          </li>
        {/each}
      </ul>
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
