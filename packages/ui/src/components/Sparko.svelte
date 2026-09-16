<!--
  Sparko.svelte — maskot Socio.id

  Karakter petir (lightning bolt) netral gender, multi-pose.
  Dipakai di: Navbar (idle mini), Hero (idle+wave), HowItWorks (wave),
  TestiWall (celebrate), 404 (sleep), empty/error states (sad/error),
  order sukses (celebrate).

  @prop pose  - 'idle' | 'wave' | 'celebrate' | 'sad' | 'error' | 'sleep'
  @prop size  - ukuran dalam pixel (default 120)
  @prop label - override aria-label (opsional)

  Dependencies:
  - Design tokens dari tokens.css: --ink, --color-sky-400, --pop-mango, --pop-berry
  - Reduced-motion: animasi otomatis off
  - Berat SVG: ~1.6KB per instance (gzip), 1 file untuk semua pose

  Author: built for socio.id landing v2 "Playful Premium"
  See: docs/LANDING_V2_PLAYFUL_PLAN.md §5.7, §6.5 + D-3 (approved)
-->
<script lang="ts">
  // Sparko — maskot Socio.id (port runes dari sparko/Sparko.svelte).
  // 6 pose: idle/wave/celebrate/sad/error/sleep. Pure SVG ~1.6KB, transform-only.
  import type { Snippet } from "svelte";

  let {
    pose = "idle",
    size = 120,
    label = null,
    class: className = "",
  }: {
    pose?: "idle" | "wave" | "celebrate" | "sad" | "error" | "sleep";
    size?: number;
    label?: string | null;
    class?: string;
  } = $props();

  const ariaLabel = $derived(label ?? `Sparko si maskot Socio.id (${pose})`);
</script>

<svg
  class="sparko sparko--{pose} {className}"
  viewBox="0 0 120 130"
  width={size}
  height={size * 130 / 120}
  role="img"
  aria-label={ariaLabel}
  preserveAspectRatio="xMidYMid meet"
  xmlns="http://www.w3.org/2000/svg"
>
  <title>{ariaLabel}</title>

  <!-- Ground shadow (animates synced with body float) -->
  <ellipse
    class="sparko-shadow"
    cx="62"
    cy="127"
    rx="20"
    ry="2.5"
    fill="var(--ink, #1a1a1a)"
    opacity="0.15"
  />

  <g class="sparko-body">
    <!-- Top sparkle (only when awake/happy) -->
    {#if pose !== 'sleep' && pose !== 'error' && pose !== 'sad'}
      <path
        class="sparko-top-spark"
        d="M 90 18 L 92.5 22 L 96.5 24 L 92.5 26 L 90 30 L 87.5 26 L 83.5 24 L 87.5 22 Z"
        fill="var(--pop-mango, #fbbf24)"
      />
    {/if}

    <!-- Body: lightning bolt path -->
    <path
      class="sparko-bolt"
      d="M 70 15 L 12 72 L 42 72 L 32 128 L 112 65 L 82 65 Z"
      fill="var(--color-sky-400, #38bdf8)"
      stroke="var(--ink, #1a1a1a)"
      stroke-width="3"
      stroke-linejoin="round"
      stroke-linecap="round"
    />

    <!-- Belly highlight (suggests light source from top-right) -->
    <path
      class="sparko-highlight"
      d="M 70 20 Q 60 40 32 124"
      stroke="white"
      stroke-width="3"
      stroke-linecap="round"
      fill="none"
      opacity="0.35"
    />

    <!-- Cheeks (subtle blush, hidden during sad/error/sleep) -->
    {#if pose === 'idle' || pose === 'wave' || pose === 'celebrate'}
      <ellipse
        class="sparko-cheek sparko-cheek--left"
        cx="34"
        cy="60"
        rx="5"
        ry="3"
        fill="var(--pop-berry, #ef4444)"
        opacity="0.45"
      />
      <ellipse
        class="sparko-cheek sparko-cheek--right"
        cx="72"
        cy="60"
        rx="5"
        ry="3"
        fill="var(--pop-berry, #ef4444)"
        opacity="0.45"
      />
    {/if}

    <!-- Eyes (per pose) -->
    <g class="sparko-eyes">
      {#if pose === 'idle' || pose === 'wave'}
        <!-- Round eyes with pupils -->
        <circle cx="46" cy="46" r="6" fill="white" stroke="var(--ink, #1a1a1a)" stroke-width="2"/>
        <circle cx="65" cy="46" r="6" fill="white" stroke="var(--ink, #1a1a1a)" stroke-width="2"/>
        <circle class="sparko-pupil" cx="46" cy="47.5" r="2.8" fill="var(--ink, #1a1a1a)"/>
        <circle class="sparko-pupil" cx="65" cy="47.5" r="2.8" fill="var(--ink, #1a1a1a)"/>
        <circle cx="47.2" cy="46.2" r="0.9" fill="white"/>
        <circle cx="66.2" cy="46.2" r="0.9" fill="white"/>
      {:else if pose === 'celebrate'}
        <!-- Happy squint ^_^ -->
        <path d="M 40 47 Q 46 41 52 47" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 59 47 Q 65 41 71 47" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      {:else if pose === 'sad'}
        <!-- Droopy eyes -->
        <ellipse cx="46" cy="48" rx="5" ry="3" fill="white" stroke="var(--ink, #1a1a1a)" stroke-width="2"/>
        <ellipse cx="65" cy="48" rx="5" ry="3" fill="white" stroke="var(--ink, #1a1a1a)" stroke-width="2"/>
        <circle cx="46" cy="49.5" r="2.4" fill="var(--ink, #1a1a1a)"/>
        <circle cx="65" cy="49.5" r="2.4" fill="var(--ink, #1a1a1a)"/>
      {:else if pose === 'error'}
        <!-- X X eyes -->
        <g stroke="var(--ink, #1a1a1a)" stroke-width="2.5" stroke-linecap="round" fill="none">
          <path d="M 41 42 L 51 50"/>
          <path d="M 51 42 L 41 50"/>
          <path d="M 60 42 L 70 50"/>
          <path d="M 70 42 L 60 50"/>
        </g>
      {:else if pose === 'sleep'}
        <!-- Closed eyes -->
        <path d="M 41 47 Q 46 51 51 47" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 60 47 Q 65 51 70 47" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      {/if}
    </g>

    <!-- Mouth (per pose) -->
    <g class="sparko-mouth">
      {#if pose === 'idle'}
        <path d="M 50 60 Q 55.5 64.5 61 60" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      {:else if pose === 'wave'}
        <path d="M 49 60 Q 55.5 66 62 60" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      {:else if pose === 'celebrate'}
        <ellipse cx="55.5" cy="63" rx="4" ry="5" fill="var(--ink, #1a1a1a)"/>
      {:else if pose === 'sad'}
        <path d="M 49 65 Q 55.5 59 62 65" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      {:else if pose === 'error'}
        <path d="M 49 62 L 53 65 L 57 62 L 61 65 L 64 62" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      {:else if pose === 'sleep'}
        <ellipse cx="55.5" cy="62" rx="2.2" ry="2.6" fill="var(--ink, #1a1a1a)"/>
      {/if}
    </g>

    <!-- Arms (per pose) -->
    <g class="sparko-arms" stroke="var(--ink, #1a1a1a)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      {#if pose === 'wave'}
        <!-- Right arm raised, left hanging -->
        <path d="M 100 70 Q 110 50 116 32" />
        <path d="M 113 32 L 118 26 M 116 32 L 113 27" opacity="0.85"/>
        <path d="M 30 80 Q 28 92 32 100" opacity="0.6"/>
      {:else if pose === 'celebrate'}
        <!-- Both arms up -->
        <path d="M 28 80 Q 20 60 16 36"/>
        <path d="M 100 70 Q 110 52 116 30"/>
      {:else if pose === 'sad'}
        <!-- Both limp -->
        <path d="M 28 82 L 32 102" opacity="0.5"/>
        <path d="M 100 72 L 105 92" opacity="0.5"/>
      {:else if pose === 'error'}
        <!-- One confused up, one down -->
        <path d="M 100 70 Q 108 55 112 38" />
        <path d="M 30 80 L 28 96" opacity="0.6"/>
      {:else if pose === 'sleep'}
        <!-- Tucked in -->
        <path d="M 30 85 Q 28 92 30 98" opacity="0.4"/>
        <path d="M 100 75 Q 102 82 100 88" opacity="0.4"/>
      {:else}
        <!-- Idle: subtle hanging -->
        <path d="M 28 80 Q 26 90 30 96" opacity="0.45"/>
        <path d="M 100 72 Q 104 82 102 92" opacity="0.45"/>
      {/if}
    </g>

    <!-- Pose-specific decorations -->
    {#if pose === 'celebrate'}
      <!-- Confetti -->
      <circle cx="20" cy="38" r="2" fill="var(--pop-mango, #fbbf24)"/>
      <circle cx="105" cy="20" r="2.5" fill="var(--pop-berry, #ef4444)"/>
      <circle cx="110" cy="92" r="2" fill="var(--pop-mango, #fbbf24)"/>
      <circle cx="12" cy="78" r="2" fill="var(--pop-berry, #ef4444)"/>
      <circle cx="8" cy="50" r="1.5" fill="var(--color-sky-300, #7dd3fc)"/>
    {:else if pose === 'sad'}
      <!-- Tear drop -->
      <path
        d="M 44 52 Q 41 57 44 60 Q 47 57 44 52 Z"
        fill="var(--color-sky-300, #7dd3fc)"
        opacity="0.85"
      />
    {:else if pose === 'sleep'}
      <!-- zZz -->
      <g fill="var(--ink, #1a1a1a)" font-family="ui-rounded, system-ui, sans-serif" font-weight="700" font-style="italic">
        <text x="92" y="22" font-size="13">z</text>
        <text x="100" y="14" font-size="10">z</text>
        <text x="106" y="9" font-size="8">z</text>
      </g>
    {:else if pose === 'error'}
      <!-- Fizzle sparks -->
      <g stroke="var(--pop-berry, #ef4444)" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7">
        <path d="M 5 50 L 12 55"/>
        <path d="M 115 78 L 108 82"/>
        <path d="M 8 95 L 14 92"/>
      </g>
    {/if}
  </g>
</svg>

<style>
  .sparko {
    overflow: visible;
    display: inline-block;
  }

  .sparko-body {
    transform-origin: 62px 70px;
    transform-box: fill-box;
    animation: sparko-idle-float 4s ease-in-out infinite;
    will-change: transform;
  }

  .sparko-shadow {
    transform-origin: 62px 127px;
    transform-box: fill-box;
    animation: sparko-shadow-pulse 4s ease-in-out infinite;
  }

  /* Pose-specific body animations */
  .sparko--wave .sparko-body {
    animation: sparko-wave 1.8s ease-in-out infinite;
    transform-origin: 95px 70px;
  }
  .sparko--celebrate .sparko-body {
    animation: sparko-celebrate 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }
  .sparko--sad .sparko-body {
    animation: sparko-sad 3.5s ease-in-out infinite;
  }
  .sparko--error .sparko-body {
    animation: sparko-error-shake 0.4s ease-in-out infinite;
  }
  .sparko--sleep .sparko-body {
    animation: sparko-sleep-breathe 5s ease-in-out infinite;
  }

  /* Pupil blink (idle/wave only) */
  .sparko--idle .sparko-pupil,
  .sparko--wave .sparko-pupil {
    transform-origin: center;
    transform-box: fill-box;
    animation: sparko-blink 5s ease-in-out infinite;
  }

  /* Keyframes */
  @keyframes sparko-idle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes sparko-shadow-pulse {
    0%, 100% { transform: scaleX(1); opacity: 0.15; }
    50% { transform: scaleX(0.85); opacity: 0.1; }
  }
  @keyframes sparko-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(2.5deg); }
    75% { transform: rotate(-1.5deg); }
  }
  @keyframes sparko-celebrate {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1.04); }
  }
  @keyframes sparko-sad {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(2px) rotate(-1.5deg); }
  }
  @keyframes sparko-error-shake {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-2px) rotate(-3deg); }
    75% { transform: translateX(2px) rotate(3deg); }
  }
  @keyframes sparko-sleep-breathe {
    0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
    50% { transform: translateY(1px) rotate(-3deg) scale(0.98); }
  }
  @keyframes sparko-blink {
    0%, 92%, 96%, 100% { transform: scaleY(1); }
    94% { transform: scaleY(0.1); }
  }

  /* Top sparkle subtle pulse */
  .sparko-top-spark {
    transform-origin: 90px 24px;
    transform-box: fill-box;
    animation: sparko-spark-pulse 2s ease-in-out infinite;
  }
  @keyframes sparko-spark-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.85); opacity: 0.7; }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .sparko-body,
    .sparko-shadow,
    .sparko-pupil,
    .sparko-top-spark {
      animation: none !important;
    }
  }
</style>
