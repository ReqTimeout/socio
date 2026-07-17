<script lang="ts">
  let {
    name = "",
    src,
    size = "md",
  }: { name?: string; src?: string; size?: "sm" | "md" | "lg" } = $props();

  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" };
  const initials = $derived(
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
  );
</script>

{#if src}
  <img {src} alt={name} class="rounded-full object-cover {sizes[size]}" />
{:else}
  <div
    class="rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center {sizes[size]}"
    aria-hidden="true"
  >
    {initials}
  </div>
{/if}
