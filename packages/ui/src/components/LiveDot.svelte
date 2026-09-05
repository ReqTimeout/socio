<script lang="ts">
  /**
   * LiveDot — pulse indicator + relative timestamp untuk SSE/poll feed.
   *
   * Props:
   *   lastUpdate: Date | string | null   — waktu update terakhir
   *   label?: string                     — "Live" / "Updated" (default: "Live")
   *   variant?: "primary" | "success"    — accent color (default: success)
   *   interval?: number                  — tick interval ms untuk refresh label (default 30s)
   *
   * Behavior:
   *   - Pulse dot anim 1.2s loop (CSS keyframe — no layout thrash)
   *   - Pause pulse + hide timestamp kalau document.visibilityState === 'hidden'
   *   - Update timestamp display tiap `interval` ms (relative: "baru", "Xs lalu", "Xm lalu")
   *   - Honor prefers-reduced-motion (no pulse, no interval)
   */
  let {
    lastUpdate,
    label = "Live",
    variant = "success",
    interval = 30_000,
  }: {
    lastUpdate: Date | string | number | null;
    label?: string;
    variant?: "primary" | "success";
    interval?: number;
  } = $props();

  const dotColor =
    variant === "primary"
      ? "bg-primary shadow-[0_0_0_3px_rgba(79,70,229,0.18)]"
      : "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,163,74,0.18)]";

  let tabVisible = $state(true);
  let now = $state(Date.now());

  function relTime(ts: number, ref: number): string {
    const diff = Math.max(0, ref - ts) / 1000;
    if (diff < 5) return "baru";
    if (diff < 60) return `${Math.floor(diff)}s lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
  }

  const ts = $derived(
    lastUpdate != null
      ? typeof lastUpdate === "number"
        ? lastUpdate
        : new Date(lastUpdate).getTime()
      : null,
  );

  const display = $derived(ts != null ? `Diperbarui ${relTime(ts, now)}` : null);

  $effect(() => {
    if (typeof document === "undefined") return;

    const onVis = () => {
      tabVisible = document.visibilityState === "visible";
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return () => document.removeEventListener("visibilitychange", onVis);

    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      now = Date.now();
    }, interval);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  });
</script>

<span
  class="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase { variant === 'primary' ? 'text-primary' : 'text-emerald-700' }"
  aria-live="polite"
  aria-atomic="true"
>
  <span
    class="relative inline-grid h-2 w-2 place-items-center rounded-full {dotColor} {tabVisible ? 'live-dot-pulse' : ''}"
    aria-hidden="true"
  ></span>
  {#if display}
    <span class="text-ink-500 font-medium tracking-wide">{display}</span>
  {:else}
    <span class="tracking-wide">{label}</span>
  {/if}
</span>

<style>
  /* Pulse: 2 concentric rings expanding outward, 1.2s loop, GPU-only. */
  @keyframes live-dot-pulse-kf {
    0% {
      box-shadow: 0 0 0 0 currentColor;
      transform: scale(1);
    }
    60% {
      box-shadow: 0 0 0 6px transparent;
      transform: scale(1);
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
      transform: scale(1);
    }
  }
  .live-dot-pulse::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 9999px;
    animation: live-dot-pulse-kf 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    color: currentColor;
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .live-dot-pulse::before {
      animation: none;
    }
  }
</style>
