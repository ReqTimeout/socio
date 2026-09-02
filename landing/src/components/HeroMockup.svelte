<script lang="ts">
  // D2: HeroMockup — live dashboard mockup §3g.0 (pola haloka, di-level-up)
  // CSS murni, no chrome dots, no emoji, no external image. Reduced-motion → state final.
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const saldo = tweened(0, { duration: 1800, easing: cubicOut });
  const followers = tweened(12480, { duration: 1800, easing: cubicOut });

  let activePlatform = $state(0);
  let orderRows = $state([
    { id: '#88232', service: 'Spotify Plays', qty: '5.000', status: 'Diproses', cls: 'status-live' },
    { id: '#88231', service: 'IG Followers', qty: '1.000', status: 'Selesai', cls: 'status-done' },
    { id: '#88230', service: 'TikTok Views', qty: '10.000', status: 'Diproses', cls: 'status-live' },
    { id: '#88229', service: 'YT Likes', qty: '500', status: 'Diproses', cls: 'status-live' },
  ]);
  let saldoDelta = $state('');

  const platforms = [
    { name: 'Instagram', handle: '@tokokue_enak', color: '#e1306c' },
    { name: 'TikTok', handle: '@tokokue_enak', color: '#111827' },
    { name: 'YouTube', handle: 'Toko Kue Enak', color: '#dc2626' },
  ];

  const streamPool = [
    { service: 'Telegram Members', qty: '500' },
    { service: 'Spotify Plays', qty: '5.000' },
    { service: 'IG Reels Views', qty: '25.000' },
    { service: 'TikTok Likes', qty: '2.000' },
    { service: 'X Followers', qty: '1.000' },
  ];

  const fmt = (n: number) => Math.round(n).toLocaleString('id-ID');

  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // state final — tanpa animasi (plan §3g.0: pause total)
      saldo.set(247500, { duration: 0 });
      followers.set(13730, { duration: 0 });
      return;
    }

    followers.set(13730);
    saldo.set(247500);

    // Platform rotate 2.4s
    const rotId = setInterval(() => {
      activePlatform = (activePlatform + 1) % platforms.length;
    }, 2400);

    // Order stream: row baru tiap 2.5s — selalu 4 baris (init 4, replace bukan grow → no CLS)
    let seq = 88233;
    const ordId = setInterval(() => {
      const p = streamPool[seq % streamPool.length];
      orderRows = [
        { id: `#${seq++}`, service: p.service, qty: p.qty, status: 'Diproses', cls: 'status-live' },
        ...orderRows.slice(0, 3),
      ];
    }, 2500);

    // Saldo "jalan sendiri" tiap 8s
    const salId = setInterval(() => {
      saldoDelta = '+Rp3.500';
      setTimeout(() => (saldoDelta = ''), 2200);
    }, 8000);

    return () => { clearInterval(rotId); clearInterval(ordId); clearInterval(salId); };
  });
</script>

<div class="relative mx-auto w-[300px] sm:w-[340px] lg:w-[360px]">
  <!-- Glow breathing — decorative, bukan LCP, pointer-events-none -->
  <div
    class="glow"
    aria-hidden="true"
  ></div>

  <!-- Phone frame: dark-ink border, entrance rotateY sekali -->
  <div class="phone-frame">
    <!-- App header — seperti app socio asli -->
    <div class="header-bar">
      <div class="logo-dot">S</div>
      <div class="min-w-0 flex-1">
        <p class="text-[13px] font-bold leading-none text-white">Socio.id</p>
        <p class="mt-1 flex items-center gap-1.5 text-[10px] text-white/75">
          <span class="live-dot-sm" aria-hidden="true"></span> Live · Panel SMM
        </p>
      </div>
      <span class="text-[10px] font-bold text-white/90 bg-white/15 rounded-full px-2.5 py-1">Agen</span>
    </div>

    <!-- Saldo card — tweened count-up + delta badge -->
    <div class="saldo-card">
      <div>
        <p class="text-[9px] font-bold uppercase tracking-widest opacity-75">Saldo</p>
        <p class="saldo-num num">Rp {fmt($saldo)}</p>
      </div>
      {#if saldoDelta}
        <span class="delta-badge">{saldoDelta}</span>
      {/if}
    </div>

    <!-- Follower metric — platform rotate -->
    <div class="px-3 pt-3">
      <div class="follow-card">
        <span class="platform-glyph" style="background: {platforms[activePlatform].color}" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
            {#if activePlatform === 0}
              <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.5" fill="white" />
            {:else if activePlatform === 1}
              <path d="M9.5 8.5v7l6-3.5-6-3.5Z" /><path d="M4 8c0-2.2 1.8-4 4-4" opacity="0" />
            {:else}
              <path d="M4 6h16v12H4z" /><path d="M10 9.5v5l4-2.5-4-2.5Z" />
            {/if}
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-bold leading-none text-ink">{platforms[activePlatform].handle}</p>
          <p class="mt-1 text-[10px] text-ink-3">{platforms[activePlatform].name}</p>
        </div>
        <div class="text-right">
          <p class="num text-[13px] font-extrabold leading-none text-ink">{fmt($followers)}</p>
          <p class="mt-1 text-[9px] font-bold text-[var(--color-success)]">+1.250 followers</p>
        </div>
      </div>
      <!-- Platform pills -->
      <div class="mt-2 flex gap-1.5" aria-label="Platform demo">
        {#each platforms as p, i}
          <span
            class="pill {activePlatform === i ? 'pill-on' : ''}"
            style={activePlatform === i ? `background: color-mix(in oklab, ${p.color} 75%, var(--dark-panel) 25%)` : ''}
            aria-hidden="true"
          >{p.name}</span>
        {/each}
      </div>
    </div>

    <!-- Order stream -->
    <div class="px-3 pt-3 pb-3">
      <p class="mb-2 px-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-3">Order berjalan</p>
      <div class="order-list">
        {#each orderRows as row (row.id)}
          <div class="order-row">
            <div class="min-w-0 flex-1">
              <p class="truncate text-[11px] font-bold leading-none text-ink">{row.service}</p>
              <p class="num mt-1 text-[9px] leading-none text-ink-3">
                <span class="font-semibold">{row.id}</span> · {row.qty}
              </p>
            </div>
            <span class="chip {row.cls}">
              {#if row.cls === 'status-done'}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
              {:else}
                <span class="mini-dot" aria-hidden="true"></span>
              {/if}
              {row.status}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Floating metric cards — desktop only, floatSlow offset delay -->
  <div class="float-card float-right" aria-hidden="true">
    <span class="glyph" style="background: var(--color-success)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11.5V7a2 2 0 0 1 4 0v3m0-1.5v6m4-6.5v9m-8-4v2a5 5 0 0 0 9 3l3.5-6a1.8 1.8 0 0 0-3-1.9L14 13.5" /></svg>
    </span>
    <div>
      <p class="text-[9px] font-bold uppercase tracking-widest text-ink-3">Refill</p>
      <p class="num text-[13px] font-extrabold text-ink">98,2%</p>
    </div>
  </div>
  <div class="float-card float-left" aria-hidden="true">
    <span class="glyph" style="background: var(--accent-ink)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" /></svg>
    </span>
    <div>
      <p class="text-[9px] font-bold uppercase tracking-widest text-ink-3">Mulai</p>
      <p class="num text-[13px] font-extrabold text-ink">Rp42/1k</p>
    </div>
  </div>
</div>

<style>
  .glow {
    position: absolute;
    top: 50%; left: 50%;
    width: 400px; height: 400px;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, oklch(0.68 0.13 220 / 0.22), transparent 65%);
    filter: blur(48px);
    pointer-events: none;
    animation: glow-breathe 6s ease-in-out infinite;
  }
  @keyframes glow-breathe { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

  .phone-frame {
    position: relative;
    background: var(--paper);
    border-radius: 2rem;
    border: 9px solid var(--ink);
    overflow: hidden;
    box-shadow: 0 24px 60px -20px rgb(15 23 42 / 0.35);
    animation: frame-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes frame-in {
    from { opacity: 0; transform: perspective(1200px) rotateY(-8deg) translateY(12px); }
    to { opacity: 1; transform: perspective(1200px) rotateY(0) translateY(0); }
  }

  .header-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px 10px;
    background: linear-gradient(135deg, var(--ink), var(--dark-panel-2));
  }
  .logo-dot {
    width: 30px; height: 30px; border-radius: 9999px;
    display: grid; place-items: center;
    background: var(--accent-ink); color: white;
    font-weight: 800; font-size: 13px;
  }
  .live-dot-sm {
    width: 5px; height: 5px; border-radius: 9999px;
    background: #4ade80;
    animation: pulse 1.6s ease-in-out infinite;
    display: inline-block;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

  .saldo-card {
    margin: 12px;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--dark-panel);
    color: white;
    border-radius: 14px;
    padding: 10px 14px;
  }
  .saldo-num { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
  .delta-badge {
    font-size: 10px; font-weight: 700;
    background: #4ade80; color: var(--dark-panel);
    padding: 2px 8px; border-radius: 9999px;
    animation: pop-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes pop-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  .follow-card {
    display: flex; align-items: center; gap: 10px;
    background: white;
    border: 1px solid var(--hairline);
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  }
  .platform-glyph {
    width: 28px; height: 28px; border-radius: 8px;
    display: grid; place-items: center;
    flex-shrink: 0;
    transition: background 200ms;
  }
  .pill {
    flex: 1; text-align: center;
    font-size: 10px; font-weight: 700;
    padding: 5px 0;
    border-radius: 9999px;
    background: var(--paper-2);
    color: var(--ink-2);
    transition: background 200ms, color 200ms;
  }
  .pill-on { color: white; }

  .order-row {
    display: flex; align-items: center; gap: 8px;
    background: white;
    border: 1px solid var(--hairline);
    border-radius: 10px;
    padding: 8px 10px;
    animation: slide-down 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 9px; font-weight: 700;
    padding: 3px 8px;
    border-radius: 9999px;
    flex-shrink: 0;
  }
  .status-done { background: var(--color-success-soft); color: var(--color-success); }
  .status-live { background: var(--color-warning-soft); color: var(--color-warning); }
  .mini-dot {
    width: 4px; height: 4px; border-radius: 9999px;
    background: currentColor;
    animation: pulse 1.6s ease-in-out infinite;
  }

  .float-card {
    position: absolute;
    display: none;
    align-items: center; gap: 8px;
    background: white;
    border: 1px solid var(--hairline);
    border-radius: 12px;
    padding: 8px 12px;
    box-shadow: 0 12px 32px -12px rgb(15 23 42 / 0.2);
    animation: float-slow 4s ease-in-out infinite;
  }
  @media (min-width: 640px) { .float-card { display: flex; } }
  .float-right { top: 24px; right: -18px; }
  .float-left { bottom: 88px; left: -24px; animation-delay: 1s; }
  @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

  @media (prefers-reduced-motion: reduce) {
    .glow, .phone-frame, .order-row, .delta-badge, .live-dot-sm, .mini-dot, .float-card {
      animation: none !important;
    }
  }
</style>
