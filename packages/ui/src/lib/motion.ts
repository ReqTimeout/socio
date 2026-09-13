// @socio/ui — Motion helpers (reusable craft layer)
// Token-driven. Pairs with --ease-out-soft / --ease-out-quad in tokens.css.

import { tweened } from "svelte/motion";
import { cubicOut, backOut } from "svelte/easing";

export interface StaggerInOpts {
  y?: number;
  x?: number;
  duration?: number;
  /** per-index delay step in ms */
  step?: number;
  /** base delay before the first item in ms */
  base?: number;
}

/**
 * Build `in:fly` (or `in:fade`/`in:scale`) params for a staggered list.
 *   {#each items as item, i (item.id)}<div in:fly={staggerIn(i)}>...
 */
export function staggerIn(
  i: number,
  opts: StaggerInOpts = {},
): {
  y: number;
  x: number;
  duration: number;
  delay: number;
} {
  const { y = 12, x = 0, duration = 300, step = 60, base = 0 } = opts;
  return { y, x, duration, delay: base + i * step };
}

/**
 * CSS var string for `.reveal` stagger (admin pages).
 *   <div class="reveal" style={revealDelay(i, 120, 60)}>...
 */
export function revealDelay(i: number, base = 0, step = 60): string {
  return `--d:${base + i * step}ms`;
}

export interface TweenNumberOpts {
  duration?: number;
  easing?: (t: number) => number;
}

/**
 * Tweened numeric store, rounded (for currency/IDs/quantities).
 * Default 700ms cubicOut — matches the Command Center "hero moment".
 *   const balance = tweenNumber(0);
 *   $effect(() => balance.set(data.user.balance));
 *   <span>{$balance}</span>
 */
export function tweenNumber(initial = 0, opts: TweenNumberOpts = {}) {
  const { duration = 700, easing = cubicOut } = opts;
  return tweened(initial, {
    duration,
    easing,
    interpolate: (a, b) => (t) => Math.round(a + (b - a) * t),
  });
}

/**
 * Consistent utility-surface hover lift (transform + shadow only, 180ms).
 * Alias untuk `.card-lift` (primitives.css): layered shadow, hover -3px,
 * tactile press. Jangan tambah shadow/hover utility lain di elemen yang sama.
 */
export const hoverLift = "card-lift";

export interface PopInOpts {
  /** base delay before the first item in ms */
  base?: number;
  /** per-index delay step in ms */
  step?: number;
  /** duration in ms (default = --dur-pop 400) */
  duration?: number;
}

/**
 * Build `in:scale` params for sticker/chip/mascot pop entrance (F0).
 * Pasangan JS dari token --ease-spring (CSS) — pakai backOut (spring 1 overshoot).
 *   {#each items as item, i (item.id)}<div in:scale={popIn(i)}>...
 * Hormati reduced-motion di call-site (skip transisi bila reduce).
 */
export function popIn(
  i: number,
  opts: PopInOpts = {},
): {
  delay: number;
  duration: number;
  easing: (t: number) => number;
  start: number;
  opacity: number;
} {
  const { base = 0, step = 60, duration = 400 } = opts;
  return {
    delay: base + i * step,
    duration,
    easing: backOut,
    start: 0.8,
    opacity: 0,
  };
}
