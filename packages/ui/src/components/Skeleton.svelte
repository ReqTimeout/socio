<script lang="ts">
  let {
    width = "100%",
    height = "1rem",
    rounded = "rounded-lg",
    class: className = "",
  }: { width?: string; height?: string; rounded?: string; class?: string } = $props();
</script>

<div
  class="skeleton {rounded} {className}"
  style="width:{width};height:{height};"
  aria-hidden="true"
></div>
