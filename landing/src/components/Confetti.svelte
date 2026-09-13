<script>
  // Confetti burst — A9 vanilla, <3KB, no lib (PLAN inventory).
  // 24-36 partikel div, physics sederhana (translate+rotate+fade), 1.2s,
  // sekali per interaksi. Warna: pop-mango / accent / pop-berry / ink.
  // Reduced-motion / tab hidden → tidak muncul (fallback: toast tetap jalan).
  // Pakai: <Confetti /> + panggil burst() via bind, atau prop `fire` counter.
  import { onMount } from 'svelte';

  let { fire = 0 } = $props();

  let host;
  let lastFire = 0;
  const COLORS = ['var(--pop-mango)', 'var(--accent)', 'var(--pop-berry)', 'var(--ink)'];
  const reduced =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  function burst() {
    if (reduced || !host || document.visibilityState === 'hidden') return;
    const n = 24 + Math.floor(Math.random() * 13); // 24-36
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40; // bias ke atas
      const rot = (Math.random() - 0.5) * 540;
      const size = 5 + Math.random() * 6;
      p.style.cssText = [
        'position:absolute',
        'left:50%',
        'top:50%',
        'pointer-events:none',
        `width:${size}px`,
        `height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px`,
        `background:${COLORS[i % COLORS.length]}`,
        `border-radius:${Math.random() > 0.6 ? '50%' : '2px'}`,
        'opacity:1',
      ].join(';');
      host.appendChild(p);
      const anim = p.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 60}px)) rotate(${rot}deg)`,
            opacity: 0,
          },
        ],
        { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(0.16,1,0.3,1)' },
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
