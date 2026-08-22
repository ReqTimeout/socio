<script lang="ts">
  /* Sparkline — tren mini SVG (kurva halus + gradient fill + glow).
   * Dipakai di StatCard: 1 angka besar + 1 tren kecil (pola metric-card premium).
   * Tanpa dependency, warna dari token design system.
   */
  let {
    data = [],
    color = "var(--color-primary-500)",
    height = 40,
    strokeWidth = 2,
    fill = true,
    glow = false,
  }: {
    data?: number[];
    color?: string;
    height?: number;
    strokeWidth?: number;
    fill?: boolean;
    glow?: boolean;
  } = $props();

  const W = 100;
  const PAD = 3;

  const pts = $derived(data.length ? data : [0, 0]);
  const maxV = $derived(Math.max(1, ...pts));
  const minV = $derived(Math.min(...pts));
  const n = $derived(Math.max(pts.length, 2));

  function px(i: number) {
    return PAD + (i * (W - PAD * 2)) / (n - 1);
  }
  function py(v: number) {
    const h = height - PAD * 2;
    const range = maxV - minV || 1;
    return PAD + h - ((v - minV) / range) * h;
  }

  // Kurva halus Catmull-Rom → cubic bezier
  function smoothPath(vals: number[]) {
    const p = vals.map((v, i) => [px(i), py(v)] as [number, number]);
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

  const line = $derived(smoothPath(pts));
  const area = $derived(`${line} L${px(n - 1).toFixed(1)},${height} L${px(0).toFixed(1)},${height} Z`);
  const uid = $props.id();
</script>

<svg
  viewBox="0 0 {W} {height}"
  preserveAspectRatio="none"
  class="block w-full"
  style="height:{height}px"
  aria-hidden="true"
>
  <defs>
    <linearGradient id="{uid}-f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color={color} stop-opacity="0.28" />
      <stop offset="100%" stop-color={color} stop-opacity="0" />
    </linearGradient>
    {#if glow}
      <filter id="{uid}-glow" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation="1.4" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    {/if}
  </defs>
  {#if fill}
    <path d={area} fill="url(#{uid}-f)" />
  {/if}
  <path
    d={line}
    fill="none"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    vector-effect="non-scaling-stroke"
    filter={glow ? `url(#${uid}-glow)` : undefined}
  />
</svg>
