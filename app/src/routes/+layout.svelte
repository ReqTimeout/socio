<script lang="ts">
  import "../app.css";
  import { onNavigate } from "$app/navigation";
  import { Toast } from "@socio/ui";

  let { children } = $props();

  // View Transitions API — cross-fade antar halaman ala native app.
  // Ref: https://svelte.dev/blog/view-transitions (pattern resmi SvelteKit).
  // Browser tanpa support (atau prefers-reduced-motion) fallback ke navigasi biasa.
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

{@render children()}
<Toast />

<style>
  /* Transisi halaman: fade cepat + slide halus (transform/opacity only) */
  :global(::view-transition-old(root)) {
    animation: 90ms cubic-bezier(0.4, 0, 1, 1) both vt-fade-out;
  }
  :global(::view-transition-new(root)) {
    animation: 210ms cubic-bezier(0.16, 1, 0.3, 1) both vt-fade-in;
  }
  @keyframes vt-fade-out {
    to {
      opacity: 0;
    }
  }
  @keyframes vt-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
