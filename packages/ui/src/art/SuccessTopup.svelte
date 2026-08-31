<script lang="ts">
  // SuccessTopup — dompet + koin masuk (top-up berhasil).
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
  <!-- dompet bawah -->
  <g>
    <path
      d="M26 58 h56 a8 8 0 0 1 8 8 v26 a8 8 0 0 1 -8 8 h-56 a8 8 0 0 1 -8 -8 v-26 a8 8 0 0 1 8 -8 z"
      fill="currentColor"
      fill-opacity="0.05"
    />
    <circle cx="68" cy="74" r="7" />
    <path d="M68 70 v8 M65 72 h6" />
  </g>
  <!-- koin jatuh masuk -->
  <g class="art-coin">
    <circle cx="54" cy="34" r="13" fill="currentColor" />
    <text x="54" y="39.5" text-anchor="middle" font-size="13" font-weight="bold" fill="white" stroke="none">+</text>
  </g>
  <!-- trail -->
  <path d="M54 52 v4 M54 20 v-4 M42 18 l-2 -3 M66 18 l2 -3" class="art-trail" />
</svg>

<style>
  .art-coin {
    transform-origin: 54px 34px;
    animation: art-drop 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes art-drop {
    from { transform: translateY(-26px) scale(0.4); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  .art-trail {
    animation: art-fade 2.4s ease-in-out infinite;
  }
  @keyframes art-fade {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.8; }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-coin, .art-trail { animation: none !important; }
  }
</style>
