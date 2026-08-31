<script lang="ts">
  import {
    Input,
    QtyStepper,
    Button,
    toast,
    Icon,
    Select,
    revealDelay,
    NumberFlow,
    hoverLift,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import {
    computePrice,
    baseForLevel,
    type UserLevel,
    type PricingRule,
  } from "@socio/core/pricing";
  import { formatRupiah, serviceDisplayName } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Svc = {
    id: number;
    serviceName: string;
    type: string;
    price: number;
    priceApi: number;
    priceReseller: number;
    min: number;
    max: number;
    isRefill: number;
    note: string;
    waktu: string;
    providerId: number;
    providerServiceId: number;
  };

  // Rule markup level user dari server (DB pricing_rules)
  const levelRule = $derived.by<PricingRule | undefined>(() =>
    (data.rules ?? []).find((r) => r.level === data.level),
  );

  function pickPrice(svc: Svc): number {
    return baseForLevel(
      { price: svc.price, priceApi: svc.priceApi ?? 0, priceReseller: svc.priceReseller ?? 0 },
      data.level as UserLevel,
    );
  }

  // ── Step state ──────────────────────────────────────────────
  let selectedCat = $state<number>(0);
  let serviceList = $state<Svc[]>([]);
  let loadingServices = $state(false);
  let selectedService = $state<Svc | null>(null);

  // ── Order form state ────────────────────────────────────────
  let link = $state("");
  let quantity = $state(0);
  let komen = $state("");
  let saving = $state(false);

  // Prefill sekali dari URL (service deep-link / repeat-order) — tidak boleh tertimpa saat invalidate
  $effect(() => {
    const svc = data.service;
    if (svc) {
      selectedCat = svc.categoryId ?? 0;
      selectedService = { ...(svc as Svc), note: svc.note ?? "", waktu: svc.waktu ?? "" };
      if (!quantity) quantity = data.prefill?.qty || svc.min || 1000;
    } else if (data.prefill?.qty && !quantity) {
      quantity = data.prefill.qty;
    }
    if (!link) link = data.prefill?.link ?? "";
  });

  const isCustomComments = $derived(selectedService?.type === "Custom Comments");
  const lineCount = $derived(komen.split("\n").filter(Boolean).length);
  const effectiveQty = $derived(isCustomComments ? lineCount : quantity);
  // Total live pakai base per level + markup DB — persis sama dengan hitungan server
  const total = $derived(
    selectedService
      ? computePrice(
          pickPrice(selectedService),
          effectiveQty,
          data.level as UserLevel,
          levelRule,
          selectedService.priceApi ?? 0,
        )
      : 0,
  );

  // ── Kupon ───────────────────────────────────────────────────
  let couponCode = $state("");
  let couponDiscount = $state(0);
  let couponMsg = $state("");
  let couponOk = $state(false);
  let checkingCoupon = $state(false);
  const payable = $derived(Math.max(total - couponDiscount, 0));
  const enough = $derived(data.balance >= payable);

  // Auto-recheck kupon saat subtotal berubah (diskon tetap mengikuti subtotal)
  let couponTimer: ReturnType<typeof setTimeout> | undefined;
  async function checkCoupon() {
    const code = couponCode.trim().toUpperCase();
    clearTimeout(couponTimer);
    if (!code) {
      couponDiscount = 0;
      couponMsg = "";
      couponOk = false;
      return;
    }
    if (!total) return;
    couponTimer = setTimeout(async () => {
      checkingCoupon = true;
      try {
        const res = await fetch(`/pesan/coupon?code=${encodeURIComponent(code)}&subtotal=${total}`);
        const j = await res.json();
        couponDiscount = j.valid ? j.discount : 0;
        couponOk = !!j.valid;
        couponMsg = j.valid ? `Hemat ${formatRupiah(j.discount)} 🎉` : j.message;
      } catch {
        couponDiscount = 0;
        couponOk = false;
        couponMsg = "";
      } finally {
        checkingCoupon = false;
      }
    }, 400);
  }
  // Reset preview kupon kalau layanan/qty berganti (subtotal berubah)
  $effect(() => {
    const subtotal = total; // track subtotal → re-check saat berubah
    couponDiscount = 0;
    couponOk = false;
    if (couponCode.trim() && subtotal > 0) checkCoupon();
  });

  // NumberFlow — total "mengalir" saat service/qty/kupon berubah (hero moment).
  const totalFlow = $derived(payable);

  const canSubmit = $derived(
    !!selectedService &&
      !!link &&
      (isCustomComments ? lineCount > 0 : quantity >= (selectedService?.min ?? 0)),
  );

  const catOptions = $derived(data.categories.map((c) => ({ value: c.id, label: c.name })));
  const serviceOptions = $derived(
    serviceList.map((s) => ({
      value: s.id,
      label: s.serviceName,
      hint: `${formatRupiah(pickPrice(s))}/1k`,
    })),
  );

  const catName = $derived(data.categories.find((c) => c.id === selectedCat)?.name ?? "");

  // ── Data loading ────────────────────────────────────────────
  async function loadServices(cat: number) {
    if (!cat) {
      serviceList = [];
      return;
    }
    loadingServices = true;
    try {
      const res = await fetch(`/pesan/services?cat=${cat}`);
      serviceList = res.ok ? await res.json() : [];
    } catch {
      serviceList = [];
      toast("Gagal memuat layanan", "error");
    } finally {
      loadingServices = false;
    }
  }

  async function selectCategory(cat: number) {
    haptic(8);
    if (cat === selectedCat) return;
    selectedCat = cat;
    selectedService = null;
    await loadServices(cat);
  }

  async function pickService(svc: Svc) {
    haptic(10);
    selectedService = svc;
    quantity = svc.min || 1000;
    komen = "";
  }

  function pickServiceById(id: string | number) {
    const svc = serviceList.find((s) => s.id === Number(id));
    if (svc) pickService(svc);
  }

  // Deep-link (?service=X): preload the category's service list so the picker
  // shows the selection highlighted.
  onMount(() => {
    if (selectedCat) loadServices(selectedCat);
  });
</script>

<svelte:head>
  <title>Buat Pesanan — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Buat pesanan followers, likes, views, dan comments untuk Instagram, TikTok, YouTube. Pilih kategori & layanan, proses otomatis."
  />
</svelte:head>

<section class="relative lg:mx-auto lg:max-w-[640px]">
  <!-- Floating backdrop glow — desktop only, playful premium -->
  <div aria-hidden="true" class="pointer-events-none absolute -inset-6 -z-10 hidden lg:block">
    <div
      class="absolute left-1/2 top-[8%] h-[420px] w-[720px] -translate-x-1/2 rounded-[40px] bg-gradient-to-br from-primary-500/12 via-accent-500/10 to-violet-500/10 blur-[32px]"
    ></div>
    <div
      class="absolute left-1/2 top-[22%] h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-400/8 to-primary-400/8 blur-[28px]"
    ></div>
  </div>

  <div class="space-y-4">
    <!-- Hero — compact, floating premium -->
    <div
      class="relative overflow-hidden rounded-2xl lg:rounded-[22px] bg-gradient-to-br from-primary-600 via-primary to-accent-600 p-4 lg:p-5 text-white shadow-[0_14px_32px_-14px_rgba(79,70,229,0.55)] lg:shadow-[0_20px_48px_-16px_rgba(79,70,229,0.45),0_8px_20px_-10px_rgba(15,23,42,0.10)]"
    >
      <div
        class="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
      ></div>
      <div class="relative flex items-center gap-3">
        <div class="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
          <Icon name="rocket" size={22} />
        </div>
        <div>
          <h1 class="font-display text-lg font-extrabold leading-tight">Buat Pesanan Baru</h1>
          <p class="mt-0.5 text-xs text-white/80">
            Pilih kategori, layanan, lalu order — cepat & otomatis
          </p>
        </div>
      </div>
    </div>

    <!-- Order form — floating premium, centered, playful shadow -->
    <div
      class="mx-auto w-full max-w-none space-y-4 rounded-2xl lg:rounded-[22px] border border-ink-100 bg-surface p-4 sm:p-5 lg:p-6 sm:max-w-xl lg:shadow-[0_24px_56px_-18px_rgba(15,23,42,0.18),0_10px_24px_-10px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.9)_inset] lg:border-white/70 lg:backdrop-blur-xl transition-shadow duration-300 hover:lg:shadow-[0_28px_64px_-18px_rgba(15,23,42,0.22),0_12px_28px_-10px_rgba(15,23,42,0.12)]"
    >
      {#if form?.error}
        <div
          class="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
        >
          <Icon name="alert" size={16} />
          {form.error}
        </div>
      {/if}

      <!-- Kategori -->
      <div>
        <span class="mb-1.5 block text-sm font-bold">Kategori</span>
        <Select
          value={selectedCat}
          options={catOptions}
          placeholder="Pilih kategori…"
          searchPlaceholder="Cari kategori…"
          onChange={(v) => selectCategory(Number(v))}
        />
      </div>

      <!-- Layanan -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-sm font-bold">Layanan</span>
          {#if loadingServices}
            <span class="flex items-center gap-1 text-xs text-ink-500">
              <Icon name="refresh" size={12} class="animate-spin" /> Memuat…
            </span>
          {:else if serviceList.length > 0}
            <span class="text-xs text-ink-500">{serviceList.length} layanan</span>
          {/if}
        </div>
        <Select
          value={selectedService?.id ?? ""}
          options={serviceOptions}
          placeholder={selectedCat ? "Pilih layanan…" : "Pilih kategori dulu"}
          searchPlaceholder="Cari layanan…"
          searchable
          disabled={!selectedCat || loadingServices}
          onChange={pickServiceById}
        />
        {#if selectedService}
          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span class="font-display font-bold text-accent-ink"
              >{formatRupiah(pickPrice(selectedService))}<span class="font-medium text-ink-500"
                >/1k</span
              ></span
            >
            <span class="text-ink-500">·</span>
            <span class="text-ink-500"
              >Min {selectedService.min.toLocaleString("id-ID")} – {selectedService.max.toLocaleString(
                "id-ID",
              )}</span
            >
            {#if selectedService.isRefill}
              <span class="rounded-full bg-success/10 px-1.5 py-0.5 font-bold text-emerald-400"
                >♻ Refill</span
              >
            {/if}
          </div>
        {/if}
      </div>

      <form
        method="POST"
        class="space-y-5 border-t border-ink-100 pt-5"
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
        <input type="hidden" name="serviceId" value={selectedService?.id ?? ""} />
        <input type="hidden" name="quantity" value={effectiveQty} />

        <!-- Link -->
        <div>
          <label class="mb-1.5 block text-sm font-bold">Link / Username</label>
          {#if data.saved.length > 0}
            <div
              class="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
            >
              <span class="shrink-0 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                Favorit
              </span>
              {#each data.saved as sv, i (sv.id)}
                <button
                  type="button"
                  style={revealDelay(i, 0, 40)}
                  onclick={() => {
                    haptic(8);
                    if (sv.serviceId) {
                      goto(`/pesan?service=${sv.serviceId}&link=${encodeURIComponent(sv.link)}`);
                    } else {
                      link = sv.link;
                    }
                  }}
                  title={sv.link}
                  class="min-h-[44px] shrink-0 rounded-full bg-ink-100 px-3 py-2 text-xs font-medium transition active:scale-95 hover:bg-ink-200 reveal"
                >
                  {sv.label || sv.link.slice(0, 20)}
                </button>
              {/each}
            </div>
          {/if}
          <Input
            name="link"
            bind:value={link}
            placeholder="https://instagram.com/username"
            required
          />
          <p class="mt-1.5 flex items-center gap-1 text-xs text-ink-500">
            <Icon name="info" size={12} class="shrink-0" />
            {copy.order.linkHelper}
          </p>
        </div>

        <!-- Quantity or Custom Comments -->
        {#if isCustomComments}
          <div>
            <label class="mb-1.5 block text-sm font-bold"> Komentar (1 per baris) </label>
            <textarea
              name="komen"
              bind:value={komen}
              rows="5"
              placeholder="Komentar 1&#10;Komentar 2&#10;Komentar 3"
              class="w-full rounded-xl border border-ink-200 p-3 text-sm outline-none transition-colors focus:border-primary"
            ></textarea>
            <div class="mt-1.5 flex items-center justify-between text-xs">
              <span class="text-ink-500">{lineCount} komentar = {lineCount} qty</span>
              <span class="text-ink-500">Min {selectedService?.min ?? 0}</span>
            </div>
          </div>
        {:else}
          <div>
            <label class="mb-1.5 block text-sm font-bold">Jumlah</label>
            <QtyStepper
              bind:value={quantity}
              min={selectedService?.min ?? 1}
              max={selectedService?.max ?? 1000000}
              step={selectedService?.min || 1}
            />
            <p class="mt-1.5 min-h-[44px] py-2 text-xs leading-relaxed text-ink-500">
              {#if selectedService}
                Min {selectedService.min.toLocaleString("id-ID")} · Max {selectedService.max.toLocaleString(
                  "id-ID",
                )}
              {:else}
                Pilih layanan dulu untuk melihat batas jumlah — semua angka tervalidasi otomatis.
              {/if}
            </p>
          </div>
        {/if}

        <!-- Kupon -->
        <div>
          <label class="mb-1.5 block text-sm font-bold" for="coupon-input"
            >Kode kupon (opsional)</label
          >
          <input
            id="coupon-input"
            name="coupon"
            bind:value={couponCode}
            oninput={checkCoupon}
            placeholder="SUMMER25"
            autocomplete="off"
            class="h-11 w-full rounded-xl border border-ink-200 px-3 font-mono text-sm uppercase outline-none transition-colors focus:border-primary"
          />
          <p
            class="mt-1.5 min-h-[1.25rem] text-xs font-medium {couponOk
              ? 'text-success'
              : couponMsg
                ? 'text-danger'
                : 'text-ink-500'}"
            aria-live="polite"
          >
            {#if checkingCoupon}Memeriksa kupon…{:else if couponMsg}{couponMsg}{:else}
              Punya kupon? Masukkan kodenya di sini.
            {/if}
          </p>
        </div>

        <!-- Price summary -->
        <div
          class="reveal rounded-2xl bg-ink-900 p-4 text-white shadow-[0_16px_32px_-14px_rgba(15,23,42,0.45)]"
          style="--d:40ms"
        >
          {#if couponOk && couponDiscount > 0}
            <div class="flex items-center justify-between text-xs text-ink-300">
              <span>Subtotal</span>
              <span class="tabular-nums line-through">{formatRupiah(total)}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-emerald-400">
              <span>Kupon {couponCode.trim().toUpperCase()}</span>
              <span class="tabular-nums">−{formatRupiah(couponDiscount)}</span>
            </div>
          {/if}
          <div class="flex items-center justify-between">
            <span class="text-sm text-ink-300">Total bayar</span>
            <span class="font-display text-2xl font-extrabold tabular-nums text-white">
              <NumberFlow value={totalFlow} format={formatRupiah} duration={0.6} />
            </span>
          </div>
          <div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
            <span class="text-ink-300">Saldo kamu</span>
            <span class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1 font-semibold tabular-nums {enough
                  ? 'text-emerald-400'
                  : 'text-red-400'}"
              >
                {formatRupiah(data.balance)}
              </span>
              {#if !enough && payable > 0}
                <a
                  href="/saldo/top-up"
                  class="inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-ink-900 transition hover:opacity-90"
                >
                  <Icon name="plus" size={11} stroke={2.5} />
                  {copy.order.notEnough(formatRupiah(payable - data.balance))}
                </a>
              {/if}
            </span>
          </div>
        </div>

        <!-- Save link -->
        <label class="flex items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            name="saveLink"
            class="h-4 w-4 rounded border-ink-300 text-primary"
          />
          Simpan link untuk pesan lagi nanti
        </label>

        <Button type="submit" disabled={!canSubmit || !enough || saving} full size="lg">
          {#if saving}
            <Icon name="refresh" size={16} class="animate-spin" />
            {copy.order.processing}
          {:else if !selectedService}
            {copy.order.pickServiceFirst}
          {:else if !enough}
            Saldo Kurang — Top Up Dulu
          {:else}
            {copy.order.ctaWithTotal(formatRupiah(payable))}
          {/if}
        </Button>
      </form>

      {#if selectedService?.waktu?.trim()}
        <div class="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-primary-800">
          <Icon name="clock" size={15} class="mt-0.5 shrink-0" />
          <span><strong>Estimasi waktu:</strong> {selectedService.waktu}</span>
        </div>
      {/if}

      {#if selectedService?.note?.trim()}
        <div class="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <Icon name="alert" size={15} class="mt-0.5 shrink-0" />
          <span><strong>Catatan:</strong> {selectedService.note}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- ═══════════════ SUMMARY + GUIDE — now stacked below form (floating flow) ═══════════════ -->
  <div class="space-y-4">
    <!-- Live summary — playful shadow -->
    <div
      class="reveal rounded-2xl lg:rounded-[20px] border border-ink-100 bg-surface p-4 lg:p-5 {hoverLift}"
      style="--d:120ms"
    >
      <div class="mb-3 flex items-center gap-2">
        <div class="grid h-8 w-8 place-items-center rounded-lg bg-success/10 text-success">
          <Icon name="receipt" size={16} />
        </div>
        <h2 class="text-sm font-bold">Ringkasan</h2>
      </div>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between border-b border-dashed border-ink-100 pb-2">
          <dt class="text-ink-500">Kategori</dt>
          <dd class="font-semibold">{catName || "—"}</dd>
        </div>
        <div class="flex justify-between gap-3 border-b border-dashed border-ink-100 pb-2">
          <dt class="shrink-0 text-ink-500">Layanan</dt>
          <dd class="truncate text-right font-semibold">
            {selectedService ? serviceDisplayName(selectedService.serviceName) : "—"}
          </dd>
        </div>
        <div class="flex justify-between border-b border-dashed border-ink-100 pb-2">
          <dt class="text-ink-500">Jumlah</dt>
          <dd class="font-semibold tabular-nums">
            {selectedService ? effectiveQty.toLocaleString("id-ID") : "—"}
          </dd>
        </div>
        <div class="flex items-center justify-between pt-1">
          <dt class="font-bold">Total</dt>
          <dd class="font-display text-lg font-extrabold text-accent-ink tabular-nums">
            <NumberFlow value={totalFlow} format={formatRupiah} duration={0.6} />
          </dd>
        </div>
      </dl>
    </div>

    <!-- Guide — playful -->
    <div
      class="surface-pop rounded-2xl lg:rounded-[20px] border border-ink-100 bg-surface p-4 lg:p-5"
    >
      <div class="mb-3 flex items-center gap-2">
        <div class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon name="info" size={16} />
        </div>
        <h2 class="text-sm font-bold">Ketentuan Penting</h2>
      </div>
      <ul class="space-y-2.5 text-xs text-ink-600">
        <li class="flex gap-2">
          <Icon name="check" size={14} class="mt-0.5 shrink-0 text-success" />
          <span>Pastikan link <strong>publik</strong> & tidak private.</span>
        </li>
        <li class="flex gap-2">
          <Icon name="check" size={14} class="mt-0.5 shrink-0 text-success" />
          <span>Hindari order layanan sama sebelum order sebelumnya selesai.</span>
        </li>
        <li class="flex gap-2">
          <Icon name="check" size={14} class="mt-0.5 shrink-0 text-success" />
          <span>Kesalahan input link jadi tanggung jawab pemesan.</span>
        </li>
        <li class="flex gap-2">
          <Icon name="shield" size={14} class="mt-0.5 shrink-0 text-primary" />
          <span>Transaksi aman & saldo otomatis dikembalikan bila order gagal.</span>
        </li>
      </ul>
    </div>
  </div>
</section>
