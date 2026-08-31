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

<span class="inline-flex items-center gap-1.5">
  {#if mark}
    <span class="hidden" aria-hidden="true"></span>
  {/if}
  <!-- Must match auth style: socio (primary) + .id (accent — AA contrast on white) -->
  <span
    class="font-display font-extrabold leading-none tracking-tight {text[size]}"
  >
    <span class="text-primary">socio</span><span class="text-accent-700"
      >.id</span
    >
  </span>
</span>
