<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { fade, fly, scale } from 'svelte/transition';

  // Estimasi pengeluaran jika beli "jasa mahal" vs Socio.id
  let followersNeeded = 1000;

  $: manualPrice = followersNeeded * 45; // Rp45/1 follower di jasa mahal
  $: socioPrice = Math.ceil((followersNeeded / 1000) * 18); // Rp18/1k di Socio.id
  $: saved = manualPrice - socioPrice;

  const animatedManual = tweened(0, { duration: 500, easing: cubicOut });
  const animatedSocio = tweened(0, { duration: 500, easing: cubicOut });

  $: animatedManual.set(manualPrice);
  $: animatedSocio.set(socioPrice);

  const regLink = 'https://app.socio.id/register';
  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);

  let step1 = 0;
  let step2 = 0;
  let step3 = 0;

  onMount(() => {
    const i1 = setInterval(() => (step1 = (step1 + 1) % 4), 2000);
    const i2 = setInterval(() => (step2 = (step2 + 1) % 3), 1500);
    const i3 = setInterval(() => (step3 = (step3 + 1) % 3), 1800);
    return () => {
      clearInterval(i1);
      clearInterval(i2);
      clearInterval(i3);
    };
  });
</script>

<section class="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-white via-ink-50 to-white">
  <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
    <div
      class="absolute inset-0 opacity-[0.03]"
      style="background-image: radial-gradient(#444 1px, transparent 1px); background-size: 30px 30px;"
    >
    </div>
  </div>

  <div class="relative z-20 container mx-auto px-4 md:px-8 max-w-7xl">
    <div class="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-10 shadow-2xl border border-white/60 mb-20 md:mb-32">
      <div class="text-center mb-8">
        <span
          class="inline-block py-1 px-3 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[10px] font-bold tracking-widest uppercase mb-2 shadow-sm"
        >
          🔥 Cek Hemat Kamu
        </span>
        <h2 class="font-display font-black text-2xl md:text-3xl text-ink-900 mb-2 leading-tight">
          Berapa Bisa Dihemat Hari Ini?
        </h2>
        <p class="text-sm text-ink-500 max-w-2xl mx-auto">
          Geser slider. Bandingkan harga jasa mahal vs <strong>harga termurah di Socio.id.</strong>
        </p>
      </div>

      <div class="mb-8 bg-white/50 rounded-2xl p-5 md:p-8 border border-white shadow-sm relative">
        <div class="flex flex-col md:flex-row justify-between items-end mb-4 md:mb-6 gap-2">
          <label class="font-bold text-ink-700 text-base md:text-lg flex flex-col">
            <span>Target Follower / Views</span>
            <span class="text-xs text-ink-400 font-normal mt-0.5">Berapa yang mau kamu beli</span>
          </label>
          <div class="text-4xl md:text-5xl font-display font-black text-ink-800 tracking-tight flex items-baseline">
            {followersNeeded.toLocaleString('id-ID')}
            <span class="text-base md:text-lg font-sans text-ink-400 font-bold ml-2">unit</span>
          </div>
        </div>
        <div class="relative w-full h-5 bg-ink-200 rounded-full shadow-inner cursor-pointer group">
          <input
            type="range"
            min="100"
            max="100000"
            step="100"
            bind:value={followersNeeded}
            class="absolute w-full h-full opacity-0 cursor-pointer z-20"
          />
          <div
            class="absolute h-full rounded-full z-10 transition-all duration-300 ease-out bg-primary"
            style="width: {(followersNeeded / 100000) * 100}%"
          >
          </div>
        </div>
        <div
          class="flex justify-between text-[10px] md:text-xs text-ink-400 mt-2 font-mono uppercase tracking-wide font-bold"
        >
          <span>100</span>
          <span>50rb</span>
          <span>100rb</span>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6 items-stretch">
        <div class="bg-white rounded-2xl p-6 md:p-8 border border-ink-200 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-sm bg-ink-50">😱</div>
              <div>
                <h3 class="font-bold text-ink-900 text-lg">Jasa Lain (Mahal)</h3>
                <p class="text-xs text-ink-500">Harga rata-rata pasaran</p>
              </div>
            </div>
            <div class="text-3xl md:text-4xl font-display font-black text-ink-800">
              Rp {formatRupiah(Math.floor($animatedManual))}
            </div>
          </div>
          <div class="p-3 rounded-lg text-xs leading-relaxed font-medium bg-ink-50 border border-ink-100 text-ink-600">
            Mahal, lambat, dan sering tanpa garansi. Saldo sering hangus.
          </div>
        </div>

        <div
          class="rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group border bg-gradient-to-br from-primary to-primary-800"
        >
          <div
            class="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-[shimmer_2s_infinite]"
          >
          </div>
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/10"
              >
                🚀
              </div>
              <div>
                <h3 class="font-bold text-white text-lg">Socio.id</h3>
                <p class="text-[10px] text-white/90 uppercase tracking-widest font-semibold">Termurah</p>
              </div>
            </div>
            <div class="text-4xl font-display font-black text-white tracking-tighter">
              Rp {formatRupiah(Math.floor($animatedSocio))}
            </div>
          </div>
          <div class="relative z-10 mt-4 pt-4 border-t border-white/20">
            <div class="flex items-end gap-1.5 mb-1">
              <span class="text-sm font-medium text-white/90 mb-1.5">Hemat</span>
              <span class="text-4xl font-mono font-bold text-white tracking-tighter shadow-sm"
                >Rp {formatRupiah(saved)}</span
              >
            </div>
            <a
              href={regLink}
              class="w-full mt-3 py-3 bg-white text-primary-800 rounded-xl font-bold text-sm hover:bg-ink-50 hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Ambil Harga Ini
              <svg class="w-3 h-3 text-primary-700 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg
              >
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center max-w-3xl mx-auto mb-12">
      <h2 class="font-display font-bold text-2xl md:text-4xl text-ink-900 mb-4">
        3 Masalah Ini Bikin <br /><span class="text-danger">Saldo Boncos</span> Diam-Diam
      </h2>
      <p class="text-ink-500 text-sm md:text-base">
        Sering ngalamin di bawah ini? Hati-hati, budget marketing kamu tergerus pelan-pelan.
      </p>
    </div>

    <div class="grid md:grid-cols-3 gap-6 md:gap-8">
      <div
        class="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-danger-soft transition-all duration-300 border border-ink-100 relative overflow-hidden"
      >
        <div class="h-40 mb-6 bg-ink-50 rounded-2xl p-4 flex flex-col justify-between relative border border-ink-100">
          <div class="flex items-center gap-2 border-b border-ink-200 pb-2 mb-2">
            <div class="w-2 h-2 rounded-full bg-danger"></div>
            <div class="text-[10px] text-ink-400">Pesanan Lama</div>
          </div>
          <div class="space-y-2 text-[10px]">
            {#if step1 >= 1}
              <div in:fly={{ x: -10 }} class="bg-white p-2 rounded-xl shadow-sm border border-ink-100 w-fit">"Min, orderan 2 hari lalu gmn?"</div>
            {/if}
            {#if step1 === 2}
              <div in:fade class="flex justify-end">
                <div class="bg-ink-200 p-2 rounded-xl w-fit text-ink-500 italic">Admin: masih antre…</div>
              </div>
            {/if}
            {#if step1 === 3}
              <div in:fly={{ x: -10 }} class="bg-danger-soft text-danger p-2 rounded-xl shadow-sm w-fit font-bold">"Baru masuk? Skip! 😡"</div>
            {/if}
          </div>
        </div>
        <h3 class="font-bold text-lg text-ink-900 mb-2 group-hover:text-danger transition-colors">Lama = Batal Beli</h3>
        <p class="text-ink-500 text-xs leading-relaxed">Pesan di panel lemot, order nunggak berhari-hari. Campaign mu sudah kadaluarsa.</p>
      </div>

      <div
        class="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-warning-soft transition-all duration-300 border border-ink-100 relative overflow-hidden"
      >
        <div class="h-40 mb-6 bg-warning-soft/50 rounded-2xl flex items-center justify-center relative overflow-hidden">
          {#if step2 === 0}
            <div in:scale class="text-center"><div class="text-4xl">💸</div><div class="text-xs font-bold text-ink-600 mt-2">Harga Mahal</div></div>
          {:else if step2 === 1}
            <div in:fly={{ y: 20 }} class="text-center"><div class="text-4xl animate-bounce">📉</div><div class="text-xs font-bold text-danger mt-2">- Margin Tipis</div></div>
          {:else}
            <div in:scale class="text-center opacity-50 grayscale"><div class="text-4xl">🚫</div><div class="text-xs font-bold text-ink-400 mt-2">Tanpa Garansi</div></div>
          {/if}
        </div>
        <h3 class="font-bold text-lg text-ink-900 mb-2 group-hover:text-warning transition-colors">Harga Selangit</h3>
        <p class="text-ink-500 text-xs leading-relaxed">Banyak panel nge-markup gila-gilaan. Tanpa garansi, saldo hangus kalau gagal.</p>
      </div>

      <div
        class="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-primary-100 transition-all duration-300 border border-ink-100 relative overflow-hidden"
      >
        <div class="h-40 mb-6 bg-ink-800 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center">
          <div class="absolute top-3 right-3 text-2xl opacity-50">🌙</div>
          {#if step3 === 0}
            <div in:fade class="text-ink-200 text-xs text-center"><span class="block text-2xl mb-1">😴</span>Panel Offline</div>
          {/if}
          {#if step3 >= 1}
            <div in:fly={{ y: 50 }} class="absolute bottom-4 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-lg flex items-center gap-2 w-3/4 shadow-lg">
              <div class="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center text-[10px] text-white">S</div>
              <div class="flex-1"><div class="h-1.5 w-12 bg-ink-400 rounded mb-1"></div><div class="h-1.5 w-8 bg-ink-500 rounded"></div></div>
              {#if step3 === 2}<span in:scale class="text-danger text-xs font-bold">❌ Down</span>{/if}
            </div>
          {/if}
        </div>
        <h3 class="font-bold text-lg text-ink-900 mb-2 group-hover:text-primary transition-colors">Panel Sering Down</h3>
        <p class="text-ink-500 text-xs leading-relaxed">Butuh order pas lagi viral malam hari, eh panel maintenance. Rejeki kelewat.</p>
      </div>
    </div>
  </div>
</section>

<style>
  @keyframes shimmer {
    100% {
      left: 150%;
    }
  }
</style>
