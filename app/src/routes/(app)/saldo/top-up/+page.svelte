<script lang="ts">
  import { Button, toast, EmptyState } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let amount = $state(50000);
  let custom = $state("");
  let submitting = $state(false);

  const chips = [50000, 100000, 200000, 500000];

  function setChip(v: number) {
    haptic();
    amount = v;
    custom = "";
  }
</script>

<section class="space-y-4">
  <h1 class="font-display text-lg font-bold">Top Up Saldo</h1>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-2">
    {#each chips as c}
      <button
        onclick={() => setChip(c)}
        class="rounded-2xl border p-4 text-center font-semibold {amount === c && !custom
          ? 'border-accent-ink bg-accent-50 text-accent-700'
          : 'border-ink-200'}"
      >
        {formatRupiah(c)}
      </button>
    {/each}
  </div>

  <div>
    <label class="mb-1 block text-sm font-semibold">Nominal lain</label>
    <input
      type="number"
      bind:value={custom}
      oninput={() => custom && (amount = Number(custom))}
      placeholder="100000"
      class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-accent-ink"
    />
  </div>

  <div class="rounded-2xl bg-ink-900 p-4 text-white">
    <div class="flex items-center justify-between text-sm">
      <span class="text-ink-300">Total</span>
      <span class="font-display text-xl font-extrabold tabular-nums">{formatRupiah(amount)}</span>
    </div>
  </div>

  <form
    method="POST"
    action="?/topup"
    use:enhance={() => {
      submitting = true;
      return async ({ result }) => {
        submitting = false;
        if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
        else {
          toast("Permintaan top up dibuat", "success");
          await applyAction(result);
        }
      };
    }}
  >
    <input type="hidden" name="amount" value={amount} />
    <Button type="submit" disabled={submitting} class="w-full">
      {submitting ? "Memproses…" : "Top Up Sekarang"}
    </Button>
  </form>

  {#if !data.midtransReady && !data.tripayReady}
    <p class="text-center text-xs text-ink-400">
      Pembayaran otomatis (Midtrans/Tripay) akan aktif setelah konfigurasi payment gateway.
    </p>
  {/if}

  <div>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-semibold">Riwayat Top Up</h2>
      <a href="/saldo/riwayat" class="text-xs font-semibold text-accent-ink">Semua ›</a>
    </div>
    {#if data.history.length === 0}
      <EmptyState title="Belum ada riwayat" description="Riwayat deposit akan muncul di sini." />
    {:else}
      <ul class="space-y-2">
        {#each data.history as h (h.id)}
          <li
            class="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 text-sm"
          >
            <div>
              <div class="font-semibold">{formatRupiah(Number(h.amount))}</div>
              <div class="text-xs text-ink-500">{h.methodName}</div>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold {h.status === 'Success'
                ? 'bg-success/10 text-success'
                : h.status === 'Canceled'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-status-pending/10 text-status-pending'}">{h.status}</span
            >
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
