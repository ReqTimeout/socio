<script>
  // LiveOrderToast — V2 §5.3 / wireframe §1.3: toast "order masuk" desktop.
  // A12 slide-in, 1 toast / 25-40s jitter, max 3 per sesi.
  // SKIP jika: reduced-motion, layar <1024px, tab hidden, scroll > 60%.
  // Pure Svelte island, client:visible. Data snapshot statis (no runtime fetch —
  // landing statis Cloudflare Pages).
  import { onMount } from 'svelte';

  const pool = [
    { detail: '1.000 TikTok Views', city: 'Solo' },
    { detail: '500 IG Followers', city: 'Bandung' },
    { detail: '2.000 YT Views', city: 'Surabaya' },
    { detail: '300 Telegram Members', city: 'Medan' },
    { detail: '5.000 Spotify Plays', city: 'Jakarta' },
    { detail: '250 FB Likes', city: 'Yogya' },
  ];

  let toast = $state(null);
  let shown = 0;
  let timers = [];

  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktop = matchMedia('(min-width: 1024px)').matches;
    if (reduced || !desktop) return;

    let i = Math.floor(Math.random() * pool.length);
    let first = true;
    const schedule = () => {
      if (shown >= 3 || document.visibilityState === 'hidden') return;
      // toast pertama cepat (8-12s) supaya pengunjung lihat panel ini hidup;
      // setelahnya 25-40s jitter.
      const delay = first ? 8000 + Math.random() * 4000 : 25000 + Math.random() * 15000;
      first = false;
      timers.push(
        setTimeout(() => {
          const doc = document.documentElement;
          const scrolled = window.scrollY / (doc.scrollHeight - innerHeight || 1);
          if (scrolled > 0.6 || document.visibilityState === 'hidden') {
            schedule();
            return;
          }
          i = (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
          toast = pool[i];
          shown += 1;
          timers.push(
            setTimeout(() => {
              toast = null;
              schedule();
            }, 4000),
          );
        }, delay),
      );
    };
    schedule();
    return () => timers.forEach(clearTimeout);
  });
</script>

{#if toast}
  <div
    class="toast-in fixed bottom-24 left-5 z-50 hidden max-w-[280px] rounded-2xl border border-[var(--pop-mango)] bg-[var(--dark-panel)] p-3.5 shadow-xl lg:block"
    role="status"
    aria-live="polite"
  >
    <p class="flex items-center gap-1.5 text-[12px] font-bold text-[var(--pop-mango)]">
      <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true"></span>
      Order masuk
    </p>
    <p class="num mt-1 text-[13px] font-semibold text-[var(--on-dark)]">
      {toast.detail} · {toast.city}
    </p>
  </div>
{/if}

<style>
  .toast-in {
    animation: toast-in 400ms var(--ease-dramatic) both;
  }
  @keyframes toast-in {
    from {
      transform: translateX(110%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast-in {
      animation: none;
    }
  }
</style>
