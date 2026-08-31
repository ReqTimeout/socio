<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  // Live counters - animates like real SMM dashboard
  const followers = tweened(12480, { duration: 1800, easing: cubicOut });
  const likes = tweened(8920, { duration: 1800, easing: cubicOut });
  const views = tweened(45.2, { duration: 1800, easing: cubicOut });

  let activePlatform = $state(0);
  const platforms = [
    { name: 'Instagram', handle: '@tokokue_enak', delta: '+1.250', icon: '📸', color: 'from-pink-500 to-rose-500' },
    { name: 'TikTok', handle: '@tokokue_enak', delta: '+12.8K', icon: '🎵', color: 'from-zinc-900 to-zinc-700' },
    { name: 'YouTube', handle: 'Toko Kue Enak', delta: '+3.4K', icon: '▶️', color: 'from-red-500 to-red-600' },
  ];

  onMount(() => {
    // Animate counters after mount
    setTimeout(() => {
      followers.set(13730);
      likes.set(9210);
      views.set(52.8);
    }, 600);

    // Rotate platform highlight
    const id = setInterval(() => {
      activePlatform = (activePlatform + 1) % platforms.length;
    }, 2200);
    return () => clearInterval(id);
  });

  const fmt = (n: number) => n.toLocaleString('id-ID');
</script>

<div class="relative mx-auto w-[320px] sm:w-[360px] lg:w-[380px]">
  <!-- Glow behind -->
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-[60px] pointer-events-none"></div>

  <!-- Phone frame -->
  <div
    class="relative bg-white rounded-[2.2rem] border-[10px] border-ink-900 shadow-2xl shadow-primary-900/30 overflow-hidden"
  >
    <!-- Notch -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-ink-900 rounded-b-xl z-20"></div>

    <!-- App header -->
    <div class="bg-gradient-to-r from-primary to-accent px-4 pt-7 pb-3 flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-white flex items-center justify-center font-display font-black text-primary text-sm">S</div>
      <div class="flex-1 min-w-0">
        <p class="text-white font-bold text-sm leading-none">Socio.id</p>
        <p class="text-white/80 text-[10px] flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
          Live · Panel SMM
        </p>
      </div>
      <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">🔔</div>
    </div>

    <!-- Profile card - animating follower count -->
    <div class="p-3 bg-ink-50">
      <div class="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-ink-100">
        <img
          src="https://i.pravatar.cc/100?img=32"
          alt="avatar"
          class="w-10 h-10 rounded-full object-cover"
          loading="lazy"
        />
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-ink-900 leading-none truncate">{platforms[activePlatform].handle}</p>
          <p class="text-[11px] text-ink-500">{platforms[activePlatform].name}</p>
        </div>
        <div class="text-right">
          <p class="font-display font-black text-sm text-ink-900 leading-none tabular-nums">
            {fmt(Math.round($followers))}
          </p>
          <p class="text-[10px] font-bold text-success">{$followers > 12480 ? '+1.250' : ''} followers</p>
        </div>
      </div>
    </div>

    <!-- Platform pills -->
    <div class="px-3 flex gap-1.5">
      {#each platforms as p, i}
        <button
          class="flex-1 rounded-full px-2 py-1.5 text-[10px] font-bold transition-all flex items-center justify-center gap-1
            {activePlatform === i ? 'bg-ink-900 text-white shadow-md' : 'bg-ink-100 text-ink-500'}"
        >
          <span>{p.icon}</span> {p.name.split(' ')[0]}
        </button>
      {/each}
    </div>

    <!-- Live order status -->
    <div class="p-3 space-y-2">
      <p class="text-[10px] font-bold uppercase tracking-widest text-ink-400 px-1">Pesanan Terakhir</p>
      {#each [
        { id: '#SOC-88231', service: 'IG Followers 1K', qty: '1.000', status: 'Selesai', color: 'bg-success', time: '2m lalu' },
        { id: '#SOC-88230', service: 'TikTok Views 10K', qty: '10.000', status: 'Proses', color: 'bg-amber-500', time: '5m lalu' },
        { id: '#SOC-88229', service: 'YT Likes 500', qty: '500', status: 'Pending', color: 'bg-ink-400', time: 'baru' },
      ] as row}
        <div class="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-ink-100 shadow-sm">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-ink-800 truncate">{row.service}</p>
            <p class="text-[11px] text-ink-400 font-mono">{row.id} · {row.qty} · {row.time}</p>
          </div>
          <span class="shrink-0 text-[10px] font-bold text-white px-2.5 py-1 rounded-full {row.color}">{row.status}</span>
        </div>
      {/each}
    </div>

    <!-- Saldo bar -->
    <div class="mx-3 mb-3 bg-gradient-to-r from-primary to-accent rounded-2xl p-3 flex items-center justify-between text-white">
      <div>
        <p class="text-[10px] opacity-80 uppercase tracking-wide font-bold">Saldo</p>
        <p class="font-display font-black text-sm tabular-nums">Rp 247.500</p>
      </div>
      <div class="bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full">+ Top Up</div>
    </div>
  </div>

  <!-- Floating metrics - desktop only, hidden on small mobile to avoid clutter -->
  <div class="hidden sm:block absolute -right-4 top-8 bg-white rounded-2xl shadow-xl border border-ink-100 px-3 py-2.5 min-w-[140px] animate-[floatSlow_4s_ease-in-out_infinite]">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-sm">❤️</div>
      <div>
        <p class="text-[10px] font-bold text-ink-400 uppercase tracking-wide">Likes</p>
        <p class="font-display font-black text-sm tabular-nums text-ink-900">{fmt(Math.round($likes))}</p>
      </div>
      <span class="ml-auto text-[10px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded-full">+290</span>
    </div>
  </div>

  <div class="hidden sm:block absolute -left-6 bottom-20 bg-white rounded-2xl shadow-xl border border-ink-100 px-3 py-2.5 min-w-[150px] animate-[floatSlow_4s_ease-in-out_infinite_1s]">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm">▶️</div>
      <div>
        <p class="text-[10px] font-bold text-ink-400 uppercase tracking-wide">Views</p>
        <p class="font-display font-black text-sm tabular-nums text-ink-900">{($views).toFixed(1)}K</p>
      </div>
      <span class="ml-auto text-[10px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded-full">+7.6K</span>
    </div>
  </div>
</div>

<style>
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
</style>
