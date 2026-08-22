<script lang="ts">
  import { Button, EmptyState, toast, Icon, ConfirmDialog } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let modal = $state<"add" | number | "editKey" | null>(null);
  let confirm = $state<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Edit form state
  let editName = $state("");
  let editUrlOrder = $state("");
  let editUrlStatus = $state("");

  function openEdit(id: number) {
    const p = data.providers.find((x: any) => x.id === id);
    if (!p) return;
    editName = p.name;
    editUrlOrder = p.api_url_order;
    editUrlStatus = p.api_url_status;
    modal = id;
  }

  function closeModal() {
    modal = null;
  }

  function askDelete(p: any) {
    confirm = {
      open: true,
      title: `Hapus provider ${p.name}?`,
      message: `Tindakan ini tidak bisa dibatalkan.${p.services_count > 0 ? " Provider dipakai " + p.services_count + " layanan — hapus akan ditolak." : ""}`,
      action: async () => {
        const fd = new FormData();
        fd.set("id", String(p.id));
        const res = await fetch("?/delete", { method: "POST", body: fd });
        const json = await res.json();
        if (json.type === "failure") toast(json.data?.error ?? "Gagal", "error");
        else toast(json.data?.success ?? "OK", "success");
        confirm = null;
        await applyAction(json);
      },
    };
  }

  function askTest(p: any) {
    confirm = {
      open: true,
      title: `Tes koneksi ${p.name}?`,
      message: "Akan memanggil API balance provider dengan key yang tersimpan. Pastikan key valid.",
      action: async () => {
        const fd = new FormData();
        fd.set("id", String(p.id));
        const res = await fetch("?/testConnection", { method: "POST", body: fd });
        const json = await res.json();
        if (json.type === "failure") toast(json.data?.error ?? "Gagal", "error");
        else toast(json.data?.success ?? "OK", "success");
        confirm = null;
      },
    };
  }

  function askSync(p: any) {
    confirm = {
      open: true,
      title: `Sync katalog ${p.name}?`,
      message:
        "Menarik layanan terbaru dari provider (bisa memakan waktu 1-2 menit untuk provider besar).",
      action: async () => {
        const fd = new FormData();
        fd.set("id", String(p.id));
        const res = await fetch("?/sync", { method: "POST", body: fd });
        const json = await res.json();
        if (json.type === "failure") toast(json.data?.error ?? "Gagal", "error");
        else toast(json.data?.success ?? "OK", "success");
        confirm = null;
        await applyAction(json);
      },
    };
  }

  // G5: encrypt at rest semua API key yang masih plain text
  function askEncryptAll() {
    confirm = {
      open: true,
      title: "Encrypt semua API key?",
      message: `${data.plainKeyCount} key masih tersimpan plain text di database. Akan di-encrypt AES-256-GCM at rest. Aman dijalankan berulang (yang sudah encrypted di-skip).`,
      action: async () => {
        const res = await fetch("?/encryptAll", { method: "POST", body: new FormData() });
        const json = await res.json();
        if (json.type === "failure") toast(json.data?.error ?? "Gagal", "error");
        else toast(json.data?.success ?? "OK", "success");
        confirm = null;
        await applyAction(json);
      },
    };
  }

  // Sync terakhir per provider (dari syncLogs)
  function lastSync(providerId: number) {
    const log = data.syncLogs.find((l: any) => Number(l.provider_id) === providerId);
    return log
      ? {
          status: log.status,
          at: fmtDate(log.created_at),
          fetched: Number(log.fetched),
          changed: Number(log.changed),
        }
      : null;
  }

  const fmt = (n: number) => n.toLocaleString("id-ID");
  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
</script>

<section class="space-y-6">
  <!-- Header: inline narrative (zero card chrome, no stat strip) -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Provider SMM
      </h1>
      <p class="mt-1 text-sm text-ink-500">
        {fmt(data.providers.length)} provider
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-ink-700"
          >{fmt(
            data.providers.reduce((a: number, p: any) => a + Number(p.services_count ?? 0), 0),
          )}</span
        >
        layanan terhubung
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold {data.hasSmmturkKey ? 'text-success' : 'text-warning'}"
          >SMMturk key {data.hasSmmturkKey ? "aktif" : "belum"}</span
        >
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-ink-500">{fmt(data.syncLogs.length)}</span> sync log
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      {#if data.plainKeyCount > 0}
        <Button size="md" variant="ghost" onclick={askEncryptAll}>
          <Icon name="lock" size={16} stroke={2.5} class="-ml-0.5" />
          Encrypt {data.plainKeyCount} key
        </Button>
      {/if}
      <Button size="md" onclick={() => (modal = "add")}>
        <Icon name="plus" size={16} stroke={2.5} class="-ml-0.5" />
        Tambah Provider
      </Button>
    </div>
  </header>

  {#if data.plainKeyCount > 0}
    <div class="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-ink-700">
      <Icon name="shield" size={16} stroke={2} class="mt-0.5 shrink-0 text-warning" />
      <span
        ><strong class="font-semibold">{data.plainKeyCount} API key</strong> masih tersimpan plain text
        di database (G5). Encrypt at rest disarankan.</span
      >
    </div>
  {/if}

  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
      {form.success}
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <!-- Provider list — hairline-top sub-heading, no wrapper card -->
  <div>
    <div class="flex items-center justify-between border-t border-ink-200 px-1 pb-2 pt-3">
      <h2 class="text-xs font-bold uppercase tracking-wide text-ink-500">Daftar provider</h2>
      <span class="text-xs text-ink-400">{data.providers.length} provider</span>
    </div>

    {#if data.providers.length === 0}
      <EmptyState
        icon="⚡"
        title="Belum ada provider"
        description="Tambah provider SMM untuk mulai menerima order."
      />
    {:else}
      <!-- Mobile: hairline rows, no card chrome, full data -->
      <ul class="lg:hidden">
        {#each data.providers as p, i (p.id)}
          <li
            class="reveal border-b border-ink-100 py-3 last:border-b-0 transition-colors hover:bg-ink-50/40"
            style="--d:{i * 40}ms"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600"
                  >
                    <Icon name="zap" size={12} stroke={2.5} />
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink-900">{p.name}</p>
                    <p class="truncate font-mono text-[11px] text-ink-400">{p.api_url_order}</p>
                  </div>
                </div>
                <!-- Provider ladder: layanan / saldo / key -->
                <dl class="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt class="text-ink-400">Layanan</dt>
                    <dd class="tabular-nums font-semibold text-ink-900">
                      {fmt(Number(p.services_count))}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-ink-400">Saldo</dt>
                    <dd class="tabular-nums font-semibold text-ink-900">
                      ${fmt(Number(p.balance_provider))}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-ink-400">Key</dt>
                    <dd>
                      {#if p.encrypted}
                        <span
                          class="inline-flex items-center gap-1 text-[11px] font-semibold text-success"
                        >
                          <Icon name="lock" size={10} />Encrypted
                        </span>
                      {:else}
                        <code class="font-mono text-[11px] text-ink-700">{p.api_key_prefix}…</code>
                      {/if}
                    </dd>
                  </div>
                </dl>
                {#if lastSync(p.id)}
                  {@const log = lastSync(p.id)!}
                  <div class="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                    <span
                      class="rounded-full px-1.5 py-0.5 font-bold {log.status === 'ok'
                        ? 'bg-success-soft text-success'
                        : log.status === 'error'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-warning-soft text-warning'}"
                    >
                      sync {log.status}
                    </span>
                    <span>{log.at}</span>
                  </div>
                {/if}
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onclick={() => askSync(p)}
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
              >
                <Icon name="refresh" size={12} />Sync
              </button>
              <button
                type="button"
                onclick={() => askTest(p)}
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <Icon name="zap" size={12} />Tes
              </button>
              <button
                type="button"
                onclick={() => openEdit(p.id)}
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <Icon name="settings" size={12} />Edit
              </button>
              <button
                type="button"
                onclick={() => askDelete(p)}
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/5"
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          </li>
        {/each}
      </ul>

      <!-- Desktop: table -->
      <div class="hidden lg:block">
        <table class="w-full text-sm">
          <thead class="sticky top-0 z-10 bg-surface backdrop-blur">
            <tr
              class="border-b border-ink-100 text-left text-[10px] font-bold uppercase tracking-wide text-ink-400"
            >
              <th class="px-4 py-2">#</th>
              <th class="px-2 py-2">Nama</th>
              <th class="px-2 py-2">API Order URL</th>
              <th class="px-2 py-2">API Key</th>
              <th class="px-2 py-2 text-center">Layanan</th>
              <th class="px-2 py-2 text-right">Saldo</th>
              <th class="px-4 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each data.providers as p, i (p.id)}
              <tr
                class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-b-0"
                style="--d:{i * 30}ms"
              >
                <td class="px-4 py-3 font-mono text-xs text-ink-400">#{p.id}</td>
                <td class="px-2 py-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600"
                    >
                      <Icon name="zap" size={13} stroke={2.5} />
                    </span>
                    <span class="font-semibold">{p.name}</span>
                  </div>
                </td>
                <td class="px-2 py-3">
                  <code class="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700"
                    >{p.api_url_order}</code
                  >
                </td>
                <td class="px-2 py-3">
                  <div class="flex items-center gap-1.5">
                    {#if p.encrypted}
                      <Icon name="lock" size={12} class="text-success" />
                      <span class="text-[10px] font-semibold text-success">Terenkripsi</span>
                    {:else}
                      <code
                        class="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700"
                        >{p.api_key_prefix}…</code
                      >
                      <span class="text-[10px] text-ink-400">{p.api_key_len}ch</span>
                    {/if}
                  </div>
                </td>
                <td class="px-2 py-3 text-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold {Number(
                      p.services_count,
                    ) > 0
                      ? 'bg-success-soft text-success'
                      : 'bg-ink-100 text-ink-500'}"
                  >
                    {fmt(Number(p.services_count))}
                  </span>
                </td>
                <td class="px-2 py-3 text-right">
                  <span class="font-semibold text-ink-700">${fmt(Number(p.balance_provider))}</span>
                  {#if lastSync(p.id)}
                    {@const log = lastSync(p.id)!}
                    <span
                      class="ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold {log.status ===
                      'ok'
                        ? 'bg-success-soft text-success'
                        : log.status === 'error'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-warning-soft text-warning'}"
                    >
                      {log.status}
                    </span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      onclick={() => askSync(p)}
                      title="Sync katalog"
                      class="grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
                    >
                      <Icon name="refresh" size={14} />
                    </button>
                    <button
                      type="button"
                      onclick={() => askTest(p)}
                      title="Tes koneksi"
                      class="grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
                    >
                      <Icon name="zap" size={14} />
                    </button>
                    <button
                      type="button"
                      onclick={() => openEdit(p.id)}
                      title="Edit"
                      class="grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Icon name="settings" size={14} />
                    </button>
                    <button
                      type="button"
                      onclick={() => askDelete(p)}
                      title="Hapus"
                      class="grid h-7 w-7 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Sync log — hairline-top, no card -->
  {#if data.syncLogs.length > 0}
    <details class="group border-t border-ink-200 pt-3">
      <summary
        class="flex cursor-pointer items-center justify-between px-1 py-2 text-xs font-bold uppercase tracking-wide text-ink-500 hover:text-ink-700"
      >
        Sync log terakhir ({data.syncLogs.length})
        <span class="transition-transform group-open:rotate-90" aria-hidden="true">›</span>
      </summary>
      <ul class="divide-y divide-ink-50 border-t border-ink-100">
        {#each data.syncLogs as log}
          <li class="flex items-start gap-3 px-4 py-2 text-xs">
            <span
              class="mt-0.5 inline-flex h-5 items-center rounded-full px-2 font-bold {log.status ===
              'ok'
                ? 'bg-success-soft text-success'
                : log.status === 'error'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-warning-soft text-warning'}"
            >
              {log.status}
            </span>
            <div class="flex-1">
              <p class="text-ink-700">
                Provider #{log.provider_id} · {fmt(Number(log.fetched))} fetched · {fmt(
                  Number(log.changed),
                )} changed
              </p>
              {#if log.error}<p class="text-danger">{log.error}</p>{/if}
            </div>
            <span class="text-ink-400">{fmtDate(log.created_at)}</span>
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</section>

<!-- Add modal -->
{#if modal === "add"}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-label="Tambah provider"
    onclick={(e) => {
      if (e.target === e.currentTarget) closeModal();
    }}
  >
    <form
      method="POST"
      action="?/add"
      use:enhance={() =>
        async ({ result }) => {
          const r = result as any;
          if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
          else {
            toast(r.data?.success ?? "OK", "success");
            closeModal();
          }
          await applyAction(result);
        }}
      class="w-full max-w-md rounded-t-2xl bg-surface p-4 shadow-card-hover sm:rounded-2xl"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-display font-bold">Provider baru</h3>
        <button type="button" onclick={closeModal} class="text-ink-400 hover:text-ink-700">
          <Icon name="x" size={18} />
        </button>
      </div>
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">Nama</span>
          <input
            type="text"
            name="name"
            required
            placeholder="cth. SMMturk"
            class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Order URL</span>
          <input
            type="url"
            name="apiUrlOrder"
            required
            placeholder="https://provider.com/api/v2"
            class="w-full rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Status URL</span>
          <input
            type="url"
            name="apiUrlStatus"
            required
            placeholder="https://provider.com/api/v2"
            class="w-full rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Key</span>
          <input
            type="password"
            name="apiKey"
            required
            placeholder="••••••••"
            class="w-full rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <span class="mt-1 block text-[10px] text-ink-400">
            Disimpan plain di DB. Encrypt di-rest (AES-256) dijadwalkan M3.5.
          </span>
        </label>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={closeModal}
          class="rounded-xl px-3 py-2 text-sm font-semibold text-ink-500 hover:bg-ink-50"
        >
          Batal
        </button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  </div>
{/if}

<!-- Edit modal -->
{#if typeof modal === "number"}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-label="Edit provider"
    onclick={(e) => {
      if (e.target === e.currentTarget) closeModal();
    }}
  >
    <form
      method="POST"
      action="?/edit"
      use:enhance={() =>
        async ({ result }) => {
          const r = result as any;
          if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
          else {
            toast(r.data?.success ?? "OK", "success");
            closeModal();
          }
          await applyAction(result);
        }}
      class="w-full max-w-md rounded-t-2xl bg-surface p-4 shadow-card-hover sm:rounded-2xl"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-display font-bold">Edit provider #{modal}</h3>
        <button type="button" onclick={closeModal} class="text-ink-400 hover:text-ink-700">
          <Icon name="x" size={18} />
        </button>
      </div>
      <input type="hidden" name="id" value={modal} />
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">Nama</span>
          <input
            type="text"
            name="name"
            required
            bind:value={editName}
            class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Order URL</span>
          <input
            type="url"
            name="apiUrlOrder"
            required
            bind:value={editUrlOrder}
            class="w-full rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Status URL</span>
          <input
            type="url"
            name="apiUrlStatus"
            required
            bind:value={editUrlStatus}
            class="w-full rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Key baru (opsional)</span>
          <input
            type="password"
            name="apiKey"
            placeholder="Kosongkan untuk不改"
            class="w-full rounded-xl border border-ink-200 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <span class="mt-1 block text-[10px] text-ink-400">
            Kosongkan jika tidak ingin mengubah API key.
          </span>
        </label>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={closeModal}
          class="rounded-xl px-3 py-2 text-sm font-semibold text-ink-500 hover:bg-ink-50"
        >
          Batal
        </button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  </div>
{/if}

{#if confirm}
  <ConfirmDialog
    bind:open={confirm.open}
    title={confirm.title}
    message={confirm.message}
    confirmLabel="Lanjut"
    onConfirm={confirm.action}
  />
{/if}

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
