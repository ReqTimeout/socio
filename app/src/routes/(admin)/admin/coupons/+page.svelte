<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast, ContextFab } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  type CouponRow = PageData["coupons"][number];

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let editing = $state<CouponRow | null>(null);
  let creating = $state(false);
  let confirmDel = $state<CouponRow | null>(null);
  let confirmDelOpen = $state(false);

  // form state
  let f_code = $state("");
  let f_type = $state<"percent" | "fixed">("percent");
  let f_value = $state(0);
  let f_minOrder = $state(0);
  let f_maxDiscount = $state(0);
  let f_expiresAt = $state("");
  let f_maxUsage = $state(0);
  let f_active = $state(true);

  function openCreate() {
    creating = true;
    editing = null;
    f_code = "";
    f_type = "percent";
    f_value = 10;
    f_minOrder = 0;
    f_maxDiscount = 0;
    f_expiresAt = "";
    f_maxUsage = 0;
    f_active = true;
  }

  function openEdit(c: CouponRow) {
    creating = false;
    editing = c;
    f_code = c.code;
    f_type = c.type;
    f_value = c.value;
    f_minOrder = c.minOrder;
    f_maxDiscount = c.maxDiscount;
    f_expiresAt = c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "";
    f_maxUsage = c.maxUsage;
    f_active = c.active === "1";
  }

  const showModal = $derived(creating || editing !== null);

  function discountLabel(c: CouponRow) {
    return c.type === "percent" ? `${c.value}%` : formatRupiah(c.value);
  }

  function statusLabel(c: CouponRow): { text: string; cls: string } {
    if (c.active !== "1") return { text: "Nonaktif", cls: "bg-ink-100 text-ink-500" };
    if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())
      return { text: "Kedaluwarsa", cls: "bg-warning-soft text-warning" };
    if (c.maxUsage > 0 && c.used >= c.maxUsage)
      return { text: "Habis kuota", cls: "bg-warning-soft text-warning" };
    return { text: "Aktif", cls: "bg-success-soft text-success" };
  }

  const fmtDate = (d: unknown) =>
    new Date(d as string).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // use:enhance = (submit) => async (result-phase) — dua lapis arrow wajib.
  const onResult = (close: boolean) => () => async (input: any) => {
    const { result, update } = input;
    if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
    else {
      toast((result.data as any)?.success ?? "OK", "success");
      if (close) {
        creating = false;
        editing = null;
      }
    }
    await update();
  };
</script>

<svelte:head>
  <title>Kupon — Admin Socio.id</title>
</svelte:head>

<section class="space-y-6">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Kupon</h1>
      <p class="mt-1 text-sm text-ink-500">
        Kode diskon untuk checkout —
        <span class="font-semibold text-ink-700">{data.stats.total}</span> kupon
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success">{data.stats.active}</span> aktif
        <span class="mx-1 text-ink-300">·</span>
        dipakai <span class="font-semibold text-accent-ink">{data.stats.used}×</span>
      </p>
    </div>
    <Button onclick={openCreate}><Icon name="plus" size={16} stroke={2.5} /> Kupon baru</Button>
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

  {#if data.coupons.length === 0}
    <EmptyState
      art="coupons"
      title="Belum ada kupon"
      description="Buat kode diskon untuk promo — bisa dipakai user di halaman Pesan."
    >
      <Button onclick={openCreate}>Buat kupon pertama</Button>
    </EmptyState>
  {:else}
    <!-- Desktop table -->
    <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
      <table class="w-full min-w-[800px] text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="p-3 font-semibold">Kode</th>
            <th class="p-3 font-semibold">Diskon</th>
            <th class="p-3 font-semibold">Syarat</th>
            <th class="p-3 font-semibold text-right">Pemakaian</th>
            <th class="p-3 font-semibold">Berlaku</th>
            <th class="p-3 font-semibold">Status</th>
            <th class="p-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.coupons as c (c.id)}
            {@const st = statusLabel(c)}
            <tr class="border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0">
              <td class="p-3">
                <span
                  class="rounded-lg bg-ink-100 px-2 py-1 font-mono text-sm font-bold tracking-wide text-ink-900"
                  >{c.code}</span
                >
              </td>
              <td class="p-3 font-semibold tabular-nums text-ink-900">{discountLabel(c)}</td>
              <td class="p-3 text-xs text-ink-500">
                {#if c.minOrder > 0}Min. {formatRupiah(c.minOrder)}{:else}Tanpa min{/if}
                {#if c.maxDiscount > 0}
                  · maks {formatRupiah(c.maxDiscount)}{/if}
              </td>
              <td class="p-3 text-right tabular-nums">
                {c.used}{#if c.maxUsage > 0}<span class="text-ink-400">/{c.maxUsage}</span>{/if}
              </td>
              <td class="whitespace-nowrap p-3 text-xs text-ink-500">
                {c.expiresAt ? `s/d ${fmtDate(c.expiresAt)}` : "Tanpa batas"}
              </td>
              <td class="p-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {st.cls}"
                  >{st.text}</span
                >
              </td>
              <td class="p-3 text-right">
                <div class="inline-flex gap-0.5">
                  <button
                    type="button"
                    onclick={() => openEdit(c)}
                    class="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    aria-label="Edit kupon {c.code}"><Icon name="edit" size={16} /></button
                  >
                  <button
                    type="button"
                    onclick={() => {
                      confirmDel = c;
                      confirmDelOpen = true;
                    }}
                    class="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Hapus kupon {c.code}"><Icon name="trash" size={16} /></button
                  >
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <ul class="space-y-2 lg:hidden">
      {#each data.coupons as c (c.id)}
        {@const st = statusLabel(c)}
        <li class="rounded-2xl border border-ink-100 bg-surface p-3.5">
          <div class="flex items-center justify-between gap-2">
            <span class="rounded-lg bg-ink-100 px-2 py-1 font-mono text-sm font-bold tracking-wide"
              >{c.code}</span
            >
            <span class="rounded-full px-2 py-0.5 text-[10px] font-bold {st.cls}">{st.text}</span>
          </div>
          <div class="mt-2 flex items-baseline justify-between">
            <span class="font-display text-lg font-extrabold">{discountLabel(c)}</span>
            <span class="text-xs text-ink-400"
              >{c.used}{#if c.maxUsage > 0}/{c.maxUsage}{/if} dipakai</span
            >
          </div>
          <p class="mt-1 text-xs text-ink-500">
            {#if c.minOrder > 0}Min. {formatRupiah(c.minOrder)}{/if}
            {#if c.maxDiscount > 0}
              · maks {formatRupiah(c.maxDiscount)}{/if}
            · {c.expiresAt ? `s/d ${fmtDate(c.expiresAt)}` : "tanpa batas"}
          </p>
          <div class="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" full onclick={() => openEdit(c)}>Edit</Button>
            <Button
              size="sm"
              variant="danger"
              full
              onclick={() => {
                confirmDel = c;
                confirmDelOpen = true;
              }}>Hapus</Button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- P1-01/02: ContextFab — quick action -->
  <ContextFab
    primary={{ label: "Aksi Cepat", icon: "plus" }}
    lgLabel="Aksi Cepat Kupon"
    actions={[
      { label: "Cari kupon", icon: "search", href: "?q=", tone: "neutral" },
      { label: "Aktif", icon: "check", href: "?status=active", tone: "success" },
      { label: "Expired", icon: "clock", href: "?status=expired", tone: "warning" },
    ]}
  />
</section>

<!-- Modal create/edit -->
{#if showModal}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) {
        creating = false;
        editing = null;
      }
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
    >
      <div class="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 class="font-display text-lg font-bold">
            {editing ? `Edit kupon ${editing.code}` : "Kupon baru"}
          </h3>
          <p class="text-xs text-ink-400">Dipakai user di halaman Pesan saat checkout.</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-ink-400 hover:bg-ink-100"
          aria-label="Tutup"
          onclick={() => {
            creating = false;
            editing = null;
          }}>✕</button
        >
      </div>

      <form method="POST" action="?/save" use:enhance={onResult(true)} class="space-y-3">
        <input type="hidden" name="id" value={editing?.id ?? 0} />
        <div>
          <label for="c-code" class="mb-1 block text-xs font-semibold text-ink-500"
            >Kode kupon</label
          >
          <input
            id="c-code"
            name="code"
            bind:value={f_code}
            placeholder="SUMMER25"
            class="h-10 w-full rounded-xl border border-ink-200 px-3 font-mono text-sm uppercase"
            required
            minlength="3"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="c-type" class="mb-1 block text-xs font-semibold text-ink-500">Tipe</label>
            <select
              id="c-type"
              name="type"
              bind:value={f_type}
              class="h-10 w-full rounded-xl border border-ink-200 bg-surface px-2 text-sm"
            >
              <option value="percent">Persen (%)</option>
              <option value="fixed">Nominal (Rp)</option>
            </select>
          </div>
          <div>
            <label for="c-value" class="mb-1 block text-xs font-semibold text-ink-500"
              >Nilai {f_type === "percent" ? "(%)" : "(Rp)"}</label
            >
            <input
              id="c-value"
              name="value"
              type="number"
              min="1"
              max={f_type === "percent" ? 100 : undefined}
              bind:value={f_value}
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
              required
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="c-min" class="mb-1 block text-xs font-semibold text-ink-500"
              >Min. order (Rp)</label
            >
            <input
              id="c-min"
              name="minOrder"
              type="number"
              min="0"
              bind:value={f_minOrder}
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
            />
          </div>
          <div>
            <label for="c-max" class="mb-1 block text-xs font-semibold text-ink-500"
              >Maks. diskon (Rp)</label
            >
            <input
              id="c-max"
              name="maxDiscount"
              type="number"
              min="0"
              bind:value={f_maxDiscount}
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="c-exp" class="mb-1 block text-xs font-semibold text-ink-500"
              >Berlaku s/d (opsional)</label
            >
            <input
              id="c-exp"
              name="expiresAt"
              type="date"
              bind:value={f_expiresAt}
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
            />
          </div>
          <div>
            <label for="c-quota" class="mb-1 block text-xs font-semibold text-ink-500"
              >Kuota (0 = takterbatas)</label
            >
            <input
              id="c-quota"
              name="maxUsage"
              type="number"
              min="0"
              bind:value={f_maxUsage}
              class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
            />
          </div>
        </div>
        <label
          class="flex cursor-pointer items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5"
        >
          <span class="text-sm font-semibold">Kupon aktif</span>
          <input
            type="checkbox"
            name="active"
            value="1"
            bind:checked={f_active}
            class="h-4 w-4 accent-primary"
          />
        </label>
        <Button type="submit" full>{editing ? "Simpan perubahan" : "Buat kupon"}</Button>
      </form>
    </div>
  </div>
{/if}

<ConfirmDialog
  bind:open={confirmDelOpen}
  danger
  title="Hapus kupon"
  message={`Kupon ${confirmDel?.code ?? ""} akan dihapus permanen. Riwayat pemakaian di order tetap tercatat.`}
>
  <form
    method="POST"
    action="?/delete"
    use:enhance={() => async (input: any) => {
      const { result, update } = input;
      confirmDelOpen = false;
      if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
      else toast((result.data as any)?.success ?? "OK", "success");
      await update();
    }}
    class="flex gap-3"
  >
    <input type="hidden" name="id" value={confirmDel?.id ?? 0} />
    <Button type="button" variant="ghost" full onclick={() => (confirmDelOpen = false)}
      >Batal</Button
    >
    <Button type="submit" variant="danger" full>Ya, hapus</Button>
  </form>
</ConfirmDialog>
