<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  let step = $state(1);
  let title = $state("");
  let body = $state("");
  let segment: string = $state("all");
  let channel: string = $state("in_app");

  const segments = [
    { v: "all", label: "Semua", count: data.counts.all },
    { v: "member", label: "Member", count: data.counts.member },
    { v: "agen", label: "Agen", count: data.counts.agen },
    { v: "reseller", label: "Reseller", count: data.counts.reseller },
    { v: "verified", label: "Verified", count: data.counts.verified },
    { v: "unverified", label: "Unverified", count: data.counts.unverified },
  ];
  const selectedCount = $derived(segments.find((s) => s.v === segment)?.count ?? 0);
</script>

<svelte:head>
  <title>Broadcast — Socio Admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
  <div>
    <h1 class="font-display text-xl font-extrabold">Broadcast Notifikasi</h1>
    <p class="mt-1 text-sm text-ink-500">Kirim ke segment user — in-app + web push</p>
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">{form.success}</div>
  {/if}

  <!-- Step indicator -->
  <div class="flex items-center gap-2 text-xs font-bold">
    <span class="flex items-center gap-1 {step === 1 ? 'text-primary' : 'text-ink-400'}"><span class="grid h-6 w-6 place-items-center rounded-full {step === 1 ? 'bg-primary text-white' : 'bg-ink-100'}">1</span> Segment</span>
    <span class="h-px w-6 bg-ink-200"></span>
    <span class="flex items-center gap-1 {step === 2 ? 'text-primary' : 'text-ink-400'}"><span class="grid h-6 w-6 place-items-center rounded-full {step === 2 ? 'bg-primary text-white' : 'bg-ink-100'}">2</span> Konten</span>
    <span class="h-px w-6 bg-ink-200"></span>
    <span class="flex items-center gap-1 {step === 3 ? 'text-primary' : 'text-ink-400'}"><span class="grid h-6 w-6 place-items-center rounded-full {step === 3 ? 'bg-primary text-white' : 'bg-ink-100'}">3</span> Kirim</span>
  </div>

  <form method="POST" action="?/send" use:enhance class="space-y-4 rounded-2xl border border-ink-100 bg-surface p-5">
    {#if step === 1}
      <h2 class="font-bold">Pilih target — siapa yang mau dikabari</h2>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {#each segments as s}
          <button
            type="button"
            onclick={() => (segment = s.v)}
            class="rounded-xl border px-3 py-3 text-left transition {segment === s.v
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-ink-200 hover:border-ink-300'}"
          >
            <div class="text-sm font-bold">{s.label}</div>
            <div class="text-xs text-ink-500">{s.count.toLocaleString("id-ID")} user</div>
          </button>
        {/each}
      </div>
      <input type="hidden" name="segment" value={segment} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      <Button type="button" onclick={() => (step = 2)}>Lanjut — Konten</Button>
    {:else if step === 2}
      <h2 class="font-bold">Tulis pesan — judul + isi (push: 120 judul, 240 isi)</h2>
      <div>
        <label class="mb-1 block text-xs font-bold">Judul *</label>
        <input name="title" bind:value={title} maxlength="120" required placeholder="Promo akhir tahun — diskon 20%" class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm" />
        <div class="mt-1 text-right text-[11px] text-ink-400">{title.length}/120</div>
      </div>
      <div>
        <label class="mb-1 block text-xs font-bold">Isi *</label>
        <textarea name="body" bind:value={body} maxlength="240" required rows="3" placeholder="Hai, ada promo spesial buat kamu..." class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"></textarea>
        <div class="mt-1 text-right text-[11px] text-ink-400">{body.length}/240</div>
      </div>
      <div>
        <label class="mb-1 block text-xs font-bold">Channel</label>
        <div class="flex gap-2">
          <label class="flex items-center gap-1.5 text-sm"><input type="radio" bind:group={channel} value="in_app" /> In-app</label>
          <label class="flex items-center gap-1.5 text-sm"><input type="radio" bind:group={channel} value="web_push" /> Web Push</label>
          <label class="flex items-center gap-1.5 text-sm"><input type="radio" bind:group={channel} value="both" /> Keduanya</label>
        </div>
      </div>
      <input type="hidden" name="segment" value={segment} />
      <div class="flex gap-2">
        <Button type="button" variant="ghost" onclick={() => (step = 1)}>Kembali</Button>
        <Button type="button" onclick={() => (step = 3)}>Preview</Button>
      </div>
    {:else if step === 3}
      <h2 class="font-bold">Preview & Kirim</h2>
      <div class="rounded-xl border border-ink-200 bg-ink-50 p-4">
        <p class="text-xs font-bold text-ink-500">Preview notifikasi</p>
        <div class="mt-2 rounded-xl bg-white p-3 shadow-sm">
          <p class="text-sm font-bold">{title || "(judul kosong)"}</p>
          <p class="mt-1 text-sm text-ink-600">{body || "(isi kosong)"}</p>
        </div>
        <p class="mt-2 text-xs text-ink-500">Akan dikirim ke <span class="font-bold text-ink-900">{selectedCount.toLocaleString("id-ID")} user</span> · segment {segment} · channel {channel}</p>
      </div>
      <input type="hidden" name="segment" value={segment} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="body" value={body} />
      <div class="flex gap-2">
        <Button type="button" variant="ghost" onclick={() => (step = 2)}>Kembali</Button>
        <Button type="submit">Kirim sekarang</Button>
      </div>
    {/if}
  </form>

  <div class="rounded-2xl border border-ink-100 bg-surface p-5">
    <h2 class="font-bold">History</h2>
    {#if data.campaigns.length === 0}
      <p class="mt-2 text-sm text-ink-500">Belum ada broadcast.</p>
    {:else}
      <ul class="mt-3 divide-y divide-ink-100">
        {#each data.campaigns as c}
          <li class="flex items-center justify-between gap-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold">{c.title}</p>
              <p class="truncate text-xs text-ink-500">{c.body}</p>
              <p class="text-[11px] text-ink-400">{c.targetSegment} · {c.channel} · {new Date(c.createdAt).toLocaleString("id-ID")} · {c.sentCount} terkirim</p>
            </div>
            <span class="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold">{c.sentCount}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
