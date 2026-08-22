<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data }: { data: PageData; form: ActionData } = $props();

  type B = PageData["banners"][number];

  const posLabel = (v: string) => data.positions.find((p: any) => p.value === v)?.label ?? v;

  const fmtDate = (d: unknown) =>
    d
      ? new Date(d as string).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  // Form state (add/edit modal)
  let modal = $state<"add" | number | null>(null);
  let fTitle = $state("");
  let fSubtitle = $state("");
  let fImageUrl = $state("");
  let fLinkUrl = $state("");
  let fPosition = $state("dashboard");
  let fSort = $state(0);
  let fActive = $state(true);
  let fStart = $state("");
  let fEnd = $state("");

  function openAdd() {
    modal = "add";
    fTitle = "";
    fSubtitle = "";
    fImageUrl = "";
    fLinkUrl = "";
    fPosition = "dashboard";
    fSort = 0;
    fActive = true;
    fStart = "";
    fEnd = "";
  }
  function openEdit(b: B) {
    modal = b.id;
    fTitle = b.title;
    fSubtitle = b.subtitle;
    fImageUrl = b.imageUrl;
    fLinkUrl = b.linkUrl;
    fPosition = b.position;
    fSort = b.sortOrder;
    fActive = b.isActive;
    fStart = b.startAt ? String(b.startAt).replace(" ", "T").slice(0, 16) : "";
    fEnd = b.endAt ? String(b.endAt).replace(" ", "T").slice(0, 16) : "";
  }
  function closeModal() {
    modal = null;
  }

  // G30: aksi destruktif via ConfirmDialog (pola sama dengan providers page)
  let confirm = $state<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  function askDelete(b: B) {
    confirm = {
      open: true,
      title: `Hapus banner "${b.title}"?`,
      message: "Banner akan hilang dari dashboard user. Tindakan ini tidak bisa dibatalkan.",
      action: async () => {
        const fd = new FormData();
        fd.set("id", String(b.id));
        const res = await fetch("?/delete", { method: "POST", body: fd });
        const json = await res.json();
        if (json.type === "failure") toast(json.data?.error ?? "Gagal", "error");
        else toast(json.data?.success ?? "OK", "success");
        confirm = null;
        await applyAction(json);
      },
    };
  }

  function toggle(b: B) {
    const fd = new FormData();
    fd.set("id", String(b.id));
    fetch("?/toggle", { method: "POST", body: fd }).then(async (res) => {
      const json = await res.json();
      if (json.type === "failure") toast(json.data?.error ?? "Gagal", "error");
      else toast(json.data?.success ?? "OK", "success");
      await applyAction(json);
    });
  }

  const input =
    "h-10 w-full rounded-xl border border-ink-200 bg-surface px-3 text-sm focus:border-ink-400 focus:outline-none";
</script>

<svelte:head>
  <title>Banner — Admin Socio.id</title>
</svelte:head>

<section class="space-y-6">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Banner Promosi
      </h1>
      <p class="mt-1 text-sm text-ink-500">
        {data.banners.length} banner
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-ink-700"
          >{data.banners.filter((b: B) => b.isActive).length} aktif</span
        >
      </p>
    </div>
    <Button size="md" onclick={openAdd}>
      <Icon name="plus" size={16} stroke={2.5} class="-ml-0.5" />
      Tambah Banner
    </Button>
  </header>

  {#if data.banners.length === 0}
    <EmptyState
      icon="🖼"
      title="Belum ada banner"
      description="Tambahkan banner promo untuk tampil di dashboard user."
    />
  {:else}
    <!-- Mobile card-list -->
    <ul class="space-y-2 lg:hidden">
      {#each data.banners as b (b.id)}
        <li class="rounded-2xl border border-ink-100 p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-semibold text-ink-900">{b.title}</span>
            <span
              class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold {b.isActive
                ? 'bg-success/10 text-success'
                : 'bg-ink-100 text-ink-500'}">{b.isActive ? "Aktif" : "Nonaktif"}</span
            >
          </div>
          {#if b.subtitle}
            <p class="mt-0.5 text-xs text-ink-500">{b.subtitle}</p>
          {/if}
          <div class="mt-1 flex items-center justify-between text-xs text-ink-400">
            <span>{posLabel(b.position)}</span>
            <span>#{b.sortOrder}</span>
          </div>
          <div class="mt-2 flex gap-2">
            <Button size="sm" variant="ghost" class="flex-1" onclick={() => openEdit(b)}
              >Edit</Button
            >
            <Button size="sm" variant="ghost" class="flex-1" onclick={() => toggle(b)}
              >{b.isActive ? "Matikan" : "Aktifkan"}</Button
            >
            <Button
              size="sm"
              variant="ghost"
              class="shrink-0 text-danger"
              onclick={() => askDelete(b)}>Hapus</Button
            >
          </div>
        </li>
      {/each}
    </ul>

    <!-- Desktop table -->
    <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 lg:block">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th class="px-4 py-3 font-semibold">Banner</th>
            <th class="px-4 py-3 font-semibold">Posisi</th>
            <th class="px-4 py-3 font-semibold">Jadwal</th>
            <th class="px-4 py-3 text-center font-semibold">Urutan</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          {#each data.banners as b (b.id)}
            <tr class="hover:bg-ink-50/60">
              <td class="max-w-xs px-4 py-3">
                <div class="truncate font-medium text-ink-900">{b.title}</div>
                {#if b.subtitle}
                  <div class="truncate text-xs text-ink-400">{b.subtitle}</div>
                {/if}
              </td>
              <td class="px-4 py-3 text-xs text-ink-600">{posLabel(b.position)}</td>
              <td class="px-4 py-3 text-xs text-ink-400">
                {fmtDate(b.startAt)} → {fmtDate(b.endAt)}
              </td>
              <td class="px-4 py-3 text-center text-xs tabular-nums text-ink-500">{b.sortOrder}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold {b.isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-ink-100 text-ink-500'}">{b.isActive ? "Aktif" : "Nonaktif"}</span
                >
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onclick={() => openEdit(b)}>Edit</Button>
                  <Button size="sm" variant="ghost" onclick={() => toggle(b)}
                    >{b.isActive ? "Matikan" : "Aktifkan"}</Button
                  >
                  <Button size="sm" variant="ghost" class="text-danger" onclick={() => askDelete(b)}
                    >Hapus</Button
                  >
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<!-- Add/Edit modal (bottom-sheet mobile, centered desktop) -->
{#if modal !== null}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm lg:items-center lg:p-4"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && closeModal()}
  >
    <div
      class="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 sm:max-w-lg lg:rounded-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={modal === "add" ? "Tambah banner" : "Edit banner"}
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-display text-lg font-bold">
          {modal === "add" ? "Tambah Banner" : `Edit Banner #${modal}`}
        </h2>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-ink-400 hover:bg-ink-100"
          onclick={closeModal}
          aria-label="Tutup">✕</button
        >
      </div>
      <form
        method="POST"
        action="?/save"
        use:enhance={() => async (input: any) => {
          const r = input.result;
          if (r.type === "failure") toast(r.data?.error ?? "Gagal", "error");
          else {
            toast(r.data?.success ?? "OK", "success");
            closeModal();
            await input.update();
          }
        }}
        class="space-y-3"
      >
        <input type="hidden" name="id" value={modal === "add" ? 0 : modal} />
        <div>
          <label class="mb-1 block text-sm font-semibold" for="bn-title"
            >Judul<span class="text-danger">*</span></label
          >
          <input
            id="bn-title"
            name="title"
            bind:value={fTitle}
            required
            maxlength="150"
            class={input}
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-semibold" for="bn-sub">Subjudul</label>
          <input id="bn-sub" name="subtitle" bind:value={fSubtitle} maxlength="255" class={input} />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-semibold" for="bn-img">URL Gambar</label>
            <input
              id="bn-img"
              name="imageUrl"
              bind:value={fImageUrl}
              type="url"
              placeholder="https://…"
              class={input}
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="bn-link">URL Tautan (klik)</label>
            <input
              id="bn-link"
              name="linkUrl"
              bind:value={fLinkUrl}
              type="url"
              placeholder="/layanan, https://…"
              class={input}
            />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-semibold" for="bn-pos">Posisi</label>
            <select id="bn-pos" name="position" bind:value={fPosition} class={input}>
              {#each data.positions as p (p.value)}
                <option value={p.value}>{p.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="bn-sort">Urutan</label>
            <input
              id="bn-sort"
              name="sortOrder"
              bind:value={fSort}
              type="number"
              min="0"
              class={input}
            />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-semibold" for="bn-start">Mulai (opsional)</label>
            <input
              id="bn-start"
              name="startAt"
              bind:value={fStart}
              type="datetime-local"
              class={input}
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="bn-end">Berakhir (opsional)</label>
            <input id="bn-end" name="endAt" bind:value={fEnd} type="datetime-local" class={input} />
          </div>
        </div>
        <label class="flex items-center gap-2.5 text-sm font-medium" for="bn-active">
          <input
            id="bn-active"
            type="checkbox"
            name="isActive"
            value="1"
            bind:checked={fActive}
            class="h-4 w-4 rounded border-ink-300"
          />
          Aktif (tampil untuk user)
        </label>
        <div class="flex gap-2 pt-1">
          <Button type="submit" class="flex-1">{modal === "add" ? "Simpan" : "Update"}</Button>
          <Button type="button" variant="ghost" onclick={closeModal}>Batal</Button>
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
    confirmLabel="Ya, hapus"
    danger
    onConfirm={confirm.action}
  />
{/if}
