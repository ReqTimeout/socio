<script lang="ts">
  // EmptyAffiliate — dua node terhubung garis putus (referral network).
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
  <!-- node kamu (accent) -->
  <g class="art-float">
    <circle cx="34" cy="88" r="14" class="art-accent" fill="currentColor" />
    <path d="M31 88 l2.4 2.4 4.4 -4.6" stroke="white" stroke-width="1.8" />
  </g>
  <!-- node downline -->
  <g class="art-float" style="animation-delay: 0.5s">
    <circle cx="86" cy="30" r="11" fill="currentColor" fill-opacity="0.06" />
    <circle cx="86" cy="27.5" r="3" />
    <path d="M81 35 a8 8 0 0 1 10 0" />
  </g>
  <g class="art-float" style="animation-delay: 1s">
    <circle cx="96" cy="76" r="11" fill="currentColor" fill-opacity="0.06" />
    <circle cx="96" cy="73.5" r="3" />
    <path d="M91 81 a8 8 0 0 1 10 0" />
  </g>
  <!-- garis putus -->
  <path d="M44 78 C 60 66, 66 48, 78 36" stroke-dasharray="3 5" class="art-dash" />
  <path d="M48 92 C 66 92, 78 88, 88 82" stroke-dasharray="3 5" class="art-dash" style="animation-delay: 0.5s" />
  <!-- komisi chip -->
  <g class="art-float" style="animation-delay: 1.4s">
    <rect x="52" y="46" width="22" height="13" rx="6.5" fill="currentColor" fill-opacity="0.05" />
    <path d="M56.5 52.5 h13" />
  </g>
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
    transform-origin: 34px 88px;
    animation: art-pulse 3.8s ease-in-out infinite;
  }
  @keyframes art-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  .art-dash {
    animation: art-dash 1.6s linear infinite;
  }
  @keyframes art-dash {
    to { stroke-dashoffset: -16; }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-float, .art-accent, .art-dash { animation: none !important; }
  }
</style>
