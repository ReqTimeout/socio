<script lang="ts">
  import { Input, QtyStepper, Button, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { computePrice, type UserLevel } from "@socio/core/pricing";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let link = $state("");
  let quantity = $state(data.service?.min ?? 1000);
  let saving = $state(false);

  const total = $derived(
    data.service ? computePrice(data.service.price, quantity, data.level) : 0,
  );
  const enough = $derived(data.balance >= total);
</script>

<section class="space-y-4">
  {#if !data.service}
    <div class="rounded-2xl border border-ink-100 bg-surface p-4 text-sm text-ink-500">
      Pilih layanan dari halaman <a href="/layanan" class="font-semibold text-accent-ink">Layanan</a> untuk mulai memesan.
    </div>
  {:else}
    <div>
      <h1 class="font-display text-lg font-bold">{data.service.serviceName}</h1>
      <p class="text-xs text-ink-500">{data.service.type} · Min {data.service.min.toLocaleString("id-ID")} · Max {data.service.max.toLocaleString("id-ID")}</p>
    </div>

    {#if form?.error}
      <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{form.error}</div>
    {/if}

    <form
      method="POST"
      class="space-y-4"
      use:enhance={() => {
        saving = true;
        return async ({ result }) => {
          saving = false;
          if (result.type === "failure") {
            toast((result.data as any)?.error ?? "Gagal memesan", "error");
          } else {
            await applyAction(result);
          }
        };
      }}
    >
      <input type="hidden" name="serviceId" value={data.service.id} />

      <div>
        <label class="mb-1 block text-sm font-semibold">Link / Username</label>
        {#if data.saved.length > 0}
          <div class="mb-2 flex flex-wrap gap-1">
            {#each data.saved as sv}
              <button type="button" onclick={() => (link = sv.link)} class="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium hover:bg-ink-200">{sv.label || sv.link}</button>
            {/each}
          </div>
        {/if}
        <Input name="link" bind:value={link} placeholder="https://instagram.com/username" required />
      </div>

      <div>
        <label class="mb-1 block text-sm font-semibold">Jumlah</label>
        <QtyStepper bind:value={quantity} min={data.service.min} max={data.service.max} step={data.service.min} />
      </div>

      <div class="rounded-2xl bg-ink-900 p-4 text-white">
        <div class="flex items-center justify-between text-sm">
          <span class="text-ink-300">Total bayar</span>
          <span class="font-display text-xl font-extrabold tabular-nums">{formatRupiah(total)}</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-xs">
          <span class="text-ink-400">Saldo kamu</span>
          <span class="tabular-nums {enough ? 'text-success' : 'text-danger'}">{formatRupiah(data.balance)}</span>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" name="saveLink" class="h-4 w-4 rounded border-ink-300" />
        Simpan link untuk pemesanan berikutnya
      </label>

      <Button type="submit" disabled={!enough || saving} class="w-full">
        {saving ? "Memproses…" : enough ? "Pesan Sekarang" : "Saldo Tidak Cukup"}
      </Button>
    </form>
  {/if}
</section>
