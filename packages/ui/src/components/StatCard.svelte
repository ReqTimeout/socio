<script lang="ts">
  /* StatCard — kartu metrik dashboard (pola premium: 1 angka besar +
   * 1 pembanding tren + 1 visual sparkline). Gaya vibrant: chip gradient
   * ber-glow, hover lift + colored glow. Warna dari token design system.
   */
  import Icon from "./Icon.svelte";
  import Sparkline from "./Sparkline.svelte";

  type Tone = "primary" | "accent" | "success" | "warning" | "danger" | "neutral";

  let {
    label,
    value,
    icon,
    tone = "neutral",
    delta,
    hint,
    href,
    spark,
  }: {
    label: string;
    value: string;
    icon?: string;
    tone?: Tone;
    /** % perubahan vs periode sebelumnya, mis. +12.5 / -3.2 */
    delta?: number;
    /** teks kecil di bawah value, mis. "7 hari terakhir" */
    hint?: string;
    href?: string;
    /** data mini utk sparkline (mis. tren 7 hari) */
    spark?: number[];
  } = $props();

  const tones: Record<Tone, { chip: string; color: string; glow: string }> = {
    primary: {
      chip: "from-primary-500 to-primary-700",
      color: "var(--color-primary-500)",
      glow: "hover:shadow-[0_16px_36px_-12px_rgba(79,70,229,0.5)]",
    },
    accent: {
      chip: "from-accent-400 to-accent-600",
      color: "var(--color-accent-500)",
      glow: "hover:shadow-[0_16px_36px_-12px_rgba(6,182,212,0.5)]",
    },
    success: {
      chip: "from-emerald-400 to-emerald-600",
      color: "var(--color-success)",
      glow: "hover:shadow-[0_16px_36px_-12px_rgba(16,163,74,0.45)]",
    },
    warning: {
      chip: "from-amber-400 to-amber-600",
      color: "var(--color-warning)",
      glow: "hover:shadow-[0_16px_36px_-12px_rgba(217,119,6,0.45)]",
    },
    danger: {
      chip: "from-rose-400 to-rose-600",
      color: "var(--color-danger)",
      glow: "hover:shadow-[0_16px_36px_-12px_rgba(220,38,38,0.45)]",
    },
    neutral: {
      chip: "from-ink-400 to-ink-600",
      color: "var(--color-ink-500)",
      glow: "hover:shadow-card-hover",
    },
  };
  const t = $derived(tones[tone]);
  const up = $derived((delta ?? 0) >= 0);
</script>

<svelte:element
  this={href ? "a" : "div"}
  {href}
  class="group relative block overflow-hidden rounded-card border border-ink-100 bg-surface p-4 shadow-card transition-all duration-300 lg:p-5
    {href ? `hover:-translate-y-1 ${t.glow}` : ''}"
>
  <!-- wash gradien tipis biar gak flat -->
  <div
    class="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-br {t.chip} opacity-[0.06] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]"
  ></div>

  <div class="relative flex items-start justify-between gap-3">
    <div class="min-w-0">
      <p class="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p class="mt-1 truncate font-display text-xl font-extrabold tracking-tight text-ink-900 lg:text-2xl">
        {value}
      </p>
    </div>
    {#if icon}
      <span
        class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br {t.chip} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
      >
        <Icon name={icon} size={20} stroke={2} />
      </span>
    {/if}
  </div>

  <div class="relative mt-2 flex items-end justify-between gap-2">
    <div class="min-w-0">
      {#if delta !== undefined}
        <span
          class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold
            {up ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}"
        >
          <Icon name={up ? "arrow_up" : "arrow_down"} size={11} stroke={2.75} />
          {Math.abs(delta).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
        </span>
        <span class="ml-1 text-[10px] text-ink-500">7h</span>
      {:else if hint}
        <span class="text-[11px] text-ink-500">{hint}</span>
      {/if}
    </div>
    {#if spark && spark.length}
      <div class="w-16 shrink-0 opacity-90 sm:w-20">
        <Sparkline data={spark} color={t.color} height={28} strokeWidth={2} glow />
      </div>
    {/if}
  </div>
</svelte:element>
