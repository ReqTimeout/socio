<script lang="ts">
  import {
    Input,
    QtyStepper,
    Button,
    toast,
    Icon,
    Select,
    Skeleton,
    revealDelay,
    NumberFlow,
    hoverLift,
    Sparko,
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

  // Harga efektif per 1000 (sudah termasuk markup level user) — dipakai untuk
  // tampilkan harga real di dropdown & info layanan supaya konsisten dgn total.
  function effectivePer1k(svc: Svc): number {
    return computePrice(
      pickPrice(svc),
      1000,
      data.level as UserLevel,
      levelRule,
      svc.priceApi ?? 0,
    );
  }

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

  // ── Inline validation (UX3.3) — link pattern + qty range
  type LinkValidation =
    { ok: true; platform: string } | { ok: false; reason: string } | { ok: null };
  function validateLink(url: string): LinkValidation {
    if (!url.trim()) return { ok: null };
    try {
      const u = new URL(url.trim());
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (/(^|\.)instagram\.com$/.test(host)) return { ok: true, platform: "Instagram" };
      if (/(^|\.)tiktok\.com$/.test(host)) return { ok: true, platform: "TikTok" };
      if (/(^|\.)youtube\.com$|youtu\.be$/.test(host)) return { ok: true, platform: "YouTube" };
      if (/(^|\.)facebook\.com$|fb\.watch$/.test(host)) return { ok: true, platform: "Facebook" };
      if (/(^|\.)twitter\.com$|x\.com$/.test(host)) return { ok: true, platform: "X / Twitter" };
      if (/(^|\.)t\.me$|telegram\.org$/.test(host)) return { ok: true, platform: "Telegram" };
      return {
        ok: false,
        reason: `Domain ${host} belum didukung — pakai IG/TikTok/YT/FB/X/Telegram.`,
      };
    } catch {
      return { ok: false, reason: "URL tidak valid — sertakan https://" };
    }
  }
  const linkValid = $derived(validateLink(link));
  const linkHasError = $derived(linkValid.ok === false);
  const linkOk = $derived(linkValid.ok === true);
  const linkReason = $derived(linkValid.ok === false ? linkValid.reason : "");
  const linkPlatform = $derived(linkValid.ok === true ? linkValid.platform : "");

  const qtyOutOfRange = $derived(
    !!selectedService &&
      ((!isCustomComments && quantity > 0 && quantity < selectedService.min) ||
        quantity > selectedService.max),
  );

  // Step indicator hidup (F2, presentasi saja): mengikuti state form yang ada.
  const steps = $derived([
    { label: "Kategori", done: selectedCat > 0 },
    { label: "Layanan", done: !!selectedService },
    {
      label: "Order",
      done:
        linkOk &&
        !qtyOutOfRange &&
        (isCustomComments ? lineCount > 0 : quantity >= (selectedService?.min ?? 0)),
    },
  ]);

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

  const catOptions = $derived(data.categories.map((c) => ({ value: c.id, label: c.name })));
  // Dropdown layanan — urutkan harga efektif termurah ke atas, tandai termurah.
  const serviceOptions = $derived.by(() => {
    const rows = serviceList
      .map((s) => ({ s, eff: effectivePer1k(s) }))
      .sort((a, b) => a.eff - b.eff);
    return rows.map(({ s, eff }, i) => ({
      value: s.id,
      label: serviceDisplayName(s.serviceName),
      hint: formatRupiah(eff),
      badge: i === 0 && rows.length > 1 ? "Termurah" : undefined,
    }));
  });

  const catName = $derived(data.categories.find((c) => c.id === selectedCat)?.name ?? "");

  // ── Deteksi platform dari kategori/layanan — untuk validasi link silang.
  // Return string kanonik SAMA dgn validateLink() supaya bisa dibandingkan langsung.
  function platformFromName(name: string): string {
    const n = (name || "").toLowerCase();
    if (/instagram|insta|\big\b/.test(n)) return "Instagram";
    if (/tiktok|tik-tok|\btt\b/.test(n)) return "TikTok";
    if (/youtube|youtu|\byt\b/.test(n)) return "YouTube";
    if (/facebook|\bfb\b/.test(n)) return "Facebook";
    if (/twitter|\bx\b/.test(n)) return "X / Twitter";
    if (/telegram|\btg\b/.test(n)) return "Telegram";
    return "";
  }
  const expectedPlatform = $derived(
    platformFromName(catName || selectedService?.serviceName || ""),
  );
  // Link valid tapi platform-nya tidak cocok dgn layanan → mismatch (user sering salah).
  const platformMismatch = $derived(
    !!expectedPlatform && linkOk && linkPlatform !== expectedPlatform,
  );

  const canSubmit = $derived(
    !!selectedService &&
      !!link &&
      linkValid.ok !== false &&
      !platformMismatch &&
      (isCustomComments ? lineCount > 0 : quantity >= (selectedService?.min ?? 0)) &&
      !qtyOutOfRange,
  );
  const placeholderByPlatform: Record<string, string> = {
    Instagram: "https://instagram.com/username",
    TikTok: "https://tiktok.com/@username",
    YouTube: "https://youtube.com/watch?v=...",
    Facebook: "https://facebook.com/...",
    "X / Twitter": "https://x.com/username",
    Telegram: "https://t.me/username",
  };
  const dynamicPlaceholder = $derived(
    placeholderByPlatform[expectedPlatform] ?? "https://link-target-kamu",
  );

  // ── Sparko asisten kontekstual — 1 instance, pesan mengikuti state paling urgent.
  const sparkoMsg = $derived.by(() => {
    if (platformMismatch)
      return `Layanan ini ${expectedPlatform}, tapi link-mu ${linkPlatform}. Ganti link ${expectedPlatform} ya!`;
    if (linkHasError) return linkReason;
    if (!selectedService) return "Pilih kategori & layanan dulu yuk!";
    if (!enough && payable > 0) return "Saldo kurang — top up dulu~";
    if (linkOk) return "Mantap, link valid. Siap pesan!";
    return "Tempel link target untuk lanjut.";
  });
  const sparkoPose = $derived<"error" | "sad" | "wave" | "celebrate" | "idle">(
    platformMismatch || linkHasError
      ? "error"
      : !selectedService
        ? "wave"
        : !enough && payable > 0
          ? "sad"
          : linkOk
            ? "celebrate"
            : "idle",
  );

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

<section class="relative lg:mx-auto lg:max-w-[1100px]">
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
    <!-- Hero — full width, compact -->
    <div
      class="relative overflow-hidden rounded-2xl lg:rounded-[22px] border-2 border-ink-900 bg-gradient-to-br from-primary-600 via-primary to-accent-600 p-4 lg:p-5 text-white shadow-[3px_3px_0_var(--color-ink-900)] transition-transform duration-300 hover:-translate-y-0.5"
    >
      <div
        class="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
      ></div>
      <div class="relative flex items-center gap-3">
        <div
          class="float-slow grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur"
        >
          <Icon name="rocket" size={22} />
        </div>
        <div>
          <h1 class="font-display text-lg font-extrabold leading-tight">Buat Pesanan Baru</h1>
          <p class="mt-0.5 text-xs text-white/80">
            Pilih kategori, layanan, lalu order — cepat & otomatis
          </p>
        </div>
        <!-- Doodle panah tangan (APP V2 §6.2) — dekoratif, SVG inline -->
        <svg
          class="pointer-events-none absolute -bottom-7 right-6 hidden h-8 w-8 -scale-x-100 rotate-12 text-white/70 sm:block"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 6c8 1 14 6 16 14m0 0-5-1m5 1-1-5"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <!-- ═══════════════ UX3: DESKTOP 2-COLUMN LAYOUT — lg:grid-cols-[1.55fr_0.75fr] ═══════════════ -->
    <div
      class="space-y-4 lg:grid lg:grid-cols-[1.55fr_0.75fr] lg:gap-6 lg:space-y-0 lg:items-start"
    >
      <!-- Kolom kiri: form utama -->
      <div>
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

          <!-- Step indicator hidup (F2): Kategori → Layanan → Order, ikut state -->
          <ol class="flex items-center gap-1.5" aria-label="Langkah pemesanan">
            {#each steps as s, i (s.label)}
              <li class="flex min-w-0 flex-1 items-center gap-1.5">
                <span class="step-dot {s.done ? 'is-done' : ''}" aria-hidden="true">
                  {#if s.done}
                    <span class="step-check grid place-items-center">
                      <Icon name="check" size={11} stroke={3.5} />
                    </span>
                  {:else}
                    <span class="num">{i + 1}</span>
                  {/if}
                </span>
                <span
                  class="truncate text-[11px] font-bold {s.done ? 'text-ink-800' : 'text-ink-400'}"
                >
                  {s.label}
                </span>
                {#if i < 2}
                  <span
                    class="h-px min-w-2 flex-1 transition-colors duration-200 {s.done
                      ? 'bg-success'
                      : 'bg-ink-200'}"
                    aria-hidden="true"
                  ></span>
                {/if}
              </li>
            {/each}
          </ol>

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
              multiline
              disabled={!selectedCat || loadingServices}
              onChange={pickServiceById}
            />
            {#if loadingServices}
              <div class="mt-2 space-y-2" aria-hidden="true">
                <Skeleton width="80%" height="0.8rem" />
                <Skeleton width="55%" height="0.8rem" />
              </div>
            {/if}
            {#if selectedService}
              <p class="mt-2 text-sm font-bold leading-snug text-ink-900">
                {serviceDisplayName(selectedService.serviceName)}
              </p>
              <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span class="font-display font-bold text-accent-ink"
                  >{formatRupiah(effectivePer1k(selectedService))}</span
                >
                <span class="text-ink-500">· harga per 1000</span>
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
            id="pesan-form"
            method="POST"
            class="space-y-5 border-t border-ink-100 pt-5"
            use:enhance={() => {
              saving = true;
              return async ({ result }) => {
                saving = false;
                if (result.type === "failure") {
                  toast((result.data as any)?.error ?? "Gagal memesan", "error");
                } else {
                  // Sukses = redirect /pesanan (server). Selebrasi order PERTAMA
                  // saja (APP V2 §4.2 M6): flag localStorage + sinyal ke /pesanan
                  // via sessionStorage (confetti fire di sana, bukan di sini
                  // yang langsung unmount). Toast global ikut ke /pesanan.
                  if (result.type === "redirect") {
                    try {
                      if (!localStorage.getItem("socio-celebrated-firstOrder")) {
                        localStorage.setItem("socio-celebrated-firstOrder", "1");
                        sessionStorage.setItem("socio-first-order-fire", "1");
                        toast(copy.order.successTitle, "success");
                      }
                    } catch {
                      // storage diblokir — lanjut redirect normal tanpa selebrasi
                    }
                  }
                  await applyAction(result);
                }
              };
            }}
          >
            <input type="hidden" name="serviceId" value={selectedService?.id ?? ""} />
            <input type="hidden" name="quantity" value={effectiveQty} />

            <!-- Link / Username — UX3.3 inline validation -->
            <div>
              <label class="mb-1.5 block text-sm font-bold" for="link-input">Link / Username</label>
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
                          goto(
                            `/pesan?service=${sv.serviceId}&link=${encodeURIComponent(sv.link)}`,
                          );
                        } else {
                          link = sv.link;
                        }
                      }}
                      title={sv.link}
                      class="min-h-[44px] shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition active:scale-95 hover:bg-primary/10 reveal"
                    >
                      {sv.label || sv.link.slice(0, 20)}
                    </button>
                  {/each}
                </div>
              {/if}
              <div class="relative">
                <Input
                  id="link-input"
                  name="link"
                  bind:value={link}
                  placeholder={dynamicPlaceholder}
                  required
                  inputmode="url"
                  autocomplete="off"
                  aria-invalid={linkHasError || platformMismatch ? "true" : undefined}
                  aria-describedby="link-hint"
                />
                {#if platformMismatch}
                  {#key expectedPlatform}
                    <span
                      class="stamp-pop pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-white"
                      aria-hidden="true"
                    >
                      <Icon name="alert" size={12} stroke={3} />
                    </span>
                  {/key}
                {:else if linkOk}
                  {#key linkPlatform}
                    <span
                      class="stamp-pop pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"
                      aria-hidden="true"
                    >
                      <Icon name="check" size={12} stroke={3} />
                    </span>
                  {/key}
                {/if}
              </div>
              <p
                id="link-hint"
                class="mt-1.5 flex items-center gap-1 text-xs leading-relaxed
              {linkHasError || platformMismatch
                  ? 'text-danger font-medium'
                  : linkOk
                    ? 'text-success font-medium'
                    : 'text-ink-500'}"
                aria-live="polite"
              >
                {#if platformMismatch}
                  <Icon name="alert" size={12} class="shrink-0" />
                  Layanan {expectedPlatform}, tapi link-mu {linkPlatform}. Pakai link
                  {expectedPlatform}.
                {:else if linkHasError}
                  <Icon name="alert" size={12} class="shrink-0" />
                  {linkReason}
                {:else if linkOk}
                  <Icon name="check" size={12} class="shrink-0" />
                  Platform {linkPlatform} cocok
                {:else if expectedPlatform}
                  <Icon name="info" size={12} class="shrink-0" />
                  Layanan ini butuh link {expectedPlatform}
                {:else}
                  <Icon name="info" size={12} class="shrink-0" />
                  {copy.order.linkHelper}
                {/if}
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
                    Pilih layanan dulu untuk melihat batas jumlah — semua angka tervalidasi
                    otomatis.
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

            <!-- Price summary — sticker-dark (APP V2 §6.2) -->
            <div
              class="reveal relative overflow-hidden rounded-2xl border-2 border-white/25 bg-ink-900 p-4 text-white shadow-[3px_3px_0_rgba(255,255,255,0.22),0_16px_32px_-14px_rgba(15,23,42,0.45)]"
              style="--d:40ms"
            >
              {#key selectedService?.id ?? "none"}
                <span class="sum-flash" aria-hidden="true"></span>
              {/key}
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
                <span class="flex items-center gap-1.5 text-sm text-ink-300">
                  Total bayar
                  {#key payable}<span class="tick-dot" aria-hidden="true"></span>{/key}
                </span>
                <span class="font-display text-2xl font-extrabold tabular-nums text-white">
                  <NumberFlow value={totalFlow} format={formatRupiah} duration={0.6} />
                </span>
              </div>
              <div
                class="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs"
              >
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
            <div
              class="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-primary-800"
            >
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

        <!-- UX3.1 — Mobile bottom-CTA pinned (di atas dock) — lg:hidden karena desktop pakai sticky di column -->
        <div
          class="lg:hidden fixed inset-x-3 bottom-[88px] z-40 max-w-xl mx-auto space-y-2"
          aria-label="Total dan submit"
        >
          <!-- Compact summary mobile — sticker-dark -->
          <div
            class="reveal rounded-2xl border-2 border-white/25 bg-ink-900 p-3 text-white shadow-[3px_3px_0_rgba(255,255,255,0.22),0_16px_32px_-14px_rgba(15,23,42,0.45)]"
            style="--d:0ms"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div
                  class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-300"
                >
                  Total bayar
                  {#key payable}<span class="tick-dot" aria-hidden="true"></span>{/key}
                </div>
                <div class="font-display text-xl font-extrabold tabular-nums">
                  <NumberFlow value={totalFlow} format={formatRupiah} duration={0.6} />
                </div>
                {#if !enough && payable > 0}
                  <a
                    href="/saldo/top-up"
                    class="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:underline"
                  >
                    <Icon name="plus" size={10} stroke={2.5} />
                    Kurang {formatRupiah(payable - data.balance)} · Top Up
                  </a>
                {/if}
              </div>
              <Button
                type="submit"
                form="pesan-form"
                disabled={!canSubmit || !enough || saving}
                size="md"
                class="shrink-0"
              >
                {#if saving}
                  <Icon name="refresh" size={14} class="animate-spin" />
                  {copy.order.processing}
                {:else if !selectedService}
                  {copy.order.pickServiceFirst}
                {:else if !enough}
                  Top Up Dulu
                {:else}
                  Pesan
                {/if}
              </Button>
            </div>
            <!-- Sparko asisten — strip mini di bawah total+button (mobile) -->
            <div class="mt-2.5 flex items-center gap-2 border-t border-white/10 pt-2.5">
              <Sparko pose={sparkoPose} size={28} class="shrink-0" />
              <p
                class="min-w-0 flex-1 truncate text-[11px] leading-tight
                {platformMismatch || linkHasError
                  ? 'text-amber-300 font-semibold'
                  : linkOk
                    ? 'text-emerald-300 font-semibold'
                    : 'text-ink-300'}"
                aria-live="polite"
              >
                {sparkoMsg}
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- /Kolom kiri -->

      <!-- Kolom kanan — UX3.2: ringkasan + guide (sticky di desktop) -->
      <aside class="hidden lg:block lg:sticky lg:top-20 self-start space-y-4">
        <!-- Live summary — playful shadow -->
        <div
          class="reveal relative overflow-hidden rounded-2xl lg:rounded-[20px] border border-ink-100 bg-surface p-4 lg:p-5 shadow-[0_18px_42px_-16px_rgba(15,23,42,0.12)]"
        >
          {#key selectedService?.id ?? "none"}
            <span class="sum-flash sum-flash--light" aria-hidden="true"></span>
          {/key}
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
              <dt class="flex items-center gap-1.5 font-bold">
                Total
                {#key payable}<span class="tick-dot" aria-hidden="true"></span>{/key}
              </dt>
              <dd class="font-display text-lg font-extrabold text-accent-ink tabular-nums">
                <NumberFlow value={totalFlow} format={formatRupiah} duration={0.6} />
              </dd>
            </div>
          </dl>

          <!-- Sparko asisten (desktop) -->
          <div
            class="mt-3 flex items-start gap-2.5 rounded-xl border p-2.5
            {platformMismatch || linkHasError
              ? 'border-red-200 bg-red-50'
              : linkOk
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-ink-100 bg-ink-50'}"
          >
            <Sparko pose={sparkoPose} size={34} class="shrink-0 -mt-0.5" />
            <p
              class="min-w-0 flex-1 text-xs leading-snug
              {platformMismatch || linkHasError
                ? 'font-semibold text-red-700'
                : linkOk
                  ? 'font-semibold text-emerald-700'
                  : 'text-ink-600'}"
              aria-live="polite"
            >
              {sparkoMsg}
            </p>
          </div>
        </div>

        <!-- Guide -->
        <div
          class="reveal rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
          style="--d:80ms"
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
      </aside>
    </div>
    <!-- /UX3 desktop 2-col grid -->
  </div>
</section>

<style>
  /* F2 playful: step indicator, stamp, tick — transform/opacity only (GPU) */
  .step-dot {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border-radius: 9999px;
    border: 1.5px solid var(--color-ink-200);
    color: var(--color-ink-400);
    font-size: 11px;
    font-weight: 800;
    transition:
      background-color 200ms var(--ease-out-soft),
      border-color 200ms var(--ease-out-soft),
      color 200ms var(--ease-out-soft);
  }
  .step-dot.is-done {
    background: var(--color-success-soft);
    border-color: var(--color-success-ink);
    color: var(--color-success-ink);
  }
  .step-dot.is-done .step-check {
    animation: step-pop 300ms var(--ease-spring) both;
  }
  @keyframes step-pop {
    from {
      transform: scale(0.4);
    }
    to {
      transform: scale(1);
    }
  }
  .stamp-pop {
    animation: stamp-pop 350ms var(--ease-spring) both;
  }
  @keyframes stamp-pop {
    from {
      transform: scale(0.3);
    }
    to {
      transform: scale(1);
    }
  }
  .tick-dot {
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: var(--color-mango-500);
    animation: tick-pop 350ms var(--ease-spring) both;
  }
  @keyframes tick-pop {
    from {
      transform: scale(0);
      opacity: 0;
    }
    40% {
      transform: scale(1.4);
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  /* Summary flash saat ganti layanan (APP V3 S3) — kilau mango 600ms 1× */
  .sum-flash {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(
      105deg,
      transparent 30%,
      rgb(251 191 36 / 0.22) 50%,
      transparent 70%
    );
    transform: translateX(-110%);
    animation: sum-flash 600ms ease-out 1;
  }
  .sum-flash--light {
    background: linear-gradient(
      105deg,
      transparent 30%,
      rgb(217 165 20 / 0.16) 50%,
      transparent 70%
    );
  }
  @keyframes sum-flash {
    to {
      transform: translateX(110%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .sum-flash {
      animation: none;
      display: none;
    }
    .step-dot {
      transition: none;
    }
    .step-dot.is-done .step-check,
    .stamp-pop,
    .tick-dot {
      animation: none;
    }
  }
</style>
