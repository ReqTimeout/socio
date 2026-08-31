<script lang="ts">
  // EmptyTickets — speech bubble + tanda tanya terlipat.
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
  <!-- bubble besar -->
  <g class="art-float">
    <path
      d="M24 30 h56 a10 10 0 0 1 10 10 v26 a10 10 0 0 1 -10 10 h-36 l-12 12 v-12 h-8 a10 10 0 0 1 -10 -10 v-26 a10 10 0 0 1 10 -10 z"
      fill="currentColor"
      fill-opacity="0.04"
    />
    <path d="M40 46 v3 a6 6 0 0 0 6 6 h2" />
    <circle cx="40" cy="60" r="0.6" fill="currentColor" />
  </g>
  <!-- bubble kecil (admin) -->
  <g class="art-float" style="animation-delay: 0.6s">
    <path
      d="M78 76 h22 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-10 l-8 8 v-8 h-4 a7 7 0 0 1 -7 -7 v-14 a7 7 0 0 1 7 -7 z"
      fill="currentColor"
      fill-opacity="0.05"
    />
    <path d="M84 88 h12 M84 96 h7" />
  </g>
  <!-- accent: titik balasan cepat -->
  <circle cx="104" cy="34" r="6" class="art-accent" fill="currentColor" />
  <circle cx="104" cy="34" r="2.2" fill="white" stroke="none" />
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
    animation: art-ping 3.6s ease-in-out infinite;
    transform-origin: center;
  }
  @keyframes art-ping {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.25); opacity: 0.75; }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-float, .art-accent { animation: none !important; }
  }
</style>
