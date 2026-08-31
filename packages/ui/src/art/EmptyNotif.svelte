<script lang="ts">
  // EmptyNotif — bel + gelombang kecil.
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
  <!-- bell -->
  <g class="art-bell">
    <path
      d="M60 24 a16 16 0 0 1 16 16 v18 l6 12 h-44 l6 -12 v-18 a16 16 0 0 1 16 -16 z"
      fill="currentColor"
      fill-opacity="0.05"
    />
    <path d="M52 74 a8 8 0 0 0 16 0" />
    <path d="M60 20 v4" />
  </g>
  <!-- gelombang kiri-kanan -->
  <path d="M32 44 a28 28 0 0 1 0 24" class="art-wave-l" />
  <path d="M88 44 a28 28 0 0 0 0 24" class="art-wave-r" />
  <!-- spark -->
  <path d="M96 24 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" class="art-spark" />
</svg>

<style>
  .art-bell {
    transform-origin: 60px 24px;
    animation: art-ring 4s ease-in-out infinite;
  }
  @keyframes art-ring {
    0%, 86%, 100% { transform: rotate(0deg); }
    90% { transform: rotate(9deg); }
    94% { transform: rotate(-8deg); }
    97% { transform: rotate(4deg); }
  }
  .art-wave-l,
  .art-wave-r {
    animation: art-fade 4s ease-in-out infinite;
  }
  .art-wave-r { animation-delay: 0.4s; }
  @keyframes art-fade {
    0%, 100% { opacity: 0.25; }
    50% { opacity: 0.8; }
  }
  .art-spark {
    animation: art-twinkle 3.2s ease-in-out infinite;
    transform-origin: 96px 30px;
  }
  @keyframes art-twinkle {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
    50% { transform: scale(1.2) rotate(20deg); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-bell, .art-wave-l, .art-wave-r, .art-spark { animation: none !important; }
  }
</style>
