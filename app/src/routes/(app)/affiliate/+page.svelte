<script lang="ts">
  import { Button, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let busy = $state(false);
  let confirmOpen = $state(false);

  async function submitWithdraw(input: any) {
    busy = true;
    const r = input.result;
    if (r.type === "failure") toast(r.data?.error ?? "Gagal", "error");
    else {
      toast(r.data?.success ?? "Komisi ditarik", "success");
      confirmOpen = false;
      if (r.type !== "redirect") await applyAction(r);
    }
    busy = false;
  }

  function openConfirm() {
    haptic();
    confirmOpen = true;
  }

  async function share() {
    haptic();
    if (navigator.share) {
      await navigator.share({
        title: "Socio.id",
        text: "Bergabung lewat referral saya",
        url: data.refLink,
      });
    } else {
      navigator.clipboard?.writeText(data.refLink);
      toast("Link referral disalin", "success");
    }
  }
</script>

<section class="space-y-4">
  <h1 class="font-display text-lg font-bold">Affiliate</h1>

  <div class="rounded-2xl bg-ink-900 p-4 text-white">
    <div class="text-xs text-ink-300">Komisi Pending</div>
    <div class="font-display text-2xl font-extrabold tabular-nums">
      {formatRupiah(data.commission)}
    </div>
    <div class="mt-1 flex items-center justify-between text-xs">
      <span class="text-ink-400">{data.downline} downline · kode {data.code}</span>
      {#if data.withdrawn > 0}
        <span class="text-ink-400">Sudah ditarik: {formatRupiah(data.withdrawn)}</span>
      {/if}
    </div>
    <div class="mt-3">
      {#if data.canWithdraw}
        <Button onclick={openConfirm} size="sm" variant="accent" class="w-full">Tarik Komisi</Button>
      {:else}
        <div class="rounded-xl bg-ink-800 px-3 py-2 text-center text-xs text-ink-300">
          Minimal {formatRupiah(data.minWithdraw)} untuk withdraw
        </div>
      {/if}
    </div>
  </div>

  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <label class="mb-1 block text-sm font-semibold">Link Referral</label>
    <div class="flex gap-2">
      <input
        readonly
        value={data.refLink}
        class="h-10 flex-1 rounded-xl border border-ink-200 bg-ink-50 px-3 text-sm"
      />
      <Button onclick={share} size="sm">Bagikan</Button>
    </div>
  </div>

  <div class="flex flex-col items-center rounded-2xl border border-ink-100 bg-surface p-4">
    <span class="mb-2 text-xs font-semibold text-ink-500">Scan untuk daftar</span>
    <img src={data.qr} alt="QR referral" class="h-40 w-40 rounded-xl" />
  </div>

  <p class="text-center text-xs text-ink-400">
    Ajak teman daftar lewat link kamu & dapat komisi dari setiap pembelian mereka.
  </p>
</section>

{#if confirmOpen}
  <div
    class="fixed inset-0 z-50 grid place-items-end bg-ink-900/40 sm:place-items-center"
    onclick={() => !busy && (confirmOpen = false)}
    role="dialog"
    aria-modal="true"
  >
    <form
      method="POST"
      action="?/withdraw"
      use:enhance={submitWithdraw}
      class="w-full space-y-3 rounded-t-3xl bg-surface p-5 sm:max-w-sm sm:rounded-3xl"
      role="document"
    >
      <h2 class="font-display text-base font-bold">Tarik Komisi</h2>
      <p class="text-sm text-ink-500">
        Komisi <span class="font-bold text-ink-900">{formatRupiah(data.commission)}</span> akan
        dikredit ke saldo utama kamu. Diproses instan, tidak perlu metode pembayaran.
      </p>
      <div class="flex gap-2">
        <Button type="button" size="sm" variant="ghost" class="flex-1" onclick={() => (confirmOpen = false)} disabled={busy}>Batal</Button>
        <Button type="submit" size="sm" variant="accent" class="flex-1" disabled={busy}>
          {busy ? "Memproses…" : "Tarik Sekarang"}
        </Button>
      </div>
    </form>
  </div>
{/if}
