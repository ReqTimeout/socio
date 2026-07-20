<script lang="ts">
  import { Input, QtyStepper, Button, toast, Icon } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { computePrice, type UserLevel } from "@socio/core/pricing";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let link = $state(data.prefill?.link ?? "");
  let quantity = $state(data.prefill?.qty || data.service?.min || 1000);
  let komen = $state("");
  let saving = $state(false);

  let couponInput = $state("");
  let appliedCoupon = $state<{ code: string; discount: number; finalPrice: number } | null>(null);
  let couponMsg = $state("");
  let applyingCoupon = $state(false);

  const isCustomComments = $derived(data.service?.type === "Custom Comments");
  const lineCount = $derived(komen.split("\n").filter(Boolean).length);
  const effectiveQty = $derived(isCustomComments ? lineCount : quantity);
  const total = $derived(
    data.service ? computePrice(data.service.price, effectiveQty, data.level) : 0,
  );
  const discount = $derived(appliedCoupon?.discount ?? 0);
  const finalTotal = $derived(Math.max(0, total - discount));
  const enough = $derived(data.balance >= finalTotal);
  const canSubmit = $derived(
    !!link && (isCustomComments ? lineCount > 0 : quantity >= (data.service?.min ?? 0)),
  );

  function setQty(v: number) {
    haptic(8);
    quantity = v;
  }

  function resetCoupon() {
    appliedCoupon = null;
    couponMsg = "";
    couponInput = "";
  }

  // Coupon discount depends on subtotal; invalidate if qty changes.
  $effect(() => {
    effectiveQty;
    if (appliedCoupon) resetCoupon();
  });

</script>

<section class="space-y-5">
  {#if !data.service}
    <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center">
      <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Icon name="grid" size={24} />
      </div>
      <p class="text-sm font-bold">Pilih layanan dulu</p>
      <p class="mt-1 text-xs text-ink-500">Buka halaman Layanan untuk mulai memesan.</p>
      <a
        href="/layanan"
        class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition active:scale-95 hover:bg-primary-800"
      >
        <Icon name="grid" size={16} />
        Lihat Layanan
      </a>
    </div>
  {:else}
    <!-- Service header -->
    <div class="rounded-2xl border border-ink-100 bg-surface p-4">
      <div class="flex items-start gap-3">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon name="star" size={20} />
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="font-display text-base font-bold leading-tight">{data.service.serviceName}</h1>
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
            <span class="font-semibold text-ink-700">{data.service.type}</span>
            {#if data.service.isRefill}
              <span class="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                ✓ Refill
              </span>
            {/if}
          </div>
          <div class="mt-1 text-xs text-ink-500">
            Min {data.service.min.toLocaleString("id-ID")} · Max {data.service.max.toLocaleString("id-ID")}
          </div>
        </div>
      </div>
    </div>

    {#if form?.error}
      <div
        class="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
      >
        <Icon name="alert" size={16} />
        {form.error}
      </div>
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
      <input type="hidden" name="quantity" value={effectiveQty} />
      <input type="hidden" name="coupon" value={appliedCoupon?.code ?? ""} />

      <!-- Link -->
      <div>
        <label class="mb-1.5 block text-sm font-bold">Link / Username</label>
        {#if data.saved.length > 0}
          <div class="mb-2 flex flex-wrap gap-1.5">
            {#each data.saved as sv (sv.id)}
              <button
                type="button"
                onclick={() => {
                  haptic(8);
                  link = sv.link;
                }}
                class="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium transition active:scale-95 hover:bg-ink-200"
              >
                {sv.label || sv.link.slice(0, 20)}
              </button>
            {/each}
          </div>
        {/if}
        <Input name="link" bind:value={link} placeholder="https://instagram.com/username" required />
      </div>

      <!-- Quantity or Custom Comments -->
      {#if isCustomComments}
        <div>
          <label class="mb-1.5 block text-sm font-bold">
            Komentar (1 per baris)
          </label>
          <textarea
            name="komen"
            bind:value={komen}
            rows="5"
            placeholder="Komentar 1&#10;Komentar 2&#10;Komentar 3"
            class="w-full rounded-xl border border-ink-200 p-3 text-sm outline-none transition-colors focus:border-primary"
          ></textarea>
          <div class="mt-1.5 flex items-center justify-between text-xs">
            <span class="text-ink-500">{lineCount} komentar = {lineCount} qty</span>
            <span class="text-ink-400">Min {data.service.min}</span>
          </div>
        </div>
      {:else}
        <div>
          <label class="mb-1.5 block text-sm font-bold">Jumlah</label>
          <QtyStepper
            bind:value={quantity}
            min={data.service.min}
            max={data.service.max}
            step={data.service.min}
          />
        </div>
      {/if}

      <!-- Price summary -->
      <div class="rounded-2xl bg-ink-900 p-4 text-white">
        <div class="flex items-center justify-between text-sm">
          <span class="text-ink-300">Total bayar</span>
          <span class="font-display text-xl font-extrabold tabular-nums">{formatRupiah(finalTotal)}</span>
        </div>
        {#if discount > 0}
          <div class="mt-1.5 flex items-center justify-between text-xs">
            <span class="text-ink-400">Diskon ({appliedCoupon?.code})</span>
            <span class="tabular-nums text-success">-{formatRupiah(discount)}</span>
          </div>
        {/if}
        <div class="mt-1.5 flex items-center justify-between text-xs">
          <span class="text-ink-400">Saldo kamu</span>
          <span class="tabular-nums {enough ? 'text-success' : 'text-danger'}">
            {formatRupiah(data.balance)}
          </span>
        </div>
        {#if !enough}
          <a
            href="/saldo/top-up"
            class="mt-2 block rounded-lg bg-white/10 py-2 text-center text-xs font-bold text-white transition hover:bg-white/20"
          >
            Top Up Saldo →
          </a>
        {/if}
      </div>

      <!-- Save link -->
      <label class="flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" name="saveLink" class="h-4 w-4 rounded border-ink-300 text-primary" />
        Simpan link untuk pesan lagi nanti
      </label>

      <Button type="submit" disabled={!canSubmit || !enough || saving} full size="lg">
        {#if saving}
          <Icon name="refresh" size={16} class="animate-spin" />
          Memproses…
        {:else if !enough}
          Saldo Tidak Cukup
        {:else}
          Pesan Sekarang · {formatRupiah(finalTotal)}
        {/if}
      </Button>
    </form>

    <!-- Coupon (I-U1) -->
    <div>
      <label class="mb-1.5 block text-sm font-bold">Kupon Diskon</label>
      {#if appliedCoupon}
        <div
          class="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-3 py-2.5"
        >
          <div class="flex items-center gap-2 text-sm font-semibold text-success">
            <Icon name="check" size={16} />
            {appliedCoupon.code} · -{formatRupiah(appliedCoupon.discount)}
          </div>
          <button type="button" onclick={resetCoupon} class="text-xs font-medium text-ink-500">
            Hapus
          </button>
        </div>
      {:else}
        <form
          method="POST"
          action="?/coupon"
          class="flex gap-2"
          use:enhance={({ formData }) => {
            formData.set("serviceId", String(data.service?.id ?? ""));
            formData.set("quantity", String(effectiveQty));
            formData.set("komen", komen);
            applyingCoupon = true;
            return async ({ result }) => {
              applyingCoupon = false;
              if (result.type === "success" && (result.data as any)?.coupon) {
                const d = result.data as any;
                appliedCoupon = { code: d.coupon, discount: d.discount, finalPrice: d.finalPrice };
                couponMsg = "";
                haptic(20);
              } else if (result.type === "failure") {
                couponMsg = (result.data as any)?.couponError ?? "Kupon tidak valid.";
                toast(couponMsg, "error");
              }
            };
          }}
        >
          <Input
            name="code"
            bind:value={couponInput}
            placeholder="Masukkan kode"
            class="flex-1 uppercase"
            oninput={() => {
              couponMsg = "";
            }}
          />
          <Button type="submit" variant="ghost" disabled={applyingCoupon || !couponInput}>
            {applyingCoupon ? "…" : "Terapkan"}
          </Button>
        </form>
        {#if couponMsg}
          <p class="mt-1.5 text-xs text-danger">{couponMsg}</p>
        {/if}
      {/if}
    </div>

    {#if data.service.note}
      <div class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <strong>Catatan:</strong> {data.service.note}
      </div>
    {/if}
  {/if}
</section>
