<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  let running = $state(false);

  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function fmtDate(d: any): string {
    try {
      return new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return String(d);
    }
  }

  const successCount = $derived(data.backups.filter((b: any) => b.status === "success").length);
  const totalSize = $derived(data.backups.filter((b: any) => b.status === "success").reduce((a: number, b: any) => a + Number(b.sizeBytes ?? 0), 0));
</script>

<svelte:head>
  <title>Backup Database — Socio Admin</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
  <div>
    <h1 class="font-display text-xl font-extrabold">Backup Database</h1>
    <p class="mt-1 text-sm text-ink-500">Dump logical + gzip — auto tiap hari jam 03:00, keep 10 backup</p>
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{form.success}</div>
  {/if}

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div class="rounded-2xl border border-ink-100 bg-surface p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-ink-500">Total backup</p>
      <p class="mt-2 font-display text-2xl font-extrabold">{data.backups.length}</p>
      <p class="text-xs text-ink-500">{successCount} sukses · auto + manual</p>
    </div>
    <div class="rounded-2xl border border-ink-100 bg-surface p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-ink-500">Total size</p>
      <p class="mt-2 font-display text-2xl font-extrabold">{fmtBytes(totalSize)}</p>
      <p class="text-xs text-ink-500">On disk · keep 10</p>
    </div>
    <div class="rounded-2xl border border-ink-100 bg-surface p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-ink-500">Last backup</p>
      <p class="mt-2 font-display text-2xl font-extrabold">{data.backups[0]?.status === "success" ? fmtDate(data.backups[0]?.finishedAt) : "—"}</p>
      <p class="truncate text-xs text-ink-500">{data.backups[0]?.filename ?? "Belum ada"}</p>
    </div>
  </div>

  <form method="POST" action="?/run" use:enhance={() => {
    running = true;
    return ({ update }) => {
      running = false;
      update({ reset: false });
    };
  }} class="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-surface p-4">
    <div>
      <p class="font-bold">Run backup manual</p>
      <p class="text-xs text-ink-500">Rate-limit 2/menit · audit log akan tercatat</p>
    </div>
    <Button type="submit" disabled={running}>{running ? "Running…" : "Run now"}</Button>
  </form>

  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <h2 class="font-bold">Riwayat backup</h2>
    {#if data.backups.length === 0}
      <p class="mt-2 text-sm text-ink-500">Belum ada backup. Klik "Run now" atau tunggu auto backup jam 03:00.</p>
    {:else}
      <ul class="mt-3 divide-y divide-ink-100">
        {#each data.backups as b}
          <li class="flex items-center justify-between gap-3 py-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-[11px] font-bold {b.status === 'success' ? 'bg-success/10 text-success' : b.status === 'running' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}">{b.status}</span>
                <p class="truncate text-sm font-bold">{b.filename}</p>
              </div>
              <p class="mt-1 text-xs text-ink-500">{fmtDate(b.startedAt)} → {b.finishedAt ? fmtDate(b.finishedAt) : "…"} · {fmtBytes(b.sizeBytes)} · {b.triggeredBy === 0 ? "auto" : `admin #${b.triggeredBy}`}</p>
              {#if b.error}
                <p class="mt-1 text-xs text-danger">{b.error}</p>
              {/if}
            </div>
            {#if b.status === "success"}
              <a href="/admin/backup/download/{b.filename}" class="shrink-0 rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-bold hover:bg-ink-50">Download</a>
            {/if}
            <form method="POST" action="?/delete" use:enhance class="shrink-0">
              <input type="hidden" name="id" value={b.id} />
              <button type="submit" class="rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20" onclick={(e) => !confirm("Hapus backup ini?") && e.preventDefault()}>Hapus</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
