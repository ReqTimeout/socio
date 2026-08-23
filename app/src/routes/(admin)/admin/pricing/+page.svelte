<script lang="ts">
  import { Button, toast, Icon } from "@socio/ui";
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const num = (n: number) => n;

  // Helper preview harga per 1000 untuk modal dasar tertentu
  let sampleBase = $state(1000);
  function per1k(rule: any) {
    return Number(sampleBase) * (1 + Number(rule.markupPercent) / 100) + Number(rule.flatPer1k);
  }
  function minMet(rule: any) {
    return per1k(rule) >= Number(rule.minProfitPer1k);
  }
</script>

<svelte:head>
  <title>Pricing — Admin Socio.id</title>
</svelte:head>

<section class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-2">
    <div>
      <h1 class="font-display text-xl font-bold">Aturan Harga per Level</h1>
      <p class="text-sm text-ink-500">
        Markup &amp; keuntungan per level member. Harga jual per 1000 = modal × (1 + markup%) +
        flat. Berlaku untuk layanan baru &amp; edit.
      </p>
    </div>
  </div>

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

  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <label class="mb-1 block text-xs font-bold text-ink-700">Modal dasar (contoh)</label>
    <div class="flex items-center gap-2">
      <span class="text-sm text-ink-500">Rp</span>
      <input
        type="number"
        min="0"
        bind:value={sampleBase}
        class="w-40 rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      <span class="text-xs text-ink-400">per 1000 — untuk preview live di bawah</span>
    </div>
  </div>

  <form
    method="POST"
    action="?/save"
    use:enhance={() =>
      async ({ result }) => {
        const r = result as any;
        if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
        else toast(r.data?.success ?? "OK", "success");
      }}
    class="space-y-3"
  >
    {#each data.rules as rule (rule.level)}
      <div class="reveal rounded-2xl border border-ink-100 bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-600">
              <Icon name="tag" size={14} stroke={2.5} />
            </span>
            <span class="font-display font-bold">{rule.level}</span>
          </div>
          <label class="flex items-center gap-2 text-xs font-semibold text-ink-600">
            <input
              type="checkbox"
              name="active_{rule.level}"
              value="1"
              checked={Number(rule.isActive) === 1}
              class="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
            />
            Aktif
          </label>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="block">
            <span class="mb-1 block text-xs font-bold text-ink-700">Markup (%)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              name="markup_{rule.level}"
              value={Number(rule.markupPercent)}
              class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-bold text-ink-700">Flat / 1000 (Rp)</span>
            <input
              type="number"
              min="0"
              name="flat_{rule.level}"
              value={Number(rule.flatPer1k)}
              class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-bold text-ink-700">Min profit / 1000 (Rp)</span>
            <input
              type="number"
              min="0"
              name="min_{rule.level}"
              value={Number(rule.minProfitPer1k)}
              class="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span class="text-ink-500">
            Harga jual / 1000:
            <span class="font-semibold text-ink-800"
              >Rp{num(per1k(rule)).toLocaleString("id-ID")}</span
            >
          </span>
          {#if !minMet(rule)}
            <span class="rounded-full bg-warning-soft px-2 py-0.5 font-bold text-warning">
              di bawah min profit
            </span>
          {/if}
        </div>
      </div>
    {/each}

    <div class="flex justify-end">
      <Button type="submit">Simpan Aturan Harga</Button>
    </div>
  </form>
</section>
