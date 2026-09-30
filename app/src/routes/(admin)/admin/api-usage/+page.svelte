<script lang="ts">
  import { Chart, StatCard, Icon } from "@socio/ui";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const RANGES = [
    { key: "7d", label: "7 hari" },
    { key: "30d", label: "30 hari" },
    { key: "all", label: "All time" },
  ];

  function rangeHref(r: string) {
    return `/admin/api-usage?range=${r}`;
  }

  function fmt(n: number) {
    return n.toLocaleString("id-ID");
  }

  function dt(v: string | Date) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("id-ID", { hour12: false });
  }

  const chartSeries = $derived([
    {
      label: "Panggilan API",
      data: data.daily.map((d) => d.total),
      color: "var(--color-primary)",
    },
  ]);
</script>

<div class="space-y-5">
  <!-- Header + range tabs -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-lg font-bold text-ink-800">API Usage</h1>
      <p class="text-xs text-ink-500">
        Pemakaian API publik /api/v1 — audit penyalahgunaan & kuota.
      </p>
    </div>
    <div class="flex gap-1 rounded-full border border-ink-200 bg-surface p-1">
      {#each RANGES as r (r.key)}
        <a
          href={rangeHref(r.key)}
          class="rounded-full px-3 py-1 text-xs font-semibold transition-colors {data.range ===
          r.key
            ? 'bg-primary-500 text-white'
            : 'text-ink-500 hover:bg-ink-100'}">{r.label}</a
        >
      {/each}
    </div>
  </div>

  {#if data.totals.total === 0}
    <div class="rounded-2xl border border-ink-100 bg-surface p-8 text-center">
      <div
        class="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400"
      >
        <Icon name="activity" size={22} />
      </div>
      <p class="text-sm font-semibold text-ink-600">Belum ada pemakaian API</p>
      <p class="text-xs text-ink-400">Data akan muncul setelah ada panggilan ke /api/v1.</p>
    </div>
  {:else}
    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="reveal" style="--d:60ms">
        <StatCard
          label="Total panggilan"
          value={fmt(data.totals.total)}
          icon="activity"
          tone="primary"
        />
      </div>
      <div class="reveal" style="--d:120ms">
        <StatCard
          label="Gagal / salah action"
          value={fmt(data.totals.errors)}
          icon="warning"
          tone={data.totals.errors > 0 ? "warning" : "success"}
        />
      </div>
      <div class="reveal" style="--d:180ms">
        <StatCard
          label="User unik"
          value={fmt(data.totals.uniqueUsers)}
          icon="user"
          tone="accent"
        />
      </div>
    </div>

    <!-- Daily chart -->
    <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:240ms">
      <h2 class="mb-2 text-sm font-semibold">Panggilan per hari</h2>
      <Chart series={chartSeries} labels={data.daily.map((d) => d.day)} height={220} />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Per action -->
      <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:300ms">
        <h2 class="mb-3 text-sm font-semibold">Per action</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase text-ink-400">
              <th class="pb-2">Action</th>
              <th class="pb-2 text-right">Total</th>
              <th class="pb-2 text-right">Gagal</th>
            </tr>
          </thead>
          <tbody>
            {#each data.byAction as a (a.action)}
              <tr class="border-t border-ink-100">
                <td class="py-1.5 font-medium text-ink-700">{a.action || "(kosong)"}</td>
                <td class="py-1.5 text-right tabular-nums">{fmt(a.total)}</td>
                <td
                  class="py-1.5 text-right tabular-nums {a.errors > 0
                    ? 'text-danger'
                    : 'text-ink-400'}">{fmt(a.errors)}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Top users -->
      <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:360ms">
        <h2 class="mb-3 text-sm font-semibold">User terbanyak</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase text-ink-400">
              <th class="pb-2">User</th>
              <th class="pb-2 text-right">Total</th>
              <th class="pb-2 text-right">Gagal</th>
              <th class="pb-2 text-right">Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {#each data.topUsers as u (u.userId ?? -1)}
              <tr class="border-t border-ink-100">
                <td class="py-1.5 font-medium text-ink-700">
                  {u.username ?? `#${u.userId ?? "?"} (key invalid)`}
                </td>
                <td class="py-1.5 text-right tabular-nums">{fmt(u.total)}</td>
                <td
                  class="py-1.5 text-right tabular-nums {u.errors > 0
                    ? 'text-danger'
                    : 'text-ink-400'}">{fmt(u.errors)}</td
                >
                <td class="py-1.5 text-right text-[11px] text-ink-400">{dt(u.lastSeen)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent calls -->
    <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4" style="--d:420ms">
      <h2 class="mb-3 text-sm font-semibold">50 panggilan terakhir</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase text-ink-400">
              <th class="pb-2">Waktu</th>
              <th class="pb-2">User</th>
              <th class="pb-2">Action</th>
              <th class="pb-2">Status</th>
              <th class="pb-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recent as r (r.id)}
              <tr class="border-t border-ink-100">
                <td class="py-1.5 text-[11px] text-ink-500">{dt(r.createdAt)}</td>
                <td class="py-1.5 font-medium text-ink-700"
                  >{r.username ?? `#${r.userId ?? "?"}`}</td
                >
                <td class="py-1.5 text-ink-600">{r.action || "(kosong)"}</td>
                <td class="py-1.5">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold {r.ok
                      ? 'bg-success-soft text-success'
                      : 'bg-danger/10 text-danger'}">{r.ok ? "OK" : "Gagal"}</span
                  >
                </td>
                <td class="py-1.5 text-[11px] tabular-nums text-ink-400">{r.ip ?? "—"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
