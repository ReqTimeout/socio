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
      chip: "bg-accent-50 text-accent-700",
      text: "text-accent-700",
      ring: "focus:ring-accent-500/20",
    },
    Admin: {
      icon: "key",
      gradient: "from-primary-500 to-violet-500",
      chip: "bg-primary-50 text-primary-700",
      text: "text-primary-700",
      ring: "focus:ring-primary-500/20",
    },
  };

  // Working state — initial* harus $state supaya isDirty reaktif setelah Simpan
  let initialMarkup: Record<Level, number> = $state({
    Member: Number(data.rules.find((r) => r.level === "Member")?.markupPercent ?? 200),
    Agen: Number(data.rules.find((r) => r.level === "Agen")?.markupPercent ?? 150),
    Reseller: Number(data.rules.find((r) => r.level === "Reseller")?.markupPercent ?? 180),
    Admin: Number(data.rules.find((r) => r.level === "Admin")?.markupPercent ?? 0),
  });
  let initialActive: Record<Level, boolean> = $state({
    Member: Number(data.rules.find((r) => r.level === "Member")?.isActive ?? 1) === 1,
    Agen: Number(data.rules.find((r) => r.level === "Agen")?.isActive ?? 1) === 1,
    Reseller: Number(data.rules.find((r) => r.level === "Reseller")?.isActive ?? 1) === 1,
    Admin: Number(data.rules.find((r) => r.level === "Admin")?.isActive ?? 1) === 1,
  });

  let markup: Record<Level, number> = $state({ ...initialMarkup });
  let active: Record<Level, boolean> = $state({ ...initialActive });

  // Sample base = MEDIAN harga Member dari data riil (bukan hardcode)
  const sampleBase = $derived(data.stats.medianBase > 0 ? data.stats.medianBase : 2000);
  const sampleModal = $derived(data.stats.sample[0]?.modal ?? Math.round(sampleBase * 0.7));

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

  // Apply-to-catalog derived (untuk Step 2)
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
        Masukkan <strong class="text-ink-700">persentase</strong> per level — terapkan ke
        <span class="font-bold text-ink-700"
          >{data.stats.total.toLocaleString("id-ID")} layanan</span
        > dengan satu klik.
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

  <!-- Catalog stats: distribution + samples -->
  <div class="rounded-2xl border border-ink-100 bg-surface p-4">
    <div class="mb-3 flex items-center gap-2">
      <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-700">
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

    <!-- Sample preview (3 layanan riil) -->
    {#if data.stats.sample.length > 0}
      <div class="mt-3 grid gap-1.5 sm:grid-cols-3">
        {#each data.stats.sample as s}
          <div class="min-w-0 rounded-lg border border-ink-100 bg-ink-50/50 p-2 text-[11px]">
            <p class="truncate font-semibold text-ink-800">#{s.id} {s.serviceName}</p>
            <p class="truncate text-ink-500">
              Base <span class="font-bold tabular-nums text-ink-700">{fmtRp(s.base)}</span>
              · Modal {fmtRp(s.modal)}
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
          for (const lv of LEVEL_ORDER) {
            initialMarkup[lv] = markup[lv];
            initialActive[lv] = active[lv];
          }
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
                class="h-4 w-4 cursor-pointer rounded border-ink-300 text-primary-600 focus:ring-primary-500"
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

            <!-- Slider -->
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step="5"
              bind:value={markup[lv]}
              disabled={!active[lv]}
              class="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-ink-200 via-primary-200 to-accent-200 accent-primary disabled:opacity-40"
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
                <span class="text-ink-500">Base</span>
                <span class="font-mono text-ink-700">{fmtRp(sampleBase)}</span>
                <Icon name="arrow_right" size={10} stroke={2.5} class="text-ink-400" />
                <span
                  class="rounded-md bg-white px-1.5 py-0.5 font-extrabold tabular-nums {levelTone[
                    lv
                  ].text}">{fmtRp(priceFor(lv))}</span
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
          Step 1 — simpan persentase. Order flow pakai rule baru di request berikutnya.
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

  <!-- Step 2: Terapkan ke Katalog -->
  <form
    method="POST"
    action="?/applyToCatalog"
    use:enhance={() =>
      async ({ result, update }) => {
        const msg =
          extractActionMsg((result as any).data) ??
          (result.type === "success" ? "Tersimpan" : "Gagal");
        if (result.type === "failure") toast(msg, "error");
        else toast(msg, "success");
        // Refresh server data supaya stats.total & distribution update di UI
        await update({ reset: false });
      }}
  >
    <div
      class="rounded-2xl border-2 {anyMarkup
        ? 'border-accent-500/30 bg-gradient-to-br from-accent-50/40 via-surface to-primary-50/30'
        : 'border-ink-200 bg-ink-50/40'} p-4 transition-colors"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-br {anyMarkup
              ? 'from-accent-500 to-primary-500'
              : 'from-ink-400 to-ink-600'}"
          >
            <Icon name="zap" size={18} stroke={2.75} />
          </span>
          <div>
            <p class="font-display text-base font-extrabold leading-tight">Terapkan ke Katalog</p>
            <p class="text-[11px] text-ink-500">
              Step 2 — recompute
              <strong class="text-ink-700"
                >{data.stats.total.toLocaleString("id-ID")} layanan</strong
              >
              {#if anyMarkup}
                dengan markup ×
                <span class="font-mono text-success">{memberMul.toFixed(2)}</span>
                (Member) ·
                <span class="font-mono text-success">{agenMul.toFixed(2)}</span>
                (Agen) ·
                <span class="font-mono text-success">{resellerMul.toFixed(2)}</span>
                (Reseller)
              {:else}
                <span class="font-semibold text-warning"
                  >— set minimal satu markup &gt; 0 dulu, lalu Simpan (Step 1)</span
                >
              {/if}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={!anyMarkup}
          class="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-sm font-bold text-white shadow-sm transition-all {anyMarkup
            ? 'bg-ink-900 hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-md active:scale-95'
            : 'cursor-not-allowed bg-ink-300'}"
        >
          <Icon name="refresh" size={14} stroke={2.75} />
          {anyMarkup
            ? `Update ${data.stats.total.toLocaleString("id-ID")} Layanan`
            : "Belum ada markup aktif"}
        </button>
      </div>

      <!-- Live before/after multiplier per level -->
      <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div
          class="rounded-lg border {Number(markup.Member) > 0
            ? 'border-ink-900 bg-ink-900/5'
            : 'border-ink-100 bg-white/70'} px-3 py-2 text-xs"
        >
          <p class="flex items-center gap-1 font-bold text-ink-700">
            <Icon name="user" size={11} stroke={2.75} /> Member
          </p>
          <p class="text-ink-500">
            <span class="font-mono">price × {memberMul.toFixed(2)}</span>
          </p>
          <p
            class="text-[10px] font-bold {Number(markup.Member) > 0
              ? 'text-success'
              : 'text-ink-400'}"
          >
            {Number(markup.Member) > 0
              ? `+${Number(markup.Member).toFixed(0)}% dari harga sekarang`
              : "tidak berubah"}
          </p>
        </div>
        <div
          class="rounded-lg border {Number(markup.Agen) > 0
            ? 'border-success bg-success/5'
            : 'border-ink-100 bg-white/70'} px-3 py-2 text-xs"
        >
          <p class="flex items-center gap-1 font-bold text-ink-700">
            <Icon name="shield" size={11} stroke={2.75} /> Agen
          </p>
          <p class="text-ink-500">
            <span class="font-mono">price_api × {agenMul.toFixed(2)}</span>
          </p>
          <p
            class="text-[10px] font-bold {Number(markup.Agen) > 0
              ? 'text-success'
              : 'text-ink-400'}"
          >
            {Number(markup.Agen) > 0
              ? `+${Number(markup.Agen).toFixed(0)}% dari harga sekarang`
              : "tidak berubah"}
          </p>
        </div>
        <div
          class="rounded-lg border {Number(markup.Reseller) > 0
            ? 'border-accent-600 bg-accent-50/50'
            : 'border-ink-100 bg-white/70'} px-3 py-2 text-xs"
        >
          <p class="flex items-center gap-1 font-bold text-ink-700">
            <Icon name="crown" size={11} stroke={2.75} /> Reseller
          </p>
          <p class="text-ink-500">
            <span class="font-mono">price_reseller × {resellerMul.toFixed(2)}</span>
          </p>
          <p
            class="text-[10px] font-bold {Number(markup.Reseller) > 0
              ? 'text-success'
              : 'text-ink-400'}"
          >
            {Number(markup.Reseller) > 0
              ? `+${Number(markup.Reseller).toFixed(0)}% dari harga sekarang`
              : "tidak berubah"}
          </p>
        </div>
      </div>

      <p class="mt-3 flex items-start gap-1.5 text-[11px] text-ink-500">
        <Icon name="alert" size={11} stroke={2.5} class="mt-0.5 shrink-0 text-warning" />
        <span>
          Aksi ini menulis ulang
          <code class="font-mono text-[10px]">price</code>,
          <code class="font-mono text-[10px]">price_api</code>,
          <code class="font-mono text-[10px]">price_reseller</code>
          untuk semua layanan. Tercatat di audit log. Tidak bisa di-undo otomatis — backup DB dulu kalau
          ragu.
        </span>
      </p>
    </div>
  </form>

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
        <p class="font-bold text-ink-800">Cara kerja 2-step</p>
        <p class="mt-1 text-ink-600">
          <strong>Step 1:</strong> Simpan persentase markup per level (di form atas).
        </p>
        <p class="mt-1 text-ink-600">
          <strong>Step 2:</strong> Klik "Terapkan ke Katalog" untuk recompute harga semua layanan di
          tabel <code class="font-mono text-[10px]">services</code>. Aksi ini menulis ulang
          <code class="font-mono text-[10px]">price</code>,
          <code class="font-mono text-[10px]">price_api</code>,
          <code class="font-mono text-[10px]">price_reseller</code> untuk semua
          {data.stats.total.toLocaleString("id-ID")} baris.
        </p>
        <p class="mt-1 text-ink-500">
          Order flow: baca markup dari tabel
          <code class="font-mono text-[10px]">pricing_rules</code> + harga katalog dari
          <code class="font-mono text-[10px]">services</code>. Keduanya harus sinkron — Step 2
          memastikan sinkronisasi.
        </p>
      </div>
    </div>
  </div>
</section>
