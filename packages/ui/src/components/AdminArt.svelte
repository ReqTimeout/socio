<script lang="ts">
  /* AdminArt — SVG scene system untuk empty states & success moments (UIUXADMIN §5).
   * Inline SVG, stroke-style match Icon.svelte (1.75, round), viewBox 120×120.
   * Animasi CSS-only (float/draw) — mati otomatis via global reduced-motion rule.
   * Tone = warna aksen scene dari token status (safe): primary/accent/success/warning.
   */
  let {
    scene = "search-none",
    size = 120,
    class: cls = "",
  }: { scene?: string; size?: number; class?: string } = $props();

  const toneMap: Record<string, { main: string; soft: string }> = {
    primary: {
      main: "var(--color-primary-600)",
      soft: "var(--color-primary-100)",
    },
    accent: {
      main: "var(--color-accent-600)",
      soft: "var(--color-accent-100)",
    },
    success: {
      main: "var(--color-success)",
      soft: "var(--color-success-soft)",
    },
    warning: {
      main: "var(--color-warning)",
      soft: "var(--color-warning-soft)",
    },
    danger: { main: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  };
  const sceneTone: Record<string, keyof typeof toneMap> = {
    users: "primary",
    orders: "accent",
    deposits: "warning",
    services: "primary",
    pricing: "success",
    coupons: "accent",
    tickets: "primary",
    providers: "accent",
    reporting: "success",
    affiliate: "primary",
    banners: "accent",
    news: "primary",
    email: "accent",
    audit: "primary",
    "search-none": "primary",
    success: "success",
  };
  const tone = $derived(toneMap[sceneTone[scene] ?? "primary"]);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 120 120"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"
>
  {#if scene === "users"}
    <circle cx="38" cy="42" r="9" />
    <path d="M24 68c0-8 6-14 14-14s14 6 14 14" />
    <rect x="62" y="28" width="36" height="26" rx="6" />
    <circle cx="80" cy="38" r="4" />
    <path d="M70 48c1.5-3 5.5-5 10-5s8.5 2 10 5" />
    <path d="M84 62h14M84 68h10" stroke="var(--color-ink-300)" />
    <g class="art-float">
      <rect
        x="14"
        y="76"
        width="28"
        height="18"
        rx="5"
        fill={tone.soft}
        stroke={tone.main}
      />
      <path d="M20 84h16M20 88h10" stroke={tone.main} stroke-width="1.5" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "orders"}
    <path d="M30 24h60v72l-7-4-8 4-7-4-8 4-7-4-8 4-8-4-7 4V24z" />
    <path d="M42 42h36M42 52h36M42 62h24" stroke="var(--color-ink-300)" />
    <g class="art-badge art-float">
      <circle cx="90" cy="34" r="12" fill={tone.soft} stroke={tone.main} />
      <path d="m85 34 3.5 3.5L95 30" stroke={tone.main} stroke-width="2" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "deposits"}
    <rect x="28" y="48" width="64" height="40" rx="8" />
    <path d="M28 60h64" stroke="var(--color-ink-300)" />
    <circle cx="44" cy="70" r="3" stroke={tone.main} />
    <path d="M86 70h-24" stroke="var(--color-ink-300)" />
    <g class="art-float">
      <circle cx="74" cy="34" r="7" fill={tone.soft} stroke={tone.main} />
      <path d="M74 31v6M71 34h6" stroke={tone.main} stroke-width="1.5" />
    </g>
    <g class="art-float art-float-slow">
      <circle
        cx="92"
        cy="24"
        r="5"
        fill={tone.soft}
        stroke={tone.main}
        opacity="0.7"
      />
      <path d="M92 22v4M90 24h4" stroke={tone.main} stroke-width="1.25" />
    </g>
    <path
      d="M60 24c8 4 12 10 12 16"
      stroke-dasharray="2 5"
      stroke="var(--color-ink-300)"
    />
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "services"}
    <g class="art-float">
      <rect
        x="18"
        y="66"
        width="42"
        height="30"
        rx="6"
        fill={tone.soft}
        stroke={tone.main}
      />
    </g>
    <rect
      x="26"
      y="48"
      width="42"
      height="30"
      rx="6"
      fill="var(--color-surface)"
      stroke={tone.main}
    />
    <rect
      x="34"
      y="30"
      width="42"
      height="30"
      rx="6"
      fill="var(--color-surface)"
      stroke="var(--color-ink-400)"
    />
    <path d="M42 40h22M42 46h16" stroke="var(--color-ink-300)" />
    <g class="art-float art-float-slow">
      <rect
        x="84"
        y="54"
        width="22"
        height="14"
        rx="4"
        fill={tone.soft}
        stroke={tone.main}
      />
      <path d="M90 61l3 3 6-7" stroke={tone.main} stroke-width="1.5" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "pricing"}
    <path
      d="M62 22 96 56 60 92 26 58 62 22z"
      fill={tone.soft}
      stroke={tone.main}
    />
    <circle cx="62" cy="57" r="6" stroke={tone.main} />
    <path
      d="M28 70h16M36 70v14M44 70v10M44 70c6-2 12-2 16 2M40 84h10"
      stroke="var(--color-ink-300)"
    />
    <g class="art-float">
      <path d="M86 76h18l4 4-4 4H86z" fill={tone.soft} stroke={tone.main} />
      <path d="M90 80h6" stroke={tone.main} />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "coupons"}
    <path
      d="M22 42h76v14a6 6 0 0 0 0 12v14H22V68a6 6 0 0 0 0-12V42z"
      fill={tone.soft}
      stroke={tone.main}
    />
    <path d="M62 46v34" stroke={tone.main} stroke-dasharray="4 4" />
    <path d="M76 58l-4 8h6l-4 8" stroke={tone.main} stroke-width="2" />
    <path d="M34 56h18M34 64h12" stroke={tone.main} stroke-width="1.5" />
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "tickets"}
    <path
      d="M26 40a6 6 0 0 1 6-6h56a6 6 0 0 1 6 6v10a6 6 0 0 0 0 20v10a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6V70a6 6 0 0 0 0-20V40z"
      fill={tone.soft}
      stroke={tone.main}
    />
    <path d="M66 34v52" stroke={tone.main} stroke-dasharray="4 4" />
    <path d="M82 48l-8 10h8l-8 10" stroke={tone.main} stroke-width="2" />
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "providers"}
    <path
      d="M40 34v20a20 20 0 0 0 40 0V34"
      fill={tone.soft}
      stroke={tone.main}
    />
    <path d="M52 34v-8h16v8" stroke={tone.main} />
    <path d="M60 74v16" stroke={tone.main} stroke-width="2" />
    <path
      d="M60 90c-6 8-14 8-16 2M60 90c6 8 14 8 16 2"
      stroke="var(--color-ink-300)"
    />
    <g class="art-float">
      <path d="M88 28h8M92 24v8" stroke={tone.main} stroke-width="2" />
      <path d="M98 38h6M101 35v6" stroke={tone.main} stroke-width="1.5" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "reporting"}
    <path d="M24 96V30" stroke="var(--color-ink-300)" />
    <path d="M24 96h72" stroke="var(--color-ink-300)" />
    <path
      class="art-draw"
      d="M30 84c12-4 16-30 28-34s18 12 30-8"
      stroke={tone.main}
      stroke-width="2.25"
      fill="none"
    />
    <path d="M30 88h60" stroke-dasharray="2 5" stroke="var(--color-ink-300)" />
    <g class="art-float">
      <circle cx="92" cy="38" r="9" fill={tone.soft} stroke={tone.main} />
      <path
        d="M92 34v-6M92 44v2M92 30a8 8 0 0 1 8 8h-8v-8zM84 38h2"
        stroke={tone.main}
        stroke-width="1.5"
      />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "affiliate"}
    <circle cx="60" cy="28" r="8" stroke={tone.main} />
    <path
      d="M60 36v18M38 76V62c0-4 4-8 8-8M82 76V62c0-4-4-8-8-8M60 54v12"
      stroke="var(--color-ink-300)"
    />
    <circle
      cx="38"
      cy="84"
      r="7"
      stroke={tone.main}
      fill={tone.soft}
      class="art-float"
    />
    <circle
      cx="82"
      cy="84"
      r="7"
      stroke={tone.main}
      fill={tone.soft}
      class="art-float art-float-slow"
    />
    <circle cx="60" cy="72" r="7" stroke={tone.main} fill={tone.soft} />
    <g class="art-float art-float-slow">
      <circle cx="96" cy="30" r="6" fill={tone.soft} stroke={tone.main} />
      <path d="M96 27.5v5M93.5 30h5" stroke={tone.main} stroke-width="1.25" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "banners"}
    <rect
      x="20"
      y="32"
      width="80"
      height="48"
      rx="8"
      stroke={tone.main}
      fill={tone.soft}
    />
    <path
      d="M20 62l20-14 14 10 14-12 32 16"
      stroke={tone.main}
      stroke-width="1.5"
    />
    <circle cx="38" cy="44" r="4" stroke={tone.main} />
    <g class="art-float">
      <path
        d="M78 74l14 6-3-15z"
        fill="var(--color-surface)"
        stroke={tone.main}
        stroke-width="1.5"
      />
      <path d="M82 74l6 2.5" stroke={tone.main} stroke-width="1.25" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "news"}
    <path
      d="M28 30h50a8 8 0 0 1 8 8v52H36a8 8 0 0 1-8-8V30z"
      fill={tone.soft}
      stroke={tone.main}
    />
    <path
      d="M36 30v60M36 46h42M36 54h42M36 62h30M36 70h30"
      stroke={tone.main}
      stroke-width="1.25"
    />
    <g class="art-float">
      <rect
        x="52"
        y="76"
        width="44"
        height="18"
        rx="5"
        fill="var(--color-surface)"
        stroke={tone.main}
      />
      <path d="M58 82h32M58 88h22" stroke={tone.main} stroke-width="1.25" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "email"}
    <rect
      x="24"
      y="38"
      width="72"
      height="48"
      rx="8"
      fill={tone.soft}
      stroke={tone.main}
    />
    <path d="M24 46l36 26 36-26" stroke={tone.main} />
    <g class="art-float">
      <path
        d="M92 30l6 16-34 6-6-16z"
        fill="var(--color-surface)"
        stroke={tone.main}
        stroke-width="1.5"
      />
      <path d="M94 34l3 8" stroke={tone.main} stroke-width="1.25" />
    </g>
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "audit"}
    <path
      d="M60 22l30 10v22c0 16-13 27-30 32-17-5-30-16-30-32V32l30-10z"
      fill={tone.soft}
      stroke={tone.main}
    />
    <path d="M60 40v14M60 62h.01" stroke={tone.main} stroke-width="2" />
    <path d="M42 84h36" stroke-dasharray="2 4" stroke="var(--color-ink-300)" />
    <path
      d="M48 92c4-3 8-3 12 0s8 3 12 0"
      stroke-dasharray="2 4"
      stroke="var(--color-ink-300)"
      class="art-float"
    />
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {:else if scene === "success"}
    <circle
      cx="60"
      cy="60"
      r="34"
      fill={tone.soft}
      stroke={tone.main}
      stroke-width="2"
    />
    <path
      class="art-draw-slow"
      d="m44 60 12 12 22-24"
      stroke={tone.main}
      stroke-width="3"
    />
  {:else}
    <!-- search-none: default -->
    <circle cx="52" cy="52" r="24" stroke={tone.main} />
    <path d="M70 70l18 18" stroke={tone.main} stroke-width="2.25" />
    <path d="M44 52h16M52 44v16" stroke={tone.main} />
    <path
      d="M88 30c2-6 8-8 10-8"
      stroke="var(--color-ink-300)"
      stroke-dasharray="2 4"
      class="art-float"
    />
    <g fill="currentColor" opacity="0.12"><circle cx="20" cy="20" r="1.25"/><circle cx="104" cy="88" r="1.25"/><circle cx="100" cy="18" r="1"/><circle cx="16" cy="100" r="1"/></g>
  {/if}
</svg>

<style>
  /* Float loop — ambient tier (UIUXADMIN §4). Global reduced-motion rule mematikan. */
  .art-float {
    animation: art-float 3s ease-in-out infinite;
  }
  .art-float-slow {
    animation-duration: 4.2s;
    animation-delay: -1.2s;
  }
  @keyframes art-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
  /* Line draw-in — page tier */
  .art-draw {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    animation: art-draw 700ms var(--ease-out-soft, ease-out) forwards;
  }
  .art-draw-slow {
    stroke-dasharray: 80;
    stroke-dashoffset: 80;
    animation: art-draw 600ms var(--ease-out-soft, ease-out) 120ms forwards;
  }
  @keyframes art-draw {
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
