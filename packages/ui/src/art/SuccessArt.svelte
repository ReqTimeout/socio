<script lang="ts">
  // EmptyBalance — dompet terbuka + koin melayang.
  // SuccessArt dipakai umum (auth verify dsb) — centang ring polos tanpa konfeti.
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
  <circle cx="60" cy="60" r="30" fill="currentColor" fill-opacity="0.06" class="art-ring" />
  <path d="M46 60 l10 10 20 -22" class="art-check" />
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
  @media (prefers-reduced-motion: reduce) {
    .art-check, .art-ring { animation: none !important; }
    .art-check { stroke-dashoffset: 0; }
  }
</style>
