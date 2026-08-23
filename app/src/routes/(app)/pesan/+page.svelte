<script lang="ts">
  import { fly } from "svelte/transition";
  import {
    Input,
    QtyStepper,
    Button,
    toast,
    Icon,
    Select,
    staggerIn,
    tweenNumber,
    hoverLift,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { computePrice } from "@socio/core/pricing";
  import { formatRupiah } from "$lib/format";
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
    min: number;
    max: number;
    isRefill: number;
    note: string;
    waktu: string;
    providerId: number;
    providerServiceId: number;
  };

  // ── Step state ──────────────────────────────────────────────
  let selectedCat = $state<number>(data.service?.categoryId ?? 0);
  let serviceList = $state<Svc[]>([]);
  let loadingServices = $state(false);
  let selectedService = $state<Svc | null>(
    data.service
      ? { ...(data.service as Svc), note: data.service.note ?? "", waktu: data.service.waktu ?? "" }
      : null,
  );

  // ── Order form state ────────────────────────────────────────
  let link = $state(data.prefill?.link ?? "");
  let quantity = $state(data.prefill?.qty || data.service?.min || 1000);
  let komen = $state("");
  let saving = $state(false);

  const isCustomComments = $derived(selectedService?.type === "Custom Comments");
  const lineCount = $derived(komen.split("\n").filter(Boolean).length);
  const effectiveQty = $derived(isCustomComments ? lineCount : quantity);
  const total = $derived(
    selectedService ? computePrice(selectedService.price, effectiveQty, data.level) : 0,
  );
  const enough = $derived(data.balance >= total);

  // Tweened total — animates when service/qty changes (hero moment).
  const totalTween = tweenNumber(0);
  $effect(() => {
    totalTween.set(total);
  });

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
      hint: `${formatRupiah(s.price)}/1k`,
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

<section class="space-y-5 lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-start lg:gap-6 lg:space-y-0">
  <!-- ═══════════════ MAIN COLUMN ═══════════════ -->
  <div class="space-y-4">
    <!-- Hero -->
    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary to-accent-600 p-5 text-white shadow-[0_18px_40px_-18px_rgba(79,70,229,0.6)]"
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

    <!-- Order form — w-full di mobile biar Select tidak narrow -->
    <div
      class="mx-auto w-full max-w-none space-y-5 rounded-2xl border border-ink-100 bg-surface p-4 sm:p-5 sm:max-w-xl"
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
            <span class="flex items-center gap-1 text-xs text-ink-400">
              <Icon name="refresh" size={12} class="animate-spin" /> Memuat…
            </span>
          {:else if serviceList.length > 0}
            <span class="text-xs text-ink-400">{serviceList.length} layanan</span>
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
              >{formatRupiah(selectedService.price)}<span class="font-medium text-ink-400">/1k</span
              ></span
            >
            <span class="text-ink-400">·</span>
            <span class="text-ink-500"
              >Min {selectedService.min.toLocaleString("id-ID")} – {selectedService.max.toLocaleString(
                "id-ID",
              )}</span
            >
            {#if selectedService.isRefill}
              <span class="rounded-full bg-success/10 px-1.5 py-0.5 font-bold text-success"
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
              <span class="shrink-0 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                Favorit
              </span>
              {#each data.saved as sv, i (sv.id)}
                <button
                  type="button"
                  in:fly={staggerIn(i, { y: 6, duration: 200, step: 40 })}
                  onclick={() => {
                    haptic(8);
                    if (sv.serviceId) {
                      goto(`/pesan?service=${sv.serviceId}&link=${encodeURIComponent(sv.link)}`);
                    } else {
                      link = sv.link;
                    }
                  }}
                  title={sv.link}
                  class="min-h-[44px] shrink-0 rounded-full bg-ink-100 px-3 py-2 text-xs font-medium transition active:scale-95 hover:bg-ink-200"
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
              <span class="text-ink-400">Min {selectedService?.min ?? 0}</span>
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

        <!-- Price summary -->
        <div class="reveal rounded-2xl bg-ink-900 p-4 text-white" style="--d:40ms">
          <div class="flex items-center justify-between">
            <span class="text-sm text-ink-300">Total bayar</span>
            <span class="font-display text-2xl font-extrabold tabular-nums"
              >{formatRupiah($totalTween)}</span
            >
          </div>
          <div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
            <span class="text-ink-400">Saldo kamu</span>
            <span class="font-semibold tabular-nums {enough ? 'text-success' : 'text-danger'}">
              {formatRupiah(data.balance)}
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
            Memproses…
          {:else if !selectedService}
            Pilih Layanan Dulu
          {:else if !enough}
            Saldo Tidak Cukup
          {:else}
            Pesan Sekarang · {formatRupiah(total)}
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

  <!-- ═══════════════ SIDE: SUMMARY + GUIDE (desktop) ═══════════════ -->
  <aside class="hidden lg:block">
    <div class="sticky top-20 space-y-4">
      <!-- Live summary -->
      <div
        class="reveal rounded-2xl border border-ink-100 bg-surface p-4 {hoverLift}"
        style="--d:120ms"
      >
        <div class="mb-3 flex items-center gap-2">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-success/10 text-success">
            <Icon name="receipt" size={16} />
          </div>
          <h3 class="text-sm font-bold">Ringkasan</h3>
        </div>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between border-b border-dashed border-ink-100 pb-2">
            <dt class="text-ink-500">Kategori</dt>
            <dd class="font-semibold">{catName || "—"}</dd>
          </div>
          <div class="flex justify-between gap-3 border-b border-dashed border-ink-100 pb-2">
            <dt class="shrink-0 text-ink-500">Layanan</dt>
            <dd class="truncate text-right font-semibold">{selectedService?.serviceName ?? "—"}</dd>
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
              {formatRupiah($totalTween)}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Guide -->
      <div class="rounded-2xl border border-ink-100 bg-surface p-4">
        <div class="mb-3 flex items-center gap-2">
          <div class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon name="info" size={16} />
          </div>
          <h3 class="text-sm font-bold">Ketentuan Penting</h3>
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
  </aside>
</section>
