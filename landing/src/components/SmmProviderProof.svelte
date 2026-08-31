<script lang="ts">
  import { onMount } from 'svelte';

  let visible = $state(false);
  let el: HTMLElement | undefined = $state(undefined);

  const stats = [
    { value: '8.185+', label: 'Layanan SMM', icon: '⚡' },
    { value: '872', label: 'Kategori', icon: '🎯' },
    { value: '< 5 mnt', label: 'Waktu proses', icon: '🚀' },
    { value: '24/7', label: 'Auto refill', icon: '♾️' },
  ];

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          visible = true;
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (el) observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<section
  bind:this={el}
  class="relative overflow-hidden border-y border-ink-100 bg-gradient-to-br from-ink-900 via-ink-900 to-primary-900 py-10 md:py-14"
>
  <!-- Ambient orbs -->
  <div class="pointer-events-none absolute inset-0 opacity-30">
    <div
      class="absolute -left-12 top-0 h-32 w-32 rounded-full bg-primary-500/30 blur-3xl"
    ></div>
    <div
      class="absolute -right-12 bottom-0 h-32 w-32 rounded-full bg-accent-500/20 blur-3xl"
    ></div>
  </div>

  <div class="container relative z-10 mx-auto px-4 md:px-6">
    <!-- Top strip: brand social proof -->
    <div class="mb-6 flex flex-wrap items-center justify-center gap-3 md:mb-8">
      <span
        class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm md:text-xs"
      >
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full rounded-full bg-success live-dot"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
        </span>
        Socio.id — Panel SMM #1 Indonesia · 50.000+ Reseller Aktif
      </span>
    </div>

    <!-- Stats grid -->
    <div class="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {#each stats as stat, i}
        <div
          class="reveal text-center {visible ? 'is-visible' : ''}"
          style="transition-delay: {i * 80}ms"
        >
          <div
            class="mb-1 text-2xl text-white/60 md:text-3xl"
            aria-hidden="true"
          >
            {stat.icon}
          </div>
          <div
            class="font-display text-2xl font-extrabold tabular-nums text-white md:text-4xl"
          >
            {stat.value}
          </div>
          <div
            class="text-[10px] font-bold uppercase tracking-wider text-white/60 md:text-xs"
          >
            {stat.label}
          </div>
        </div>
      {/each}
    </div>

    <!-- Bottom strip: payment + refund trust -->
    <div
      class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-white/70 md:mt-8 md:text-xs"
    >
      <span class="inline-flex items-center gap-1.5">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          ><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg
        >
        Garansi uang kembali
      </span>
      <span class="inline-flex items-center gap-1.5">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          ><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg
        >
        Pembayaran aman
      </span>
      <span class="inline-flex items-center gap-1.5">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          ><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg
        >
        Proses otomatis 24/7
      </span>
    </div>
  </div>
</section>
