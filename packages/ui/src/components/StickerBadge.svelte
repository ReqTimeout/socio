<script lang="ts">
  // StickerBadge (F0) — pill sticker: border tinta 2px + hard shadow sm.
  // Untuk label promo/hemat/baru (max hemat pemakaian: bukan default chip).
  // Teks mango-800 on mango-soft (AA 7.89:1 light; dark remap AA 10.75:1).
  import type { Snippet } from "svelte";

  let {
    tone = "mango",
    class: className = "",
    children,
  }: {
    tone?: "mango" | "accent" | "success";
    class?: string;
    children: Snippet;
  } = $props();

  const tones: Record<string, string> = {
    mango: "bg-mango-soft text-mango-ink",
    accent: "bg-accent-50 text-accent-ink",
    success: "bg-success-soft text-success-ink",
  };
</script>

<span
  class="inline-flex items-center gap-1 rounded-full border-2 border-ink-900 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide whitespace-nowrap shadow-[2px_2px_0_var(--color-ink-900)] {tones[
    tone
  ]} {className}"
>
  {@render children()}
</span>
