<script lang="ts">
  // Logo teks resmi Socio.id — mark gradient (echo dua loop brand) + wordmark.
  // Dipakai konsisten di sidebar, header mobile, dan halaman auth.
  let {
    size = "md",
    mark = true,
  }: { size?: "sm" | "md" | "lg"; mark?: boolean } = $props();

  const text: Record<string, string> = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };
  const box: Record<string, string> = {
    sm: "h-7 w-7 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
  };
  const ring: Record<string, number> = { sm: 13, md: 17, lg: 22 };
</script>

<span class="inline-flex items-center gap-2">
  {#if mark}
    <span
      class="grid shrink-0 place-items-center bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.7)] {box[
        size
      ]}"
      aria-hidden="true"
    >
      <svg
        width={ring[size]}
        height={ring[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.25"
        stroke-linecap="round"
      >
        <circle cx="9" cy="12" r="5.2" />
        <circle cx="15" cy="12" r="5.2" opacity="0.85" />
      </svg>
    </span>
  {/if}
  <span
    class="font-display font-extrabold leading-none tracking-tight text-ink-900 {text[
      size
    ]}"
  >
    socio<span
      class="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent"
      >.id</span
    >
  </span>
</span>
