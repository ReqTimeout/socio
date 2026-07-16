<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'accent' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';

  let {
    variant = 'primary',
    size = 'md',
    href,
    type = 'button',
    disabled = false,
    full = false,
    onclick,
    class: className = '',
    children,
    ...rest
  }: {
    variant?: Variant;
    size?: Size;
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    full?: boolean;
    onclick?: () => void;
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  } = $props();

  const base =
    'inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none';
  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-white shadow-sm hover:bg-primary-700',
    accent: 'bg-accent-500 text-white shadow-sm hover:bg-accent-600',
    ghost: 'bg-ink-100 text-ink-700 hover:bg-ink-200',
    danger: 'bg-danger text-white shadow-sm hover:bg-red-700',
  };
  const sizes: Record<Size, string> = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };
</script>

{#if href}
  <a {href} {...rest} class="{base} {variants[variant]} {sizes[size]} {full ? 'w-full' : ''} {className}">{@render children()}</a>
{:else}
  <button
    {type}
    {disabled}
    onclick={onclick}
    {...rest}
    class="{base} {variants[variant]} {sizes[size]} {full ? 'w-full' : ''} {className}"
  >
    {@render children()}
  </button>
{/if}
