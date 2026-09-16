<script lang="ts">
  import type { Snippet } from "svelte";

  type Variant = "primary" | "accent" | "ghost" | "danger";
  type Size = "sm" | "md" | "lg";

  let {
    variant = "primary",
    size = "md",
    href,
    type = "button",
    disabled = false,
    full = false,
    onclick,
    class: className = "",
    children,
    ...rest
  }: {
    variant?: Variant;
    size?: Size;
    href?: string;
    type?: "button" | "submit";
    disabled?: boolean;
    full?: boolean;
    onclick?: () => void;
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  } = $props();

  const base =
    "relative inline-flex items-center justify-center gap-2 font-bold rounded-full transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<Variant, string> = {
    primary:
      "bg-ink-900 text-ink-50 border-2 border-ink-900 shadow-[2px_2px_0_var(--color-ink-900)] hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
    accent: "bg-accent-700 text-white shadow-sm hover:brightness-90",
    ghost: "bg-ink-100 text-ink-700 hover:bg-ink-200",
    /* P2-12: pakai red-600 (Tailwind default, #dc2626) bukan --color-danger
       karena di dark mode --color-danger = #f87171 (terang) dan white text
       di atasnya = 2.76:1 FAIL. red-600 darker red = white text 4.83:1 ✅ */
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:hover:bg-red-500",
  };
  const sizes: Record<Size, string> = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };
</script>

{#if href}
  <a
    {href}
    {...rest}
    class="{base} {variants[variant]} {sizes[size]} {full
      ? 'w-full'
      : ''} {className}">{@render children()}{#if variant === "primary" || variant === "accent"}<span
        class="btn-shine"
        aria-hidden="true"
      ></span>{/if}</a
  >
{:else}
  <button
    {type}
    {disabled}
    {onclick}
    {...rest}
    class="{base} {variants[variant]} {sizes[size]} {full
      ? 'w-full'
      : ''} {className}"
  >
    {@render children()}{#if variant === "primary" || variant === "accent"}<span
        class="btn-shine"
        aria-hidden="true"
      ></span>{/if}
  </button>
{/if}

<style>
  /* Shine sweep ala landing CTA — hover/focus/active, 1× 700ms */
  .btn-shine {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 8px;
    right: 8px;
    border-radius: 9999px;
    overflow: hidden;
    pointer-events: none;
  }
  .btn-shine::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 45%;
    background: linear-gradient(
      105deg,
      transparent,
      rgba(255, 255, 255, 0.45),
      transparent
    );
    transform: translateX(-240%);
  }
  button:hover .btn-shine::before,
  a:hover .btn-shine::before,
  button:focus-visible .btn-shine::before,
  a:focus-visible .btn-shine::before,
  button:active .btn-shine::before,
  a:active .btn-shine::before {
    animation: btn-shine 700ms ease 1;
  }
  @keyframes btn-shine {
    to {
      transform: translateX(340%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .btn-shine::before {
      animation: none;
    }
  }
</style>
