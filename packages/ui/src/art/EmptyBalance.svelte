<script lang="ts">
  // EmptyBalance — dompet terbuka + koin melayang.
  let { size = 120, class: className = "" }: { size?: number; class?: string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 120 120"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  <!-- dompet -->
  <g class="art-float">
    <path
      d="M28 52 h54 a8 8 0 0 1 8 8 v30 a8 8 0 0 1 -8 8 h-54 a8 8 0 0 1 -8 -8 v-30 a8 8 0 0 1 8 -8 z"
      fill="currentColor"
      fill-opacity="0.04"
    />
    <path d="M20 56 v-8 a6 6 0 0 1 6 -6 h44 l6 10" />
    <circle cx="70" cy="72" r="7" />
    <path d="M70 68 v8 M67 70 h6" />
  </g>
  <!-- koin -->
  <g class="art-coin">
    <circle cx="96" cy="34" r="12" fill="currentColor" />
    <text x="96" y="39" text-anchor="middle" font-size="13" font-weight="bold" fill="white" stroke="none" class="art-coin-text">Rp</text>
  </g>
  <!-- koin kecil -->
  <circle cx="82" cy="58" r="5" class="art-float" style="animation-delay: 0.7s" />
  <!-- spark -->
  <path d="M36 26 l1.8 3.6 3.6 1.8 -3.6 1.8 -1.8 3.6 -1.8 -3.6 -3.6 -1.8 3.6 -1.8 z" class="art-float" style="animation-delay: 1.2s" />
</svg>

<style>
  .art-float {
    animation: art-bob 3.6s ease-in-out infinite;
  }
  @keyframes art-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .art-coin {
    transform-origin: 96px 34px;
    animation: art-coin 3.8s ease-in-out infinite;
  }
  @keyframes art-coin {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-5px) scale(1.05); }
  }
  .art-coin-text {
    font-family: inherit;
  }
  @media (prefers-reduced-motion: reduce) {
    .art-float, .art-coin { animation: none !important; }
  }
</style>
