<script lang="ts">
  // ResellerArt — line-art "margin/untung": tag harga (modal) → arrow naik →
  // tumpukan koin (profit) + sparkle. DNA art system: 1.5px currentColor +
  // 1 aksen (fill-opacity), motion-safe, animasi TERUS-MENERUS (art-bob /
  // art-dash / art-pulse infinite) — bukan one-shot. Reduced-motion: semua
  // animasi mati (state akhir dipertahankan). Dipakai di halaman reseller app.
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
  <!-- Tag harga modal (accent soft) -->
  <g class="art-float">
    <path
      d="M16 70 h20 l14 14 -14 14 h-20 a4 4 0 0 1 -4 -4 v-20 a4 4 0 0 1 4 -4 z"
      fill="currentColor"
      fill-opacity="0.06"
    />
    <circle cx="24" cy="84" r="2.6" />
    <path d="M32 79 h12 M32 88 h8" />
  </g>

  <!-- Arrow margin naik (dash mengalir terus-menerus) + kepala arrow -->
  <path d="M46 74 C 60 62, 66 48, 80 38" stroke-dasharray="3 5" class="art-dash" />
  <path d="M72 36 l9 -2 -2 9" />

  <!-- Tumpukan koin (untung) — bob bertahap + accent pulse -->
  <g class="art-float" style="animation-delay: 0.5s">
    <ellipse cx="88" cy="92" rx="17" ry="6" fill="currentColor" fill-opacity="0.05" />
    <ellipse cx="88" cy="84" rx="17" ry="6" />
    <ellipse
      cx="88"
      cy="76"
      rx="17"
      ry="6"
      class="art-accent"
      fill="currentColor"
      fill-opacity="0.1"
    />
    <path d="M84 76 h8 M88 72 v8" />
  </g>

  <!-- Sparkle (pulse terus-menerus) -->
  <path
    class="art-spark"
    d="M102 30 l2.2 4.6 4.6 2.2 -4.6 2.2 -2.2 4.6 -2.2 -4.6 -4.6 -2.2 4.6 -2.2 z"
    fill="currentColor"
    fill-opacity="0.55"
    stroke="none"
  />
</svg>

<style>
  .art-float {
    animation: art-bob 3.8s ease-in-out infinite;
  }
  @keyframes art-bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
  .art-accent {
    transform-origin: 88px 76px;
    animation: art-pulse 3.8s ease-in-out infinite;
  }
  @keyframes art-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.06);
    }
  }
  .art-dash {
    animation: art-dash 1.6s linear infinite;
  }
  @keyframes art-dash {
    to {
      stroke-dashoffset: -16;
    }
  }
  .art-spark {
    transform-origin: 102px 37px;
    animation: art-spark 2.8s ease-in-out infinite;
  }
  @keyframes art-spark {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.55;
    }
    50% {
      transform: scale(1.25);
      opacity: 0.9;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .art-float,
    .art-accent,
    .art-dash,
    .art-spark {
      animation: none !important;
    }
  }
</style>
