<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  let preview: string | null = $state(null);
  let rejectNotes = $state("");
  let rejectId = $state<number | null>(null);

  const fmtRp = (n: number) => "Rp" + Number(n).toLocaleString("id-ID");
  const fmtDate = (d: string | Date) => new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
</script>

<svelte:head>
  <title>Verifikasi Deposit — Socio Admin</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="font-display text-xl font-extrabold">Verifikasi Deposit</h1>
      <p class="mt-1 text-sm text-ink-500">
        {#if data.pendingCount > 0}
          <span class="font-semibold text-amber-700">{data.pendingCount} menunggu</span> · oldest {data.oldest ? fmtDate(data.oldest) : "-"}
        {:else}
          Tidak ada antrian — semua terverifikasi
        {/if}
      </p>
    </div>
    <a href="/admin/deposits" class="text-sm font-bold text-primary hover:underline">← Semua deposit</a>
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{form.success}</div>
  {/if}

  {#if data.deposits.length === 0}
    <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center">
      <Icon name="wallet" size={32} class="mx-auto text-ink-300" />
      <p class="mt-2 text-sm font-bold text-ink-700">Tidak ada deposit butuh verifikasi</p>
      <p class="mt-1 text-xs text-ink-500">Deposit tanpa bukti tidak masuk antrian ini.</p>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.deposits as d}
        <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
          <button type="button" onclick={() => (preview = d.img)} class="block w-full">
            {#if d.img}
              <img src={d.img} alt="Bukti #{d.id}" class="h-40 w-full object-contain bg-ink-50" loading="lazy" />
            {:else}
              <div class="grid h-40 place-items-center bg-ink-50 text-ink-400">No image</div>
            {/if}
          </button>
          <div class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-mono text-xs font-bold">#{d.id} · @{d.username ?? d.userId}</p>
                <p class="text-xs text-ink-500">{fmtDate(d.createdAt)}</p>
              </div>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Pending</span>
            </div>
            <div class="mt-3 space-y-1 text-sm">
              <div class="flex justify-between"><span class="text-ink-500">Nominal</span><span class="font-mono font-bold">{fmtRp(d.amount)}</span></div>
              <div class="flex justify-between"><span class="text-ink-500">Post amount</span><span class="font-mono">{fmtRp(d.postAmount)}</span></div>
            </div>
            <div class="mt-3 flex gap-2">
              <form method="POST" action="?/verify" use:enhance class="flex-1">
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="action" value="approve" />
                <Button type="submit" size="sm" full>Cocok & Setujui</Button>
              </form>
              <button
                type="button"
                onclick={() => {
                  rejectId = d.id;
                  rejectNotes = "";
                }}
                class="rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50"
              >
                Tidak Cocok
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if preview}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4" role="dialog" aria-modal="true">
      <div class="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-surface p-2">
        <button type="button" onclick={() => (preview = null)} class="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-900/60 text-white" aria-label="Tutup">✕</button>
        <img src={preview} alt="Preview bukti" class="max-h-[80vh] w-auto object-contain" />
      </div>
    </div>
  {/if}

  {#if rejectId !== null}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true">
      <form method="POST" action="?/verify" use:enhance class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <h2 class="font-bold">Tolak deposit #{rejectId}</h2>
        <p class="mt-1 text-sm text-ink-500">Alasan wajib diisi.</p>
        <input type="hidden" name="id" value={rejectId ?? ""} />
        <input type="hidden" name="action" value="reject" />
        <textarea name="notes" bind:value={rejectNotes} placeholder="Bukti tidak terbaca · minta upload ulang" required class="mt-3 h-20 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"></textarea>
        <div class="mt-4 flex gap-2">
          <Button type="button" variant="ghost" onclick={() => (rejectId = null)}>Batal</Button>
          <Button type="submit" variant="danger">Tolak</Button>
        </div>
      </form>
    </div>
  {/if}
</div>
