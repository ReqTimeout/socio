<script lang="ts">
  import { fly } from 'svelte/transition';

  // §3h blog single dock: muncul setelah 60% scroll, glass pill "Baca juga" → next.
  // Menggantikan FloatingTabDock tabs di artikel (mobile only).
  let props: { href?: string; title?: string } = $props();
  const href = $derived(props.href ?? '#');
  const title = $derived(props.title ?? '');

  let visible = $state(false);

  $effect(() => {
    const check = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      visible = max > 0 && scrollY > max * 0.6;
    };
    check();
    addEventListener('scroll', check, { passive: true });
    return () => removeEventListener('scroll', check);
  });
</script>

{#if visible && href !== '#'}
  <a
    {href}
    transition:fly={{ y: 100, duration: 380 }}
    class="md:hidden fixed inset-x-3 bottom-3 z-40 flex min-h-[56px] items-center gap-3 rounded-[20px] border border-white/40 bg-white/85 px-3 py-2.5 shadow-[0_10px_36px_-14px_rgba(15,23,42,0.18),0_4px_14px_rgba(15,23,42,0.08)] backdrop-blur-2xl pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
  >
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-tint)] text-[11px] font-bold uppercase tracking-wider text-[var(--accent-ink)]">
      Next
    </span>
    <div class="min-w-0 flex-1 leading-tight">
      <p class="text-[10px] font-bold uppercase tracking-widest text-ink-3">Baca juga</p>
      <p class="truncate text-[13px] font-bold text-ink">{title}</p>
    </div>
    <svg class="h-4 w-4 shrink-0 text-[var(--accent-ink)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6"/>
    </svg>
  </a>
{/if}