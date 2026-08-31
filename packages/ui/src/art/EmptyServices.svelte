<script lang="ts">
  // EmptyServices — kaca pembesar + kartu layanan.
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
  <!-- service cards -->
  <g class="art-float">
    <rect x="18" y="26" width="34" height="24" rx="6" fill="currentColor" fill-opacity="0.04" />
    <circle cx="29" cy="38" r="4" />
    <path d="M38 34 h8 M38 42 h10" />
  </g>
  <g class="art-float" style="animation-delay: 0.5s">
    <rect x="26" y="56" width="34" height="24" rx="6" fill="currentColor" fill-opacity="0.06" />
    <circle cx="37" cy="68" r="4" />
    <path d="M46 64 h8 M46 72 h10" />
  </g>
  <!-- magnifier -->
  <g class="art-accent">
    <circle cx="76" cy="60" r="18" fill="currentColor" fill-opacity="0.06" />
    <path d="M89 73 l14 14" stroke-width="2" />
  </g>
  <!-- question spark -->
  <path d="M98 26 l2.4 4.8 4.8 2.4 -4.8 2.4 -2.4 4.8 -2.4 -4.8 -4.8 -2.4 4.8 -2.4 z" class="art-float" style="animation-delay: 1s" />
</svg>

<style>
  .art-float {
    animation: art-bob 3.8s ease-in-out infinite;
  }
  @keyframes art-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .art-accent {
    animation: art-rotate 7s ease-in-out infinite;
    transform-origin: 76px 60px;
  }
  @keyframes art-rotate {
    0%, 100% { transform: rotate(-4deg); }
    50% { transform: rotate(5deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-float, .art-accent { animation: none !important; }
  }
</style>
