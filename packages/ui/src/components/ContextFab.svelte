<script lang="ts">
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  export type ContextFabAction = {
    label: string;
    href?: string;
    icon: string;
    tone?: "neutral" | "primary" | "success" | "warning" | "danger";
    onclick?: () => void;
  };

  let {
    primary,
    actions = [],
    lgLabel,
    position = "br",
    /** Show only on mobile/tablet (hidden lg+) or only desktop (hidden lg-block) */
    showOn = "all",
  }: {
    primary: ContextFabAction;
    actions?: ContextFabAction[];
    lgLabel?: string;
    /** Position: br=bottom-right (default), bl=bottom-left */
    position?: "br" | "bl";
    showOn?: "all" | "mobile" | "desktop";
  } = $props();

  let open = $state(false);
  let root = $state<HTMLDivElement | null>(null);

  const visibleActions = $derived(actions.slice(0, 6)); // max 6 secondary
  const hasSecondary = $derived(visibleActions.length > 0);

  function toggle() {
    haptic(10);
    open = !open;
  }

  function close() {
    if (open) {
      open = false;
      haptic(8);
    }
  }

  function handlePrimary(e: MouseEvent) {
    if (!hasSecondary) {
      haptic(16);
      primary.onclick?.();
      return;
    }
    // Has secondary → toggle menu
    toggle();
  }

  function handleAction(a: ContextFabAction) {
    haptic(12);
    a.onclick?.();
    close();
  }

  function handleDocClick(e: MouseEvent) {
    if (!open) return;
    if (root && !root.contains(e.target as Node)) close();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) close();
  }

  $effect(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  });

  const posClass = $derived(
    position === "bl" ? "left-4 lg:left-7" : "right-4 lg:right-7"
  );
  const visibilityClass = $derived(
    showOn === "mobile"
      ? "lg:hidden"
      : showOn === "desktop"
        ? "hidden lg:flex"
        : "flex"
  );
</script>

<div
  bind:this={root}
  class="cfab-root pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-{position === 'bl' ? 'start' : 'end'} {posClass} {visibilityClass}"
  aria-hidden={false}
>
  <div class="cfab-stack pointer-events-auto relative mb-20 flex flex-col items-end gap-2 lg:mb-7">
    <!-- Secondary actions (slide up, stagger) -->
    {#if hasSecondary && open}
      <div
        class="cfab-actions flex flex-col items-end gap-2"
        role="menu"
        aria-label="Aksi cepat"
      >
        {#each visibleActions as a, i (a.label)}
          {@const toneCls = a.tone === "success"
            ? "bg-success text-ink-50"
            : a.tone === "warning"
              ? "bg-warning text-ink-50"
              : a.tone === "danger"
                ? "bg-danger text-ink-50"
                : a.tone === "primary"
                  ? "bg-primary text-ink-50"
                  : "bg-surface text-ink-900 border border-ink-100"}
          <div
            class="cfab-row flex items-center gap-2"
            style="--cfab-d: {60 + i * 40}ms"
          >
            <span
              class="cfab-pill pointer-events-none hidden whitespace-nowrap rounded-full bg-ink-900/90 px-2.5 py-1 text-[11px] font-bold text-ink-50 shadow-md backdrop-blur sm:inline-block"
            >
              {a.label}
            </span>
            {#if a.href}
              <a
                href={a.href}
                onclick={() => handleAction(a)}
                class="cfab-action grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-md transition-transform duration-200 hover:scale-110 active:scale-95 {toneCls}"
                role="menuitem"
                aria-label={a.label}
              >
                <Icon name={a.icon} size={16} stroke={2.5} />
              </a>
            {:else}
              <button
                type="button"
                onclick={() => handleAction(a)}
                class="cfab-action grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-md transition-transform duration-200 hover:scale-110 active:scale-95 {toneCls}"
                role="menuitem"
                aria-label={a.label}
              >
                <Icon name={a.icon} size={16} stroke={2.5} />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Backdrop blur (visual separation when open) -->
    {#if hasSecondary && open}
      <div
        class="pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10 rounded-[40px] bg-ink-50/40 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
      ></div>
    {/if}

    <!-- Primary button -->
    {#if primary.href && !hasSecondary}
      <a
        href={primary.href}
        onclick={() => primary.onclick?.()}
        class="cfab-primary group inline-flex h-12 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-extrabold text-ink-50 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-ink-800 hover:shadow-2xl active:scale-95"
      >
        <Icon name={primary.icon} size={16} stroke={2.75} />
        <span class="whitespace-nowrap lg:hidden">{primary.label}</span>
        <span class="hidden whitespace-nowrap lg:inline">{lgLabel ?? primary.label}</span>
      </a>
    {:else}
      <button
        type="button"
        onclick={handlePrimary}
        class="cfab-primary group inline-flex h-12 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-extrabold text-ink-50 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-ink-800 hover:shadow-2xl active:scale-95"
        aria-haspopup={hasSecondary ? "menu" : undefined}
        aria-expanded={hasSecondary ? open : undefined}
        aria-label={primary.label}
      >
        <span
          class="cfab-icon grid h-7 w-7 place-items-center rounded-full bg-ink-50/15 transition-transform duration-300 group-hover:rotate-90"
          class:rotate-45={open && hasSecondary}
        >
          {#if hasSecondary && open}
            <Icon name="x" size={14} stroke={3} />
          {:else}
            <Icon name={primary.icon} size={14} stroke={2.75} />
          {/if}
        </span>
        <span class="whitespace-nowrap lg:hidden">{primary.label}</span>
        <span class="hidden whitespace-nowrap lg:inline">{lgLabel ?? primary.label}</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .cfab-row {
    animation: cfab-in 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: var(--cfab-d, 0ms);
  }
  @keyframes cfab-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.85);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .cfab-row {
      animation: none;
    }
    .cfab-icon {
      transition: none;
    }
  }
</style>
