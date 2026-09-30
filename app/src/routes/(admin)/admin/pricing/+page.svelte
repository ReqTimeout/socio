<script lang="ts">
  import { Button, toast, Icon, extractActionMsg } from "@socio/ui";
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Order level (paling murah → paling mahal)
  const LEVEL_ORDER = ["Admin", "Reseller", "Agen", "Member"] as const;
  type Level = (typeof LEVEL_ORDER)[number];

  // Tone per level
  const levelTone: Record<
    Level,
    { icon: string; gradient: string; chip: string; text: string; ring: string }
  > = {
    Member: {
      icon: "user",
      gradient: "from-ink-700 to-ink-900",
      chip: "bg-ink-100 text-ink-700",
      text: "text-ink-700",
      ring: "focus:ring-ink-500/15",
    },
    Agen: {
      icon: "shield",
      gradient: "from-success to-emerald-500",
      chip: "bg-success-soft text-success",
      text: "text-success",
      ring: "focus:ring-success/20",
    },
    Reseller: {
      icon: "crown",
      gradient: "from-accent-500 to-pink-500",
      chip: "bg-accent-50 text-accent-ink",
      text: "text-accent-ink",
      ring: "focus:ring-accent-500/20",
    },
    Admin: {
      icon: "key",
      gradient: "from-primary-500 to-violet-500",
      chip: "bg-primary-50 text-primary-ink",
      text: "text-primary-ink",
      ring: "focus:ring-primary-500/20",
    },
  };

  // Snapshot server — $derived supaya isDirty reaktif setelah Simpan (invalidate → data.rules baru)
  const initialMarkup: Record<Level, number> = $derived({
    Member: Number(data.rules.find((r) => r.level === "Member")?.markupPercent ?? 200),
    Agen: Number(data.rules.find((r) => r.level === "Agen")?.markupPercent ?? 150),
    Reseller: Number(data.rules.find((r) => r.level === "Reseller")?.markupPercent ?? 180),
    Admin: Number(data.rules.find((r) => r.level === "Admin")?.markupPercent ?? 0),
  });
  const initialActive: Record<Level, boolean> = $derived({
    Member: Number(data.rules.find((r) => r.level === "Member")?.isActive ?? 1) === 1,
    Agen: Number(data.rules.find((r) => r.level === "Agen")?.isActive ?? 1) === 1,
    Reseller: Number(data.rules.find((r) => r.level === "Reseller")?.isActive ?? 1) === 1,
    Admin: Number(data.rules.find((r) => r.level === "Admin")?.isActive ?? 1) === 1,
  });

  // Working state — prefill dari snapshot saat init & setelah Simpan; edit user tidak tertimpa invalidate.
  // PENTING: jangan pakai `isDirty` sebagai guard prefill. State awal {0,0,0,0} ≠ snapshot
  // sehingga isDirty langsung true dan prefill tidak pernah jalan (bug: form tampil 0 terus).
  let markup: Record<Level, number> = $state({ Member: 0, Agen: 0, Reseller: 0, Admin: 0 });
  let active: Record<Level, boolean> = $state({
    Member: true,
    Agen: true,
    Reseller: true,
    Admin: true,
  });
  let hydrated = $state(false);
  $effect(() => {
    // Track snapshot agar effect jalan saat data server tiba.
    void initialMarkup.Member;
    void initialMarkup.Agen;
    void initialMarkup.Reseller;
    void initialMarkup.Admin;
    if (!hydrated) {
      markup = { ...initialMarkup };
      active = { ...initialActive };
      hydrated = true;
    }
  });

  // Sample base = MEDIAN modal murni dari service aktif (katalog = rate provider).
  // Post-rebase Sep-2026, kolom `price` dan `priceApi` identik = MODAL. Pakai
  // angka yang sama utk base & modal supaya preview markup/profit self-consistent
  // dan tidak pernah negatif saat markup ≥ 0.
  const sampleBase = $derived(data.stats.medianBase > 0 ? data.stats.medianBase : 2000);
  const sampleModal = $derived(sampleBase);

  // Slider range 0-400% (lebih ketat, 200% jadi titik tengah)
  const SLIDER_MIN = 0;
  const SLIDER_MAX = 400;

  // Quick presets
  const PRESETS: { label: string; values: Record<Level, number>; desc: string }[] = [
    {
      label: "Standar Socio",
      values: { Member: 200, Agen: 150, Reseller: 180, Admin: 0 },
      desc: "Default Socio",
    },
    {
      label: "Agresif",
      values: { Member: 300, Agen: 200, Reseller: 220, Admin: 0 },
      desc: "Margin lebih tebal",
    },
    {
      label: "Ramai Volume",
      values: { Member: 100, Agen: 70, Reseller: 90, Admin: 0 },
      desc: "Markup tipis",
    },
    {
      label: "Reset 0%",
      values: { Member: 0, Agen: 0, Reseller: 0, Admin: 0 },
      desc: "Identik dengan DB",
    },
  ];

  function applyPreset(p: (typeof PRESETS)[number]) {
    markup = { ...p.values };
  }
  function bumpLevel(lv: Level, delta: number) {
    markup[lv] = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, Number(markup[lv] ?? 0) + delta));
  }
  function resetLevel(lv: Level) {
    markup[lv] = initialMarkup[lv];
  }

  // Derived — harga jual untuk sample base
  function priceFor(lv: Level) {
    if (!active[lv]) return Number(sampleBase);
    return Number(sampleBase) * (1 + Number(markup[lv] ?? 0) / 100);
  }
  function profitFor(lv: Level) {
    return priceFor(lv) - Number(sampleModal);
  }
  function markupVsBasePct(lv: Level) {
    if (!active[lv]) return 0;
    return (priceFor(lv) / Number(sampleBase) - 1) * 100;
  }

  const fmtRp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
  const fmtPct = (n: number) =>
    Number(n) === 0 ? "0%" : `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

  const isDirty = $derived(
    LEVEL_ORDER.some((lv) => markup[lv] !== initialMarkup[lv] || active[lv] !== initialActive[lv]),
  );

  // Ringkasan multiplier aktif (dipakai kartu info "markup berlaku otomatis")
  const anyMarkup = $derived(
    Number(markup.Member) > 0 || Number(markup.Agen) > 0 || Number(markup.Reseller) > 0,
  );
  const memberMul = $derived(1 + Number(markup.Member) / 100);
  const agenMul = $derived(1 + Number(markup.Agen) / 100);
  const resellerMul = $derived(1 + Number(markup.Reseller) / 100);

  // Slider tick marks
  const ticks = [0, 50, 100, 150, 200, 250, 300, 350, 400];
</script>

<svelte:head>
  <title>Pricing — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5 lg:space-y-6">
  <!-- Header -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.5)]"
        >
          <Icon name="tag" size={20} stroke={2.5} />
        </span>
        Markup per Level
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">
        Atur <strong class="text-ink-700">persentase markup</strong> per level — berlaku otomatis
        saat checkout untuk
        <span class="font-bold text-ink-700"
          >{data.stats.total.toLocaleString("id-ID")} layanan</span
        >. Katalog menyimpan harga modal, bukan harga jual.
      </p>
    </div>
  </header>

  <!-- Quick presets -->
  <div class="space-y-2">
    <p class="text-xs font-bold uppercase tracking-wide text-ink-400">Preset cepat</p>
    <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:flex-wrap">
      {#each PRESETS as p}
        <button
          type="button"
          onclick={() => applyPreset(p)}
          class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs font-bold text-ink-700 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 active:scale-95"
          title={p.desc}
        >
          <Icon name="zap" size={11} stroke={2.5} class="text-primary-600" />
          {p.label}
        </button>
      {/each}
    </div>
  </div>

  {#if form?.success}
    <div
      class="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success"
    >
      <Icon name="check" size={14} stroke={2.75} />
      {form.success}
    </div>
  {/if}
  {#if form?.error}
    <div
      class="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger"
    >
      <Icon name="alert" size={14} stroke={2.5} />
      {form.error}
    </div>
  {/if}

  <!-- Kurs USD→IDR: efektif = max(live, floor) anti-rugi -->
  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-success-soft text-success">
          <Icon name="banknote" size={16} stroke={2.5} />
        </span>
        <div>
          <p class="text-sm font-bold leading-tight">
            $1 = Rp{data.fx.effective.toLocaleString("id-ID")}
          </p>
          <p class="text-[11px] text-ink-500">
            Live {data.fx.live ? `Rp${data.fx.live.rate.toLocaleString("id-ID")}` : "—"} · Floor Rp{data.fx.floor.toLocaleString(
              "id-ID",
            )} ·
            {data.fx.live && data.fx.live.at
              ? `update ${new Date(data.fx.live.at as string).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "belum pernah fetch"}
          </p>
        </div>
      </div>
      <form method="POST" action="?/setFloor" use:enhance class="flex items-center gap-2">
        <label for="fx-floor" class="text-xs font-bold text-ink-500">Floor</label>
        <input
          id="fx-floor"
          name="floor"
          type="number"
          min="1000"
          max="100000"
          step="100"
          value={data.fx.floor}
          class="h-9 w-28 rounded-xl border border-ink-200 px-2.5 text-sm font-bold tabular-nums"
        />
        <Button type="submit" size="sm">Simpan</Button>
      </form>
    </div>
    <p class="mt-2 text-[11px] text-ink-400">
      Efektif = nilai terbesar (live vs floor) — harga modal tidak pernah di bawah floor. Live
      di-fetch otomatis tiap hari 00:05. Berlaku di sync katalog berikutnya.
    </p>
  </div>

  <!-- Catalog stats: distribution + samples -->
  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <div class="mb-3 flex items-center gap-2">
      <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-ink">
        <Icon name="chart" size={16} stroke={2.5} />
      </span>
      <div>
        <p class="text-sm font-bold leading-tight">Katalog Layanan Anda</p>
        <p class="text-[11px] text-ink-500">
          {data.stats.total.toLocaleString("id-ID")} layanan ·
          {data.stats.active.toLocaleString("id-ID")} aktif · median {fmtRp(
            data.stats.medianBase,
          )}/1k
        </p>
      </div>
    </div>

    <!-- Distribution bar chart -->
    {#if data.stats.distribution.length > 0}
      {@const maxCount = Math.max(...data.stats.distribution.map((d) => d.count), 1)}
      <div class="space-y-1.5">
        {#each data.stats.distribution as d}
          <div class="flex items-center gap-2 text-[11px]">
            <span class="w-24 shrink-0 font-mono text-ink-600">{d.range}</span>
            <div class="h-5 flex-1 overflow-hidden rounded-full bg-ink-50">
              <div
                class="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                style="width: {(d.count / maxCount) * 100}%"
              ></div>
            </div>
            <span class="w-12 shrink-0 text-right font-bold tabular-nums text-ink-700"
              >{d.count.toLocaleString("id-ID")}</span
            >
          </div>
        {/each}
      </div>
    {/if}

    <!-- Sample preview (3 layanan riil) — harga jual dihitung live dari slider markup
         yang sedang aktif, bukan dari kolom services.profit yang statis/sisa rebase. -->
    {#if data.stats.sample.length > 0}
      <div class="mt-3 grid gap-1.5 sm:grid-cols-3">
        {#each data.stats.sample as s}
          {@const jual = Math.round(s.modal * (1 + Number(markup.Member ?? 0) / 100))}
          {@const margin = jual - s.modal}
          <div class="min-w-0 rounded-lg border border-ink-100 bg-ink-50/50 p-2 text-[11px]">
            <p class="truncate font-semibold text-ink-800">#{s.id} {s.serviceName}</p>
            <p class="truncate text-ink-500">
              Modal <span class="font-bold tabular-nums text-ink-700">{fmtRp(s.modal)}</span>
              {#if margin > 0}
                <Icon name="arrow_right" size={10} stroke={2.5} class="mx-0.5 text-ink-400" />
                <span class="font-bold tabular-nums text-success">{fmtRp(jual)}</span>
              {/if}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- The 4 Markup Cards -->
  <form
    method="POST"
    action="?/save"
    use:enhance={() =>
      async ({ result, update }) => {
        const r = result as any;
        if (result.type === "failure") toast(extractActionMsg(r.data) ?? "Gagal", "error");
        else {
          toast(extractActionMsg(r.data) ?? "Tersimpan", "success");
          // sync server stats + pricing_rules cache supaya preview median ikut update
          await update({ reset: false });
        }
      }}
    class="space-y-3"
  >
    {#each LEVEL_ORDER as lv, i (lv)}
      <div
        class="reveal relative overflow-hidden rounded-2xl border border-ink-100 bg-surface"
        style="--d:{i * 60}ms"
      >
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r {levelTone[lv].gradient}"></div>

        <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_2.2fr] sm:gap-4">
          <!-- Level identity + active toggle -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2.5">
              <span
                class="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm bg-gradient-to-br {levelTone[
                  lv
                ].gradient}"
              >
                <Icon name={levelTone[lv].icon} size={17} stroke={2.5} />
              </span>
              <div>
                <p class="font-display text-base font-extrabold leading-tight">{lv}</p>
                <p class="text-[11px] text-ink-500">
                  {lv === "Reseller"
                    ? "price_reseller"
                    : lv === "Agen"
                      ? "price_api"
                      : lv === "Admin"
                        ? "internal"
                        : "price"}
                </p>
              </div>
            </div>

            <label
              class="flex min-h-[36px] w-fit cursor-pointer items-center gap-2 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs font-bold transition-colors hover:bg-ink-50"
            >
              <input
                type="checkbox"
                name="active_{lv}"
                value="1"
                checked={active[lv]}
                onchange={(e) => (active[lv] = (e.currentTarget as HTMLInputElement).checked)}
                class="h-4 w-4 cursor-pointer rounded border-ink-300 text-primary-ink focus:ring-primary-500"
              />
              {active[lv] ? "Aktif" : "Nonaktif"}
            </label>
          </div>

          <!-- Markup input + slider + preview -->
          <div class="space-y-2">
            <!-- Number input + bumpers -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => bumpLevel(lv, -10)}
                disabled={!active[lv]}
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink-200 bg-surface text-ink-500 transition-all hover:border-ink-300 hover:bg-ink-50 active:scale-95 disabled:opacity-40"
                aria-label="Kurangi 10%"
              >
                <Icon name="arrow_down" size={15} stroke={2.75} />
              </button>
              <div
                class="relative flex h-11 flex-1 items-center overflow-hidden rounded-xl border border-ink-200 bg-surface pl-3 pr-1 transition-all focus-within:border-primary-500 focus-within:ring-4 {levelTone[
                  lv
                ].ring}"
              >
                <input
                  type="number"
                  step="1"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  name="markup_{lv}"
                  bind:value={markup[lv]}
                  disabled={!active[lv]}
                  aria-label="Markup {lv} (persen)"
                  class="w-full bg-transparent pr-6 text-2xl font-extrabold tabular-nums text-ink-900 focus:outline-none disabled:opacity-40"
                />
                <span
                  class="pointer-events-none absolute right-3 text-base font-bold {levelTone[lv]
                    .text}">%</span
                >
              </div>
              <button
                type="button"
                onclick={() => bumpLevel(lv, 10)}
                disabled={!active[lv]}
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-ink-200 bg-surface text-ink-500 transition-all hover:border-ink-300 hover:bg-ink-50 active:scale-95 disabled:opacity-40"
                aria-label="Tambah 10%"
              >
                <Icon name="plus" size={15} stroke={2.75} />
              </button>
              <button
                type="button"
                onclick={() => resetLevel(lv)}
                disabled={markup[lv] === initialMarkup[lv]}
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-400 transition-all hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                aria-label="Reset {lv}"
                title="Reset ke nilai tersimpan ({fmtPct(initialMarkup[lv])})"
              >
                <Icon name="refresh" size={15} stroke={2.5} />
              </button>
            </div>

            <!-- Slider (thumb 24px via CSS agar mudah digeser di mobile) -->
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="5"
              bind:value={markup[lv]}
              disabled={!active[lv]}
              class="markup-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-ink-200 via-primary-200 to-accent-200 accent-primary disabled:opacity-40"
              style="accent-color: var(--color-{lv === 'Member'
                ? 'ink'
                : lv === 'Agen'
                  ? 'success'
                  : lv === 'Reseller'
                    ? 'accent'
                    : 'primary'}-600)"
              aria-label="Slider markup {lv}"
            />

            <!-- Tick marks -->
            <div class="flex justify-between text-[9px] font-semibold text-ink-400 tabular-nums">
              {#each ticks as t}
                <span
                  class={t === Math.round(Number(markup[lv] ?? 0) / 50) * 50
                    ? levelTone[lv].text
                    : ""}>{t}%</span
                >
              {/each}
            </div>

            <!-- Live preview per level (using real median base) -->
            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-ink-50/60 px-3 py-2 text-xs"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-ink-500">Modal</span>
                <span class="font-mono text-ink-700">{fmtRp(sampleBase)}</span>
                <Icon name="arrow_right" size={10} stroke={2.5} class="text-ink-400" />
                <span
                  class="rounded-md bg-ink-100 px-1.5 py-0.5 font-extrabold tabular-nums text-ink-900"
                  aria-hidden="true">{fmtRp(priceFor(lv))}</span
                >
              </div>
              <span class="text-ink-300">·</span>
              <span class="text-ink-500">
                Profit
                <span
                  class="font-bold tabular-nums {profitFor(lv) >= 0
                    ? 'text-success'
                    : 'text-danger'}">{fmtRp(profitFor(lv))}</span
                >
              </span>
              {#if markupVsBasePct(lv) > 0}
                <span
                  class="inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700"
                >
                  <Icon name="trending_up" size={9} stroke={2.75} />
                  {fmtPct(markupVsBasePct(lv))} lebih tinggi
                </span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/each}

    <!-- Sticky footer save -->
    <div
      class="sticky bottom-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-surface/95 p-3 px-4 shadow-2xl backdrop-blur"
    >
      <div class="min-w-0">
        <p class="text-xs font-bold">
          {#if isDirty}
            <span class="inline-flex items-center gap-1 text-warning">
              <Icon name="alert" size={11} stroke={2.5} />
              Ada perubahan belum disimpan
            </span>
          {:else}
            <span class="inline-flex items-center gap-1 text-success">
              <Icon name="check" size={11} stroke={2.75} />
              Aturan tersimpan
            </span>
          {/if}
        </p>
        <p class="mt-0.5 text-[11px] text-ink-500">
          Simpan persentase — order flow langsung pakai rule baru di request berikutnya.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          onclick={() => {
            markup = { ...initialMarkup };
            active = { ...initialActive };
          }}
          disabled={!isDirty}
          class="inline-flex h-10 items-center gap-1 rounded-full border border-ink-200 bg-surface px-4 text-sm font-bold text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-40"
        >
          <Icon name="x" size={12} stroke={2.5} />
          Batal
        </button>
        <Button type="submit" size="md" disabled={!isDirty}>
          <Icon name="check" size={14} stroke={2.75} />
          Simpan Markup
        </Button>
      </div>
    </div>
  </form>

  <!-- Auto-apply info (markup diterapkan saat checkout, bukan ditulis ke katalog) -->
  <div
    class="rounded-2xl border {anyMarkup
      ? 'border-accent-500/30 bg-gradient-to-br from-accent-50/40 via-surface to-primary-50/30'
      : 'border-ink-200 bg-ink-50/40'} p-4"
  >
    <div class="flex items-start gap-3">
      <span
        class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br {anyMarkup
          ? 'from-accent-500 to-primary-500'
          : 'from-ink-400 to-ink-600'}"
      >
        <Icon name="zap" size={18} stroke={2.75} />
      </span>
      <div class="min-w-0">
        <p class="font-display text-base font-extrabold leading-tight">markup berlaku otomatis</p>
        <p class="mt-1 text-[11px] leading-relaxed text-ink-600">
          Catalog menyimpan <strong class="text-ink-800">harga modal murni</strong> (rate provider).
          Markup per level yang Anda simpan di atas diterapkan
          <strong class="text-ink-800">sekali saja saat checkout</strong> (halaman pesan & API
          publik), sehingga pelanggan selalu melihat harga jual = modal × markup, bukan harga modal.
          Tidak ada tombol "terapkan ke catalog" lagi — itu dulu menyebabkan
          <strong class="text-danger">markup berbunga dua kali</strong>.
        </p>
        {#if anyMarkup}
          <p class="mt-1.5 text-[11px] font-semibold text-success">
            Aktif sekarang: Member ×{memberMul.toFixed(2)} · Agen ×{agenMul.toFixed(2)} · Reseller ×{resellerMul.toFixed(
              2,
            )} — langsung berlaku di order berikutnya.
          </p>
        {:else}
          <p class="mt-1.5 text-[11px] font-semibold text-warning">
            Semua markup 0% — pelanggan saat ini hanya membayar harga modal. Set minimal satu level
            markup &gt; 0 lalu Simpan.
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Formula explainer -->
  <div
    class="rounded-2xl border border-primary-500/15 bg-gradient-to-br from-primary-50/40 via-surface to-accent-50/30 p-4"
  >
    <div class="flex items-start gap-3">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm"
      >
        <Icon name="info" size={17} stroke={2.5} />
      </span>
      <div class="min-w-0 text-xs leading-relaxed">
        <p class="font-bold text-ink-800">Cara kerja</p>
        <p class="mt-1 text-ink-600">
          <strong>Simpan</strong> persentase markup per level di form atas. Selesai — tidak perlu tombol
          lain.
        </p>
        <p class="mt-1 text-ink-600">
          Katalog (<code class="font-mono text-[10px]">services</code>) selalu menyimpan
          <strong>harga modal murni</strong> yang disinkron dari provider. Saat ada order, harga
          jual dihitung: <span class="font-mono text-[10px]">modal × (1 + markup%)</span> sesuai level
          pembeli.
        </p>
        <p class="mt-1 text-ink-500">
          Markup dibaca dari tabel <code class="font-mono text-[10px]">pricing_rules</code> saat checkout,
          sehingga perubahan di sini langsung berlaku di order berikutnya tanpa menulis ulang catalog
          — dan markup tidak pernah berbunga dua kali.
        </p>
      </div>
    </div>
  </div>
</section>

<style>
  /* Thumb 24px agar slider mudah digeser di layar sentuh (track tetap ramping) */
  .markup-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    background: #fff;
    border: 2px solid var(--color-primary-500);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
    cursor: pointer;
  }
  .markup-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 9999px;
    background: #fff;
    border: 2px solid var(--color-primary-500);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
    cursor: pointer;
  }
  .markup-slider:disabled::-webkit-slider-thumb,
  .markup-slider:disabled::-moz-range-thumb {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
