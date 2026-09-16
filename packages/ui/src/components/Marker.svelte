<script lang="ts">
  // Marker (APP V2 M11) — stabilo mango di belakang kata kunci.
  // Swipe scaleX 0→1 450ms sekali saat mount. Reduced-motion = stabilo statis.
  // Contoh: Siang, <Marker>Rina</Marker> ✦ · marker di VIP / profit / level.
  // Budget: teks di atas mango-soft = mango-ink (AA light & dark via remap).
  import type { Snippet } from "svelte";

  let {
    class: className = "",
    children,
  }: {
    class?: string;
    children: Snippet;
  } = $props();
</script>

<span class="marker {className}"><span class="marker__text">{@render children()}</span></span>

<style>
  .marker {
    position: relative;
    display: inline-block;
    padding: 0 0.08em;
    white-space: nowrap;
  }
  .marker::after {
    content: "";
    position: absolute;
    left: -0.06em;
    right: -0.06em;
    top: 12%;
    bottom: 6%;
    background: var(--pop-mango-soft);
    border-radius: 3px;
    transform: scaleX(0);
    transform-origin: 0 50%;
    animation: marker-swipe 450ms var(--ease-out-soft) 100ms both;
  }
  .marker__text {
    position: relative;
    z-index: 1;
    color: var(--pop-mango-ink);
  }
  @keyframes marker-swipe {
    to {
      transform: scaleX(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .marker::after {
      animation: none;
      transform: scaleX(1);
    }
  }
</style>
