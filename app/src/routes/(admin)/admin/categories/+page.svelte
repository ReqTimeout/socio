<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Admin .id = copy Indonesia hardcoded (tanpa katalog i18n).
  const C = {
    title: "Kategori",
    heading: "Kategori",
    back: "Kembali ke Layanan",
    sub: "{n} kategori · {a} kategori punya layanan aktif",
    addBtn: "Tambah Kategori",
    colStatus: "Status",
    colSvc: "Layanan",
    search: "Cari kategori…",
    all: "Semua",
    on: "Aktif",
    off: "Mati",
    shown: "{n} dari {m} kategori",
    more: "Muat {n} lagi",
    empty: "Tidak ada kategori yang cocok.",
    disableTitle: "Matikan semua layanan di {n}",
    enableTitle: "Nyalakan semua layanan di {n}",
    disableMsg:
      "Semua {m} layanan aktif di kategori ini akan dinonaktifkan (bertag manual-off, tahan dari auto-reaktivasi sync). Pesanan berjalan TIDAK dibatalkan.",
    enableMsg: "{m} layanan yang sebelumnya dimatikan manual akan diaktifkan lagi.",
    okOff: "{m} layanan di {n} → Nonaktif",
    okOn: "{m} layanan di {n} → Aktif",
    failed: "Gagal mengubah status kategori",
    routed: "Dirutekan",
    defaultRoute: "Provider Aktif",
    servedBy: "Dilayani {p}",
    colId: "ID",
    colName: "Nama",
    colAksi: "Aksi",
    edit: "Edit",
    hapus: "Hapus",
    hapusTitle: "Hapus kategori?",
    hapusInUse: "{n} masih dipakai {m} layanan. Kategori tidak bisa dihapus.",
    hapusConfirm: "Kategori {n} akan dihapus permanen.",
    deletedOk: "Kategori dihapus.",
    deleteFailed: "Gagal menghapus kategori",
    active: "Aktif",
    addTitle: "Tambah Kategori",
    editTitle: "Edit Kategori #{n}",
    nama: "Nama kategori",
    simpan: "Simpan",
    batal: "Batal",
    fieldWajib: "Field wajib diisi.",
    toastFail: "Gagal menyimpan.",
  };

  const fill = (t: string, v: Record<string, string>) =>
    t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

  type CatRow = PageData["categories"][number];

  // Filter lokal (client-side) — ±1.800 kategori sudah dikirim server, jadi ketik
  // langsung memfilter tanpa round trip. Nilai awal boleh datang dari URL
  // (?q=tiktok&st=off) supaya link dari halaman layanan bisa membawa konteks.
  let fq = $state(data.q);
  let fst = $state<"" | "on" | "off">(data.st === "on" || data.st === "off" ? data.st : "");
  // Filter kondisi routing (routed = punya provider eksplisit; default = ikut
  // provider aktif global). Client-side, sama seperti fq/fst.
  let fr = $state<"" | "routed" | "default">("");
  let limit = $state(100);
  $effect(() => {
    void fq;
    void fst;
    void fr;
    limit = 100;
  });

  const filtered = $derived.by(() => {
    const needle = fq.trim().toLowerCase();
    return data.categories.filter((c) => {
      if (needle && !c.name.toLowerCase().includes(needle)) return false;
      if (fst === "on" && c.active === 0) return false;
      if (fst === "off" && !(c.total > 0 && c.active === 0)) return false;
      if (fr === "routed" && !c.routingProviderName) return false;
      if (fr === "default" && c.routingProviderId) return false;
      return true;
    });
  });
  const shown = $derived(filtered.slice(0, limit));
  const withActive = $derived(data.categories.filter((c) => c.active > 0).length);

  let addOpen = $state(false);
  let editCat = $state<{ id: number; name: string } | null>(null);
  let confirm = $state<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    danger?: boolean;
  } | null>(null);

  // Toggle satu kategori = matikan/nyalakan SEMUA layanannya. Jalur SQL-nya sama
  // dengan rail kiri /admin/services ($lib/server/category-admin) — disable selalu
  // bertag [manual-off] sehingga service-sync per jam tidak mengaktifkan ulang.
  function toggleCat(c: CatRow) {
    const off = c.active > 0;
    confirm = {
      open: true,
      title: off ? fill(C.disableTitle, { n: c.name }) : fill(C.enableTitle, { n: c.name }),
      message: off
        ? fill(C.disableMsg, { m: String(c.total) })
        : fill(C.enableMsg, { m: String(c.total) }),
      danger: off,
      action: async () => {
        const fd = new FormData();
        fd.set("categoryId", String(c.id));
        const r = await fetch("?/toggleCategory", { method: "POST", body: fd });
        if (r.ok) {
          toast(
            off
              ? fill(C.okOff, { n: c.name, m: String(c.total) })
              : fill(C.okOn, { n: c.name, m: String(c.total) }),
            "success",
          );
          await invalidateAll();
        } else {
          toast(C.failed, "error");
        }
      },
    };
  }

  function askDelete(c: CatRow) {
    const used = c.total;
    confirm = {
      open: true,
      title: C.hapusTitle,
      message:
        used > 0
          ? fill(C.hapusInUse, { n: c.name, m: String(used) })
          : fill(C.hapusConfirm, { n: c.name }),
      danger: true,
      action: used > 0 ? async () => {} : askDeleteRun(c),
    };
  }
  const askDeleteRun = (c: CatRow) => async () => {
    const fd = new FormData();
    fd.set("id", String(c.id));
    const r = await fetch("?/deleteCategory", { method: "POST", body: fd });
    if (r.ok) {
      toast(C.deletedOk, "success");
      await invalidateAll();
    } else {
      toast(C.deleteFailed, "error");
    }
  };

  const onResult =
    () =>
    async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      if (result.type === "failure") toast((result.data as any)?.error ?? C.toastFail, "error");
      else {
        toast((result.data as any)?.success ?? C.toastFail, "success");
        addOpen = false;
        editCat = null;
      }
      await update();
    };

  function chip(on: boolean, cls: string) {
    return `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
      on ? cls : "border-ink-200 bg-surface text-ink-500 hover:border-ink-300"
    }`;
  }
</script>

<svelte:head>
  <title>{C.title}</title>
</svelte:head>

<section class="space-y-5">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <a
        href="/admin/services"
        class="inline-flex items-center gap-1.5 text-xs font-bold text-ink-500 transition-colors hover:text-ink-700"
      >
        <Icon name="chevron_down" size={12} stroke={2.5} class="rotate-90" />
        {C.back}
      </a>
      <h1
        class="mt-1.5 flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.5)]"
        >
          <Icon name="layers" size={20} stroke={2.5} />
        </span>
        {C.heading}
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">
        {fill(C.sub, { n: String(data.totalCats), a: String(withActive) })}
      </p>
    </div>
    <button
      type="button"
      onclick={() => (addOpen = true)}
      class="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink-900 px-4 text-sm font-bold text-ink-50 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-md active:scale-95"
    >
      <Icon name="plus" size={14} stroke={2.75} />
      {C.addBtn}
    </button>
  </header>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
      {form.success}
    </div>
  {/if}

  <!-- Toolbar filter -->
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative min-w-[200px] flex-1 sm:max-w-xs">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
        <Icon name="search" size={14} stroke={2} />
      </span>
      <input
        type="search"
        bind:value={fq}
        placeholder={C.search}
        class="h-10 w-full rounded-full border border-ink-200 bg-surface pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
      />
    </div>
    <button
      type="button"
      onclick={() => (fst = "")}
      class={chip(fst === "", "border-transparent bg-ink-900 text-ink-50")}
    >
      {C.all}
    </button>
    <button
      type="button"
      onclick={() => (fst = "on")}
      class={chip(fst === "on", "border-transparent bg-success text-white")}
    >
      <span class="h-1.5 w-1.5 rounded-full {fst === 'on' ? 'bg-white' : 'bg-success'}"></span>
      {C.on}
    </button>
    <button
      type="button"
      onclick={() => (fst = "off")}
      class={chip(fst === "off", "border-transparent bg-ink-700 text-white")}
    >
      <span class="h-1.5 w-1.5 rounded-full {fst === 'off' ? 'bg-white' : 'bg-ink-400'}"></span>
      {C.off}
    </button>
    <span class="mx-1 h-5 w-px bg-ink-200"></span>
    <button
      type="button"
      onclick={() => (fr = "routed")}
      class={chip(fr === "routed", "border-transparent bg-primary-500 text-white")}
    >
      <Icon name="share" size={12} stroke={2.5} />
      {C.routed}
    </button>
    <button
      type="button"
      onclick={() => (fr = "default")}
      class={chip(fr === "default", "border-transparent bg-ink-900 text-ink-50")}
    >
      {C.defaultRoute}
    </button>
    <span class="ml-auto text-[11px] tabular-nums text-ink-400">
      {fill(C.shown, { n: String(filtered.length), m: String(data.categories.length) })}
    </span>
  </div>

  {#if shown.length === 0}
    <EmptyState art="services" title={C.heading} description={C.empty} />
  {:else}
    <div class="overflow-x-auto rounded-2xl border border-ink-100 bg-surface">
      <table class="w-full text-sm">
        <thead
          class="border-b border-ink-100 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500"
        >
          <tr>
            <th class="w-16 p-3 font-semibold">{C.colId}</th>
            <th class="p-3 font-semibold">{C.colName}</th>
            <th class="w-40 p-3 font-semibold">{C.colSvc}</th>
            <th class="w-24 p-3 font-semibold">{C.colStatus}</th>
            <th class="w-56 p-3 text-right font-semibold">{C.colAksi}</th>
          </tr>
        </thead>
        <tbody>
          {#each shown as c, i (c.id)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{(i % 100) * 12}ms"
            >
              <td class="p-3 font-semibold tabular-nums text-ink-900">#{c.id}</td>
              <td class="max-w-[420px] p-3 text-ink-700">
                <a
                  href="/admin/services?cat={c.id}"
                  class="line-clamp-3 break-words leading-snug no-underline transition-colors hover:text-primary-ink"
                  title={c.name}>{c.name}</a
                >
                <div class="mt-1 flex flex-wrap gap-1">
                  {#if c.routingProviderName}
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-ink"
                    >
                      <Icon name="share" size={9} stroke={2.5} />
                      {fill(C.servedBy, { p: c.routingProviderName })}</span
                    >
                  {:else if c.providerNames.length}
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500"
                      >{c.providerNames.join(" · ")}</span
                    >
                  {/if}
                </div>
              </td>
              <td class="p-3 tabular-nums">
                <span class="font-bold {c.active > 0 ? 'text-success' : 'text-ink-400'}"
                  >{c.active}</span
                ><span class="text-ink-400">/{c.total}</span>
              </td>
              <td class="p-3">
                {#if c.total === 0}
                  <span
                    class="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold text-ink-300"
                    >—</span
                  >
                {:else if c.active === 0}
                  <span
                    class="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500"
                    >{C.off}</span
                  >
                {:else if c.active < c.total}
                  <span
                    class="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning"
                  >
                    {C.on}
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-success"></span>{C.active}
                  </span>
                {/if}
              </td>
              <td class="p-3 text-right">
                <div class="inline-flex items-center gap-2">
                  {#if c.total > 0}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.active > 0}
                      onclick={() => toggleCat(c)}
                      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {c.active >
                      0
                        ? 'bg-success'
                        : 'bg-ink-300'}"
                      aria-label={fill(c.active > 0 ? C.disableTitle : C.enableTitle, {
                        n: c.name,
                      })}
                      title={c.active > 0 ? C.disableTitle : C.enableTitle}
                    >
                      <span
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform {c.active >
                        0
                          ? 'translate-x-[22px]'
                          : 'translate-x-[2px]'}"
                      ></span>
                    </button>
                  {/if}
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => (editCat = { id: c.id, name: c.name })}>{C.edit}</Button
                  >
                  <Button size="sm" variant="ghost" onclick={() => askDelete(c)}>{C.hapus}</Button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if filtered.length > shown.length}
      <div class="flex justify-center py-2">
        <button
          type="button"
          onclick={() => (limit += 200)}
          class="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-4 text-xs font-bold text-ink-700 transition-all hover:border-ink-300 hover:bg-ink-50 active:scale-95"
        >
          <Icon name="chevron_down" size={12} stroke={2.5} />
          {fill(C.more, { n: String(filtered.length - shown.length) })}
        </button>
      </div>
    {/if}
  {/if}
</section>

<!-- Add Category modal -->
{#if addOpen}
  <div
    class="fixed inset-0 z-[80] grid place-items-center bg-ink-900/45 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    tabindex={-1}
    onkeydown={(e) => e.key === "Escape" && (addOpen = false)}
  >
    <div class="w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h3 class="font-display text-lg font-extrabold">{C.addTitle}</h3>
        <button
          type="button"
          onclick={() => (addOpen = false)}
          aria-label={C.batal}
          class="grid h-8 w-8 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100"
        >
          <Icon name="x" size={14} stroke={2.5} />
        </button>
      </div>
      <form method="POST" action="?/addCategory" use:enhance={onResult} class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="add-catname"
            >{C.nama}</label
          >
          <input
            id="add-catname"
            name="name"
            required
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div class="flex gap-2">
          <Button type="button" size="md" variant="ghost" full onclick={() => (addOpen = false)}
            >{C.batal}</Button
          >
          <Button type="submit" size="md" full>{C.simpan}</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit Category modal -->
{#if editCat}
  <div
    class="fixed inset-0 z-[80] grid place-items-center bg-ink-900/45 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    tabindex={-1}
    onkeydown={(e) => e.key === "Escape" && (editCat = null)}
  >
    <div class="w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h3 class="font-display text-lg font-extrabold">
          {fill(C.editTitle, { n: String(editCat.id) })}
        </h3>
        <button
          type="button"
          onclick={() => (editCat = null)}
          aria-label={C.batal}
          class="grid h-8 w-8 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100"
        >
          <Icon name="x" size={14} stroke={2.5} />
        </button>
      </div>
      <form method="POST" action="?/editCategory" use:enhance={onResult} class="space-y-3">
        <input type="hidden" name="id" value={editCat.id} />
        <div>
          <label class="mb-1 block text-xs font-semibold text-ink-500" for="edit-catname"
            >{C.nama}</label
          >
          <input
            id="edit-catname"
            name="name"
            bind:value={editCat.name}
            required
            class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          />
        </div>
        <div class="flex gap-2">
          <Button type="button" size="md" variant="ghost" full onclick={() => (editCat = null)}
            >{C.batal}</Button
          >
          <Button type="submit" size="md" full>{C.simpan}</Button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if confirm}
  <ConfirmDialog
    bind:open={confirm.open}
    title={confirm.title}
    message={confirm.message}
    confirmLabel={C.simpan}
    cancelLabel={C.batal}
    danger={confirm.danger ?? true}
    onConfirm={confirm.action}
  />
{/if}

<style>
  .reveal {
    animation: reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
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
