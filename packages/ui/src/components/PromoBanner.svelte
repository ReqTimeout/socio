<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "./Icon.svelte";
  import { haptic } from "../haptic.js";

  export type Banner = {
    title: string;
    subtitle?: string;
    cta?: string;
    href?: string;
    img?: string; // URL banner dari admin (R2/CDN). Kosong = pakai gradient.
    gradient?: string; // tailwind gradient classes untuk fallback tanpa gambar
    badge?: string;
  };

  let { banners = [] }: { banners?: Banner[] } = $props();

  let idx = $state(0);
  let paused = $state(false);
  const many = $derived(banners.length > 1);

  function go(i: number) {
    idx = (i + banners.length) % banners.length;
  }
  function next() {
    go(idx + 1);
  }

  onMount(() => {
    if (!many) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => {
      if (!paused) next();
    }, 5500);
    return () => clearInterval(t);
  });

  // Swipe (mobile)
  let startX = 0;
  function onStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
  }
  function onEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 45) {
      haptic(8);
      go(idx + (dx < 0 ? 1 : -1));
    }
  }
</script>

{#if banners.length}
  <div
    class="relative overflow-hidden rounded-card shadow-card"
    role="region"
    aria-label="Promo & pengumuman"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    ontouchstart={onStart}
    ontouchend={onEnd}
  >
    {#each banners as b, i (i)}
      {@const active = i === idx}
      <a
        href={b.href || "#"}
        class="absolute inset-0 block transition-opacity duration-500 {active
          ? 'opacity-100'
          : 'pointer-events-none opacity-0'}"
        tabindex={active ? 0 : -1}
        aria-hidden={!active}
      >
        {#if b.img}
          <img src={b.img} alt={b.title} class="h-full w-full object-cover" />
          <div
            class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent"
          ></div>
        {:else}
          <div
            class="h-full w-full bg-gradient-to-br {b.gradient ??
              'from-primary-600 via-primary-700 to-accent-600'}"
          ></div>
          <div
            class="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/15 blur-2xl"
          ></div>
          <div
            class="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/10 blur-3xl"
          ></div>
        {/if}

        <div class="relative flex h-full flex-col justify-center gap-1 p-5 lg:p-7">
          {#if b.badge}
            <span
              class="inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur"
            >
              <Icon name="sparkles" size={12} stroke={2.5} />
              {b.badge}
            </span>
          {/if}
          <h3
            class="max-w-[80%] font-display text-lg font-extrabold leading-tight tracking-tight text-white drop-shadow-sm lg:text-2xl"
          >
            {b.title}
          </h3>
          {#if b.subtitle}
            <p class="max-w-[85%] text-xs text-white/85 lg:text-sm">{b.subtitle}</p>
          {/if}
          {#if b.cta}
            <span
              class="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-primary-700 shadow-sm transition-transform group-hover:translate-x-0.5 lg:text-sm"
            >
              {b.cta}
              <Icon name="arrow_right" size={15} stroke={2.5} />
            </span>
          {/if}
        </div>
      </a>
    {/each}

    <!-- Spacer untuk tinggi (banner absolute) — lebih pendek di mobile -->
    <div class="h-[140px] sm:h-[160px] lg:h-[180px]" aria-hidden="true"></div>

    {#if many}
      <div class="absolute bottom-3 left-5 z-10 flex items-center gap-1.5 lg:left-7">
        {#each banners as _, i (i)}
          <button
            type="button"
            onclick={(e) => {
              e.preventDefault();
              go(i);
            }}
            aria-label={`Banner ${i + 1}`}
            aria-current={i === idx}
            class="h-1.5 rounded-full transition-all duration-300 {i === idx
              ? 'w-6 bg-white'
              : 'w-1.5 bg-white/50 hover:bg-white/80'}"
          ></button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
