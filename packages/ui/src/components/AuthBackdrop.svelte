<script lang="ts">
  /**
   * AuthBackdrop — mesh + orbs + SVG micro-art (GPU only: transform/opacity/blur).
   * Varian: default (login), member, reseller. Reseller pakai aksen amber.
   */
  let {
    playful = false,
    variant = "default" as "default" | "member" | "reseller",
  }: { playful?: boolean; variant?: "default" | "member" | "reseller" } = $props();

  const isReseller = $derived(variant === "reseller");
</script>

<div
  aria-hidden="true"
  class="auth-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
  class:playful
  class:reseller={isReseller}
>
  <!-- mesh -->
  <div class="mesh"></div>

  <!-- orbs -->
  <div class="orb orb-a"></div>
  <div class="orb orb-b"></div>
  <div class="orb orb-c"></div>

  <!-- subtle dot grid (static) -->
  <svg class="grid-dots" width="100%" height="100%" aria-hidden="true">
    <defs>
      <pattern id="auth-dots" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.1" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#auth-dots)" />
  </svg>

  <!-- SVG micro-art — floating shapes (CSS animated, no JS) -->
  <div class="art">
    <!-- rocket (login/member) / crown (reseller) -->
    <div class="art-item art-1">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        {#if isReseller}
          <!-- crown -->
          <path d="M6 26L4 10l8 6 6-8 6 8 8-6-2 16H6z" fill="rgba(245,158,11,0.16)" stroke="rgba(245,158,11,0.42)" stroke-width="1.2" stroke-linejoin="round" />
          <circle cx="18" cy="8.5" r="2.2" fill="rgba(245,158,11,0.9)" />
        {:else}
          <!-- rocket -->
          <path d="M18 3C18 3 28 9 28 18c0 5-4 9-10 12C12 27 8 23 8 18 8 9 18 3 18 3z" fill="rgba(99,102,241,0.14)" stroke="rgba(99,102,241,0.38)" stroke-width="1.2" />
          <circle cx="18" cy="17" r="3.2" fill="white" opacity="0.9" />
          <path d="M13 26l5-3 5 3-2 5h-6l-2-5z" fill="rgba(99,102,241,0.22)" />
        {/if}
      </svg>
    </div>
    <div class="art-item art-2">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="22" height="14" rx="4" fill="white" opacity="0.78" stroke="rgba(15,23,42,0.08)" />
        <rect x="7" y="11" width="10" height="2.5" rx="1.2" fill="rgba(99,102,241,0.9)" />
        <rect x="7" y="15" width="7" height="2" rx="1" fill="rgba(15,23,42,0.12)" />
        <circle cx="20.5" cy="14" r="3" fill="rgba(6,182,212,0.18)" stroke="rgba(6,182,212,0.36)" />
      </svg>
    </div>
    <div class="art-item art-3">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        {#if isReseller}
          <path d="M15 4l3 7h7l-5.5 4 2 7L15 18l-6.5 4 2-7L5 11h7L15 4z" fill="rgba(245,158,11,0.18)" stroke="rgba(245,158,11,0.45)" stroke-linejoin="round" />
        {:else}
          <path d="M4 22L11 9l4 6 5-4 4 8H4z" fill="none" stroke="rgba(6,182,212,0.5)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="24" cy="13" r="2.5" fill="white" stroke="rgba(6,182,212,0.5)" />
        {/if}
      </svg>
    </div>
    <div class="art-item art-4">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <circle cx="13" cy="13" r="9" fill="white" opacity="0.72" stroke="rgba(15,23,42,0.08)" />
        <path d="M9 13l3 3 5-6" stroke="rgba(22,163,74,0.85)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </svg>
    </div>
  </div>

  <!-- grain -->
  <div class="grain"></div>
</div>

<style>
  .auth-backdrop {
    background: #f8fafc;
    color: rgba(15,23,42,0.14);
  }
  .auth-backdrop.reseller {
    color: rgba(245,158,11,0.14);
  }
  .mesh {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(55% 60% at 20% 15%, rgba(79,70,229,0.16), transparent 60%),
      radial-gradient(45% 50% at 85% 20%, rgba(6,182,212,0.14), transparent 55%),
      radial-gradient(60% 50% at 50% 95%, rgba(79,70,229,0.08), transparent 60%),
      linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    background-size: 160% 160%, 140% 140%, 160% 160%, 100% 100%;
    animation: meshDrift 18s ease-in-out infinite;
    will-change: background-position;
  }
  .reseller .mesh {
    background:
      radial-gradient(55% 60% at 20% 15%, rgba(245,158,11,0.18), transparent 60%),
      radial-gradient(45% 50% at 85% 20%, rgba(6,182,212,0.12), transparent 55%),
      radial-gradient(60% 50% at 50% 95%, rgba(245,158,11,0.10), transparent 60%),
      linear-gradient(180deg, #fffbeb 0%, #f8fafc 100%);
    background-size: 160% 160%, 140% 140%, 160% 160%, 100% 100%;
  }
  .orb {
    position: absolute;
    border-radius: 9999px;
    filter: blur(18px);
    opacity: 0.55;
    will-change: transform, opacity;
  }
  .orb-a {
    width: 220px; height: 220px;
    left: -30px; top: 8%;
    background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.9), rgba(99,102,241,0.0) 70%);
    animation: floatA 9s ease-in-out infinite;
  }
  .orb-b {
    width: 180px; height: 180px;
    right: -20px; top: 28%;
    background: radial-gradient(circle at 30% 30%, rgba(6,182,212,0.9), rgba(6,182,212,0.0) 70%);
    animation: floatB 11s ease-in-out infinite;
  }
  .orb-c {
    width: 260px; height: 260px;
    left: 18%; bottom: -40px;
    background: radial-gradient(circle at 30% 30%, rgba(167,139,250,0.55), rgba(167,139,250,0.0) 70%);
    animation: floatC 13s ease-in-out infinite;
  }
  .reseller .orb-a {
    background: radial-gradient(circle at 30% 30%, rgba(245,158,11,0.85), rgba(245,158,11,0.0) 70%);
  }
  .grid-dots {
    position: absolute;
    inset: 0;
    color: rgba(15,23,42,0.06);
    opacity: 0.7;
  }
  .reseller .grid-dots {
    color: rgba(245,158,11,0.08);
  }
  .art {
    position: absolute;
    inset: 0;
  }
  .art-item {
    position: absolute;
    filter: drop-shadow(0 4px 12px rgba(15,23,42,0.08));
    will-change: transform;
    opacity: 0.95;
  }
  .art-1 { left: 6%; top: 14%; animation: artFloat1 7s ease-in-out infinite; }
  .art-2 { right: 8%; top: 18%; animation: artFloat2 8.5s ease-in-out infinite; }
  .art-3 { left: 12%; bottom: 18%; animation: artFloat3 9s ease-in-out infinite; }
  .art-4 { right: 14%; bottom: 22%; animation: artFloat4 7.5s ease-in-out infinite; }

  .grain {
    position: absolute;
    inset: 0;
    opacity: 0.05;
    background:
      radial-gradient(circle at 30% 20%, white, transparent 40%),
      radial-gradient(circle at 80% 10%, white, transparent 35%);
    mix-blend-mode: overlay;
  }

  .playful .mesh { animation-duration: 14s; }
  .playful .orb-a { animation-duration: 7s; }
  .playful .orb-b { animation-duration: 8.5s; }
  .playful .orb-c { animation-duration: 10s; }

  @keyframes meshDrift {
    0%, 100% { background-position: 0% 50%, 100% 0%, 50% 100%, 0% 0%; }
    50%      { background-position: 100% 50%, 0% 100%, 40% 80%, 0% 0%; }
  }
  @keyframes floatA {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
    50%      { transform: translate(12px, -10px) scale(1.06); opacity: 0.75; }
  }
  @keyframes floatB {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
    50%      { transform: translate(-10px, 14px) scale(1.08); opacity: 0.7; }
  }
  @keyframes floatC {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
    50%      { transform: translate(8px, -12px) scale(1.05); opacity: 0.6; }
  }
  @keyframes artFloat1 {
    0%, 100% { transform: translate(0,0) rotate(-2deg); }
    50%      { transform: translate(6px,-8px) rotate(2deg); }
  }
  @keyframes artFloat2 {
    0%, 100% { transform: translate(0,0) rotate(1deg); }
    50%      { transform: translate(-7px,6px) rotate(-1.5deg); }
  }
  @keyframes artFloat3 {
    0%, 100% { transform: translate(0,0) rotate(1.5deg); }
    50%      { transform: translate(5px,-6px) rotate(-1deg); }
  }
  @keyframes artFloat4 {
    0%, 100% { transform: translate(0,0) rotate(-1deg); }
    50%      { transform: translate(-6px,7px) rotate(1.5deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .mesh { animation-duration: 28s; }
    .orb-a, .orb-b, .orb-c { animation-duration: 20s; opacity: 0.35; }
    .art-item { animation-duration: 16s !important; }
  }
  @media (max-width: 640px) {
    .art-1, .art-2 { opacity: 0.7; }
    .art-3, .art-4 { opacity: 0.5; }
  }
</style>
