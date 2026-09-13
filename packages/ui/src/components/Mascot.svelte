<script lang="ts">
  // Mascot — Si Socio paper-plane (F0). Metafora "boost".
  // stroke=currentColor (adaptif light/dark), fill mango + accent token.
  // Pose: wave (sapa/CTA) | fly (sukses/ujung alur) | fall (empty/error).
  // Ukuran lewat prop size; dekoratif (aria-hidden) kecuali title diisi.
  let {
    pose = "wave",
    size = 72,
    class: className = "",
    title = "",
  }: {
    pose?: "wave" | "fly" | "fall";
    size?: number;
    class?: string;
    title?: string;
  } = $props();
</script>

{#if pose === "fly"}
  <svg
    width={size}
    height={size}
    viewBox="0 0 72 72"
    fill="none"
    class={className}
    aria-hidden={title ? undefined : "true"}
    role={title ? "img" : undefined}
  >
    {#if title}<title>{title}</title>{/if}
    <path
      d="M6 22h10M2 34h12M8 46h9"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      opacity="0.45"
    />
    <path
      d="M20 36 58 10 44 60 36 42 20 36Z"
      fill="var(--color-mango-400)"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M36 42 58 10 40 38l-4 4Z" fill="var(--color-accent-500)" opacity="0.9" />
    <path
      d="M20 36l16 6 8-14"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <circle cx="33" cy="30" r="2.6" fill="currentColor" />
    <circle cx="41" cy="26" r="2.6" fill="currentColor" />
    <circle cx="33.8" cy="29.2" r="0.9" fill="var(--color-surface)" />
    <circle cx="41.8" cy="25.2" r="0.9" fill="var(--color-surface)" />
    <path
      d="M34 35.5c2 1.6 5 1.6 7 0"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{:else if pose === "fall"}
  <svg
    width={size}
    height={size}
    viewBox="0 0 72 72"
    fill="none"
    class={className}
    aria-hidden={title ? undefined : "true"}
    role={title ? "img" : undefined}
  >
    {#if title}<title>{title}</title>{/if}
    <path
      d="M36 6c-10 0-17 6-18 14 6-3 12-3 18 0 6-3 12-3 18 0-1-8-8-14-18-14Z"
      fill="var(--color-danger)"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path
      d="M22 22 30 38M50 22 42 38M36 20v16"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
    <g transform="rotate(24 36 52)">
      <path
        d="M24 50l24-10-8 20-6-6-10-4Z"
        fill="var(--color-mango-400)"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <circle cx="35" cy="47" r="2.4" fill="currentColor" />
      <circle cx="41.5" cy="44.5" r="2.4" fill="currentColor" />
      <ellipse cx="37" cy="52.5" rx="2.2" ry="2.8" fill="currentColor" />
    </g>
  </svg>
{:else}
  <svg
    width={size}
    height={size}
    viewBox="0 0 72 72"
    fill="none"
    class={className}
    aria-hidden={title ? undefined : "true"}
    role={title ? "img" : undefined}
  >
    {#if title}<title>{title}</title>{/if}
    <path
      d="M58 8l1.8 4.2L64 14l-4.2 1.8L58 20l-1.8-4.2L52 14l4.2-1.8L58 8Z"
      fill="var(--color-mango-400)"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <path
      d="M14 40 56 18 42 60 34 46 14 40Z"
      fill="var(--color-mango-400)"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M34 46 56 18l-14 20-8 8Z" fill="var(--color-accent-500)" opacity="0.9" />
    <path
      d="M14 40l20 6 6-12"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <circle cx="30" cy="34" r="2.6" fill="currentColor" />
    <circle cx="38" cy="31" r="2.6" fill="currentColor" />
    <circle cx="30.8" cy="33.2" r="0.9" fill="var(--color-surface)" />
    <circle cx="38.8" cy="30.2" r="0.9" fill="var(--color-surface)" />
    <path
      d="M31 39.5c2.2 1.8 5.4 1.8 7.6 0"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M8 52c-2 2-2 5 0 7M4 48c-3 3.5-3 8 0 11"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      opacity="0.45"
    />
  </svg>
{/if}
