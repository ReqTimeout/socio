<script lang="ts">
  // EmptyOrders — struk/receipt menembus titik jalur (line-art, 1.5 stroke).
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
  <!-- dashed path -->
  <path d="M14 96 C 40 96, 34 70, 58 70 S 88 84, 106 60" stroke-dasharray="4 5" class="art-float" />
  <!-- receipt -->
  <g class="art-float" style="animation-delay: 0.4s">
    <path
      d="M46 18 h28 v64 l-6 -5 -5 5 -6 -5 -5 5 -6 -5 z"
      fill="currentColor"
      fill-opacity="0.04"
    />
    <path d="M54 32 h12 M54 40 h16 M54 48 h12 M58 58 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />
  </g>
  <!-- accent coin -->
  <circle cx="96" cy="34" r="9" class="art-accent" fill="currentColor" />
  <path d="M93 34 l2.4 2.4 4.6 -4.8" stroke="white" stroke-width="1.8" />
</svg>

<style>
  .art-float {
    animation: art-bob 3.6s ease-in-out infinite;
  }
  @keyframes art-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  .art-accent {
    animation: art-pulse 3.6s ease-in-out infinite;
    transform-origin: center;
  }
  @keyframes art-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.12); }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-float, .art-accent { animation: none !important; }
  }
</style>
