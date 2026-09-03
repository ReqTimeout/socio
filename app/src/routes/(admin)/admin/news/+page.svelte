<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast } from "@socio/ui";
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

  let q = $state("");
  $effect(() => {
    q = data.q ?? "";
  });
  let modal = $state<"add" | number | null>(null);
  let fKategori = $state("");
  let fContent = $state("");
  const KATEGORI_PRESET = [
    "✅ Layanan Terbaru",
    "✅ RECOMMENDED",
    "✅ TRENDING NOW",
    "? Layanan Turun Harga",
    "Info",
    "Promo",
    "Maintenance",
  ] as const;
  function catTone(cat: string): string {
    if (cat.includes("Terbaru")) return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (cat.includes("RECOMMEND")) return "bg-sky-50 border-sky-200 text-sky-700";
    if (cat.includes("TRENDING")) return "bg-violet-50 border-violet-200 text-violet-700";
    if (cat.includes("Turun")) return "bg-amber-50 border-amber-200 text-amber-700";
    if (cat.toLowerCase().includes("promo")) return "bg-rose-50 border-rose-200 text-rose-700";
    if (cat.toLowerCase().includes("maintenance")) return "bg-ink-100 border-ink-200 text-ink-600";
    return "bg-ink-900 border-transparent text-ink-50";
  }

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
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-ink-50 shadow-sm"
        >
          <Icon name="megaphone" size={18} stroke={2.5} />
        </span>
        Berita
        <span class="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-ink-50"
          >{data.total}</span
        >
        {#if data.q}<span
            class="ml-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700"
            >"{data.q}"</span
          >{/if}
      </h1>
      <p class="mt-1.5 text-xs font-medium text-ink-500">
        Broadcast ke <span class="font-bold text-ink-700">NotifBell + /notif</span> (type info) & popup
        user · kategori pill + jadwal broadcast
      </p>
    </div>
    <Button size="md" onclick={openAdd}>
      <Icon name="plus" size={16} stroke={2.5} class="-ml-0.5" />
      Buat Berita
    </Button>
  </header>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      doSearch();
    }}
    class="flex items-center gap-2"
  >
    <div class="relative flex-1">
      <span
        class="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-ink-400"
      >
        <Icon name="search" size={16} />
      </span>
      <input
        bind:value={q}
        placeholder="Cari kategori / konten…"
        class="h-10 w-full rounded-xl border border-ink-200 bg-surface pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />
    </div>
    <Button type="submit" size="sm">Cari</Button>
    {#if data.q}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onclick={() => {
          q = "";
          doSearch();
        }}>Reset</Button
      >
    {/if}
  </form>

  <p class="text-[11px] font-medium text-ink-400">
    💡 Tip: setiap <span class="font-semibold text-ink-600">Simpan</span> akan push ke
    <span class="font-bold">NotifBell</span>
    semua user status `1` (muncul di
    <code class="rounded bg-ink-100 px-1 py-0.5 font-mono text-[10px]">/notif?type=news</code>) &
    set <code class="rounded bg-ink-100 px-1 py-0.5 font-mono text-[10px]">read_popup=0</code> untuk popup.
  </p>

  {#if data.items.length === 0}
    <EmptyState
      art="news"
      title={data.q ? "Tidak ada hasil" : "Belum ada berita"}
      description={data.q
        ? `Tidak ada berita untuk "${data.q}"`
        : "Buat berita untuk broadcast ke user."}
    />
  {:else}
    <!-- Mobile cards -->
    <ul class="space-y-2 lg:hidden">
      {#each data.items as r (r.id)}
        <li
          class="reveal overflow-hidden rounded-2xl border border-ink-100 bg-surface"
          style="--d:{0}ms"
        >
          <div
            class="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-3 py-2"
          >
            <span
              class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold {catTone(
                r.kategori,
              )}">{r.kategori || "—"}</span
            >
            <span class="font-mono text-[11px] text-ink-400">#{r.id} · {fmtDate(r.createdAt)}</span>
          </div>
          <p
            class="line-clamp-4 whitespace-pre-wrap px-3 py-2.5 text-sm leading-relaxed text-ink-700"
          >
            {r.content}
          </p>
          <div class="flex gap-1.5 border-t border-ink-100 bg-ink-50/30 px-3 py-2">
            <button
              type="button"
              onclick={() => openEdit(r)}
              class="flex-1 rounded-full bg-ink-900 px-3 py-2 text-xs font-bold text-ink-50 hover:bg-ink-800"
              >Edit</button
            >
            <button
              type="button"
              onclick={() => askDelete(r)}
              class="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
              >Hapus</button
            >
          </div>
        </li>
      {/each}
    </ul>

    <!-- Desktop table -->
    <div class="hidden overflow-hidden rounded-2xl border border-ink-100 lg:block">
      <table class="w-full text-sm">
        <thead class="bg-ink-50/80 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th class="px-4 py-2.5 font-semibold">ID</th>
            <th class="px-3 py-2.5 font-semibold">Kategori</th>
            <th class="px-4 py-2.5 font-semibold">Konten</th>
            <th class="px-4 py-2.5 font-semibold">Tanggal</th>
            <th class="px-4 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          {#each data.items as r (r.id)}
            <tr class="group hover:bg-ink-50/60">
              <td class="px-4 py-3 font-mono text-xs text-ink-400">#{r.id}</td>
              <td class="px-3 py-3">
                <span
                  class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold {catTone(
                    r.kategori,
                  )}">{r.kategori}</span
                >
              </td>
              <td class="max-w-[520px] px-4 py-3">
                <div
                  class="line-clamp-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700 group-hover:text-ink-900"
                >
                  {r.content}
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-ink-500"
                >{fmtDate(r.createdAt)}</td
              >
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    onclick={() => openEdit(r)}
                    class="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-ink-50 hover:bg-ink-800"
                    title="Edit"><Icon name="settings" size={14} /></button
                  >
                  <button
                    type="button"
                    onclick={() => askDelete(r)}
                    class="grid h-8 w-8 place-items-center rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    title="Hapus"><Icon name="trash" size={14} /></button
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
            list="news-kategori-list"
            placeholder="Ketik atau pilih preset…"
            class={input}
          />
          <datalist id="news-kategori-list">
            {#each KATEGORI_PRESET as k}<option value={k}></option>{/each}
          </datalist>
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
