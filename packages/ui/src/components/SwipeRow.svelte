<script lang="ts">
  /**
   * SwipeRow — touch + keyboard swipeable row dengan action revealed.
   *
   * Pattern: child content (any markup) geser ke kiri saat drag horizontal
   * untuk reveal action button absolute di kanan.
   *
   * - Touch drag horizontal di mobile: geser offset, lepas > threshold → reveal
   * - Tap dengan offset > 5px → batalkan navigasi (tidak klik)
   * - Keyboard accessible: Escape menutup reveal
   * - Reduced-motion: tetap jalan (offset=transisi linier)
   *
   * Props:
   *   children: Snippet                — konten yang akan tergeser
   *   threshold?: number               — px drag untuk commit reveal (default 80)
   *   actionLabel: string              — label tombol (default "Aksi")
   *   actionIcon?: string              — icon name (default "zap")
   *   onAction: () => void             — callback saat action ditekan
   */
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  let {
    children,
    threshold = 80,
    actionLabel = "Aksi",
    actionIcon = "zap",
    onAction,
  }: {
    children: Snippet;
    threshold?: number;
    actionLabel?: string;
    actionIcon?: string;
    onAction: () => void;
  } = $props();

  let offset = $state(0);
  let startX = $state(0);
  let isDragging = $state(false);
  let revealed = $state(false);

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    isDragging = true;
  }
  function onTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    if (dx < 0) {
      offset = Math.max(dx, -120);
    } else {
      offset = 0;
      if (revealed) revealed = false;
    }
  }
  function onTouchEnd() {
    isDragging = false;
    if (offset < -threshold) {
      offset = -100;
      revealed = true;
    } else {
      offset = 0;
      revealed = false;
    }
  }
  function close() {
    offset = 0;
    revealed = false;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && revealed) close();
  }
  function onInnerClick(e: MouseEvent) {
    if (Math.abs(offset) > 5) {
      // tap saat swipe-offset → batalkan navigasi
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="relative overflow-hidden rounded-2xl">
  <!-- Action revealed behind row (always present, only visible when row offset) -->
  <div
    class="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 bg-emerald-500 px-5 text-white"
    aria-hidden={!revealed}
  >
    <button
      type="button"
      onclick={onAction}
      class="flex items-center gap-1.5 font-bold"
      tabindex={revealed ? 0 : -1}
      aria-label={actionLabel}
    >
      <Icon name={actionIcon} size={16} stroke={2.4} />
      {actionLabel}
    </button>
  </div>

  <!-- The row (draggable, content translated by offset) -->
  <div
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    onclick={onInnerClick}
    style="transform: translateX({offset}px); transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1); will-change: transform;"
    class="relative z-10 touch-pan-y select-none bg-surface"
  >
    {@render children()}
  </div>
</div>
