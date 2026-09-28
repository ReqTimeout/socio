<script lang="ts">
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";
  import type { Snippet } from "svelte";

  let {
    onclick,
    children,
    label = "Buat Pesanan",
    lgLabel,
    icon = "rocket",
  }: {
    onclick?: () => void;
    children?: Snippet;
    label?: string;
    /** Label alternatif di desktop (default: sama dengan label) */
    lgLabel?: string;
    icon?: string;
  } = $props();

  let rippleKey = $state(0);
  let rippleX = $state(0);
  let rippleY = $state(0);

  function handle(e: MouseEvent) {
    haptic(16);
    if (e.currentTarget instanceof HTMLElement) {
      const r = e.currentTarget.getBoundingClientRect();
      rippleX = e.clientX - r.left;
      rippleY = e.clientY - r.top;
    }
    rippleKey++;
    onclick?.();
  }
</script>

<button
  type="button"
  onclick={handle}
  class="fab-premium group fixed z-50
    inline-flex items-center
    rounded-full
    text-white select-none
    min-h-11"
>
  <!-- soft glow backdrop (standout, cheap blur) -->
  <span
    class="fab-glow pointer-events-none absolute -inset-1 rounded-full -z-10"
    aria-hidden="true"
  ></span>

  <!-- shimmer sweep (elegant, every 3s) -->
  <span
    class="fab-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-full"
    aria-hidden="true"
  >
    <span class="fab-shimmer-bar"></span>
  </span>

  <!-- click ripple -->
  {#if rippleKey > 0}
    {#key rippleKey}
      <span
        class="fab-ripple pointer-events-none absolute rounded-full"
        style="left:{rippleX}px; top:{rippleY}px;"
        aria-hidden="true"
      ></span>
    {/key}
  {/if}

  <!-- icon disc -->
  <span
    class="fab-disc relative grid h-7 w-7 shrink-0 place-items-center rounded-full"
  >
    <span class="fab-icon relative">
      {#if children}
        {@render children()}
      {:else}
        <Icon name={icon} size={14} stroke={2.8} />
      {/if}
    </span>
  </span>

  <!-- label (mobile + desktop variant) -->
  <span
    class="fab-label relative font-display text-[13px] font-extrabold tracking-tight leading-none whitespace-nowrap lg:hidden"
    >{label}</span
  >
  <span
    class="fab-label fab-label-lg relative hidden font-display text-[13px] font-extrabold tracking-tight leading-none whitespace-nowrap lg:inline"
    >{lgLabel ?? label}</span
  >
</button>

<style>
  .fab-premium {
    /* Posisi: mobile melayang di atas dock navigasi */
    right: 12px;
    bottom: calc(108px + env(safe-area-inset-bottom));
    gap: 8px;
    padding: 8px 16px 8px 10px;
    /* Style "pop" konsisten landing/app: fill brand + border tinta + hard shadow */
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%);
    border: 2px solid var(--color-ink-900);
    isolation: isolate;
    overflow: visible;
    will-change: transform;
    box-shadow:
      2px 2px 0 var(--color-ink-900),
      0 10px 24px -10px rgba(79, 70, 229, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
    animation:
      fab-pop 520ms cubic-bezier(0.16, 1, 0.3, 1),
      fab-float 3s ease-in-out 1.2s infinite;
    transition:
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 180ms ease,
      filter 180ms ease;
  }

  .fab-premium:hover {
    transform: translateY(-1px) scale(1.04);
    filter: brightness(1.06);
    box-shadow:
      3px 3px 0 var(--color-ink-900),
      0 14px 30px -10px rgba(79, 70, 229, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }
  .fab-premium:active {
    transform: translate(2px, 2px) scale(0.97);
    box-shadow:
      0 0 0 var(--color-ink-900),
      0 4px 12px -6px rgba(79, 70, 229, 0.4);
    transition-duration: 80ms;
  }
  .fab-premium:focus-visible {
    outline: 2px solid var(--pop-mango, #fbbf24);
    outline-offset: 3px;
  }

  /* Desktop: floating bottom-right, ukuran lebih besar, shadow lebih dalam */
  @media (min-width: 1024px) {
    .fab-premium {
      right: 28px;
      bottom: 28px;
      gap: 10px;
      padding: 12px 22px 12px 14px;
      min-height: 52px;
      box-shadow:
        3px 3px 0 var(--color-ink-900),
        0 16px 36px -12px rgba(79, 70, 229, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.24);
    }
    .fab-premium:hover {
      box-shadow:
        4px 4px 0 var(--color-ink-900),
        0 20px 44px -12px rgba(79, 70, 229, 0.58),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
    .fab-disc {
      width: 34px;
      height: 34px;
    }
    .fab-icon {
      transform: scale(1.15);
    }
    .fab-label-lg {
      font-size: 14.5px;
    }
    .fab-glow {
      filter: blur(11px);
    }
  }

  /* Soft glow — standout without heavy blur cost */
  .fab-glow {
    background: radial-gradient(
      60% 80% at 50% 50%,
      rgba(99, 102, 241, 0.4),
      transparent 70%
    );
    filter: blur(8px);
    opacity: 0.9;
    animation: fab-glow-pulse 2.8s ease-in-out infinite;
  }

  /* Icon disc — chip putih dengan ikon brand (pop) */
  .fab-disc {
    background: #ffffff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      0 1px 4px rgba(15, 23, 42, 0.22);
  }
  .fab-icon {
    color: #4f46e5;
    display: grid;
    place-items: center;
    transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fab-premium:hover .fab-icon {
    transform: rotate(-10deg) scale(1.08);
  }
  .fab-premium:active .fab-icon {
    transform: scale(0.9);
  }

  .fab-label {
    text-shadow: 0 1px 1px rgba(15, 23, 42, 0.28);
    letter-spacing: -0.01em;
  }

  /* Shimmer — every ~3s, GPU-only */
  .fab-shimmer-bar {
    position: absolute;
    inset: 0 auto 0 -60%;
    width: 55%;
    background: linear-gradient(
      105deg,
      transparent 0%,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.58) 50%,
      rgba(255, 255, 255, 0) 70%,
      transparent 100%
    );
    transform: skewX(-18deg);
    animation: fab-shimmer 3s ease-in-out infinite;
    will-change: transform;
  }

  .fab-ripple {
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.6);
    transform: translate(-50%, -50%) scale(1);
    animation: fab-ripple 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fab-pop {
    0% {
      transform: scale(0.35) translateY(16px);
      opacity: 0;
    }
    60% {
      transform: scale(1.06) translateY(-1px);
      opacity: 1;
    }
    85% {
      transform: scale(0.98) translateY(0);
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  /* Lightweight float: tiny Y + brightness, no shadow recalc cost */
  @keyframes fab-float {
    0%,
    100% {
      transform: translateY(0);
      filter: brightness(1);
    }
    50% {
      transform: translateY(-2px);
      filter: brightness(1.06);
    }
  }
  @keyframes fab-glow-pulse {
    0%,
    100% {
      opacity: 0.75;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.06);
    }
  }
  @keyframes fab-shimmer {
    0% {
      transform: translateX(0) skewX(-18deg);
    }
    45% {
      transform: translateX(280%) skewX(-18deg);
    }
    100% {
      transform: translateX(280%) skewX(-18deg);
    }
  }
  @keyframes fab-ripple {
    to {
      transform: translate(-50%, -50%) scale(32);
      opacity: 0;
    }
  }

  /* Respect reduced-motion but keep CTA alive (slower, softer) */
  @media (prefers-reduced-motion: reduce) {
    .fab-premium {
      animation: fab-pop 360ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .fab-glow {
      animation-duration: 4.5s;
      opacity: 0.6;
    }
    .fab-shimmer-bar {
      animation-duration: 4.5s;
      opacity: 0.7;
    }
    .fab-ripple {
      animation-duration: 360ms;
    }
  }
</style>
