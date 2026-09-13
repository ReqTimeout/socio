<!-- SocioMascot — maskot "Si Socio": paper-plane SVG bermata (D-3 approved 2026-09-13).
  Metafora "boost": pesawat kertas = order yang diterbangkan socio.id.
  Inline SVG, stroke --ink, fill pop/accent. aria-hidden (dekoratif).
  Props: pose = "wave" (default) | "fly" (roadmap/hero) | "fall" (404/empty). -->
<script>
  let { pose = 'wave', class: cls = '', title = '' } = $props();
</script>

{#if pose === 'fly'}
  <svg
    class={cls}
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
  >
    {#if title}<title>{title}</title>{/if}
    <!-- motion lines -->
    <path d="M6 22h10M2 34h12M8 46h9" stroke="var(--ink-3)" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
    <!-- plane body -->
    <path
      d="M20 36 58 10 44 60 36 42 20 36Z"
      fill="var(--pop-mango)"
      stroke="var(--ink)"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M36 42 58 10 40 38l-4 4Z" fill="var(--accent)" opacity="0.85" />
    <!-- wing fold -->
    <path d="M20 36l16 6 8-14" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" />
    <!-- eyes (di badan pesawat) -->
    <circle cx="33" cy="30" r="2.6" fill="var(--ink)" />
    <circle cx="41" cy="26" r="2.6" fill="var(--ink)" />
    <circle cx="33.8" cy="29.2" r="0.9" fill="#fff" />
    <circle cx="41.8" cy="25.2" r="0.9" fill="#fff" />
    <!-- smile -->
    <path d="M34 35.5c2 1.6 5 1.6 7 0" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
  </svg>
{:else if pose === 'fall'}
  <svg
    class={cls}
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
  >
    {#if title}<title>{title}</title>{/if}
    <!-- parasut -->
    <path
      d="M36 6c-10 0-17 6-18 14 6-3 12-3 18 0 6-3 12-3 18 0-1-8-8-14-18-14Z"
      fill="var(--pop-berry)"
      stroke="var(--ink)"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M22 22 30 38M50 22 42 38M36 20v16" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
    <!-- plane miring jatuh -->
    <g transform="rotate(24 36 52)">
      <path
        d="M24 50l24-10-8 20-6-6-10-4Z"
        fill="var(--pop-mango)"
        stroke="var(--ink)"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <circle cx="35" cy="47" r="2.4" fill="var(--ink)" />
      <circle cx="41.5" cy="44.5" r="2.4" fill="var(--ink)" />
      <!-- mulut O kaget -->
      <ellipse cx="37" cy="52.5" rx="2.2" ry="2.8" fill="var(--ink)" />
    </g>
  </svg>
{:else}
  <!-- wave (default): pesawat tegak + tangan melambai -->
  <svg
    class={cls}
    width="72"
    height="72"
    viewBox="0 0 72 72"
    fill="none"
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
  >
    {#if title}<title>{title}</title>{/if}
    <!-- sparkle -->
    <path
      d="M58 8l1.8 4.2L64 14l-4.2 1.8L58 20l-1.8-4.2L52 14l4.2-1.8L58 8Z"
      fill="var(--pop-mango)"
      stroke="var(--ink)"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <!-- plane body -->
    <path
      d="M14 40 56 18 42 60 34 46 14 40Z"
      fill="var(--pop-mango)"
      stroke="var(--ink)"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M34 46 56 18l-14 20-8 8Z" fill="var(--accent)" opacity="0.85" />
    <path d="M14 40l20 6 6-12" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" />
    <!-- eyes -->
    <circle cx="30" cy="34" r="2.6" fill="var(--ink)" />
    <circle cx="38" cy="31" r="2.6" fill="var(--ink)" />
    <circle cx="30.8" cy="33.2" r="0.9" fill="#fff" />
    <circle cx="38.8" cy="30.2" r="0.9" fill="#fff" />
    <!-- smile -->
    <path d="M31 39.5c2.2 1.8 5.4 1.8 7.6 0" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" />
    <!-- waving motion arcs -->
    <path d="M8 52c-2 2-2 5 0 7M4 48c-3 3.5-3 8 0 11" stroke="var(--ink-3)" stroke-width="2" stroke-linecap="round" opacity="0.7" />
  </svg>
{/if}
