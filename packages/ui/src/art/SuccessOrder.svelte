<script lang="ts">
  // SuccessOrder — centang dalam lingkaran + konfeti kecil.
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
  <!-- lingkaran -->
  <circle cx="60" cy="60" r="30" fill="currentColor" fill-opacity="0.06" class="art-ring" />
  <!-- centang (draw-in) -->
  <path d="M46 60 l10 10 20 -22" class="art-check" />
  <!-- konfeti -->
  <path d="M30 34 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" class="art-confetti" />
  <rect x="86" y="28" width="7" height="7" rx="1.5" class="art-confetti" style="animation-delay: 0.3s" />
  <path d="M92 78 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" class="art-confetti" style="animation-delay: 0.6s" />
  <rect x="24" y="74" width="7" height="7" rx="1.5" class="art-confetti" style="animation-delay: 0.9s" />
</svg>

<style>
  .art-check {
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: art-draw 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
  }
  @keyframes art-draw {
    to { stroke-dashoffset: 0; }
  }
  .art-ring {
    transform-origin: 60px 60px;
    animation: art-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes art-pop {
    from { transform: scale(0.6); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .art-confetti {
    transform-origin: center;
    animation: art-confetti 2.8s ease-in-out infinite;
  }
  @keyframes art-confetti {
    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
    50% { transform: translateY(-4px) rotate(24deg); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-check, .art-ring, .art-confetti { animation: none !important; }
    .art-check { stroke-dashoffset: 0; }
  }
</style>
