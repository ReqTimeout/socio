<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { ActionData, PageData } from "./$types";

  let { data }: { data: PageData; form: ActionData } = $props();

  type C = PageData["campaigns"][number];

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

  const statusBadge = (s: string) =>
    s === "sent"
      ? "bg-success/10 text-success"
      : s === "draft"
        ? "bg-ink-100 text-ink-600"
        : s === "scheduled"
          ? "bg-primary-50 text-primary-700"
          : s === "cancelled"
            ? "bg-danger/10 text-danger"
            : "bg-amber-100 text-amber-700";
  const statusLabel = (s: string) =>
    s === "sent"
      ? "Terkirim"
      : s === "draft"
        ? "Draft"
        : s === "scheduled"
          ? "Terjadwal"
          : s === "cancelled"
            ? "Batal"
            : "Pause";

  let modal = $state<"add" | number | null>(null);
  let fTitle = $state("");
  let fSubject = $state("");
  let fBody = $state("");
  let fCtaText = $state("");
  let fCtaUrl = $state("");
  let fTemplateType = $state("promotional");
  let fAudience = $state("all");
  let fGroup = $state("all");

  function openAdd() {
    modal = "add";
    fTitle = "";
    fSubject = "";
    fBody = "";
    fCtaText = "";
    fCtaUrl = "";
    fTemplateType = "promotional";
    fAudience = "all";
    fGroup = "all";
  }
  function openEdit(c: C) {
    modal = c.id;
    fTitle = c.title;
    fSubject = c.subject;
    fBody = c.body;
    fCtaText = c.ctaText;
    fCtaUrl = c.ctaUrl;
    fTemplateType = c.templateType;
    fAudience = c.audience;
    fGroup = c.group;
  }
  function closeModal() {
    modal = null;
  }

  function setFilter(s: string) {
    const u = new URL($page.url);
    if (s) u.searchParams.set("status", s);
    else u.searchParams.delete("status");
    u.searchParams.delete("page");
    goto(u.toString());
  }

  let confirm = $state<{
    open: boolean;
    title: string;
    message: string;
    danger: boolean;
    label: string;
    actionName: string;
    id: number;
  } | null>(null);

  function askAction(c: C, act: "send" | "cancel" | "delete") {
    const cfg =
      act === "send"
        ? {
            title: `Kirim "${c.title}"?`,
            message: `Campaign akan di-queue ke email_queue untuk segment ${c.audience}. Pengiriman berlangsung via cron.`,
            danger: false,
            label: "Ya, kirim",
          }
        : act === "cancel"
          ? {
              title: `Batalkan "${c.title}"?`,
              message: "Status berubah menjadi cancelled dan tidak bisa dikirim ulang.",
              danger: true,
              label: "Ya, batalkan",
            }
          : {
              title: `Hapus "${c.title}"?`,
              message: "Tindakan ini tidak bisa dibatalkan. Campaign terkirim tidak bisa dihapus.",
              danger: true,
              label: "Ya, hapus",
            };
    confirm = { open: true, ...cfg, actionName: act, id: c.id };
  }

  async function runConfirm() {
    if (!confirm) return;
    const fd = new FormData();
    fd.set("id", String(confirm.id));
    const res = await fetch(`?/${confirm.actionName}`, { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    if (json) {
      const d = json.data ?? json;
      if (json.type === "failure" || d?.error) toast(d.error ?? "Gagal", "error");
      else toast(d.success ?? "OK", "success");
    }
    confirm = null;
    await goto($page.url.toString(), { invalidateAll: true });
  }

  const input =
    "w-full rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm focus:border-ink-400 focus:outline-none";
</script>

<svelte:head>
  <title>Email Marketing — Admin Socio.id</title>
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
          <Icon name="mail" size={18} stroke={2.5} />
        </span>
        Email Marketing
        <span class="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-ink-50"
          >{data.total}</span
        >
      </h1>
      <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-500">
        <span
          class="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-surface px-2.5 py-1"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>queue {data.queuePending} pending
        </span>
        {#if data.queueFailed}
          <span
            class="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-600"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>{data.queueFailed} gagal
          </span>
        {/if}
        <span class="hidden sm:inline text-ink-300">·</span>
        <span class="rounded-full bg-ink-50 px-2.5 py-1 text-ink-500"
          >6 segment · templated CTA via Resend</span
        >
      </p>
    </div>
    <Button size="md" onclick={openAdd}>
      <Icon name="plus" size={16} stroke={2.5} class="-ml-0.5" />
      Buat Campaign
    </Button>
  </header>

  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap gap-1.5">
      {#each data.filterStatuses as s (s || "all")}
        <button
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-bold transition-colors {data.status ===
          s
            ? 'border-transparent bg-ink-900 text-ink-50 shadow-sm'
            : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-50'}"
          onclick={() => setFilter(s)}>{s === "" ? "Semua" : statusLabel(s)}</button
        >
      {/each}
    </div>
    <span class="text-[11px] font-medium text-ink-400"
      >Segment: all / active 7d / high_spender 30d / churn_risk — blast via <code
        class="rounded bg-ink-100 px-1 py-0.5 font-mono text-[10px]">email_queue</code
      ></span
    >
  </div>

  {#if data.campaigns.length === 0}
    <EmptyState
      art="email"
      title={data.status
        ? `Tidak ada campaign "${statusLabel(data.status)}"`
        : "Belum ada campaign"}
      description="Buat campaign email untuk broadcast ke segment user."
    />
  {:else}
    <!-- Mobile cards -->
    <ul class="space-y-2 lg:hidden">
      {#each data.campaigns as c (c.id)}
        <li class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
          <div
            class="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-3 py-2"
          >
            <span class="truncate text-sm font-bold text-ink-900">{c.title}</span>
            <span
              class="inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold {statusBadge(
                c.status,
              )}">{statusLabel(c.status)}</span
            >
          </div>
          <p class="truncate px-3 pt-1.5 text-xs font-medium text-ink-600">{c.subject}</p>
          <p class="px-3 text-[11px] text-ink-400">
            {c.audience} · {c.group}
            {#if c.ctaText}· CTA: {c.ctaText}{/if}
          </p>
          <div class="grid grid-cols-3 gap-1.5 px-3 pt-1.5 text-center text-[11px] text-ink-500">
            <div class="rounded-xl bg-ink-50 py-1.5">
              <div class="font-extrabold text-ink-800">{c.track.sent}</div>
              kirim
            </div>
            <div class="rounded-xl bg-ink-50 py-1.5">
              <div class="font-extrabold text-ink-800">{c.track.opened}</div>
              buka
            </div>
            <div class="rounded-xl bg-ink-50 py-1.5">
              <div class="font-extrabold text-ink-800">{c.track.clicked}</div>
              klik
            </div>
          </div>
          <p class="px-3 pt-1.5 text-xs text-ink-400">{fmtDate(c.sentAt ?? c.scheduledAt)}</p>
          <div class="flex gap-1.5 border-t border-ink-100 bg-ink-50/30 px-3 py-2">
            {#if c.status === "draft" || c.status === "paused"}
              <button
                type="button"
                onclick={() => openEdit(c)}
                class="flex-1 rounded-full border border-ink-200 bg-surface px-3 py-2 text-xs font-bold text-ink-700 hover:bg-ink-50"
                >Edit</button
              >
              <button
                type="button"
                onclick={() => askAction(c, "send")}
                class="flex-1 rounded-full bg-ink-900 px-3 py-2 text-xs font-bold text-ink-50 hover:bg-ink-800"
                >Kirim</button
              >
            {:else if c.status !== "cancelled"}
              <button
                type="button"
                onclick={() => askAction(c, "cancel")}
                class="flex-1 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                >Batalkan</button
              >
            {/if}
            {#if c.status !== "sent"}
              <button
                type="button"
                onclick={() => askAction(c, "delete")}
                class="rounded-full border border-ink-200 bg-surface px-3 py-2 text-xs font-bold text-ink-500 hover:bg-ink-50"
                >Hapus</button
              >
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    <!-- Desktop table -->
    <div class="hidden overflow-hidden rounded-2xl border border-ink-100 lg:block">
      <table class="w-full text-sm">
        <thead class="bg-ink-50/80 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th class="px-4 py-2.5 font-semibold">Campaign</th>
            <th class="px-3 py-2.5 font-semibold">Segment</th>
            <th class="px-4 py-2.5 text-center font-semibold">Statistik</th>
            <th class="px-4 py-2.5 font-semibold">Terakhir</th>
            <th class="px-4 py-2.5 font-semibold">Status</th>
            <th class="px-4 py-2.5 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          {#each data.campaigns as c (c.id)}
            <tr class="group hover:bg-ink-50/60">
              <td class="max-w-[280px] px-4 py-3">
                <div class="truncate font-bold text-ink-900">{c.title}</div>
                <div class="truncate text-xs text-ink-500">
                  {c.subject}
                  {#if c.ctaText}· <span
                      class="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold"
                      >{c.ctaText}</span
                    >{/if}
                </div>
              </td>
              <td class="px-3 py-3 text-xs"
                ><span
                  class="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 font-bold text-ink-600"
                  >{c.audience}</span
                > <span class="text-ink-300">/</span>
                <span class="font-medium text-ink-500">{c.group}</span></td
              >
              <td class="px-4 py-3 text-center text-xs"
                ><span
                  class="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 font-bold text-ink-700"
                  >{c.track.sent} · {c.track.opened} · {c.track.clicked}</span
                > <span class="ml-1 text-[11px] text-ink-400">kirim · buka · klik</span></td
              >
              <td class="whitespace-nowrap px-4 py-3 text-xs text-ink-500"
                >{fmtDate(c.sentAt ?? c.scheduledAt)}</td
              >
              <td class="px-4 py-3"
                ><span
                  class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold {statusBadge(
                    c.status,
                  )}">{statusLabel(c.status)}</span
                ></td
              >
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  {#if c.status === "draft" || c.status === "paused"}
                    <button
                      type="button"
                      onclick={() => openEdit(c)}
                      class="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
                      title="Edit"><Icon name="settings" size={14} /></button
                    >
                    <button
                      type="button"
                      onclick={() => askAction(c, "send")}
                      class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-ink-50 hover:bg-ink-800"
                      ><Icon name="mail" size={12} />Kirim</button
                    >
                  {:else if c.status !== "cancelled"}
                    <button
                      type="button"
                      onclick={() => askAction(c, "cancel")}
                      class="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                      >Batalkan</button
                    >
                  {/if}
                  {#if c.status !== "sent"}
                    <button
                      type="button"
                      onclick={() => askAction(c, "delete")}
                      class="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-surface text-ink-500 hover:bg-ink-50"
                      title="Hapus"><Icon name="trash" size={14} /></button
                    >
                  {/if}
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
      class="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 sm:max-w-2xl lg:rounded-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={modal === "add" ? "Buat campaign email" : "Edit campaign email"}
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-display text-lg font-bold">
          {modal === "add" ? "Buat Campaign" : `Edit Campaign #${modal}`}
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
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-title"
              >Judul<span class="text-danger">*</span></label
            >
            <input
              id="ec-title"
              name="title"
              bind:value={fTitle}
              required
              maxlength="255"
              class={input}
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-subject"
              >Subject Email<span class="text-danger">*</span></label
            >
            <input
              id="ec-subject"
              name="subjectLine"
              bind:value={fSubject}
              required
              maxlength="255"
              class={input}
            />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm font-semibold" for="ec-body"
            >Isi Email<span class="text-danger">*</span></label
          >
          <textarea
            id="ec-body"
            name="emailBody"
            bind:value={fBody}
            required
            rows="8"
            class={input + " min-h-[160px] py-3"}
          ></textarea>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-cta-text">Teks Tombol CTA</label
            >
            <input
              id="ec-cta-text"
              name="ctaButtonText"
              bind:value={fCtaText}
              maxlength="50"
              class={input}
              placeholder="cth: Pesan Sekarang"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-cta-url">URL Tombol CTA</label>
            <input
              id="ec-cta-url"
              name="ctaButtonUrl"
              bind:value={fCtaUrl}
              maxlength="500"
              class={input}
              placeholder="https://app.socio.id/…"
            />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-type">Tipe Template</label>
            <select id="ec-type" name="templateType" bind:value={fTemplateType} class={input}>
              {#each data.templateTypes as t (t)}
                <option value={t}>{t}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-aud">Target Audience</label>
            <select id="ec-aud" name="targetAudience" bind:value={fAudience} class={input}>
              {#each data.audiences as a (a.value)}
                <option value={a.value}>{a.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-semibold" for="ec-group">Level User</label>
            <select id="ec-group" name="targetGroup" bind:value={fGroup} class={input}>
              <option value="all">Semua level</option>
              <option value="Member">Member</option>
              <option value="Agen">Agen</option>
              <option value="Reseller">Reseller</option>
            </select>
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <Button type="submit" class="flex-1">{modal === "add" ? "Simpan Draft" : "Update"}</Button
          >
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
    confirmLabel={confirm.label}
    danger={confirm.danger}
    onConfirm={runConfirm}
  />
{/if}
