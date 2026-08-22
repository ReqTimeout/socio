<script lang="ts">
  /* Chart — area chart SVG murni (tanpa dependency), gaya vibrant:
   * kurva halus (Catmull-Rom → bezier), gradient fill + glow, garis
   * animasi menggambar saat mount, hover crosshair + tooltip.
   * Pengganti ApexCharts app PHP lama. Warna dari token design system.
   */
  import { onMount } from "svelte";

  type Series = { label: string; data: number[]; color?: string };

  let {
    series,
    labels = [],
    height = 200,
    formatValue = (v: number) => v.toLocaleString("id-ID"),
  }: {
    series: Series[];
    labels?: string[];
    height?: number;
    formatValue?: (v: number) => string;
  } = $props();

  const W = 600; // viewBox width — responsive via CSS
  const PAD_X = 10;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 26;

  const palette = ["var(--color-primary-600)", "var(--color-accent-500)", "var(--color-success)"];

  const n = $derived(Math.max(...series.map((s) => s.data.length), 2));
  const maxV = $derived(Math.max(1, ...series.flatMap((s) => s.data)));

  function x(i: number) {
    return PAD_X + (i * (W - PAD_X * 2)) / (n - 1);
  }
  function y(v: number) {
    const h = height - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + h - (v / maxV) * h;
  }

  // Kurva halus Catmull-Rom → cubic bezier
  function smoothPath(data: number[]) {
    const p = data.map((v, i) => [x(i), y(v)] as [number, number]);
    if (p.length < 2) return "";
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function areaPath(data: number[]) {
    const base = height - PAD_BOTTOM;
    return `${smoothPath(data)} L${x(data.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
  }

  // Hover tooltip: index terdekat dari posisi pointer
  let hoverIdx = $state(-1);
  let svgEl: SVGSVGElement | undefined = $state();
  let drawn = $state(false);

  onMount(() => {
    const id = requestAnimationFrame(() => (drawn = true));
    return () => cancelAnimationFrame(id);
  });

  function onMove(e: PointerEvent) {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD_X) / (W - PAD_X * 2)) * (n - 1));
    hoverIdx = Math.max(0, Math.min(n - 1, i));
  }

  // Listener via effect — hindari isu typing pointer-event di language server
  $effect(() => {
    const el = svgEl;
    if (!el) return;
    const leave = () => (hoverIdx = -1);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", leave);
    };
  });

  const gridLines = $derived([0.25, 0.5, 0.75].map((f) => PAD_TOP + (height - PAD_TOP - PAD_BOTTOM) * f));
  const uid = $props.id();
</script>

<div class="relative w-full">
  <svg
    bind:this={svgEl}
    viewBox="0 0 {W} {height}"
    class="chart block w-full touch-none"
    class:drawn
    role="img"
    aria-label={series.map((s) => s.label).join(", ")}
  >
    <defs>
      {#each series as s, si}
        <linearGradient id="{uid}-g{si}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={s.color ?? palette[si % palette.length]} stop-opacity="0.28" />
          <stop offset="100%" stop-color={s.color ?? palette[si % palette.length]} stop-opacity="0" />
        </linearGradient>
      {/each}
      <filter id="{uid}-glow" x="-10%" y="-30%" width="120%" height="160%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <!-- Grid halus -->
    {#each gridLines as gy}
      <line x1={PAD_X} x2={W - PAD_X} y1={gy} y2={gy} stroke="var(--color-ink-100)" stroke-width="1" />
    {/each}

    {#each series as s, si}
      <path d={areaPath(s.data)} fill="url(#{uid}-g{si})" class="chart-area" />
      <path
        d={smoothPath(s.data)}
        fill="none"
        stroke={s.color ?? palette[si % palette.length]}
        stroke-width="2.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#{uid}-glow)"
        class="chart-line"
      />
    {/each}

    <!-- Crosshair + titik saat hover -->
    {#if hoverIdx >= 0}
      <line
        x1={x(hoverIdx)}
        x2={x(hoverIdx)}
        y1={PAD_TOP}
        y2={height - PAD_BOTTOM}
        stroke="var(--color-ink-300)"
        stroke-width="1"
        stroke-dasharray="3 3"
      />
      {#each series as s, si}
        {#if s.data[hoverIdx] !== undefined}
          <circle
            cx={x(hoverIdx)}
            cy={y(s.data[hoverIdx])}
            r="4.5"
            fill={s.color ?? palette[si % palette.length]}
            stroke="var(--color-surface)"
            stroke-width="2.5"
          />
        {/if}
      {/each}
    {/if}

    <!-- Label sumbu X (maks 7 supaya gak numpuk) -->
    {#each labels as lbl, i}
      {#if labels.length <= 8 || i % Math.ceil(labels.length / 7) === 0}
        <text
          x={x(i)}
          y={height - 6}
          text-anchor="middle"
          class="fill-ink-400"
          font-size="11"
          font-family="inherit">{lbl}</text
        >
      {/if}
    {/each}
  </svg>

  <!-- Tooltip -->
  {#if hoverIdx >= 0}
    <div
      class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-ink-100 bg-surface px-3 py-2 shadow-card"
      style="left: {(x(hoverIdx) / W) * 100}%"
    >
      {#if labels[hoverIdx]}
        <p class="mb-1 text-[11px] font-semibold text-ink-500">{labels[hoverIdx]}</p>
      {/if}
      {#each series as s, si}
        <p class="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-700">
          <span
            class="inline-block h-2 w-2 rounded-full"
            style="background: {s.color ?? palette[si % palette.length]}"
          ></span>
          {s.label}: <span class="font-bold text-ink-900">{formatValue(s.data[hoverIdx] ?? 0)}</span>
        </p>
      {/each}
    </div>
  {/if}

  <!-- Legend -->
  {#if series.length > 1}
    <div class="mt-2 flex flex-wrap items-center gap-4">
      {#each series as s, si}
        <span class="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <span
            class="inline-block h-2 w-2 rounded-full"
            style="background: {s.color ?? palette[si % palette.length]}"
          ></span>
          {s.label}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Garis menggambar sendiri saat mount + area fade-in. Hormati reduced-motion. */
  .chart-line {
    stroke-dasharray: 1400;
    stroke-dashoffset: 1400;
  }
  .chart-area {
    opacity: 0;
  }
  .chart.drawn .chart-line {
    transition: stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1);
    stroke-dashoffset: 0;
  }
  .chart.drawn .chart-area {
    transition: opacity 0.8s ease 0.35s;
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .chart-line {
      stroke-dasharray: none;
      stroke-dashoffset: 0;
    }
    .chart-area {
      opacity: 1;
    }
    .chart.drawn .chart-line,
    .chart.drawn .chart-area {
      transition: none;
    }
  }
</style>
