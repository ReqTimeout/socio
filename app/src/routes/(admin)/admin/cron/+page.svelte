<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  function ago(iso: string | null): string {
    if (!iso) return "belum pernah jalan";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}d lalu`;
    if (s < 3600) return `${Math.floor(s / 60)}m lalu`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m lalu`;
    return `${Math.floor(s / 86400)}h lalu`;
  }
  function nextIn(sec: number | null): string {
    if (sec == null) return "—";
    if (sec <= 0) return "segera";
    if (sec < 60) return `${sec}d lagi`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m lagi`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m lagi`;
    return `${Math.floor(sec / 86400)}h lagi`;
  }
  function fmtMs(ms: number | null): string {
    if (ms == null) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  onMount(() => {
    const id = setInterval(() => {
      if (!document.hidden) invalidateAll();
    }, 15000);
    return () => clearInterval(id);
  });
</script>

<svelte:head><title>Cron Jobs — Socio Admin</title></svelte:head>

<section class="space-y-5">
  <header>
    <h1 class="flex items-center gap-2 font-display text-xl font-extrabold">
      <span class="grid h-8 w-8 place-items-center rounded-xl bg-ink-900 text-ink-50">
        <Icon name="clock" size={15} stroke={2.5} />
      </span>
      Cron Jobs
    </h1>
    <p class="mt-1 text-sm text-ink-500">
      Semua {data.jobs.length} job + jadwal + run terakhir + tombol jalankan manual. Auto-refresh 15 detik.
    </p>
  </header>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{form.success}</div>
  {/if}

  <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
    {#each data.jobs as j (j.key)}
      <div
        class="rounded-2xl border border-ink-100 bg-surface p-4 {j.last?.status === 'error' || j.error24h > 2
          ? 'border-danger/30'
          : ''}"
        role="region"
        aria-label="Cron {j.label}"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="flex items-center gap-2 text-sm font-bold">
              <span
                class="h-2 w-2 shrink-0 rounded-full {j.running
                  ? 'animate-pulse bg-warning'
                  : !j.last
                    ? 'bg-ink-300'
                    : j.last.status === 'ok'
                      ? 'bg-success'
                      : j.last.status === 'error'
                        ? 'bg-danger'
                        : 'bg-warning'}"
              ></span>
              {j.label}
            </h2>
            <p class="mt-0.5 text-xs text-ink-500">{j.note}</p>
            <p class="mt-1 text-[11px] font-semibold text-ink-400">Jadwal: {j.scheduleLabel}</p>
          </div>
          <form method="POST" action="?/run" use:enhance>
            <input type="hidden" name="key" value={j.key} />
            <Button type="submit" size="sm" disabled={j.running}>
              {j.running ? "Jalan…" : "Jalankan"}
            </Button>
          </form>
        </div>

        <dl class="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-ink-50/60 p-2.5 text-xs">
          <div>
            <dt class="font-semibold uppercase tracking-wide text-ink-400 text-[10px]">Terakhir</dt>
            <dd class="font-bold text-ink-900">
              {j.last ? ago(j.last.at) : "—"}
              {#if j.last}
                <span
                  class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] {j.last.status === 'ok'
                    ? 'bg-success/10 text-success'
                    : j.last.status === 'error'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-warning/10 text-warning'}">{j.last.status}</span
                >
              {/if}
            </dd>
            {#if j.last}
              <dd class="mt-0.5 text-ink-500">
                {fmtMs(j.last.durationMs)} · {j.last.by}
              </dd>
            {/if}
          </div>
          <div>
            <dt class="font-semibold uppercase tracking-wide text-ink-400 text-[10px]">Berikutnya</dt>
            <dd class="font-bold text-ink-900">{j.running ? "sedang jalan" : nextIn(j.nextInSec)}</dd>
          </div>
          <div>
            <dt class="font-semibold uppercase tracking-wide text-ink-400 text-[10px]">Error 24h</dt>
            <dd class="font-bold {j.error24h > 0 ? 'text-danger' : 'text-ink-900'}">{j.error24h}</dd>
          </div>
        </dl>

        {#if j.last?.error}
          <p class="mt-2 truncate rounded-lg bg-danger/5 px-2.5 py-1.5 font-mono text-[11px] text-danger" title={j.last.error}>
            {j.last.error}
          </p>
        {/if}
      </div>
    {/each}
  </div>

  <p class="text-center text-xs text-ink-400">
    Riwayat max 200 run per job · trigger manual tercatat dengan ID admin · log detail di tabel cron_runs
  </p>
</section>
