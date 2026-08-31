<script lang="ts">
  import { Button, EmptyState, toast, Icon, ConfirmDialog, extractActionMsg } from "@socio/ui";
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
        if (json.type === "failure") toast(extractActionMsg(json.data) ?? "Gagal", "error");
        else toast(extractActionMsg(json.data) ?? "OK", "success");
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
        if (json.type === "failure") toast(extractActionMsg(json.data) ?? "Gagal", "error");
        else toast(extractActionMsg(json.data) ?? "OK", "success");
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
        if (json.type === "failure") toast(extractActionMsg(json.data) ?? "Gagal", "error");
        else toast(extractActionMsg(json.data) ?? "OK", "success");
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
        if (json.type === "failure") toast(extractActionMsg(json.data) ?? "Gagal", "error");
        else toast(extractActionMsg(json.data) ?? "OK", "success");
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

<svelte:head>
  <title>Provider — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5">
  <!-- Header — premium, no jank: title + KPI pills -->
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0 flex-1">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]"
      >
        <span class="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-white shadow-sm">
          <Icon name="zap" size={18} stroke={2.5} />
        </span>
        Provider SMM
        <span
          class="hidden sm:inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white"
        >
          {fmt(data.providers.length)} aktif
        </span>
      </h1>
      <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-500">
        <span
          class="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-surface px-2.5 py-1"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-ink-900"></span>
          {fmt(data.providers.reduce((a: number, p: any) => a + Number(p.services_count ?? 0), 0))} layanan
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold {data.hasSmmturkKey
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'}"
        >
          <span
            class="h-1.5 w-1.5 rounded-full {data.hasSmmturkKey
              ? 'bg-emerald-500'
              : 'bg-amber-500'}"
          ></span>
          SMMturk {data.hasSmmturkKey
            ? data.hasSmmturkProvider
              ? "terhubung"
              : "key ada — belum connect"
            : "belum"}
        </span>
        {#if data.syncLogs.length > 0}
          <span
            class="hidden sm:inline-flex items-center gap-1 rounded-full border border-ink-200 bg-surface px-2.5 py-1 text-ink-600"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-ink-400"></span>{fmt(data.syncLogs.length)} sync
            log
          </span>
        {/if}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      {#if data.hasSmmturkKey && !data.hasSmmturkProvider}
        <form
          method="POST"
          action="?/addSmmturk"
          use:enhance={() =>
            async ({ result }) => {
              const r = result as any;
              const ok = result.type !== "failure";
              toast(
                extractActionMsg(r.data) ?? (ok ? "Provider SMMturk ditambahkan." : "Gagal"),
                ok ? "success" : "error",
              );
              if (ok) await applyAction(result);
            }}
        >
          <Button size="md">
            <Icon name="zap" size={16} stroke={2.5} class="-ml-0.5" />
            Hubungkan SMMturk
          </Button>
        </form>
      {/if}
      {#if data.plainKeyCount > 0}
        <Button size="md" variant="ghost" onclick={askEncryptAll}>
          <Icon name="lock" size={16} stroke={2.5} class="-ml-0.5" />
          Encrypt {data.plainKeyCount} key
        </Button>
      {/if}
      <Button size="md" variant="ghost" onclick={() => (modal = "add")}>
        <Icon name="plus" size={16} stroke={2.5} class="-ml-0.5" />
        Tambah
      </Button>
    </div>
  </header>

  {#if data.plainKeyCount > 0}
    <div
      class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
    >
      <Icon name="shield" size={16} stroke={2} class="mt-0.5 shrink-0 text-amber-600" />
      <span
        ><strong>{data.plainKeyCount} API key</strong> masih plain — klik Encrypt untuk AES-256 at-rest.</span
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

  <!-- Provider list — card -->
  <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
    <div class="flex items-center justify-between border-b border-ink-100 bg-ink-50/40 px-4 py-2.5">
      <h2 class="text-xs font-bold uppercase tracking-wide text-ink-500">Daftar provider</h2>
      <span class="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-white"
        >{data.providers.length}</span
      >
    </div>

    {#if data.providers.length === 0}
      <EmptyState
        art="providers"
        title="Belum ada provider"
        description="Tambah provider SMM untuk mulai menerima order."
      />
    {:else}
      <!-- Mobile: stacked cards -->
      <ul class="divide-y divide-ink-100 lg:hidden">
        {#each data.providers as p, i (p.id)}
          {@const isPrimary = p.name === "SMMturk" || Number(p.services_count) > 0}
          <li class="reveal p-3 {isPrimary ? 'bg-violet-50/30' : ''}" style="--d:{i * 40}ms">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-xl {isPrimary
                    ? 'bg-violet-600 text-white'
                    : 'bg-ink-100 text-ink-500'}"
                >
                  <Icon name={isPrimary ? "zap" : "package"} size={14} stroke={2.5} />
                </span>
                <div class="min-w-0">
                  <p class="flex items-center gap-1.5 truncate font-bold text-ink-900">
                    {p.name}
                    {#if isPrimary}<span
                        class="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                        >aktif</span
                      >{/if}
                  </p>
                  <p class="truncate font-mono text-[11px] text-ink-400">
                    {p.api_url_order || "—"}
                  </p>
                </div>
              </div>
              <span
                class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold {Number(
                  p.services_count,
                ) > 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-ink-200 bg-ink-100 text-ink-500'}"
              >
                {fmt(Number(p.services_count))} layanan
              </span>
            </div>
            <dl class="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-ink-50/60 p-2 text-xs">
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Layanan
                </dt>
                <dd class="font-bold tabular-nums text-ink-900">{fmt(Number(p.services_count))}</dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Saldo
                </dt>
                <dd class="font-bold tabular-nums text-ink-900">
                  ${fmt(Number(p.balance_provider))}
                </dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Key</dt>
                <dd>
                  {#if p.encrypted}<span
                      class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"
                      ><Icon name="lock" size={10} /> Encrypted</span
                    >{:else}<code class="font-mono text-[11px] text-ink-700"
                      >{p.api_key_prefix}…</code
                    >{/if}
                </dd>
              </div>
            </dl>
            {#if lastSync(p.id)}
              {@const log = lastSync(p.id)!}
              <div class="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
                <span
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-bold {log.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-700'
                    : log.status === 'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'}">sync {log.status}</span
                >
                <span>{log.at} · {fmt(log.fetched)} fetched</span>
              </div>
            {/if}
            <div class="mt-3 grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onclick={() => askSync(p)}
                class="inline-flex items-center justify-center gap-1 rounded-full bg-ink-900 px-2 py-2 text-xs font-bold text-white hover:bg-ink-800"
                ><Icon name="refresh" size={12} />Sync</button
              >
              <button
                type="button"
                onclick={() => askTest(p)}
                class="inline-flex items-center justify-center gap-1 rounded-full border border-ink-200 bg-surface px-2 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
                ><Icon name="zap" size={12} />Tes</button
              >
              <button
                type="button"
                onclick={() => openEdit(p.id)}
                class="inline-flex items-center justify-center gap-1 rounded-full border border-ink-200 bg-surface px-2 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
                ><Icon name="settings" size={12} />Edit</button
              >
              <button
                type="button"
                onclick={() => askDelete(p)}
                class="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-2 py-2 text-red-600 hover:bg-red-100"
                ><Icon name="trash" size={12} /></button
              >
            </div>
          </li>
        {/each}
      </ul>

      <!-- Desktop: table -->
      <div class="hidden lg:block">
        <table class="w-full text-sm">
          <thead class="sticky top-0 z-10 bg-ink-50/80 backdrop-blur">
            <tr
              class="border-b border-ink-100 text-left text-[11px] font-bold uppercase tracking-wide text-ink-400"
            >
              <th class="px-4 py-2.5">#</th>
              <th class="px-2 py-2.5">Nama</th>
              <th class="px-2 py-2.5">API Order URL</th>
              <th class="px-2 py-2.5">API Key</th>
              <th class="px-2 py-2.5 text-center">Layanan</th>
              <th class="px-2 py-2.5 text-right">Saldo</th>
              <th class="px-4 py-2.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            {#each data.providers as p, i (p.id)}
              {@const isPrimary = p.name === "SMMturk" || Number(p.services_count) > 0}
              <tr
                class="reveal transition-colors hover:bg-ink-50/60 {isPrimary
                  ? 'bg-violet-50/20'
                  : ''}"
                style="--d:{i * 30}ms"
              >
                <td class="px-4 py-3 font-mono text-xs text-ink-400">#{p.id}</td>
                <td class="px-2 py-3">
                  <span class="inline-flex items-center gap-2 font-bold text-ink-900">
                    <span
                      class="grid h-7 w-7 place-items-center rounded-lg {isPrimary
                        ? 'bg-violet-600 text-white'
                        : 'bg-ink-100 text-ink-500'}"
                      ><Icon name={isPrimary ? "zap" : "package"} size={13} stroke={2.5} /></span
                    >
                    {p.name}
                    {#if isPrimary}<span
                        class="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                        >aktif</span
                      >{/if}
                  </span>
                </td>
                <td class="max-w-[260px] truncate px-2 py-3 font-mono text-xs text-ink-500"
                  >{p.api_url_order || "—"}</td
                >
                <td class="px-2 py-3">
                  <span
                    class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold {p.encrypted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-ink-200 bg-ink-100 text-ink-600'}"
                  >
                    <Icon name="lock" size={11} />{p.encrypted
                      ? "Encrypted"
                      : `${p.api_key_prefix}…`}
                  </span>
                </td>
                <td class="px-2 py-3 text-center">
                  <span
                    class="inline-flex rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums {Number(
                      p.services_count,
                    ) > 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-ink-200 bg-ink-100 text-ink-500'}"
                    >{fmt(Number(p.services_count))}</span
                  >
                </td>
                <td class="px-2 py-3 text-right font-bold tabular-nums text-ink-700"
                  >${fmt(Number(p.balance_provider))}{#if lastSync(p.id)}{@const log = lastSync(
                      p.id,
                    )!}<span
                      class="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold {log.status ===
                      'ok'
                        ? 'bg-emerald-50 text-emerald-700'
                        : log.status === 'error'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-700'}">{log.status}</span
                    >{/if}</td
                >
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button
                      type="button"
                      onclick={() => askSync(p)}
                      title="Sync katalog"
                      class="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-white hover:bg-ink-800"
                      ><Icon name="refresh" size={14} /></button
                    >
                    <button
                      type="button"
                      onclick={() => askTest(p)}
                      title="Tes koneksi"
                      class="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
                      ><Icon name="zap" size={14} /></button
                    >
                    <button
                      type="button"
                      onclick={() => openEdit(p.id)}
                      title="Edit"
                      class="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
                      ><Icon name="settings" size={14} /></button
                    >
                    <button
                      type="button"
                      onclick={() => askDelete(p)}
                      title="Hapus"
                      class="grid h-8 w-8 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      ><Icon name="trash" size={14} /></button
                    >
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Sync log — card -->
  {#if data.syncLogs.length > 0}
    <details class="group overflow-hidden rounded-2xl border border-ink-100 bg-surface">
      <summary
        class="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-500 hover:text-ink-700"
      >
        <span class="flex items-center gap-2"
          ><Icon name="clock" size={14} /> Sync log terakhir ({data.syncLogs.length})</span
        >
        <span
          class="grid h-6 w-6 place-items-center rounded-full bg-ink-100 text-ink-500 transition-transform group-open:rotate-90"
          aria-hidden="true">›</span
        >
      </summary>
      <ul class="divide-y divide-ink-100 border-t border-ink-100">
        {#each data.syncLogs as log}
          <li class="flex items-start gap-3 px-4 py-2.5 text-xs">
            <span
              class="mt-0.5 inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-bold {log.status ===
              'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : log.status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-amber-200 bg-amber-50 text-amber-700'}">{log.status}</span
            >
            <div class="flex-1">
              <p class="font-medium text-ink-700">
                Provider #{log.provider_id} · {fmt(Number(log.fetched))} fetched · {fmt(
                  Number(log.changed),
                )} changed
              </p>
              {#if log.error}<p class="mt-0.5 text-red-600">{log.error}</p>{/if}
            </div>
            <span class="shrink-0 text-ink-400">{fmtDate(log.created_at)}</span>
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
          const ok = result.type !== "failure";
          toast(extractActionMsg(r.data) ?? (ok ? "OK" : "Gagal"), ok ? "success" : "error");
          if (ok) closeModal();
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
            class="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Order URL</span>
          <input
            type="url"
            name="apiUrlOrder"
            required
            placeholder="https://provider.com/api/v2"
            class="w-full rounded-xl border border-ink-200 px-3 py-2.5 font-mono text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Status URL</span>
          <input
            type="url"
            name="apiUrlStatus"
            required
            placeholder="https://provider.com/api/v2"
            class="w-full rounded-xl border border-ink-200 px-3 py-2.5 font-mono text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-bold text-ink-700">API Key</span>
          <input
            type="password"
            name="apiKey"
            required
            placeholder="••••••••"
            class="w-full rounded-xl border border-ink-200 px-3 py-2.5 font-mono text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
          <span class="mt-1 block text-[11px] font-medium text-emerald-600"
            >Akan disimpan terenkripsi (AES-256-GCM).</span
          >
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
          const ok = result.type !== "failure";
          toast(extractActionMsg(r.data) ?? (ok ? "OK" : "Gagal"), ok ? "success" : "error");
          if (ok) closeModal();
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
