<script lang="ts">
  import { Button, toast, hoverLift, Icon } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
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

<svelte:head>
  <title>Affiliate — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Dapatkan komisi dari setiap pembelian teman yang kamu ajak. Link referral, QR code, dan penarikan komisi."
  />
</svelte:head>

<section class="space-y-4 lg:space-y-5">
  <h1
    class="reveal font-display text-lg lg:text-[1.55rem] font-bold leading-none tracking-tight"
    style="--d:0ms"
  >
    Affiliate
  </h1>

  <div class="grid gap-4 min-w-0 lg:grid-cols-2 lg:items-start">
    <div
      class="reveal rounded-2xl bg-ink-900 p-4 lg:p-5 text-white shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)] hover:shadow-[0_20px_48px_-16px_rgba(15,23,42,0.42)] hover:-translate-y-1 transition-all duration-300"
      style="--d:80ms"
    >
      <div class="text-xs text-ink-300">Komisi Pending</div>
      <div class="font-display text-2xl lg:text-3xl font-extrabold tabular-nums">
        {formatRupiah(data.commission)}
      </div>
      <div class="mt-1 flex items-center justify-between text-xs">
        <span class="text-ink-400">{data.downline} downline · kode {data.code}</span>
        {#if data.withdrawn > 0}
          <span class="text-ink-400">Sudah ditarik: {formatRupiah(data.withdrawn)}</span>
        {/if}
      </div>
      <div class="mt-3">
        {#if data.requested > 0}
          <div class="rounded-xl bg-ink-800 px-3 py-2 text-center text-xs text-ink-300">
            {formatRupiah(data.requested)} menunggu persetujuan admin
          </div>
        {:else if data.canWithdraw}
          <Button onclick={openConfirm} size="sm" variant="accent" class="w-full"
            >Tarik Komisi</Button
          >
        {:else}
          <div class="rounded-xl bg-ink-800 px-3 py-2 text-center text-xs text-ink-300">
            Minimal {formatRupiah(data.minWithdraw)} untuk withdraw
          </div>
        {/if}
      </div>
    </div>

    <div class="space-y-4">
      <div
        class="reveal {hoverLift} rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
        style="--d:160ms"
      >
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

      <div
        class="card-lift flex flex-col items-center rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
      >
        <span class="mb-2 text-xs font-semibold text-ink-500">Scan untuk daftar</span>
        <img src={data.qr} alt="QR referral" class="h-40 w-40 lg:h-44 lg:w-44 rounded-xl" />
      </div>
    </div>
  </div>

  <!-- Trust notice — saldo, bukan cash -->
  <div
    class="reveal flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-snug text-amber-900"
    style="--d:220ms"
  >
    <span
      class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-amber-600 ring-1 ring-amber-200"
      ><Icon name="wallet" size={16} /></span
    >
    <div class="min-w-0 space-y-0.5">
      <p class="text-[11px] font-extrabold uppercase tracking-wide text-amber-700">
        Withdraw = saldo akun Socio kamu
      </p>
      <p class="text-xs leading-relaxed text-amber-800">
        Komisi kamu masuk sebagai <span class="font-bold">saldo akun</span> — bisa langsung dipakai untuk
        order semua layanan SMM & nggak hangus. Untuk sekarang belum bisa diuangkan ke rekening.
      </p>
      <a
        href="/affiliate"
        class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 underline-offset-2 hover:underline"
        >Kenapa cuma saldo? <span aria-hidden="true">→</span></a
      >
    </div>
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
      <p class="text-sm leading-relaxed text-ink-600">
        <span class="font-bold text-ink-900">{formatRupiah(data.commission)}</span> akan diajukan —
        kalau admin approve, langsung jadi
        <span class="font-semibold text-ink-900">saldo akun</span>
        kamu. Bisa buat order, nggak hangus.
        <span class="text-ink-400">Belum bisa diuangkan ke rekening, ya.</span>
      </p>
      <div class="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          class="flex-1"
          onclick={() => (confirmOpen = false)}
          disabled={busy}>Batal</Button
        >
        <Button type="submit" size="sm" variant="accent" class="flex-1" disabled={busy}>
          {busy ? "Memproses…" : "Tarik Sekarang"}
        </Button>
      </div>
    </form>
  </div>
{/if}
