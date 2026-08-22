<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { ActionData, PageData } from "./$types";

  let { data }: { data: PageData; form: ActionData } = $props();

  type Item = PageData["items"][number];

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

  let q = $state(data.q ?? "");
  let modal = $state<"add" | number | null>(null);
  let fKategori = $state("");
  let fContent = $state("");

  function openAdd() {
    modal = "add";
    fKategori = "";
    fContent = "";
  }
  function openEdit(r: Item) {
    modal = r.id;
    fKategori = r.kategori;
    fContent = r.content;
  }
  function closeModal() {
    modal = null;
  }

  function doSearch() {
    const u = new URL($page.url);
    if (q.trim()) u.searchParams.set("q", q.trim());
    else u.searchParams.delete("q");
    u.searchParams.delete("page");
    goto(u.toString(), { keepFocus: true });
  }

  let confirm = $state<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  function askDelete(r: Item) {
    confirm = {
      open: true,
      title: `Hapus berita #${r.id}?`,
      message: `Kategori "${r.kategori}" — tindakan tidak bisa dibatalkan.`,
      action: () => {
        const fd = new FormData();
        fd.set("id", String(r.id));
        fetch("?/delete", { method: "POST", body: fd, headers: { Origin: location.origin } }).then(
          async (res) => {
            const json = await res.json().catch(() => null);
            // SvelteKit form actions return JSON when fetch+Origin; fallback toast
            if (!json) return;
            const d = json.data ?? json;
            if (json.type === "failure" || d?.error) toast(d.error ?? "Gagal", "error");
            else toast(d.success ?? "Dihapus", "success");
            confirm = null;
            // reload data
            goto($page.url.toString(), { invalidateAll: true });
          },
        );
      },
    };
  }

  const input =
    "w-full rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm focus:border-ink-400 focus:outline-none";
</script>

<svelte:head>
  <title>Berita — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        Berita
      </h1>
      <p class="mt-1 text-sm text-ink-500">
        {data.total} berita
        {#if data.q}<span class="mx-1 text-ink-300">·</span> filter:
          <span class="font-semibold text-ink-700">"{data.q}"</span>{/if}
      </p>
    </div>
    <Button size="md" onclick={openAdd}>+ Buat Berita</Button>
  </header>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      doSearch();
    }}
    class="flex gap-2"
  >
    <input
      bind:value={q}
      placeholder="Cari kategori / konten…"
      class="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3 text-sm focus:border-ink-400 focus:outline-none"
    />
    <Button type="submit" variant="ghost">Cari</Button>
    {#if data.q}
      <Button
        type="button"
        variant="ghost"
        onclick={() => {
          q = "";
          doSearch();
        }}>Reset</Button
      >
    {/if}
  </form>

  {#if data.items.length === 0}
    <EmptyState
      icon="📰"
      title={data.q ? "Tidak ada hasil" : "Belum ada berita"}
      description={data.q
        ? `Tidak ada berita untuk "${data.q}"`
        : "Buat berita untuk broadcast ke user."}
    />
  {:else}
    <!-- Mobile cards -->
    <ul class="space-y-2 lg:hidden">
      {#each data.items as r (r.id)}
        <li class="rounded-2xl border border-ink-100 p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-full bg-ink-900 px-2.5 py-1 text-xs font-bold text-white"
              >{r.kategori || "—"}</span
            >
            <span class="text-xs text-ink-400">#{r.id} · {fmtDate(r.createdAt)}</span>
          </div>
          <p class="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-ink-700">{r.content}</p>
          <div class="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" class="flex-1" onclick={() => openEdit(r)}
              >Edit</Button
            >
            <Button
              size="sm"
              variant="ghost"
              class="shrink-0 text-danger"
              onclick={() => askDelete(r)}>Hapus</Button
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
            <th class="px-4 py-3 font-semibold">ID</th>
            <th class="px-4 py-3 font-semibold">Kategori</th>
            <th class="px-4 py-3 font-semibold">Konten</th>
            <th class="px-4 py-3 font-semibold">Tanggal</th>
            <th class="px-4 py-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          {#each data.items as r (r.id)}
            <tr class="hover:bg-ink-50/60">
              <td class="px-4 py-3 font-mono text-xs text-ink-500">#{r.id}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full bg-ink-900 px-2.5 py-1 text-xs font-bold text-white"
                  >{r.kategori}</span
                >
              </td>
              <td class="max-w-md px-4 py-3">
                <div class="line-clamp-2 whitespace-pre-wrap text-ink-700">{r.content}</div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-ink-400"
                >{fmtDate(r.createdAt)}</td
              >
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onclick={() => openEdit(r)}>Edit</Button>
                  <Button size="sm" variant="ghost" class="text-danger" onclick={() => askDelete(r)}
                    >Hapus</Button
                  >
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if data.total > data.perPage}
      {@const totalPages = Math.ceil(data.total / data.perPage)}
      <div class="flex items-center justify-between pt-2 text-sm">
        <span class="text-ink-400">Hal {data.page} / {totalPages}</span>
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={data.page <= 1}
            onclick={() => {
              const u = new URL($page.url);
              u.searchParams.set("page", String(data.page - 1));
              goto(u.toString());
            }}>Prev</Button
          >
          <Button
            size="sm"
            variant="ghost"
            disabled={data.page >= totalPages}
            onclick={() => {
              const u = new URL($page.url);
              u.searchParams.set("page", String(data.page + 1));
              goto(u.toString());
            }}>Next</Button
          >
        </div>
      </div>
    {/if}
  {/if}
</section>

<!-- Add/Edit modal -->
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
      aria-label={modal === "add" ? "Tambah berita" : "Edit berita"}
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-display text-lg font-bold">
          {modal === "add" ? "Buat Berita" : `Edit Berita #${modal}`}
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
        use:enhance={() =>
          async ({ result, update }: any) => {
            if (result.type === "failure") toast(result.data?.error ?? "Gagal", "error");
            else {
              toast(result.data?.success ?? "OK", "success");
              closeModal();
              await update();
            }
          }}
        class="space-y-3"
      >
        <input type="hidden" name="id" value={modal === "add" ? 0 : modal} />
        <div>
          <label class="mb-1 block text-sm font-semibold" for="news-kategori"
            >Kategori<span class="text-danger">*</span></label
          >
          <input
            id="news-kategori"
            name="kategori"
            bind:value={fKategori}
            required
            maxlength="128"
            placeholder="Info, Promo, Maintenance…"
            class={input}
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-semibold" for="news-content"
            >Konten<span class="text-danger">*</span></label
          >
          <textarea
            id="news-content"
            name="content"
            bind:value={fContent}
            required
            rows="6"
            placeholder="Tulis berita…"
            class={input + " min-h-[140px] py-3"}
          ></textarea>
        </div>
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
