<script lang="ts">
  import { onMount } from 'svelte';

  let visible = $state(false);
  let el: HTMLElement | undefined = $state(undefined);

  // L2: 4-col stat strip (anti-pattern #5) → real numbers inline narrative.
  // "42 dtk rata-rata mulai" fabricated → drop. Hanya angka terverifikasi dari katalog.

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
  class="relative overflow-hidden border-y border-[var(--hairline)] bg-[oklch(0.19_0.02_235)] py-10 md:py-14"
>
  <div class="container relative z-10 mx-auto px-4 md:px-6">
    <!-- Top strip: brand social proof -->
    <div class="mb-6 flex flex-wrap items-center justify-center gap-3 md:mb-8">
      <span
        class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[oklch(0.97_0.004_220)] backdrop-blur-sm md:text-xs"
      >
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] live-dot"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]"></span>
        </span>
        Socio.id — Panel SMM termurah &amp; tercepat Indonesia
      </span>
    </div>

    <!-- L2 #5: inline narrative stat (anti-pattern 4-col stat strip).
         Hanya 8.270 (katalog real) + 882 (kategori real). -->
    <p class="reveal text-center text-[14px] font-semibold text-[oklch(0.97_0.004_220)] md:text-[16px]">
      <span class="num font-extrabold text-[oklch(0.97_0.004_220)]">8.270</span> layanan SMM aktif
      <span aria-hidden="true" class="mx-2 opacity-40">·</span>
      <span class="num font-extrabold text-[oklch(0.97_0.004_220)]">882</span> kategori
      <span aria-hidden="true" class="mx-2 opacity-40">·</span>
      <span class="text-[oklch(0.78_0.01_220)]">panel online 24/7</span>
    </p>

    <!-- Bottom strip: payment + refund trust -->
    <div
      class="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-[oklch(0.78_0.01_220)] md:mt-8 md:text-xs"
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