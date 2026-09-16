<script lang="ts">
  // BackButton (APP V3 S1-3) — tombol kembali sticker-tactile ala Sparko.
  // border ink 2px + hard shadow-sm; press = tenggelam (shadow hilang + geser).
  // Satu komponen untuk semua halaman (ganti link ‹ tekstual yang beda-beda).
  import Icon from "./Icon.svelte";
  import { haptic } from "../haptic.js";

  let {
    href,
    label = "Kembali",
    class: className = "",
  }: {
    href: string;
    label?: string;
    class?: string;
  } = $props();
</script>

<a
  {href}
  aria-label={label}
  onclick={() => haptic(8)}
  class="back-btn group inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border-2 border-ink-900 bg-surface px-3 text-sm font-bold text-ink-800 shadow-[2px_2px_0_var(--color-ink-900)] transition-all duration-120 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none {className}"
>
  <span class="grid place-items-center transition-transform duration-200 group-active:-translate-x-0.5">
    <Icon name="arrow_left" size={18} stroke={2.4} />
  </span>
  <span class="sm:hidden">{label}</span>
</a>

<style>
  .back-btn {
    transition-timing-function: ease-out;
  }
  .back-btn:active {
    transition-duration: 120ms;
  }
  @media (prefers-reduced-motion: reduce) {
    .back-btn {
      transition: none;
    }
  }
</style>
