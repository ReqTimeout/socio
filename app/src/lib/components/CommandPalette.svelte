<script lang="ts">
  /* CommandPalette — navigasi & aksi cepat admin (UIUXADMIN §3.3).
   * Trigger: Ctrl/⌘+K atau tombol search. Group: Halaman / Aksi.
   * A11y: role=dialog, focus-trap sederhana, Esc tutup, ↑↓ navigasi, Enter pilih.
   */
  import { fade, fly } from "svelte/transition";
  import { goto, invalidateAll } from "$app/navigation";
  import { Icon, toast } from "@socio/ui";

  let {
    open = false,
    onclose,
    pages = [],
  }: {
    open?: boolean;
    onclose: () => void;
    pages?: { href: string; label: string; icon: string; group: string; keywords?: string[] }[];
  } = $props();

  let q = $state("");
  let inputEl: HTMLInputElement | undefined = $state();
  let sel = $state(0);

  const actions: { label: string; icon: string; hint: string; run: () => Promise<void> | void }[] =
    [
      {
        label: "Toggle maintenance mode",
        icon: "alert",
        hint: "aktif/nonaktif blokir user",
        run: async () => {
          const fd = new FormData();
          const cur = document.documentElement.dataset.maintenance === "1";
          fd.set("on", cur ? "0" : "1");
          const res = await fetch("/admin/settings?/maintenance", { method: "POST", body: fd });
          const j = (await res.json().catch(() => null)) as any;
          const msg = j?.data?.success ?? j?.data?.error ?? "Selesai.";
          toast(msg, "success");
          await invalidateAll();
        },
      },
    ];

  type Item = {
    kind: "page" | "action";
    label: string;
    icon: string;
    sub: string;
    run: () => void;
  };

  function fuzzy(haystack: string, needle: string): boolean {
    if (!needle) return true;
    const h = haystack.toLowerCase();
    if (h.includes(needle)) return true;
    // prefix overlap: "tiket" ~ "tickets" (5 huruf pertama match)
    const n = Math.min(needle.length, 4);
    return n >= 3 && h.includes(needle.slice(0, n));
  }

  const items = $derived.by(() => {
    const ql = q.trim().toLowerCase();
    const out: Item[] = [];
    for (const p of pages) {
      if (
        !ql ||
        fuzzy(p.label, ql) ||
        fuzzy(p.href.replace("/admin/", ""), ql) ||
        (p.keywords ?? []).some((k) => fuzzy(k, ql))
      ) {
        out.push({
          kind: "page",
          label: p.label,
          icon: p.icon,
          sub: p.group,
          run: () => goto(p.href),
        });
      }
    }
    for (const a of actions) {
      if (!ql || a.label.toLowerCase().includes(ql) || a.hint.includes(ql)) {
        out.push({
          kind: "action",
          label: a.label,
          icon: a.icon,
          sub: a.hint,
          run: () => a.run(),
        });
      }
    }
    return out.slice(0, 12);
  });

  $effect(() => {
    void q;
    sel = 0;
  });

  $effect(() => {
    if (!open) return;
    q = "";
    sel = 0;
    const t = setTimeout(() => inputEl?.focus(), 30);
    return () => clearTimeout(t);
  });

  function onInputKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      sel = Math.min(sel + 1, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sel = Math.max(sel - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[sel];
      if (it) {
        onclose();
        it.run();
      }
    }
  }

  const listed = $derived(open);
</script>

{#if listed}
  <div
    class="fixed inset-0 z-[70] flex items-start justify-center bg-ink-900/45 p-4 pt-[12vh] backdrop-blur-[2px]"
    role="presentation"
    in:fade={{ duration: 140 }}
    out:fade={{ duration: 120 }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onclose();
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onclose();
      }
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      class="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-200/60 bg-surface shadow-2xl"
      in:fly={{ y: -10, duration: 200 }}
    >
      <div class="flex items-center gap-2.5 border-b border-ink-100 px-4 py-3">
        <Icon name="search" size={18} class="text-ink-400" />
        <input
          bind:this={inputEl}
          bind:value={q}
          onkeydown={onInputKey}
          type="text"
          placeholder="Cari halaman atau aksi… (mis. users, approve, maintenance)"
          class="w-full bg-transparent text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none"
          aria-label="Perintah pencarian"
        />
        <kbd
          class="hidden shrink-0 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-400 sm:block"
          >Esc</kbd
        >
      </div>
      {#if items.length === 0}
        <div class="px-4 py-8 text-center text-sm text-ink-400">Tidak ada hasil untuk "{q}"</div>
      {:else}
        <ul class="max-h-[46vh] overflow-y-auto p-2" role="listbox">
          {#each items as it, i (it.kind + it.label)}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={i === sel}
                onclick={() => {
                  onclose();
                  it.run();
                }}
                onmousemove={() => (sel = i)}
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors {i ===
                sel
                  ? 'bg-ink-100'
                  : 'hover:bg-ink-50'}"
              >
                <span
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-lg {it.kind === 'page'
                    ? 'bg-primary-50 text-primary-600'
                    : 'bg-warning-soft text-warning'}"
                >
                  <Icon name={it.icon} size={15} />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-ink-800">{it.label}</span>
                  <span class="block truncate text-xs text-ink-400">{it.sub}</span>
                </span>
                {#if i === sel}
                  <kbd
                    class="shrink-0 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-400"
                    >↵</kbd
                  >
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div
        class="flex items-center gap-3 border-t border-ink-100 bg-ink-50/60 px-4 py-2 text-[11px] font-medium text-ink-400"
      >
        <span>↑↓ navigasi</span><span>↵ pilih</span><span>esc tutup</span>
        <span class="ml-auto">Halaman: {pages.length} · Aksi: {actions.length}</span>
      </div>
    </div>
  </div>
{/if}
