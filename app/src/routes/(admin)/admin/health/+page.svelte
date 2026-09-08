<script lang="ts">
  import { onMount } from "svelte";
  import { Icon } from "@socio/ui";
  import type { PageData } from "./$types";

  let { data } = $props<{ data: PageData }>();

  let live = $state(data.health);
  let tick = $state(0);

  function fmtBytes(n: number): string {
    if (!n || Number.isNaN(n)) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  function ago(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "baru saja";
    if (s < 3600) return `${Math.floor(s / 60)}m lalu`;
    if (s < 86400) return `${Math.floor(s / 3600)}h lalu`;
    return `${Math.floor(s / 86400)}d lalu`;
  }
  function nextIn(sec: number | null | undefined): string {
    if (sec == null) return "—";
    if (sec <= 0) return "segera";
    if (sec < 60) return `${sec}s lagi`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s lagi`;
    return `${Math.floor(sec / 3600)}h lagi`;
  }
  const errPulse = $derived((live.cronHealth ?? []).some((c: any) => c.error24h > 2));

  onMount(() => {
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/admin/health");
        if (r.ok) {
          live = await r.json();
          tick++;
        }
      } catch {}
    }, 30_000);
    return () => clearInterval(id);
  });
</script>

<svelte:head><title>System Health — Socio Admin</title></svelte:head>

<section class="space-y-5">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="font-display text-xl font-extrabold">System Health</h1>
      <p class="text-sm text-ink-500">Cron + Queue + Provider + DB — auto-refresh 30s {tick ? `· tick ${tick}` : ""}</p>
    </div>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-600" role="status" aria-live="polite">
        <span class="h-2 w-2 rounded-full {errPulse ? 'animate-pulse bg-danger' : 'bg-success'}"></span>
        {errPulse ? "Perlu perhatian" : "Sehat"}
      </span>
      <a href="/admin/backup" class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">Backup</a>
    </div>
  </header>

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <!-- Cron health -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-4" role="region" aria-label="Cron health">
      <h2 class="flex items-center gap-2 text-sm font-bold"><Icon name="clock" size={14} /> Cron Health</h2>
      <p class="mt-0.5 text-xs text-ink-500">Last run · next run · error 24h</p>
      <ul class="mt-3 divide-y divide-ink-50">
        {#each live.cronHealth as c}
          <li class="flex items-center justify-between gap-3 py-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 text-sm font-semibold">
                <span class="h-2 w-2 rounded-full {c.status === 'ok' ? 'bg-success' : c.status === 'error' ? 'bg-danger animate-pulse' : c.status === 'never' ? 'bg-ink-300' : 'bg-warning'}"></span>
                {c.label}
                <span class="text-[10px] font-bold uppercase tracking-wide {c.status === 'ok' ? 'text-success' : c.status === 'error' ? 'text-danger' : 'text-ink-400'}">{c.status}</span>
              </div>
              <div class="text-xs text-ink-500">{c.note} · {c.lastAt ? ago(c.lastAt) : "never"} · next {nextIn(c.nextInSec)}</div>
            </div>
            <div class="text-right text-xs tabular-nums">
              {#if c.durationMs != null}<div class="font-semibold">{c.durationMs}ms</div>{/if}
              {#if c.fetched != null}<div class="text-ink-500">{c.fetched}/{c.changed}</div>{/if}
              {#if c.error24h}<div class="text-danger font-bold">{c.error24h} err/24h</div>{/if}
            </div>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Queue depth -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-4" role="region" aria-label="Queue depth">
      <h2 class="flex items-center gap-2 text-sm font-bold"><Icon name="list" size={14} /> Queue Depth</h2>
      <p class="mt-0.5 text-xs text-ink-500">job_queue by status · pending oldest age</p>
      <div class="mt-3 grid grid-cols-3 gap-2">
        {#each Object.entries(live.queue.byStatus) as [status, cnt]}
          <div class="rounded-xl bg-ink-50 px-3 py-2.5 text-center">
            <div class="text-[10px] font-bold uppercase tracking-wide text-ink-500">{status}</div>
            <div class="font-mono text-lg font-extrabold tabular-nums">{cnt}</div>
          </div>
        {/each}
        {#if Object.keys(live.queue.byStatus).length === 0}
          <div class="col-span-3 rounded-xl bg-success-soft px-3 py-4 text-center text-sm font-semibold text-success">Queue kosong — semua job selesai</div>
        {/if}
      </div>
      <div class="mt-3 text-xs text-ink-500">Pending: <span class="font-bold text-ink-900 tabular-nums">{live.queue.pending}</span> · oldest: {live.queue.oldestSec != null ? `${Math.floor(live.queue.oldestSec / 60)}m` : "—"}</div>
    </div>

    <!-- Provider health -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-4" role="region" aria-label="Provider health">
      <h2 class="flex items-center gap-2 text-sm font-bold"><Icon name="zap" size={14} /> Provider Health</h2>
      <p class="mt-0.5 text-xs text-ink-500">SMMturk · last sync</p>
      {#if live.provider.lastSync}
        <div class="mt-3 flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold">{live.provider.lastSync.status} · {live.provider.lastSync.durationMs}ms</div>
            <div class="text-xs text-ink-500">{ago(live.provider.lastSync.at)}</div>
          </div>
          <span class="h-2 w-2 rounded-full {live.provider.lastSync.status === 'ok' ? 'bg-success' : 'bg-danger animate-pulse'}"></span>
        </div>
      {:else}
        <div class="mt-3 text-sm text-ink-500">Belum ada sync.</div>
      {/if}
      <div class="mt-3 text-xs text-ink-500">Balance via SMMturk API — cek di halaman Provider untuk refresh.</div>
    </div>

    <!-- DB size -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-4" role="region" aria-label="DB size">
      <h2 class="flex items-center gap-2 text-sm font-bold"><Icon name="database" size={14} /> DB Size</h2>
      <p class="mt-0.5 text-xs text-ink-500">Total + top 5 tables (information_schema)</p>
      <div class="mt-3 text-2xl font-extrabold tabular-nums">{fmtBytes(live.db.totalBytes)}</div>
      <ul class="mt-3 space-y-1">
        {#each live.db.topTables as t}
          <li class="flex items-center justify-between text-xs">
            <span class="font-mono text-ink-600">{t.name}</span>
            <span class="tabular-nums font-semibold">{fmtBytes(t.bytes)} <span class="text-ink-400">{((t.bytes / Math.max(1, live.db.totalBytes)) * 100).toFixed(1)}%</span></span>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <p class="text-center text-xs text-ink-400" aria-live="polite">Diperbarui {fmtBytes(live.db.totalBytes)} · {new Date(live.generatedAt).toLocaleTimeString("id-ID")} · auto-refresh 30s</p>
</section>
