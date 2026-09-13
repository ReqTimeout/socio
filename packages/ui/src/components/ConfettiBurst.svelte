<script lang="ts">
  // ConfettiBurst (F0) — ledakan konfeti 1× per trigger (sukses, copy, top-up).
  // Vanilla WAAPI, <3KB, tanpa dependensi. 24-36 partikel, 1.2s, sekali jalan.
  // Reduced-motion / tab hidden → no-op (hasil aksi tetap tampil normal).
  // Pakai: <span class="relative"><ConfettiBurst fire={n} />...tombol...</span>
  import { onMount } from "svelte";

  let { fire = 0 }: { fire?: number } = $props();

  let host: HTMLElement | null = $state(null);
  let lastFire = 0;
  const COLORS = [
    "var(--color-mango-400)",
    "var(--color-accent-500)",
    "var(--color-success)",
    "var(--color-primary-500)",
  ];
  const reduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  function burst() {
    if (reduced || !host || document.visibilityState === "hidden") return;
    const n = 24 + Math.floor(Math.random() * 13);
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;
      const rot = (Math.random() - 0.5) * 540;
      const size = 5 + Math.random() * 6;
      p.style.cssText = [
        "position:absolute",
        "left:50%",
        "top:50%",
        "pointer-events:none",
        `width:${size}px`,
        `height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px`,
        `background:${COLORS[i % COLORS.length]}`,
        `border-radius:${Math.random() > 0.6 ? "50%" : "2px"}`,
        "opacity:1",
      ].join(";");
      host.appendChild(p);
      const anim = p.animate(
        [
          { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 60}px)) rotate(${rot}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 900 + Math.random() * 300,
          easing: "cubic-bezier(0.16,1,0.3,1)",
        },
      );
      anim.onfinish = () => p.remove();
    }
  }

  $effect(() => {
    if (fire !== lastFire) {
      lastFire = fire;
      if (fire > 0) burst();
    }
  });

  onMount(() => {
    lastFire = fire;
  });
</script>

<span bind:this={host} class="confetti-host" aria-hidden="true"></span>

<style>
  .confetti-host {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }
</style>
