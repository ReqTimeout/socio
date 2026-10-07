<script lang="ts">
  import {
    Input,
    QtyStepper,
    Button,
    toast,
    Icon,
    Skeleton,
    revealDelay,
    NumberFlow,
    Sparko,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import {
    kindById,
    detectPlatform,
    isCustomCommentsService,
    PLATFORM_LINK_NAME,
    platformById,
    type PlatformId,
    type KindId,
  } from "@socio/core/catalog";
  import { formatRupiah, serviceDisplayName } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Svc = {
    id: number;
    serviceName: string;
    type: string;
    min: number;
    max: number;
    isRefill: number;
    note: string;
    waktu: string;
    // Harga efektif per-1000 utk level user ini — SUDAH markup, dihitung server.
    // Client TIDAK pernah menerima harga base/modal/markup (anti-kebocoran).
    pricePer1k: number;
    platform: PlatformId;
    kind: KindId;
  };

  // ── Step state: Platform (chip icon) → Jenis (chip) → Layanan (card) ──
  let selectedPlatform = $state<PlatformId | "">("");
  let selectedKind = $state<KindId | "">("");
  let kindList = $state<{ id: KindId; count: number }[]>([]);
  let loadingKinds = $state(false);
  let serviceList = $state<Svc[]>([]);
  let loadingServices = $state(false);
  let selectedService = $state<Svc | null>(null);

  // ── Search global lintas platform ──
  let searchQuery = $state("");
  let searchResults = $state<Svc[]>([]);
  let searching = $state(false);
  const searchActive = $derived(searchQuery.trim().length >= 2);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  // ── Order form state ────────────────────────────────────────
  let link = $state("");
  let quantity = $state(0);
  let komen = $state("");
  let saving = $state(false);

  // Prefill sekali dari URL (service deep-link / repeat-order) — tidak boleh tertimpa saat invalidate
  $effect(() => {
    const svc = data.service;
    if (svc) {
      selectedPlatform = svc.platform;
      selectedKind = (svc.kind as KindId) ?? "";
      selectedService = { ...(svc as Svc), note: svc.note ?? "", waktu: svc.waktu ?? "" };
      if (!quantity) quantity = data.prefill?.qty || svc.min || 1000;
    } else if (data.prefill?.qty && !quantity) {
      quantity = data.prefill.qty;
    }
    if (!link) link = data.prefill?.link ?? "";
  });

  // Komentar custom terdeteksi dari NAMA layanan (kolom type 99,9% "Default" — mati).
  const isCustomComments = $derived(
    selectedService ? isCustomCommentsService(selectedService.serviceName) : false,
  );
  const lineCount = $derived(komen.split("\n").filter(Boolean).length);
  const effectiveQty = $derived(isCustomComments ? lineCount : quantity);
  // Total live — sama persis dgn server (round(qty/1000 * harga efektif per-1000)).
  const total = $derived(
    selectedService ? Math.round((effectiveQty / 1000) * selectedService.pricePer1k) : 0,
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
    { label: "Platform", done: selectedPlatform !== "" },
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

  const platformLabel = $derived(selectedPlatform ? platformById(selectedPlatform).label : "");

  // ── Validasi link silang: platform kanonik dari chip yang dipilih.
  // String SAMA dgn validateLink() supaya bisa dibandingkan langsung.
  // Fallback deteksi nama (hasil search sebelum bucket dimuat) — tidak pernah tampil mentah.
  const expectedPlatform = $derived(
    (selectedPlatform ? (PLATFORM_LINK_NAME[selectedPlatform] ?? "") : "") ||
      (selectedService
        ? (PLATFORM_LINK_NAME[detectPlatform(selectedService.serviceName)] ?? "")
        : ""),
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
    if (!selectedService) return "Pilih platform & layanan dulu yuk!";
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

  // ── Data loading: Platform → Jenis → Layanan ───────────────────
  async function loadKinds(platform: PlatformId) {
    loadingKinds = true;
    try {
      const res = await fetch(`/pesan/services?platform=${platform}&kinds=1`);
      kindList = res.ok ? await res.json() : [];
    } catch {
      kindList = [];
      toast("Gagal memuat jenis layanan", "error");
    } finally {
      loadingKinds = false;
    }
  }

  async function loadServices(platform: PlatformId, kind: KindId) {
    if (!platform || !kind) {
      serviceList = [];
      return;
    }
    loadingServices = true;
    try {
      const res = await fetch(`/pesan/services?platform=${platform}&kind=${kind}`);
      serviceList = res.ok ? await res.json() : [];
    } catch {
      serviceList = [];
      toast("Gagal memuat layanan", "error");
    } finally {
      loadingServices = false;
    }
  }

  async function selectPlatform(p: PlatformId) {
    haptic(8);
    if (p === selectedPlatform && kindList.length > 0) return;
    selectedPlatform = p;
    selectedKind = "";
    selectedService = null;
    serviceList = [];
    await loadKinds(p);
    // Auto-pilih jenis pertama (KIND_ORDER = paling laku) — hemat 1 tap.
    if (kindList.length > 0) await selectKind(kindList[0]!.id);
  }

  async function selectKind(k: KindId) {
    haptic(8);
    if (k === selectedKind && serviceList.length > 0) return;
    selectedKind = k;
    selectedService = null;
    if (selectedPlatform) await loadServices(selectedPlatform, k);
  }

  async function pickService(svc: Svc) {
    haptic(10);
    selectedService = svc;
    quantity = svc.min || 1000;
    komen = "";
  }

  function pickServiceById(id: string | number) {
    const svc =
      serviceList.find((s) => s.id === Number(id)) ??
      searchResults.find((s) => s.id === Number(id));
    if (svc) pickService(svc);
  }

  // Search global lintas platform (debounce 350ms, min 2 char).
  function onSearchInput() {
    clearTimeout(searchTimer);
    const q = searchQuery.trim();
    if (q.length < 2) {
      searchResults = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      searching = true;
      try {
        const res = await fetch(`/pesan/services?q=${encodeURIComponent(q)}`);
        searchResults = res.ok ? await res.json() : [];
      } catch {
        searchResults = [];
      } finally {
        searching = false;
      }
    }, 350);
  }

  // Pilih dari hasil search → sinkronkan chip platform+jenis lalu muat bucket
  // agar state konsisten (langkah tetap Platform → Layanan → Order).
  async function pickFromSearch(svc: Svc) {
    haptic(10);
    searchQuery = "";
    searchResults = [];
    selectedPlatform = svc.platform;
    await loadKinds(svc.platform);
    selectedKind = svc.kind;
    await loadServices(svc.platform, svc.kind);
    pickServiceById(svc.id);
    document.getElementById("layanan-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Deep-link (?service=X): server sudah hitung platform+kind → muat rantai bucket
  // supaya chip ter-highlight & daftar menampilkan pilihan.
  onMount(async () => {
    const svc = data.service;
    if (svc?.platform) {
      await loadKinds(svc.platform as PlatformId);
      if (svc.kind) await loadServices(svc.platform as PlatformId, svc.kind as KindId);
    }
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
            Pilih platform, layanan, lalu order — cepat & otomatis
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
          class="mx-auto w-full max-w-none space-y-4 rounded-2xl lg:rounded-[22px] border-2 border-ink-900 bg-surface p-4 sm:p-5 lg:p-6 sm:max-w-xl shadow-[6px_6px_0_var(--color-ink-900)]"
        >
          {#if form?.error}
            <div
              transition:fly={{ y: 8, duration: 260 }}
              class="flex items-center gap-2 rounded-xl border-2 border-danger/40 bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
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

          <!-- Search global lintas platform -->
          <div>
            <div class="relative">
              <span
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              >
                <Icon name="search" size={16} />
              </span>
              <input
                type="search"
                bind:value={searchQuery}
                oninput={onSearchInput}
                placeholder="Cari layanan… mis. followers ig"
                autocomplete="off"
                aria-label="Cari layanan"
                class="h-11 w-full rounded-xl border-2 border-ink-900 bg-white pl-9 pr-9 text-sm outline-none transition-shadow placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              {#if searching}
                <Icon
                  name="refresh"
                  size={16}
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-400"
                />
              {:else if searchQuery}
                <button
                  type="button"
                  onclick={() => {
                    searchQuery = "";
                    searchResults = [];
                  }}
                  aria-label="Hapus pencarian"
                  class="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100"
                >
                  <Icon name="x" size={14} />
                </button>
              {/if}
            </div>
          </div>

          {#if searchActive}
            <!-- Hasil search — card + label platform/jenis -->
            <div id="layanan-list">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="text-sm font-bold">Hasil pencarian</span>
                <span class="text-xs text-ink-500">{searchResults.length} layanan</span>
              </div>
              {#if searching && searchResults.length === 0}
                <div class="space-y-2" aria-hidden="true">
                  <Skeleton width="90%" height="3.2rem" />
                  <Skeleton width="75%" height="3.2rem" />
                </div>
              {:else if searchResults.length === 0}
                <p class="rounded-xl bg-ink-50 px-3 py-4 text-center text-xs text-ink-500">
                  Tidak ketemu — coba kata lain, mis. "likes tiktok".
                </p>
              {:else}
                <ul
                  class="max-h-[320px] space-y-2 overflow-y-auto pr-0.5"
                  role="listbox"
                  aria-label="Hasil pencarian layanan"
                >
                  {#each searchResults as svc (svc.id)}
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedService?.id === svc.id}
                        onclick={() => pickFromSearch(svc)}
                        class="svc-card w-full {selectedService?.id === svc.id
                          ? 'is-selected'
                          : ''}"
                      >
                        <span class="min-w-0 flex-1 text-left">
                          <span class="block truncate text-sm font-bold leading-snug">
                            {serviceDisplayName(svc.serviceName)}
                          </span>
                          <span
                            class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-500"
                          >
                            <span class="inline-flex items-center gap-1 font-semibold text-primary">
                              <Icon name={platformById(svc.platform).icon} size={11} />
                              {platformById(svc.platform).label}
                            </span>
                            <span>· {kindById(svc.kind).label}</span>
                            <span>· {formatRupiah(svc.pricePer1k)}/1000</span>
                          </span>
                        </span>
                        {#if selectedService?.id === svc.id}
                          <span
                            class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-white"
                            aria-hidden="true"
                          >
                            <Icon name="check" size={12} stroke={3} />
                          </span>
                        {/if}
                        {#if svc.isRefill}
                          <span
                            class="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600"
                            >♻</span
                          >
                        {/if}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {:else}
            <!-- Platform — chip icon, 1 baris scroll-snap di mobile -->
            <div>
              <span class="mb-1.5 block text-sm font-bold" id="platform-label">Platform</span>
              <div
                class="platform-rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-4 lg:overflow-visible"
                role="radiogroup"
                aria-labelledby="platform-label"
              >
                {#each data.platforms as p (p.id)}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedPlatform === p.id}
                    aria-label={`${p.label} — ${p.count} layanan`}
                    onclick={() => selectPlatform(p.id as PlatformId)}
                    title={`${p.label} — ${p.count} layanan`}
                    class="platform-chip shrink-0 {selectedPlatform === p.id ? 'is-selected' : ''}"
                  >
                    <span class="platform-ic" aria-hidden="true">
                      <Icon name={p.icon} size={22} />
                    </span>
                    <span class="platform-tx">
                      <span class="block text-xs font-extrabold leading-tight">{p.label}</span>
                      <span
                        class="block text-[10px] font-semibold leading-tight opacity-70 tabular-nums"
                      >
                        {p.count > 999 ? `${(p.count / 1000).toFixed(1)}rb` : p.count} layanan
                      </span>
                    </span>
                    {#if selectedPlatform === p.id}
                      <span
                        class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/25"
                        aria-hidden="true"
                      >
                        <Icon name="check" size={10} stroke={3.5} />
                      </span>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Jenis — chip, muncul setelah platform dipilih -->
            {#if selectedPlatform}
              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-sm font-bold" id="kind-label">Jenis</span>
                  {#if loadingKinds}
                    <span class="flex items-center gap-1 text-xs text-ink-500">
                      <Icon name="refresh" size={12} class="animate-spin" /> Memuat…
                    </span>
                  {/if}
                </div>
                {#if loadingKinds && kindList.length === 0}
                  <div class="flex gap-2" aria-hidden="true">
                    <Skeleton width="4.5rem" height="2rem" />
                    <Skeleton width="4rem" height="2rem" />
                    <Skeleton width="5rem" height="2rem" />
                  </div>
                {:else}
                  <div
                    class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
                    role="radiogroup"
                    aria-labelledby="kind-label"
                  >
                    {#each kindList as k (k.id)}
                      {@const kd = kindById(k.id)}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedKind === k.id}
                        onclick={() => selectKind(k.id)}
                        class="kind-chip shrink-0 {selectedKind === k.id ? 'is-selected' : ''}"
                      >
                        <Icon name={kd.icon} size={14} />
                        {kd.label}
                        <span class="tabular-nums opacity-70">{k.count}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Layanan — daftar card radio, bukan dropdown -->
            {#if selectedKind}
              <div id="layanan-list">
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="text-sm font-bold">Layanan</span>
                  {#if loadingServices}
                    <span class="flex items-center gap-1 text-xs text-ink-500">
                      <Icon name="refresh" size={12} class="animate-spin" /> Memuat…
                    </span>
                  {:else if serviceList.length > 0}
                    <span class="text-xs text-ink-500"
                      >{serviceList.length} layanan · termurah di atas</span
                    >
                  {/if}
                </div>
                {#if loadingServices && serviceList.length === 0}
                  <div class="space-y-2" aria-hidden="true">
                    <Skeleton width="90%" height="3.2rem" />
                    <Skeleton width="75%" height="3.2rem" />
                    <Skeleton width="82%" height="3.2rem" />
                  </div>
                {:else if serviceList.length === 0}
                  <p class="rounded-xl bg-ink-50 px-3 py-4 text-center text-xs text-ink-500">
                    Layanan tidak tersedia saat ini.
                  </p>
                {:else}
                  <ul
                    class="max-h-[320px] space-y-2 overflow-y-auto pr-0.5"
                    role="listbox"
                    aria-label="Daftar layanan"
                  >
                    {#each serviceList as svc, i (svc.id)}
                      <li>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedService?.id === svc.id}
                          onclick={() => pickService(svc)}
                          class="svc-card w-full {selectedService?.id === svc.id
                            ? 'is-selected'
                            : ''}"
                        >
                          <span class="min-w-0 flex-1 text-left">
                            <span class="block truncate text-sm font-bold leading-snug">
                              {serviceDisplayName(svc.serviceName)}
                            </span>
                            <span
                              class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-500"
                            >
                              <span class="font-display font-bold text-accent-ink tabular-nums"
                                >{formatRupiah(svc.pricePer1k)}</span
                              >
                              <span>/1000</span>
                              <span>· Min {svc.min.toLocaleString("id-ID")}</span>
                              {#if i === 0 && serviceList.length > 1}
                                <span
                                  class="rounded-full bg-mango-500/15 px-1.5 py-px text-[10px] font-extrabold text-mango-700"
                                  >Termurah</span
                                >
                              {/if}
                            </span>
                          </span>
                          {#if selectedService?.id === svc.id}
                            <span
                              class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-white"
                              aria-hidden="true"
                            >
                              <Icon name="check" size={12} stroke={3} />
                            </span>
                          {:else if svc.isRefill}
                            <span
                              class="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600"
                              >♻ Refill</span
                            >
                          {/if}
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/if}
          {/if}

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
              <label class="mb-1.5 flex items-center gap-1.5 text-sm font-bold" for="coupon-input">
                <Icon name="tag" size={15} stroke={2} class="text-ink-500" />
                Kode kupon (opsional)
              </label>
              <div class="relative">
                <input
                  id="coupon-input"
                  name="coupon"
                  bind:value={couponCode}
                  oninput={checkCoupon}
                  placeholder="SUMMER25"
                  autocomplete="off"
                  class="h-11 w-full rounded-xl border-2 border-ink-900 bg-white px-3 pr-10 font-mono text-sm uppercase tracking-wide outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                {#if checkingCoupon}
                  <Icon
                    name="refresh"
                    size={16}
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-500"
                  />
                {:else if couponOk}
                  <span
                    class="pointer-events-none absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border-2 border-ink-900 bg-emerald-500 text-white"
                  >
                    <Icon name="check" size={13} stroke={3} />
                  </span>
                {/if}
              </div>
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

        <!-- UX3.1 — Mobile bottom-CTA pinned (di atas dock) — compact premium 1-baris -->
        <div
          class="lg:hidden fixed inset-x-3 bottom-[88px] z-40 max-w-xl mx-auto"
          aria-label="Total dan submit"
        >
          <div
            class="reveal rounded-xl border-2 border-white/25 bg-ink-900 px-2 py-1.5 text-white shadow-[3px_3px_0_rgba(255,255,255,0.22),0_10px_24px_-10px_rgba(15,23,42,0.5)]"
            style="--d:0ms"
          >
            <!-- Row 1: Sparko (sparkle stars) + Total/Saldo inline + Button compact -->
            <div class="flex items-center gap-2">
              <!-- Sparko wrap + sparkle bintang (mewarisi exception reduced-motion .sparko) -->
              <div class="sparko relative shrink-0" style="line-height:0">
                <Sparko pose={sparkoPose} size={22} />
                <span class="sparkle sparkle--a" aria-hidden="true">✦</span>
                <span class="sparkle sparkle--b" aria-hidden="true">✧</span>
                <span class="sparkle sparkle--c" aria-hidden="true">✦</span>
              </div>

              <div class="min-w-0 flex-1">
                <div
                  class="flex items-center gap-1.5 text-[9px] font-bold uppercase leading-none tracking-wide text-ink-300"
                >
                  Total
                  {#key payable}<span class="tick-dot" aria-hidden="true"></span>{/key}
                  <span
                    class="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-[2px] normal-case tracking-normal text-[9px] font-semibold"
                  >
                    <span class="text-ink-300">Saldo</span>
                    <span class="tabular-nums {enough ? 'text-emerald-300' : 'text-red-300'}"
                      >{formatRupiah(data.balance)}</span
                    >
                  </span>
                </div>
                <div
                  class="mt-0.5 font-display text-base font-extrabold leading-tight tabular-nums"
                >
                  <NumberFlow value={totalFlow} format={formatRupiah} duration={0.5} />
                </div>
              </div>

              <Button
                type="submit"
                form="pesan-form"
                disabled={!canSubmit || !enough || saving}
                size="sm"
                class="shrink-0"
              >
                {#if saving}
                  <Icon name="refresh" size={12} class="animate-spin" />
                  Proses
                {:else if !selectedService}
                  Pilih Layanan
                {:else if !enough}
                  Top Up
                {:else}
                  Pesan
                {/if}
              </Button>
            </div>

            <!-- Row 2 mikro — kondisional: hanya saat butuh perhatian (mismatch/error/saldo kurang) -->
            {#if platformMismatch || linkHasError || (!enough && payable > 0)}
              <p
                class="mt-1.5 flex items-center gap-1.5 border-t border-white/10 pt-1.5 text-[10px] font-semibold leading-tight text-amber-300"
                aria-live="polite"
              >
                <Icon name="alert" size={11} stroke={2.2} class="shrink-0" />
                <span class="min-w-0 flex-1 truncate">{sparkoMsg}</span>
                {#if !enough && payable > 0}
                  <a
                    href="/saldo/top-up"
                    class="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 hover:bg-white/20"
                    >Top Up ›</a
                  >
                {/if}
              </p>
            {/if}
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
              <dt class="text-ink-500">Platform</dt>
              <dd class="font-semibold">{platformLabel || "—"}</dd>
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
  /* PESAN_REVAMP: platform chip / kind chip / service card — transform/opacity only */
  .platform-rail {
    scroll-snap-type: x proximity;
  }
  .platform-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 52px;
    padding: 0.45rem 0.7rem;
    border-radius: 0.9rem;
    border: 2px solid var(--color-ink-900);
    background: #fff;
    color: var(--color-ink-900);
    scroll-snap-align: start;
    transition:
      background-color 180ms var(--ease-out-soft),
      color 180ms var(--ease-out-soft),
      transform 180ms var(--ease-out-soft);
  }
  .platform-chip:active {
    transform: scale(0.96);
  }
  .platform-chip.is-selected {
    background: var(--color-ink-900);
    color: #fff;
    box-shadow: 3px 3px 0 rgb(0 95 124 / 0.35);
  }
  .platform-ic {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    border-radius: 0.65rem;
    background: rgb(0 95 124 / 0.08);
  }
  .platform-chip.is-selected .platform-ic {
    background: rgb(255 255 255 / 0.15);
  }
  .platform-tx {
    min-width: 0;
    text-align: left;
  }
  /* Mobile: chip platform = ICON SAJA (hemat tempat, 11 platform 1 swipe).
     Label/count hanya di desktop (lg+). Nama tetap di aria-label + title. */
  @media (max-width: 1023px) {
    .platform-chip {
      min-width: 52px;
      min-height: 52px;
      padding: 0.45rem;
      justify-content: center;
    }
    .platform-chip .platform-ic {
      width: 2.3rem;
      height: 2.3rem;
      border-radius: 0.75rem;
    }
    .platform-tx {
      display: none;
    }
  }
  .kind-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 40px;
    padding: 0.4rem 0.75rem;
    border-radius: 9999px;
    border: 1.5px solid var(--color-ink-200);
    background: #fff;
    font-size: 12px;
    font-weight: 700;
    color: var(--color-ink-700);
    transition:
      background-color 180ms var(--ease-out-soft),
      border-color 180ms var(--ease-out-soft),
      color 180ms var(--ease-out-soft),
      transform 180ms var(--ease-out-soft);
  }
  .kind-chip:active {
    transform: scale(0.95);
  }
  .kind-chip.is-selected {
    background: var(--color-ink-900);
    border-color: var(--color-ink-900);
    color: #fff;
  }
  .svc-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.7rem;
    border-radius: 0.9rem;
    border: 2px solid var(--color-ink-100);
    background: #fff;
    transition:
      border-color 180ms var(--ease-out-soft),
      background-color 180ms var(--ease-out-soft),
      transform 180ms var(--ease-out-soft);
  }
  .svc-card:active {
    transform: scale(0.985);
  }
  .svc-card.is-selected {
    border-color: var(--color-ink-900);
    background: rgb(0 95 124 / 0.05);
    box-shadow: 2px 2px 0 var(--color-ink-900);
  }
  @media (prefers-reduced-motion: reduce) {
    .platform-chip,
    .kind-chip,
    .svc-card {
      transition: none;
    }
  }
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

  /* Sparkle bintang di sekitar Sparko — premium halus, tidak dibunuh reduced-motion
     karena wrapper membawa class .sparko → rule global `*:not(.sparko):not(.sparko *)`
     mengecualikan sparkle dari kill-switch. */
  .sparkle {
    position: absolute;
    font-size: 11px;
    line-height: 1;
    color: var(--pop-mango, #fbbf24);
    text-shadow:
      0 0 6px rgba(251, 191, 36, 0.9),
      0 0 14px rgba(251, 191, 36, 0.45);
    pointer-events: none;
    opacity: 0;
    transform: scale(0.35) rotate(0deg);
    animation: sparkle-twinkle 2.6s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .sparkle--a {
    top: -6px;
    right: -6px;
    animation-delay: 0s;
  }
  .sparkle--b {
    top: 4px;
    left: -7px;
    animation-delay: 0.9s;
  }
  .sparkle--c {
    bottom: -6px;
    right: -9px;
    animation-delay: 1.7s;
  }
  @keyframes sparkle-twinkle {
    0%,
    100% {
      opacity: 0;
      transform: scale(0.35) rotate(0deg);
    }
    15% {
      opacity: 1;
      transform: scale(1.1) rotate(20deg);
    }
    35% {
      opacity: 0.75;
      transform: scale(0.85) rotate(-6deg);
    }
    55% {
      opacity: 0;
      transform: scale(0.4) rotate(-4deg);
    }
  }
</style>
